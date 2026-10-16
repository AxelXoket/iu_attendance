import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { encodeBase64Url } from './base64url.ts';
import { BASE64_32_BYTES, KEY_ID } from './formats.ts';

// Standard base64 with its padding, built from base64url: 32 bytes are 43 letters and '='.
const standardBase64 = (bytes: Uint8Array) =>
  `${encodeBase64Url(bytes).replaceAll('-', '+').replaceAll('_', '/')}=`;

describe('the shared text forms', () => {
  it('take every 32-byte key as standard base64 with its padding, and no text near one', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (key) => {
        expect(BASE64_32_BYTES.test(standardBase64(key))).toBe(true);
      }),
    );
    const key = standardBase64(new Uint8Array(32).fill(7));
    expect(key).toHaveLength(44);
    // No padding, double padding, spare bits set, the url alphabet, 31 bytes.
    for (const near of [
      key.slice(0, 43),
      `${key}=`,
      `${key.slice(0, 42)}B=`,
      `${key.slice(0, 41)}-A=`,
      `${standardBase64(new Uint8Array(31)).slice(0, -1)}==`,
    ]) {
      expect(BASE64_32_BYTES.test(near), near).toBe(false);
    }
  });

  it('take a key id of one to eight lower-case letters, digits and dashes', () => {
    for (const kid of ['a', 'k1', '2026-10', 'abcd-123']) expect(KEY_ID.test(kid), kid).toBe(true);
    for (const kid of ['', 'abcd-1234', 'K1', 'k_1', 'k 1'])
      expect(KEY_ID.test(kid), kid).toBe(false);
  });
});
