// The signed attendance record envelope (D05-B01, B02), one ASCII text that stays the same
// in the phone queue, in the request and in the receipt QR:
//   IUY1.<record text>.<signature kind>.<signature>
// The record text is the unpadded base64url of a UTF-8 JSON object, and the device signs
// its ASCII bytes. Signature kinds: a Android Keystore P-256 (DER, SHA-256), s Secure
// Enclave P-256 (DER, SHA-256), i App Attest assertion (CBOR). Both base64url parts must be
// canonical, so equal envelopes are equal bytes. The record's fields are the attendance
// contract's to check; this file only frames them. No Buffer, atob or TextDecoder (Hermes).

import type { DeviceKeyKind } from '../identity/device-key.ts';
import { decodeBase64Url, encodeBase64Url } from '../shared/base64url.ts';
import { decodeUtf8, utf8Bytes } from '../shared/utf8.ts';

// A level L QR code of version 25 holds 1273 bytes.
export const ENVELOPE_MAX_BYTES = 1273;
export const ENVELOPE_FORMAT_VERSION = 1;
export const RECORD_TEXT_VERSION = 1;
export const SCAN_BODY_VERSION = 1;
export const SIGNATURE_KINDS = { a: 'ANDROID_P256', s: 'SECURE_ENCLAVE', i: 'APP_ATTEST' } as const;

export type SignatureLetter = keyof typeof SIGNATURE_KINDS;
export type SignatureKind = (typeof SIGNATURE_KINDS)[SignatureLetter];

// The device key kind each signature kind is checked with: a stored key of another kind
// is ATTENDANCE_SIGNATURE_KIND_MISMATCH.
export const KEY_KIND_OF_SIGNATURE = {
  ANDROID_P256: 'android_p256',
  SECURE_ENCLAVE: 'secure_enclave',
  APP_ATTEST: 'app_attest',
} as const satisfies Record<SignatureKind, DeviceKeyKind>;

export type ParsedEnvelope = {
  /** The record text as signed: base64url of the JSON. */
  readonly recordText: string;
  /** The decoded JSON object, unchecked: unknown fields stay in for the schema to drop. */
  readonly record: Readonly<Record<string, unknown>>;
  readonly signatureKind: SignatureKind;
  readonly signature: Uint8Array;
};

// INVALID: the frame (prefix, separators, size, canonical base64url) does not hold.
// TEXT_INVALID: the record text is not a UTF-8 JSON object.
// VERSION_UNKNOWN: the envelope format or the record version is newer than this code.
export type EnvelopeError = 'INVALID' | 'TEXT_INVALID' | 'VERSION_UNKNOWN';

const FRAME = /^IUY1\.([A-Za-z0-9_-]+)\.([asi])\.([A-Za-z0-9_-]+)$/;
const FORMAT_VERSION = /^IUY([1-9][0-9]*)\./;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The record text of a record object: the base64url of its UTF-8 JSON. */
export function recordTextOf(record: Readonly<Record<string, unknown>>): string {
  return encodeBase64Url(utf8Bytes(JSON.stringify(record)));
}

/** The bytes the device signs: the record text's ASCII bytes. */
export function signedBytesOf(recordText: string): Uint8Array {
  return utf8Bytes(recordText);
}

/** The envelope of a signed record text. Throws RangeError for parts outside their form. */
export function buildEnvelope(
  recordText: string,
  signatureKind: SignatureKind,
  signature: Uint8Array,
): string {
  const letter = (Object.keys(SIGNATURE_KINDS) as SignatureLetter[]).find(
    (key) => SIGNATURE_KINDS[key] === signatureKind,
  );
  if (letter === undefined) throw new RangeError('buildEnvelope expects a known signature kind');
  if (recordText === '' || decodeBase64Url(recordText) === null) {
    throw new RangeError('buildEnvelope expects the record text as canonical base64url');
  }
  if (signature.length === 0) throw new RangeError('buildEnvelope expects a signature');
  const envelope = `IUY${ENVELOPE_FORMAT_VERSION}.${recordText}.${letter}.${encodeBase64Url(signature)}`;
  if (envelope.length > ENVELOPE_MAX_BYTES) {
    throw new RangeError(`buildEnvelope makes at most ${ENVELOPE_MAX_BYTES} bytes`);
  }
  return envelope;
}

/**
 * The body of a receipt scan item: the UTF-8 JSON { v, envelope, lecturerId }, the
 * envelope exactly as scanned. The lecturer's phone makes it once at the scan, keeps it and
 * resends the same bytes, so the sync module's arrival receipt matches every resend.
 */
export function scanBodyOf(envelope: string, lecturerId: string): string {
  return JSON.stringify({ v: SCAN_BODY_VERSION, envelope, lecturerId });
}

/** The parts of an envelope, or why it cannot be read. Never throws. */
export function parseEnvelope(envelope: string): ParsedEnvelope | { error: EnvelopeError } {
  const format = FORMAT_VERSION.exec(envelope);
  if (format !== null && Number(format[1]) > ENVELOPE_FORMAT_VERSION) {
    return { error: 'VERSION_UNKNOWN' };
  }
  // The frame admits ASCII only, so its length in code units is its length in bytes.
  const frame = envelope.length <= ENVELOPE_MAX_BYTES ? FRAME.exec(envelope) : null;
  if (frame === null) return { error: 'INVALID' };
  const [, recordText = '', letter = '', signatureText = ''] = frame;
  // The frame gives each part one letter at least, and a part that decodes then holds a
  // byte at least.
  const textBytes = decodeBase64Url(recordText);
  const signature = decodeBase64Url(signatureText);
  if (textBytes === null || signature === null) return { error: 'INVALID' };
  const json = decodeUtf8(textBytes);
  let record: unknown;
  try {
    record = json === null ? undefined : JSON.parse(json);
  } catch {
    return { error: 'TEXT_INVALID' };
  }
  if (!isPlainObject(record)) return { error: 'TEXT_INVALID' };
  // Only a whole number above this code's version is newer; any other v is the schema's
  // to refuse, so a broken v never waits for a server that will not come.
  if (Number.isSafeInteger(record.v) && (record.v as number) > RECORD_TEXT_VERSION) {
    return { error: 'VERSION_UNKNOWN' };
  }
  return {
    recordText,
    record,
    signatureKind: SIGNATURE_KINDS[letter as SignatureLetter],
    signature,
  };
}
