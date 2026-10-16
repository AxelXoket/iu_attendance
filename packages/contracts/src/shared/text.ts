import { decodeBase64Url } from '@iu-attendance/core/shared/base64url';
import { hasControlCharacter } from '@iu-attendance/core/shared/text';
import { z } from 'zod';

const isPrintableAscii = (text: string) => {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit < 0x20 || unit > 0x7e) return false;
  }
  return true;
};

/**
 * A text a phone only notes (a time zone name, a runtime version): printable ASCII of at
 * most max characters, so its length is its size and no NUL reaches the database.
 */
export function printableAsciiSchema(max: number) {
  return z.string().max(max).refine(isPrintableAscii, { message: 'Printable ASCII only' });
}

/** A text a person typed or a file held: at most max code points, no control character. */
export function textWithoutControlSchema(max: number) {
  return z
    .string()
    .max(max)
    .refine((text) => !hasControlCharacter(text), { message: 'No control characters' });
}

// Bytes travel as unpadded base64url in its canonical form (core decodeBase64Url): the
// spare bits of the last letter are zero, so a byte string has exactly one text.
const base64UrlLength = (bytes: number) => Math.ceil((bytes * 4) / 3);
const NOT_CANONICAL = { message: 'Canonical unpadded base64url' };
const isCanonicalBase64Url = (text: string) => decodeBase64Url(text) !== null;

/** Exactly `bytes` bytes as canonical unpadded base64url (16 bytes are 22 letters). */
export function base64UrlBytesSchema(bytes: number) {
  return z.string().length(base64UrlLength(bytes)).refine(isCanonicalBase64Url, NOT_CANONICAL);
}

/** A SHA-256 digest as canonical unpadded base64url: 43 letters. */
export const sha256DigestSchema = base64UrlBytesSchema(32);

/** One to `maxBytes` bytes as canonical unpadded base64url. */
export function base64UrlMaxBytesSchema(maxBytes: number) {
  return z
    .string()
    .min(base64UrlLength(1))
    .max(base64UrlLength(maxBytes))
    .refine(isCanonicalBase64Url, NOT_CANONICAL);
}
