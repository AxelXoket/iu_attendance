import { decodeBase64Url, encodeBase64Url } from '../shared/base64url.ts';
import { decodeUtf8, utf8Bytes } from '../shared/utf8.ts';

// The second anchor text (D06 resolved gap 1): the only signed part of a submission. The
// phone writes the fields as UTF-8 JSON and sends the base64url text; the signature covers
// the ASCII bytes of that text, so the server checks the bytes it received and never a
// re-serialised copy. The server compares kind, v, installation and batch; the clock
// document inside is D04's and is not opened here.

export const SECOND_ANCHOR_KIND = 'second_anchor';
export const SECOND_ANCHOR_VERSION = 1;
/** The request schema's limit on the text (base64url letters). */
export const SECOND_ANCHOR_TEXT_MAX_LENGTH = 32768;
/** A batch has at most 200 items, so the text lists at most 200. */
export const SECOND_ANCHOR_MAX_ITEMS = 200;
/** The envelope's limit on an item id. */
const ITEM_ID_MAX_LENGTH = 64;

/**
 * The one absent reason the phone writes into the text: the app restarted after the event.
 * D04-P02 adds the shared list of absent reasons to packages/core/src/clock; this constant
 * is then imported from there, not written twice (D06 rule "İkinci çapa metni").
 */
export const AFTER_RESTART = 'AFTER_RESTART';

export type SecondAnchorItem =
  | { readonly id: string; readonly eventToDocumentMs: number }
  | { readonly id: string; readonly absentReason: typeof AFTER_RESTART };

export type SecondAnchorFields = {
  /** kurulum: the installation id (UUID text). */
  readonly installation: string;
  /** paket: the batch id (UUID text). */
  readonly batch: string;
  /** belge: the clock document exactly as the server returned it. */
  readonly document: string;
  /** istekSuresiMs: how long the document request took. */
  readonly requestDurationMs: number;
  /** ogeler: per item, the time from the event to the document, or why there is none. */
  readonly items: readonly SecondAnchorItem[];
};

/** imzaTuru: 'a' Android device key, 's' iPhone Secure Enclave second key, 'o' unsigned (staff). */
export type SignatureType = 'a' | 's' | 'o';
/** The device key types D01 stores. */
export type DeviceKeyType = 'android_p256' | 'app_attest' | 'secure_enclave';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A duration is any whole number of milliseconds: D04 judges the value per anchor (a
// negative one or one over 7 days is SURE_GECERSIZ), so one bad item time must not make the
// whole text unreadable and every item unsigned.
const isDuration = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value);
const isItemId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= ITEM_ID_MAX_LENGTH;

// The exact own keys of a plain JSON object, in any order.
function hasKeys(value: object, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isItem(value: unknown): value is SecondAnchorItem {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const item = value as { readonly [key: string]: unknown };
  if (!isItemId(item.id)) return false;
  if (hasKeys(item, ['id', 'eventToDocumentMs'])) return isDuration(item.eventToDocumentMs);
  return hasKeys(item, ['id', 'absentReason']) && item.absentReason === AFTER_RESTART;
}

function isFields(value: SecondAnchorFields): boolean {
  return (
    typeof value.installation === 'string' &&
    UUID.test(value.installation) &&
    typeof value.batch === 'string' &&
    UUID.test(value.batch) &&
    typeof value.document === 'string' &&
    value.document.length > 0 &&
    isDuration(value.requestDurationMs) &&
    Array.isArray(value.items) &&
    value.items.length <= SECOND_ANCHOR_MAX_ITEMS &&
    value.items.every(isItem) &&
    // Item ids are unique within the text.
    new Set(value.items.map((item) => item.id)).size === value.items.length
  );
}

/**
 * The text the phone signs and sends. Throws RangeError for fields that parseSecondAnchorText
 * would not accept, or a text longer than SECOND_ANCHOR_TEXT_MAX_LENGTH.
 */
export function buildSecondAnchorText(fields: SecondAnchorFields): string {
  if (!isFields(fields)) throw new RangeError('buildSecondAnchorText expects valid fields');
  // Fixed key order; JSON.stringify writes a lone surrogate as an escape, so the JSON is
  // always well-formed UTF-8.
  const json = JSON.stringify({
    kind: SECOND_ANCHOR_KIND,
    v: SECOND_ANCHOR_VERSION,
    installation: fields.installation,
    batch: fields.batch,
    document: fields.document,
    requestDurationMs: fields.requestDurationMs,
    items: fields.items.map((item) =>
      'absentReason' in item
        ? { id: item.id, absentReason: item.absentReason }
        : { id: item.id, eventToDocumentMs: item.eventToDocumentMs },
    ),
  });
  const text = encodeBase64Url(utf8Bytes(json));
  if (text.length > SECOND_ANCHOR_TEXT_MAX_LENGTH) {
    throw new RangeError('buildSecondAnchorText makes a text longer than the request allows');
  }
  return text;
}

/** The fields of a second anchor text, or null for any text that is not one. Never throws. */
export function parseSecondAnchorText(text: unknown): SecondAnchorFields | null {
  if (typeof text !== 'string' || text.length > SECOND_ANCHOR_TEXT_MAX_LENGTH) return null;
  const bytes = decodeBase64Url(text);
  const json = bytes === null ? null : decodeUtf8(bytes);
  if (json === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const keys = ['kind', 'v', 'installation', 'batch', 'document', 'requestDurationMs', 'items'];
  if (!hasKeys(value, keys)) return null;
  const record = value as { readonly [key: string]: unknown };
  if (record.kind !== SECOND_ANCHOR_KIND || record.v !== SECOND_ANCHOR_VERSION) return null;
  const fields = {
    installation: record.installation,
    batch: record.batch,
    document: record.document,
    requestDurationMs: record.requestDurationMs,
    items: record.items,
  } as SecondAnchorFields;
  return isFields(fields) ? fields : null;
}

/** The bytes the signature covers: the text's own ASCII bytes, as received. */
export function signedBytes(text: string): Uint8Array {
  return utf8Bytes(text);
}

/**
 * True for the only two pairs a signature is checked with: 'a' with an android_p256 key and
 * 's' with a secure_enclave key. An app_attest key never checks a batch (App Attest makes an
 * attestation, not a plain ECDSA signature), and 'o' is unsigned, so no key checks it.
 */
export function signatureKeyMatches(signatureType: SignatureType, keyType: DeviceKeyType): boolean {
  return (
    (signatureType === 'a' && keyType === 'android_p256') ||
    (signatureType === 's' && keyType === 'secure_enclave')
  );
}
