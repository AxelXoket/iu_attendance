import { generateKeyPairSync, sign, verify } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareEnvelopes, ENVELOPE_COMPARISONS, itemResultOf } from './compare.ts';
import {
  buildEnvelope,
  type ParsedEnvelope,
  parseEnvelope,
  recordTextOf,
  scanBodyOf,
  signedBytesOf,
} from './envelope.ts';

const LECTURER = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d10';
const parsed = (envelope: string): ParsedEnvelope => {
  const result = parseEnvelope(envelope);
  if ('error' in result) throw new Error(`test envelope does not parse: ${result.error}`);
  return result;
};
// The same envelope as it reaches the server inside a receipt scan.
const throughScan = (envelope: string) =>
  parsed((JSON.parse(scanBodyOf(envelope, LECTURER)) as { envelope: string }).envelope);
const answer = (stored: string, incoming: string) =>
  itemResultOf(compareEnvelopes(parsed(stored), parsed(incoming)));

describe('envelope comparison', () => {
  it('takes a second valid signature over the same text as the same record', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const text = recordTextOf({ kind: 'record', v: 1, id: '01890a5d-ac96-7000-8000-000000000001' });
    const signOnce = () =>
      sign('sha256', signedBytesOf(text), { key: privateKey, dsaEncoding: 'der' });
    const [first, second] = [signOnce(), signOnce()];
    // Ground control: ECDSA signs with a fresh nonce, and both signatures hold.
    expect(Buffer.compare(first, second)).not.toBe(0);
    for (const signature of [first, second]) {
      const key = { key: publicKey, dsaEncoding: 'der' } as const;
      expect(verify('sha256', signedBytesOf(text), key, signature)).toBe(true);
    }
    const stored = buildEnvelope(text, 'ANDROID_P256', first);
    const incoming = buildEnvelope(text, 'ANDROID_P256', second);
    expect(compareEnvelopes(parsed(stored), parsed(incoming))).toBe('SAME_TEXT_OTHER_SIGNATURE');
    expect(answer(stored, incoming)).toEqual({ result: 'ALREADY_EXISTS', code: null });
    expect(compareEnvelopes(parsed(stored), parsed(stored))).toBe('SAME');
  });

  it('answers by the record text alone, whatever the signature and the arrival path', () => {
    const record = fc.record({
      kind: fc.constant('record'),
      v: fc.constant(1),
      id: fc.uuid(),
      sequence: fc.nat(),
      note: fc.string({ unit: 'grapheme', maxLength: 40 }),
    });
    // Two signatures over the same text with one key, both valid: ECDSA draws a fresh
    // nonce each time.
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const signText = (text: string) =>
      sign('sha256', signedBytesOf(text), { key: privateKey, dsaEncoding: 'der' });
    const seen = new Set<string>();
    fc.assert(
      fc.property(record, record, (a, b) => {
        const [textA, textB] = [recordTextOf(a), recordTextOf(b)];
        const sa = signText(textA);
        const stored = buildEnvelope(textA, 'SECURE_ENCLAVE', sa);
        const pairs: [string, string][] = [
          [stored, stored],
          [stored, buildEnvelope(textA, 'SECURE_ENCLAVE', signText(textA))],
          [stored, buildEnvelope(textB, 'SECURE_ENCLAVE', signText(textB))],
        ];
        for (const [left, right] of pairs) {
          const comparison = compareEnvelopes(parsed(left), parsed(right));
          seen.add(comparison);
          // The scan path carries the same envelope and gets the same answer.
          expect(compareEnvelopes(parsed(left), throughScan(right))).toBe(comparison);
          expect(compareEnvelopes(throughScan(left), throughScan(right))).toBe(comparison);
          const sameText = parsed(left).recordText === parsed(right).recordText;
          expect(comparison === 'TEXT_DIFFERS').toBe(!sameText);
          expect(comparison === 'SAME').toBe(left === right);
          expect(itemResultOf(comparison)).toEqual(
            sameText
              ? { result: 'ALREADY_EXISTS', code: null }
              : { result: 'REJECTED', code: 'ATTENDANCE_ID_CONFLICT' },
          );
        }
      }),
      { numRuns: 1000 },
    );
    // Ground control: every comparison occurred.
    expect([...seen].sort()).toEqual([...ENVELOPE_COMPARISONS].sort());
  });

  it('tells the signature kinds apart over the same text', () => {
    const text = recordTextOf({ kind: 'record', v: 1 });
    const bytes = new Uint8Array([1, 2, 3]);
    const android = buildEnvelope(text, 'ANDROID_P256', bytes);
    const enclave = buildEnvelope(text, 'SECURE_ENCLAVE', bytes);
    expect(compareEnvelopes(parsed(android), parsed(enclave))).toBe('SAME_TEXT_OTHER_SIGNATURE');
    // One byte longer is another signature too.
    const longer = buildEnvelope(text, 'ANDROID_P256', new Uint8Array([1, 2, 3, 0]));
    expect(compareEnvelopes(parsed(android), parsed(longer))).toBe('SAME_TEXT_OTHER_SIGNATURE');
  });
});
