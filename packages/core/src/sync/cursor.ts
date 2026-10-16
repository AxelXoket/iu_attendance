import { decodeBase64Url, encodeBase64Url } from '../shared/base64url.ts';
import { isWholeIn, UINT64_MAX_TEXT } from '../shared/number.ts';
import { sha256 } from '../shared/sha256.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import { compareDecimal, isCanonicalDecimal, isVersion } from './page.ts';

// The download cursor (D06 rule "İmleç biçimi", resolved gap 13): opaque base64url of
// '1|systemId|timeline|generalVersion|scopeVersion|studentVersion|structureVersion|accountDigest',
// at most CURSOR_MAX_LENGTH letters. 64-bit values travel as decimal text, so no client
// parser can round them. A cursor that does not decode is not an error: the server
// answers it with a full download.

export const CURSOR_FORMAT = '1';
export const CURSOR_MAX_LENGTH = 256;

/** The account's confirmation state in the digest: '1' confirmed, '0' not, '-' staff. */
export type AccountConfirmation = '1' | '0' | '-';

export type Cursor = {
  /** sistemKimligi: the cluster's 64-bit system identifier as decimal text. */
  readonly systemId: string;
  /** zamanCizelgesi: the PostgreSQL timeline, 1 to 2^32 - 1. */
  readonly timeline: number;
  /** genelSurum: the general counter value the phone holds every row up to. */
  readonly generalVersion: string;
  /** kapsamSurumu: the counter value the scope was last computed at; never below generalVersion. */
  readonly scopeVersion: string;
  /** ogrenciSurumu: the student's status version; '0' for staff. */
  readonly studentVersion: string;
  /** yapiSurumu: the phone's local schema version (PRAGMA user_version), 0 to 2^31 - 1. */
  readonly structureVersion: number;
  /** hesapOzeti: accountDigest(personId, confirmation). */
  readonly accountDigest: string;
};

/** UNKNOWN_FORMAT: a readable cursor of another format version; UNREADABLE: anything else. */
export type CursorReading =
  | { readonly ok: true; readonly cursor: Cursor }
  | { readonly ok: false; readonly reason: 'UNREADABLE' | 'UNKNOWN_FORMAT' };

const FIELD_COUNT = 8;
const PERSON_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ACCOUNT_DIGEST = /^[0-9a-f]{16}$/;
const SIGNED_DECIMAL = /^(?:0|-?[1-9][0-9]*)$/;
// PostgreSQL prints the system identifier as a signed bigint, so a cluster made after
// January 2038 prints a negative one; the unsigned print is accepted too. The value is
// compared for equality only.
const SYSTEM_ID_MIN_MAGNITUDE = '9223372036854775808';
const TIMELINE_MAX = 4294967295;
const STRUCTURE_VERSION_MAX = 2147483647;

function isSystemId(text: string): boolean {
  if (!SIGNED_DECIMAL.test(text)) return false;
  return text.startsWith('-')
    ? compareDecimal(text.slice(1), SYSTEM_ID_MIN_MAGNITUDE) <= 0
    : compareDecimal(text, UINT64_MAX_TEXT) <= 0;
}

function isCursor(cursor: Cursor): boolean {
  return (
    typeof cursor.systemId === 'string' &&
    isSystemId(cursor.systemId) &&
    isWholeIn(cursor.timeline, 1, TIMELINE_MAX) &&
    isVersion(cursor.generalVersion) &&
    isVersion(cursor.scopeVersion) &&
    compareDecimal(cursor.generalVersion, cursor.scopeVersion) <= 0 &&
    isVersion(cursor.studentVersion) &&
    isWholeIn(cursor.structureVersion, 0, STRUCTURE_VERSION_MAX) &&
    typeof cursor.accountDigest === 'string' &&
    ACCOUNT_DIGEST.test(cursor.accountDigest)
  );
}

/**
 * The first 16 hex digits of SHA-256(personId + '|' + confirmation). The person id is the
 * lowercase UUID text PostgreSQL prints; any other spelling would give another digest, so
 * it throws RangeError, as does a confirmation other than '1', '0' or '-'.
 */
export function accountDigest(personId: string, confirmation: AccountConfirmation): string {
  if (typeof personId !== 'string' || !PERSON_ID.test(personId)) {
    throw new RangeError('accountDigest expects the person id as lowercase UUID text');
  }
  if (confirmation !== '1' && confirmation !== '0' && confirmation !== '-') {
    throw new RangeError("accountDigest expects the confirmation as '1', '0' or '-'");
  }
  const digest = sha256(utf8Bytes(`${personId}|${confirmation}`));
  let hex = '';
  for (let index = 0; index < 8; index += 1) {
    hex += (digest[index] as number).toString(16).padStart(2, '0');
  }
  return hex;
}

/** The cursor text. Throws RangeError for a cursor that decodeCursor would not accept. */
export function encodeCursor(cursor: Cursor): string {
  if (!isCursor(cursor)) throw new RangeError('encodeCursor expects a valid cursor');
  const payload = [
    CURSOR_FORMAT,
    cursor.systemId,
    String(cursor.timeline),
    cursor.generalVersion,
    cursor.scopeVersion,
    cursor.studentVersion,
    String(cursor.structureVersion),
    cursor.accountDigest,
  ].join('|');
  return encodeBase64Url(utf8Bytes(payload));
}

const unreadable: CursorReading = { ok: false, reason: 'UNREADABLE' };

// A whole-number field: canonical decimal text only ('+1', '1e0' and '01' are not), so the
// cursor text stays one-to-one; isCursor then checks the range, which also turns away a
// value too large to be a safe integer.
const wholeField = (text: string) => (isCanonicalDecimal(text) ? Number(text) : Number.NaN);

/** Reads a cursor text the phone sent back. Never throws: any other value is not a cursor. */
export function decodeCursor(text: unknown): CursorReading {
  if (typeof text !== 'string' || text.length > CURSOR_MAX_LENGTH) return unreadable;
  const bytes = decodeBase64Url(text);
  if (bytes === null) return unreadable;
  // One letter per byte. Every field is then checked against a strict ASCII pattern, so a
  // control or non-ASCII byte anywhere makes the cursor unreadable.
  let payload = '';
  for (const byte of bytes) payload += String.fromCharCode(byte);
  const fields = payload.split('|');
  // split always returns at least one field, the empty text included.
  const format = fields[0] as string;
  if (format !== CURSOR_FORMAT) {
    return isCanonicalDecimal(format) && format !== '0'
      ? { ok: false, reason: 'UNKNOWN_FORMAT' }
      : unreadable;
  }
  if (fields.length !== FIELD_COUNT) return unreadable;
  const [
    ,
    systemId,
    timelineText,
    generalVersion,
    scopeVersion,
    studentVersion,
    structureText,
    digest,
  ] = fields as [string, string, string, string, string, string, string, string];
  const cursor: Cursor = {
    systemId,
    timeline: wholeField(timelineText),
    generalVersion,
    scopeVersion,
    studentVersion,
    structureVersion: wholeField(structureText),
    accountDigest: digest,
  };
  return isCursor(cursor) ? { ok: true, cursor } : unreadable;
}
