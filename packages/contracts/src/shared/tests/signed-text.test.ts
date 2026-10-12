import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { signedTextSchema } from '../signed-text.ts';

const keyId = '01890a5d-ac96-7000-8000-000000000001';
// The sync module's second anchor: Android and Secure Enclave sign, staff send unsigned.
const secondAnchor = signedTextSchema({
  textMax: 64,
  signatureMax: 16,
  signedKinds: ['a', 's'],
  unsignedKinds: ['o'],
  extra: { keyId: z.uuid().nullable() },
});
const ok = (value: unknown) => secondAnchor.safeParse(value).success;
const signed = { text: 'eyJraW5kIjoxfQ', signatureKind: 'a', signature: 'MEUCIQ', keyId };

describe('signedTextSchema', () => {
  it('takes a signed kind with its signature and an unsigned kind with null', () => {
    expect(secondAnchor.parse(signed)).toEqual(signed);
    expect(ok({ ...signed, signatureKind: 's' })).toBe(true);
    expect(ok({ ...signed, signatureKind: 'o', signature: null, keyId: null })).toBe(true);
    expectTypeOf<z.infer<typeof secondAnchor>['signatureKind']>().toEqualTypeOf<'a' | 's' | 'o'>();
  });

  it('refuses a signed kind without a signature and an unsigned kind with one', () => {
    const missing = secondAnchor.safeParse({ ...signed, signature: null });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.path).toEqual(['signature']);
    expect(ok({ ...signed, signatureKind: 'o' })).toBe(false);
    expect(ok({ ...signed, signatureKind: 'x' })).toBe(false);
  });

  it('carries text and signature as written, within their limits', () => {
    for (const [field, value] of [
      ['text', ''],
      ['text', 'A'.repeat(65)],
      ['signature', ''],
      ['signature', 'A'.repeat(17)],
    ] as const) {
      expect(ok({ ...signed, [field]: value }), `${field} ${value}`).toBe(false);
    }
    const edge = { ...signed, text: 'A'.repeat(64), signature: 'A'.repeat(16) };
    expect(secondAnchor.parse(edge)).toEqual(edge);
    // The inner form is the module's: any text passes unchanged.
    const opaque = { ...signed, text: ' {"a": 1} ', signature: 'MEU/+=' };
    expect(secondAnchor.parse(opaque)).toEqual(opaque);
  });

  it("requires the module's extra fields and drops an unknown one", () => {
    const { keyId: _keyId, ...withoutKey } = signed;
    expect(ok(withoutKey)).toBe(false);
    expect(secondAnchor.parse({ ...signed, later: 1 })).toEqual(signed);
  });

  it('refuses a kind named twice when the schema is made', () => {
    const twice = { textMax: 8, signatureMax: 8 } as const;
    expect(() => signedTextSchema({ ...twice, signedKinds: ['a', 'a'] })).toThrow(/unique/);
    expect(() => signedTextSchema({ ...twice, signedKinds: ['a'], unsignedKinds: ['a'] })).toThrow(
      /unique/,
    );
  });
});
