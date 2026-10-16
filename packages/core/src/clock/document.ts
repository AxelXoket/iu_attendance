// The clock document (D04-B12): a fixed binary layout, version 1, 82 bytes, sent as
// unpadded base64url (110 characters).
//   [0]       version, 1
//   [1..8]    kid, ASCII, padded with 0x00
//   [9]       subject kind: 1 student device, 2 staff person
//   [10..25]  subject UUID
//   [26..41]  the phone's one-time value
//   [42..49]  server time, UTC epoch milliseconds, big-endian 64-bit
//   [50..81]  HMAC-SHA256 of bytes 0..49
// The server signs documentSigningInput with its key; the phone reads its value and the
// server time back with decodeDocument. No Buffer or atob (Hermes).

import { decodeBase64Url, encodeBase64Url } from '../shared/base64url.ts';
import { readUint64, writeUint64 } from '../shared/bytes.ts';
import { KEY_ID } from '../shared/formats.ts';
import { uuidBytes, uuidText } from '../shared/uuid.ts';
import { DOCUMENT_BYTES, VALUE_BYTES } from './constants.ts';
import type { ClockSubject, DeviceId, DocumentFields, PersonId } from './types.ts';

const VERSION = 1;
const SIGNED_BYTES = 50;
const KID_BYTES = 8;
const SUBJECT_BYTE = { STUDENT_DEVICE: 1, STAFF: 2 } as const;
const KIND_BY_BYTE: Readonly<Record<number, ClockSubject['kind'] | undefined>> = {
  1: 'STUDENT_DEVICE',
  2: 'STAFF',
};

export type DecodedDocument = DocumentFields & { readonly mac: Uint8Array };

/** The 50 signed bytes of a document. Throws RangeError for a field outside its form. */
export function documentSigningInput(fields: DocumentFields): Uint8Array {
  const { kid, subject, value, serverTimeMs } = fields;
  // A kind from outside the types (a cast or JSON) would otherwise write byte 0.
  const kindByte: number | undefined = SUBJECT_BYTE[subject.kind];
  if (kindByte === undefined) {
    throw new RangeError('documentSigningInput expects a STUDENT_DEVICE or STAFF subject');
  }
  const subjectId = subject.kind === 'STAFF' ? subject.personId : subject.deviceId;
  const idBytes = uuidBytes(subjectId);
  const valueBytes = decodeBase64Url(value);
  if (!KEY_ID.test(kid))
    throw new RangeError('documentSigningInput expects a kid of [a-z0-9-]{1,8}');
  if (idBytes === null)
    throw new RangeError('documentSigningInput expects the subject id as a UUID');
  if (valueBytes === null || valueBytes.length !== VALUE_BYTES) {
    throw new RangeError('documentSigningInput expects a 16-byte base64url value');
  }
  if (!Number.isSafeInteger(serverTimeMs) || serverTimeMs < 0) {
    throw new RangeError('documentSigningInput expects the server time as safe whole milliseconds');
  }
  const bytes = new Uint8Array(SIGNED_BYTES);
  bytes[0] = VERSION;
  for (let index = 0; index < kid.length; index += 1) bytes[1 + index] = kid.charCodeAt(index);
  bytes[9] = kindByte;
  bytes.set(idBytes, 10);
  bytes.set(valueBytes, 26);
  writeUint64(new DataView(bytes.buffer), 42, serverTimeMs);
  return bytes;
}

function readKid(bytes: Uint8Array): string | null {
  let kid = '';
  for (let index = 1; index <= KID_BYTES; index += 1) {
    const byte = bytes[index] as number;
    if (byte === 0) {
      // Padding only: nothing after the first zero.
      for (let rest = index + 1; rest <= KID_BYTES; rest += 1) if (bytes[rest] !== 0) return null;
      break;
    }
    kid += String.fromCharCode(byte);
  }
  return KEY_ID.test(kid) ? kid : null;
}

/**
 * Reads a document. VERSION: the version byte is not 1. FORMAT: anything else wrong, such as
 * text that is not canonical base64url, a length other than 82 bytes, a kid outside
 * [a-z0-9-]{1,8} or not padded with zeros, an unknown subject kind, or a time beyond the
 * safe integers. The MAC is returned, not checked: checking needs the key.
 */
export function decodeDocument(text: string): DecodedDocument | { error: 'FORMAT' | 'VERSION' } {
  const bytes = decodeBase64Url(text);
  if (bytes === null || bytes.length === 0) return { error: 'FORMAT' };
  if (bytes[0] !== VERSION) return { error: 'VERSION' };
  if (bytes.length !== DOCUMENT_BYTES) return { error: 'FORMAT' };
  const kid = readKid(bytes);
  const serverTimeMs = readUint64(
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    42,
  );
  const kind = KIND_BY_BYTE[bytes[9] as number];
  if (kid === null || kind === undefined || serverTimeMs === null) return { error: 'FORMAT' };
  const id = uuidText(bytes.slice(10, 26));
  const subject: ClockSubject =
    kind === 'STAFF' ? { kind, personId: id as PersonId } : { kind, deviceId: id as DeviceId };
  return {
    kid,
    subject,
    value: encodeBase64Url(bytes.slice(26, 26 + VALUE_BYTES)),
    serverTimeMs,
    mac: bytes.slice(SIGNED_BYTES),
  };
}
