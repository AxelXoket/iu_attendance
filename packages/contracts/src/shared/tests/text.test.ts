import { encodeBase64Url } from '@iu-attendance/core/shared/base64url';
import { sha256 } from '@iu-attendance/core/shared/sha256';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ok } from '../../tests/helpers.ts';
import {
  base64UrlBytesSchema,
  base64UrlMaxBytesSchema,
  sha256DigestSchema,
  textWithoutControlSchema,
} from '../text.ts';

const bytesText = (length: number) => encodeBase64Url(new Uint8Array(length).fill(255));

describe('the shared text schemas', () => {
  it('take a text without control characters up to its bound', () => {
    expect(ok(textWithoutControlSchema(5), 'Ğüşiö')).toBe(true);
    expect(ok(textWithoutControlSchema(5), 'Ğüşiöç')).toBe(false);
    expect(ok(textWithoutControlSchema(5), `${String.fromCodePoint(0)}a`)).toBe(false);
    // Its minimum chains after it.
    expect(ok(textWithoutControlSchema(5).min(1), '')).toBe(false);
  });

  it('take exactly n bytes as canonical base64url', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), fc.uint8Array({ maxLength: 66 }), (n, bytes) => {
        const text = encodeBase64Url(bytes);
        expect(ok(base64UrlBytesSchema(n), text)).toBe(bytes.length === n);
      }),
    );
    // Every length, at the bound and one byte to either side.
    for (let n = 1; n <= 12; n += 1) {
      expect(ok(base64UrlBytesSchema(n), bytesText(n)), `${n}`).toBe(true);
      expect(ok(base64UrlBytesSchema(n), bytesText(n - 1)), `${n}`).toBe(false);
      expect(ok(base64UrlBytesSchema(n), bytesText(n + 1)), `${n}`).toBe(false);
    }
    const sixteen = bytesText(16);
    expect(sixteen).toHaveLength(22);
    // Spare bits set in the last letter, padding, the standard alphabet.
    for (const near of [`${sixteen.slice(0, 21)}B`, `${sixteen}==`, sixteen.replaceAll('_', '/')]) {
      expect(ok(base64UrlBytesSchema(16), near), near).toBe(false);
    }
  });

  it('take every SHA-256 digest as 43 canonical base64url letters, and no text near one', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 64 }), (message) => {
        expect(ok(sha256DigestSchema, encodeBase64Url(sha256(message)))).toBe(true);
      }),
    );
    const digest = encodeBase64Url(sha256(new Uint8Array([1, 2, 3])));
    expect(digest).toHaveLength(43);
    // One letter short or over, padded, a last letter with spare bits set, the standard
    // alphabet.
    for (const near of [
      digest.slice(1),
      `${digest}A`,
      `${digest}=`,
      `${digest.slice(0, 42)}B`,
      `${digest.slice(0, 41)}+A`,
    ]) {
      expect(ok(sha256DigestSchema, near), near).toBe(false);
    }
  });

  it('take one to n bytes as canonical base64url, and refuse more or none', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), fc.uint8Array({ maxLength: 66 }), (n, bytes) => {
        const text = encodeBase64Url(bytes);
        expect(ok(base64UrlMaxBytesSchema(n), text)).toBe(bytes.length >= 1 && bytes.length <= n);
      }),
    );
    // Every bound, at the bound and one byte over.
    for (let n = 1; n <= 12; n += 1) {
      expect(ok(base64UrlMaxBytesSchema(n), bytesText(n)), `${n}`).toBe(true);
      expect(ok(base64UrlMaxBytesSchema(n), bytesText(n + 1)), `${n}`).toBe(false);
    }
    expect(ok(base64UrlMaxBytesSchema(8), 'AAA')).toBe(true);
    expect(ok(base64UrlMaxBytesSchema(8), 'AAB')).toBe(false);
    expect(ok(base64UrlMaxBytesSchema(8), 'A')).toBe(false);
    expect(ok(base64UrlMaxBytesSchema(8), '')).toBe(false);
  });
});
