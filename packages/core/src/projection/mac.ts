// The verification code (D11): HMAC-SHA256 over the 19-byte message, its first 8 bytes as
// an unsigned big-endian number in 20 digits. The HMAC comes from outside (the phone's
// Keystore or Keychain, the server's Node crypto), so the phone that draws the code and
// the server that checks it run these functions and the same test vectors; the server
// compares the codes in constant time. No BigInt: the bytes are divided by ten repeatedly.

import { writeUint64 } from '../shared/bytes.ts';
import {
  MESSAGE_BYTES,
  MESSAGE_PURPOSES,
  type MessagePurpose,
  VERIFICATION_CODE_BYTES,
  VERIFICATION_CODE_DIGITS,
} from './constants.ts';
import { type CodeFields, checkCodeFields, formatQrContent } from './qr-content.ts';

/** HMAC-SHA256 under one key: the message in, the 32-byte digest out. */
export type Hmac = (message: Uint8Array) => Uint8Array;

// Where the short code and the slice stand in the message, 8 bytes each.
const SHORT_CODE_OFFSET = 3;
const SLICE_OFFSET = 11;

/** The 19 message bytes; RangeError for an unknown purpose or fields outside the layout. */
export function codeMessage(purpose: MessagePurpose, fields: CodeFields): Uint8Array {
  if (!Object.hasOwn(MESSAGE_PURPOSES, purpose)) {
    throw new RangeError(`unknown purpose ${String(purpose)}`);
  }
  checkCodeFields(fields);
  const message = new Uint8Array(MESSAGE_BYTES);
  const view = new DataView(message.buffer);
  view.setUint8(0, MESSAGE_PURPOSES[purpose]);
  view.setUint8(1, fields.version);
  view.setUint8(2, fields.slot);
  writeUint64(view, SHORT_CODE_OFFSET, fields.shortCode);
  writeUint64(view, SLICE_OFFSET, fields.slice);
  return message;
}

/** The first 8 digest bytes in 20 digits; RangeError for a digest under 8 bytes. */
export function verificationCode(digest: Uint8Array): string {
  if (digest.length < VERIFICATION_CODE_BYTES) {
    throw new RangeError('the digest is shorter than the verification code');
  }
  const bytes = Array.from(digest.subarray(0, VERIFICATION_CODE_BYTES));
  let digits = '';
  for (let n = 0; n < VERIFICATION_CODE_DIGITS; n += 1) {
    let remainder = 0;
    for (const [index, byte] of bytes.entries()) {
      const value = remainder * 256 + byte;
      bytes[index] = Math.floor(value / 10);
      remainder = value % 10;
    }
    digits = `${remainder}${digits}`;
  }
  return digits;
}

/** The QR verification code of the fields under one key. */
export function qrVerificationCode(fields: CodeFields, hmac: Hmac): string {
  return verificationCode(hmac(codeMessage('QR', fields)));
}

/** The 41-digit content the projection or the lecturer's phone draws. */
export function qrContentFor(fields: CodeFields, hmac: Hmac): string {
  return formatQrContent({ ...fields, verificationCode: qrVerificationCode(fields, hmac) });
}
