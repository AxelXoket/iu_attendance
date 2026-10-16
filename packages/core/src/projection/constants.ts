// The QR code layout (D11, Kod duzeni), one place for the phone that draws it and the
// server that checks it. Content: version (1 digit) | slot (1) | session short code (10,
// zero-padded; its width is D02's, core/courses/sessions.ts) | slice (9) | verification
// code (20). Message under the HMAC (19 bytes):
// purpose (1) | version (1) | slot (1) | short code (8, big-endian) | slice (8, big-endian).

/** A QR code shows a 5-second slice; slice numbers count from the Unix epoch. */
export const DISPLAY_SLICE_MS = 5_000;
export const QR_CONTENT_LENGTH = 41;
/** A content is read only when it is 41 ASCII digits. */
export const QR_DIGITS = new RegExp(`^[0-9]{${QR_CONTENT_LENGTH}}$`);
export const QR_VERSION = 1;
/** The key slot digit: 0 is the projection (the server's key), 1 to 9 a lecturer phone's slots. */
export const PROJECTION_SLOT = 0;
export const SLOT_MAX = 9;
/** The slot digit stands after the version digit. */
export const SLOT_AT = 1;
/** Nine digits of 5-second slices reach the year 2128. */
export const SLICE_DIGITS = 9;
export const SLICE_MAX = 10 ** SLICE_DIGITS - 1;
/** The verification code: the HMAC's first 8 bytes, unsigned big-endian, in 20 digits. */
export const VERIFICATION_CODE_BYTES = 8;
export const VERIFICATION_CODE_DIGITS = 20;
export const MESSAGE_BYTES = 19;
/** The first message byte keeps the three codes of one key apart. */
export const MESSAGE_PURPOSES = { QR: 0x01, BACKUP_CODE: 0x02, BLUETOOTH: 0x03 } as const;
export type MessagePurpose = keyof typeof MESSAGE_PURPOSES;
/** What reading a QR content can fail with; the verification results start with these. */
export const QR_PARSE_ERRORS = ['MALFORMED', 'VERSION_UNKNOWN'] as const;
export type QrParseError = (typeof QR_PARSE_ERRORS)[number];
// The result dictionaries (D11 DOGRULAMA and GECIKME): the table CHECK lists, the result
// types, the verification mapping's keys and the documents' x-extensible-enum values all
// come from these two lists; the projection contract re-exports them.
/** How a QR or backup code verified. */
export const QR_VERIFICATION_RESULTS = [
  'VALID',
  ...QR_PARSE_ERRORS,
  'SESSION_MISMATCH',
  'KEY_NOT_FOUND',
  'KEY_RETIRED',
  'KEY_COMPROMISED',
  'NO_DOWNLOAD_RECORD',
  'MAC_INVALID',
  'BACKUP_CODE_MISMATCH',
  'BACKUP_CODE_LIMIT',
  'NONE',
] as const;
/** How late a scan came after the code was shown. */
export const QR_DELAY_RESULTS = [
  'NORMAL',
  'IN_REVIEW',
  'REJECTED',
  'SCANNED_BEFORE',
  'OUTSIDE_DISPLAY',
  'PENDING',
  'CLOCK_UNVERIFIED',
  'NO_LECTURER_CLOCK',
  'LECTURER_ANCHORS_DIVERGE',
  'KEY_REVOKED',
  'ANCHORS_STALE',
] as const;
export type QrVerification = (typeof QR_VERIFICATION_RESULTS)[number];
export type QrDelay = (typeof QR_DELAY_RESULTS)[number];
/** What the record carries: a scanned QR code, a typed backup code or neither. */
export const EVIDENCE_KINDS = ['QR', 'BACKUP_CODE', 'NONE'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
/** Where the scanned code was shown: the lectern projection (slot 0) or a lecturer's phone. */
export const DISPLAY_SOURCES = ['PROJECTION', 'LECTURER_PHONE'] as const;
export type DisplaySource = (typeof DISPLAY_SOURCES)[number];
/** The lecturer's clock of a display record: verified, anchors that disagree, or none. */
export const LECTURER_CLOCK_STATUSES = ['VERIFIED', 'ANCHORS_DISAGREE', 'NONE'] as const;
export type LecturerClockStatus = (typeof LECTURER_CLOCK_STATUSES)[number];
/** What the lectern page shows; an unknown value reads as waiting for the connection. */
export const LECTERN_STATUSES = [
  'AWAITING_PAIRING',
  'CODE_EXPIRED',
  'ATTENDANCE_NOT_OPEN',
  'CONNECTED',
  'ATTENDANCE_CLOSED',
  'SERVER_CLOCK_BROKEN',
  'CLOSED',
] as const;
export type LecternStatus = (typeof LECTERN_STATUSES)[number];
/** The lectern page holds the codes of the current slice and of up to six ahead. */
export const LECTERN_CODE_SLICES = 7;
/**
 * The delay rule's limits (D11 plan sentence), the projection settings' defaults under the
 * settings' own names: a scan is normal within 10 s of its slice (20 s with a backup code)
 * and rejected after 30 s, the projection's own clock trusted to 1 s.
 */
export const DELAY_LIMIT_DEFAULTS_MS = {
  normalLimitMs: 10_000,
  backupCodeNormalLimitMs: 20_000,
  rejectLimitMs: 30_000,
  projectionToleranceMs: 1_000,
} as const;
/** The record's Bluetooth scan status (stage 3); the projection contract's record schema reads it. */
export const BLUETOOTH_STATUSES = ['SCANNED', 'NO_BLUETOOTH'] as const;
export type BluetoothStatus = (typeof BLUETOOTH_STATUSES)[number];
