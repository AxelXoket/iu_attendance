import { decodeBase64Url, encodeBase64Url } from '../shared/base64url.ts';
import { equalBytes, readUint64, writeUint64 } from '../shared/bytes.ts';
import { KEY_ID } from '../shared/formats.ts';
import { hmacSha256 } from '../shared/hmac-sha256.ts';
import { isWholeFromZero } from '../shared/number.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import { uuidBytes } from '../shared/uuid.ts';

// The arrival receipt (D06 rule "Ulaşma makbuzu", invariant 17): the server's signed word
// that an item reached it at acceptedAtMs. The phone keeps it opaque and sends it back with
// the item after a server rewind; a valid receipt brings back the first arrival time and
// never moves it later. Bytes, then base64url:
//   format (1) | kid length (1) | kid ASCII (1 to 8) | acceptedAtMs (8, big-endian) | MAC (32)
//   MAC = HMAC-SHA256(secret, 'esitleme.ulasma.1' | installation (16) | sequence (8)
//         | item id (16) | SHA-256 of the body (32) | acceptedAtMs (8))
// The 8-byte fields hold safe integers as two 32-bit big-endian halves: no BigInt and no
// DataView Big* methods (Hermes rule).

export const RECEIPT_FORMAT = 1;
/** The MAC's domain label: a wire constant, kept byte for byte. */
export const RECEIPT_MAC_LABEL = 'esitleme.ulasma.1';
/** At most 50 bytes, so at most 67 letters: under the request's limit of 128. */
export const RECEIPT_MAX_BYTES = 50;

const MAC_LENGTH = 32;
const DIGEST_LENGTH = 32;

/** States of a secret key (D15 state machine "Gizli anahtar"). */
export type ReceiptKeyState =
  | 'GENERATED'
  | 'READY'
  | 'ACTIVE'
  | 'VERIFY_ONLY'
  | 'COMPROMISED'
  | 'DELETED';

export type ReceiptKey = {
  readonly kid: string;
  readonly secret: Uint8Array;
  readonly state: ReceiptKeyState;
};

/** What the receipt is about: one item of one installation, with the body as received. */
export type ReceiptSubject = {
  /** kurulum: UUID text. */
  readonly installation: string;
  /** sira: 1 to 2^53 - 1. */
  readonly sequence: number;
  /** ogeKimligi: UUID text. */
  readonly itemId: string;
  /** SHA-256 of the item body bytes (the ledger's body digest). */
  readonly bodyDigest: Uint8Array;
};

/** Keys a receipt still proves an arrival with; a compromised or removed key does not. */
const VERIFYING_STATES: ReadonlySet<ReceiptKeyState> = new Set(['READY', 'ACTIVE', 'VERIFY_ONLY']);

// The MAC input; null when the subject is not well-formed.
function macInput(subject: ReceiptSubject, acceptedAtMs: number): Uint8Array | null {
  const installation = uuidBytes(subject.installation);
  const itemId = uuidBytes(subject.itemId);
  if (
    installation === null ||
    itemId === null ||
    !Number.isSafeInteger(subject.sequence) ||
    subject.sequence < 1 ||
    !(subject.bodyDigest instanceof Uint8Array) ||
    subject.bodyDigest.length !== DIGEST_LENGTH
  ) {
    return null;
  }
  const label = utf8Bytes(RECEIPT_MAC_LABEL);
  const input = new Uint8Array(label.length + 16 + 8 + 16 + DIGEST_LENGTH + 8);
  const view = new DataView(input.buffer);
  let offset = 0;
  input.set(label, offset);
  offset += label.length;
  input.set(installation, offset);
  offset += 16;
  writeUint64(view, offset, subject.sequence);
  offset += 8;
  input.set(itemId, offset);
  offset += 16;
  input.set(subject.bodyDigest, offset);
  offset += DIGEST_LENGTH;
  writeUint64(view, offset, acceptedAtMs);
  return input;
}

/**
 * The receipt for an item accepted at acceptedAtMs, under the active key. Throws RangeError
 * for a kid outside ^[a-z0-9-]{1,8}$, an empty secret, a time that is not a whole number of
 * milliseconds from 0, or a subject that is not well-formed.
 */
export function issueArrivalReceipt(
  key: { readonly kid: string; readonly secret: Uint8Array },
  subject: ReceiptSubject,
  acceptedAtMs: number,
): string {
  if (typeof key.kid !== 'string' || !KEY_ID.test(key.kid) || key.secret.length === 0) {
    throw new RangeError('issueArrivalReceipt expects a kid of 1 to 8 letters and a secret');
  }
  if (!isWholeFromZero(acceptedAtMs)) {
    throw new RangeError('issueArrivalReceipt expects the time as whole milliseconds from 0');
  }
  const input = macInput(subject, acceptedAtMs);
  if (input === null) throw new RangeError('issueArrivalReceipt expects a well-formed subject');
  const kid = utf8Bytes(key.kid);
  const bytes = new Uint8Array(2 + kid.length + 8 + MAC_LENGTH);
  bytes[0] = RECEIPT_FORMAT;
  bytes[1] = kid.length;
  bytes.set(kid, 2);
  writeUint64(new DataView(bytes.buffer), 2 + kid.length, acceptedAtMs);
  bytes.set(hmacSha256(key.secret, input), 2 + kid.length + 8);
  return encodeBase64Url(bytes);
}

export type ReceiptContent = {
  readonly kid: string;
  readonly acceptedAtMs: number;
  readonly mac: Uint8Array;
};

/** The parts of a receipt text, or null for any text that is not one. Never throws. */
export function readArrivalReceipt(text: unknown): ReceiptContent | null {
  if (typeof text !== 'string') return null;
  const bytes = decodeBase64Url(text);
  if (bytes === null || bytes.length < 2 || bytes[0] !== RECEIPT_FORMAT) return null;
  const kidLength = bytes[1] as number;
  if (bytes.length !== 2 + kidLength + 8 + MAC_LENGTH) return null;
  let kid = '';
  for (const byte of bytes.subarray(2, 2 + kidLength)) kid += String.fromCharCode(byte);
  if (!KEY_ID.test(kid)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const acceptedAtMs = readUint64(view, 2 + kidLength);
  if (acceptedAtMs === null) return null;
  return { kid, acceptedAtMs, mac: bytes.slice(2 + kidLength + 8) };
}

/**
 * The arrival time a receipt proves for this subject, or null: a malformed text, an unknown
 * kid, a key that no longer verifies (compromised, removed or never ready), or a MAC that does
 * not match the installation, sequence, item id, body digest and time. Never throws.
 */
export function verifyArrivalReceipt(
  text: unknown,
  subject: ReceiptSubject,
  keyFor: (kid: string) => ReceiptKey | null,
): number | null {
  const receipt = readArrivalReceipt(text);
  if (receipt === null) return null;
  const key = keyFor(receipt.kid);
  if (key === null || key.kid !== receipt.kid || !VERIFYING_STATES.has(key.state)) return null;
  const input = macInput(subject, receipt.acceptedAtMs);
  if (input === null) return null;
  return equalBytes(hmacSha256(key.secret, input), receipt.mac) ? receipt.acceptedAtMs : null;
}
