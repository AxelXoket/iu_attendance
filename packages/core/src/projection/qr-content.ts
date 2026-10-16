// Writing and reading the 41-digit QR content (D11, Kod duzeni). Reading never throws: a
// content that is not 41 ASCII digits is MALFORMED and one of another version is
// VERSION_UNKNOWN (its layout may differ, so nothing else is read). Any other content is
// read as it stands, as the D11 verification table orders: a short code no session has (0
// among them) is the session check's, a code no key gives (one above 2^64 - 1 among them)
// the MAC check's. Writing throws for fields outside the layout.

import { SHORT_CODE_DIGITS, SHORT_CODE_MAX } from '../courses/sessions.ts';
import { isWholeIn, UINT64_MAX_TEXT } from '../shared/number.ts';
import {
  QR_DIGITS,
  QR_VERSION,
  type QrParseError,
  SLICE_DIGITS,
  SLICE_MAX,
  SLOT_AT,
  SLOT_MAX,
  VERIFICATION_CODE_DIGITS,
} from './constants.ts';

/** The fields a code is computed over. */
export type CodeFields = {
  readonly version: number;
  readonly slot: number;
  readonly shortCode: number;
  readonly slice: number;
};
/** The 20-digit verification code with the fields it covers; a parsed content may carry any 20 digits and a short code of 0. */
export type QrFields = CodeFields & { readonly verificationCode: string };
export type QrParse =
  | { readonly ok: true; readonly fields: QrFields }
  | { readonly ok: false; readonly error: QrParseError };

// 20 digits up to 2^64 - 1: no 8 HMAC bytes exceed it.
const isCode = (text: string) =>
  text.length === VERIFICATION_CODE_DIGITS && /^[0-9]+$/.test(text) && text <= UINT64_MAX_TEXT;
const SHORT_CODE_AT = SLOT_AT + 1;
const SLICE_AT = SHORT_CODE_AT + SHORT_CODE_DIGITS;
const CODE_AT = SLICE_AT + SLICE_DIGITS;

/** RangeError for fields outside the layout: another version, a slot over 9, a short code or slice out of range. */
export function checkCodeFields(fields: CodeFields): void {
  if (
    fields.version !== QR_VERSION ||
    !isWholeIn(fields.slot, 0, SLOT_MAX) ||
    !isWholeIn(fields.shortCode, 1, SHORT_CODE_MAX) ||
    !isWholeIn(fields.slice, 0, SLICE_MAX)
  ) {
    throw new RangeError('the QR fields are outside the layout');
  }
}

/** The 41 digits; RangeError for fields outside the layout or a code that is not 20 digits of a 64-bit value. */
export function formatQrContent(fields: QrFields): string {
  checkCodeFields(fields);
  if (!isCode(fields.verificationCode)) {
    throw new RangeError('the verification code is not 20 digits of a 64-bit value');
  }
  return [
    fields.version,
    fields.slot,
    String(fields.shortCode).padStart(SHORT_CODE_DIGITS, '0'),
    String(fields.slice).padStart(SLICE_DIGITS, '0'),
    fields.verificationCode,
  ].join('');
}

export function parseQrContent(text: string): QrParse {
  if (!QR_DIGITS.test(text)) return { ok: false, error: 'MALFORMED' };
  const version = Number(text[0]);
  if (version !== QR_VERSION) return { ok: false, error: 'VERSION_UNKNOWN' };
  return {
    ok: true,
    fields: {
      version,
      slot: Number(text[SLOT_AT]),
      shortCode: Number(text.slice(SHORT_CODE_AT, SLICE_AT)),
      slice: Number(text.slice(SLICE_AT, CODE_AT)),
      verificationCode: text.slice(CODE_AT),
    },
  };
}
