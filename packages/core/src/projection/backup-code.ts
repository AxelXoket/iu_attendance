// The backup code (D11-B11): the 6 digits a student types when the camera cannot read the
// QR code. It is the first 8 bytes of the HMAC over the message with purpose 0x02, as an
// unsigned big-endian number, modulo 1,000,000, zero-padded; 8 bytes make the modulo bias
// negligible. Like the verification code, the HMAC comes from outside, so the lecturer's
// phone that shows the code and the server that checks it run this one function. No
// BigInt: the remainder is carried byte by byte, each step below 2^53.

import { codeMessage, codeSourceBytes, type Hmac } from './mac.ts';
import type { CodeFields } from './qr-content.ts';

export const BACKUP_CODE_DIGITS = 6;
const MODULUS = 10 ** BACKUP_CODE_DIGITS;

/** The first 8 digest bytes modulo 1,000,000 in 6 digits; RangeError for a digest under 8 bytes. */
export function backupCode(digest: Uint8Array): string {
  let remainder = 0;
  for (const byte of codeSourceBytes(digest, 'backup code')) {
    remainder = (remainder * 256 + byte) % MODULUS;
  }
  return String(remainder).padStart(BACKUP_CODE_DIGITS, '0');
}

/** The backup code of the fields under one key. */
export function backupCodeFor(fields: CodeFields, hmac: Hmac): string {
  return backupCode(hmac(codeMessage('BACKUP_CODE', fields)));
}
