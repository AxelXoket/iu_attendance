// Attendance contract (D05): the signed record text and the two queue item bodies (the
// record envelope from the student's phone, the receipt scan from the lecturer's), the
// item result details, the record the student's phone downloads, the session records
// route, the ATTENDANCE_ error catalog with its retry and reject lists, the audit events
// and the pair lock key. The envelope framing and the scan body live in core
// (attendance/envelope.ts) and are shared with the phone. The record text and the item
// bodies drop unknown fields (D13-B24): a phone newer than the server loses nothing it
// signed, the stored envelope keeps every byte. The audit schemas are strict.

import {
  ENVELOPE_MAX_BYTES,
  RECORD_TEXT_VERSION,
  SCAN_BODY_VERSION,
  SIGNATURE_KINDS,
  type SignatureKind,
} from '@iu-attendance/core/attendance/envelope';
import { RECORD_DECISIONS } from '@iu-attendance/core/corrections/final-status';
import { SHA256_BASE64URL } from '@iu-attendance/core/shared/formats';
import { z } from 'zod';
import { absenceFinalStatusSchema } from './absence.ts';
import { CLOCK_SOURCES, CLOCK_STATUSES, FIRST_ANCHOR_PHONE_REPORTS } from './clock.ts';
import { sectionIdSchema, sessionIdSchema, termIdSchema } from './courses.ts';
import { recordEvidenceFieldsSchema } from './projection.ts';
import {
  countSchema,
  defineErrorCodes,
  defineItemType,
  defineRoute,
  EXTENSIBLE_ENUM_MAX_LENGTH,
  extensibleEnum,
  type Id,
  type ItemResult,
  idSchema,
  instantSchema,
  personIdSchema,
  printableAsciiSchema,
  rosterRowIdSchema,
  runtimeVersionSchema,
  sameText,
  UUID_LENGTH,
  v7IdSchema,
  versionSchema,
} from './shared/index.ts';

// Value lists.

export type { SignatureKind };
export const SIGNATURE_KIND_LIST = Object.values(SIGNATURE_KINDS) as [
  SignatureKind,
  ...SignatureKind[],
];
// How a record reached the server: the student's phone, or the lecturer scanning its receipt.
export const ARRIVAL_PATHS = ['PHONE', 'SCAN'] as const;
// Who set a record's decision: the verification module's calculation or a lecturer.
export const DECISION_SOURCES = ['AUTOMATIC', 'LECTURER'] as const;
// A scan row's result. RETRY writes no row: the item comes again.
export const SCAN_RESULTS = [
  'ACCEPTED',
  'ALREADY_EXISTS',
  'REJECTED',
] as const satisfies readonly ItemResult[];
// The labels of a record, as flags in storage and as a list in answers.
export const RECORD_LABELS = [
  'NO_QR',
  'SELF_DECLARED',
  'CLOCK_UNVERIFIED',
  'DEVICE_UNVERIFIED',
  'SECOND_PROFILE',
  'BACKUP_CODE',
  'VERIFIED',
] as const;
// A session's records show once its head count or held answer is in.
export const RECORD_VISIBILITIES = ['VISIBLE', 'HEAD_COUNT_PENDING'] as const;
const ROW_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type ArrivalPath = (typeof ARRIVAL_PATHS)[number];
export type RecordLabel = (typeof RECORD_LABELS)[number];
export type Labels = Readonly<Record<RecordLabel, boolean>>;

// Identifiers. A record's id is the UUIDv7 its phone made; the term partitions the table.

export type RecordId = Id<'Record'>;
export const recordIdSchema = v7IdSchema('Record');
export const recordKeySchema = z.object({ termId: termIdSchema, recordId: recordIdSchema });
export type RecordKey = z.infer<typeof recordKeySchema>;

/** The advisory lock key of a (session, student) pair, layer 3; the one place it is written. */
export function attendancePairKey(sessionId: string, studentId: string): string {
  return `attendance:pair:${sessionId}:${studentId}`;
}

export const TIME_ZONE_MAX_LENGTH = 64;

// The signed record text, version 1 (D05-B01). The term is not written; the session
// gives it. The clock fields mean what the clock module says and it judges them: a broken
// document or a negative duration is stored with its clock status, never refused here.
// The evidence fields of stages 2 and 3 come from the projection contract as optional
// fields.
export const recordTextSchema = z.object({
  kind: z.literal('record'),
  v: z.literal(RECORD_TEXT_VERSION),
  id: recordIdSchema,
  device: idSchema('Device'),
  // The signing key's id, the device key row of the identity module.
  key: idSchema('DeviceKey'),
  sequence: z.number().int().min(1),
  session: sessionIdSchema,
  // The student's internal id: no student number and no name.
  student: personIdSchema,
  // The clock document as received, null when the phone has none.
  document: z.string().max(ENVELOPE_MAX_BYTES).nullable(),
  documentRequestMs: z.number().int().nullable(),
  documentToRecordMs: z.number().int().nullable(),
  // What the phone itself reports about its first anchor; null when it has nothing to say.
  firstAnchor: z.enum(FIRST_ANCHOR_PHONE_REPORTS).nullable(),
  // The instant the phone's clock showed: a note, the estimate only without a better one.
  phoneTime: instantSchema,
  timeZone: printableAsciiSchema(TIME_ZONE_MAX_LENGTH),
  appVersion: versionSchema,
  runtimeVersion: runtimeVersionSchema.nullable(),
  updateId: z.uuid().max(UUID_LENGTH).nullable(),
  ...recordEvidenceFieldsSchema.shape,
});
export type RecordText = z.infer<typeof recordTextSchema>;

// Queue items. Both carry an envelope: the core codec reads it, the schema bounds it. A
// newer format passes the prefix and reaches the codec, which answers VERSION_UNKNOWN.
const envelopeTextSchema = z
  .string()
  .max(ENVELOPE_MAX_BYTES)
  .regex(/^IUY[0-9]+\./);
export const ATTENDANCE_RECORD_ITEM = defineItemType('attendance_record', envelopeTextSchema, {
  module: 'attendance',
});
// The lecturer's scan of a receipt QR: the envelope exactly as scanned and the lecturer
// who made the item. The core's scanBodyOf writes this JSON once; the phone resends it.
export const RECEIPT_SCAN_ITEM = defineItemType(
  'receipt_scan',
  z.object({
    v: z.literal(SCAN_BODY_VERSION),
    envelope: envelopeTextSchema,
    lecturerId: personIdSchema,
  }),
  { module: 'attendance' },
);

// Item result details and the student's own records, values extensible. The decision
// reason is the verification module's code, a growing value of at most 64 characters.
const decisionReasonSchema = z.string().max(EXTENSIBLE_ENUM_MAX_LENGTH).nullable();
const decisionFields = {
  decision: extensibleEnum(RECORD_DECISIONS),
  decisionReason: decisionReasonSchema,
  decisionVersion: z.number().int().min(1),
  labels: z.array(extensibleEnum(RECORD_LABELS)),
};
export const recordItemDetailsSchema = z.object({
  ...decisionFields,
  decidedAt: instantSchema,
  counted: z.boolean(),
});
export type RecordItemDetails = z.infer<typeof recordItemDetailsSchema>;
export const scanItemDetailsSchema = z.object({
  record: z.object({
    termId: termIdSchema,
    recordId: recordIdSchema,
    studentId: personIdSchema,
    ...decisionFields,
  }),
});
export type ScanItemDetails = z.infer<typeof scanItemDetailsSchema>;

// A record as the student's phone downloads it: no envelope, device or key.
export const studentRecordSchema = z.object({
  termId: termIdSchema,
  recordId: recordIdSchema,
  sessionId: sessionIdSchema,
  computedAt: instantSchema,
  clockStatus: extensibleEnum(CLOCK_STATUSES),
  arrivedAt: instantSchema,
  ...decisionFields,
  decidedAt: instantSchema,
  arrivalPath: extensibleEnum(ARRIVAL_PATHS),
  counted: z.boolean(),
});
export type StudentRecord = z.infer<typeof studentRecordSchema>;

// Error catalog. Only the session records route answers an HTTP error; every queue item
// result is an item code (http null).

export const ATTENDANCE_ERROR_CODES = defineErrorCodes('attendance', {
  ATTENDANCE_NOT_FOUND: {
    http: 404,
    ...sameText('Aranan kayıt bulunamadı.', 'The requested item was not found.'),
  },
  ATTENDANCE_ENVELOPE_INVALID: {
    http: null,
    ...sameText('Yoklama kaydı okunamadı.', 'The attendance record could not be read.'),
  },
  ATTENDANCE_TEXT_INVALID: {
    http: null,
    ...sameText(
      'Yoklama kaydının içeriği okunamadı.',
      'The content of the attendance record could not be read.',
    ),
  },
  ATTENDANCE_ITEM_ID_MISMATCH: {
    http: null,
    ...sameText(
      'Kaydın kimliği gönderimle uyuşmuyor.',
      'The id of the record does not match the sending.',
    ),
  },
  ATTENDANCE_KEY_UNKNOWN: {
    http: null,
    ...sameText(
      'Kaydı imzalayan anahtar tanınmıyor.',
      'The key that signed the record is unknown.',
    ),
  },
  ATTENDANCE_SIGNATURE_KIND_MISMATCH: {
    http: null,
    ...sameText(
      'Kaydın imza türü anahtarla uyuşmuyor.',
      'The signature kind of the record does not match the key.',
    ),
  },
  ATTENDANCE_KEY_DEVICE_MISMATCH: {
    http: null,
    ...sameText(
      'Kaydı imzalayan anahtar bu cihaza ait değil.',
      'The key that signed the record does not belong to this device.',
    ),
  },
  ATTENDANCE_SIGNATURE_INVALID: {
    http: null,
    ...sameText(
      'Kaydın imzası doğrulanamadı.',
      'The signature of the record could not be verified.',
    ),
  },
  ATTENDANCE_STUDENT_DEVICE_MISMATCH: {
    http: null,
    ...sameText(
      'Kayıt, bu cihaza bağlı olmayan bir öğrenci adına imzalanmış.',
      'The record was signed for a student this device does not belong to.',
    ),
  },
  ATTENDANCE_SENDER_MISMATCH: {
    http: null,
    ...sameText(
      'Kayıt başka bir öğrencinin hesabından gönderilmiş.',
      "The record was sent from another student's account.",
    ),
  },
  ATTENDANCE_SESSION_UNKNOWN: {
    http: null,
    ...sameText('Kaydın ders saati bulunamadı.', 'The class session of the record was not found.'),
  },
  ATTENDANCE_ID_CONFLICT: {
    http: null,
    ...sameText(
      'Bu kimlikle başka bir kayıt zaten var.',
      'Another record with this id already exists.',
    ),
  },
  ATTENDANCE_SEQUENCE_CONFLICT: {
    http: null,
    ...sameText(
      'Cihazın bu sırada başka bir kaydı var.',
      'The device already has another record in this place of its queue.',
    ),
  },
  ATTENDANCE_SESSION_RECORD_LIMIT: {
    http: null,
    ...sameText(
      'Bu cihazdan bu ders saati için çok sayıda kayıt geldi.',
      'Too many records came from this device for this class session.',
    ),
  },
  ATTENDANCE_NOT_LECTURERS_COURSE: {
    http: null,
    ...sameText(
      'Okutulan kayıt sizin dersinizin değil.',
      'The scanned record is not of your course.',
    ),
  },
  ATTENDANCE_ACCOUNT_MISMATCH: {
    http: null,
    ...sameText('Okutma başka bir hesapla yapılmış.', 'The scan was made with another account.'),
  },
  ATTENDANCE_FORMAT_VERSION_UNKNOWN: {
    http: null,
    ...sameText(
      'Kayıt sunucudan yeni bir sürümle yapılmış; sunucu güncellenince gönderilecek.',
      'The record was made with a newer version than the server; it is sent once the server is updated.',
    ),
  },
  ATTENDANCE_SECOND_ANCHOR_REQUIRED: {
    http: null,
    ...sameText(
      'Kaydın saati için telefonun sunucuyla bir kez daha eşitlenmesi gerekiyor.',
      'The phone has to sync with the server once more to fix the time of the record.',
    ),
  },
});

export type AttendanceErrorCode = keyof typeof ATTENDANCE_ERROR_CODES;
const errors = (...codes: AttendanceErrorCode[]) => codes;

// The item codes each queue item may return, besides the sync module's own and the
// verification module's VERIFICATION_CONTEXT_CHANGING.
export const ATTENDANCE_ITEM_CODES = {
  attendance_record: errors(
    'ATTENDANCE_ENVELOPE_INVALID',
    'ATTENDANCE_TEXT_INVALID',
    'ATTENDANCE_ITEM_ID_MISMATCH',
    'ATTENDANCE_KEY_UNKNOWN',
    'ATTENDANCE_SIGNATURE_KIND_MISMATCH',
    'ATTENDANCE_KEY_DEVICE_MISMATCH',
    'ATTENDANCE_SIGNATURE_INVALID',
    'ATTENDANCE_STUDENT_DEVICE_MISMATCH',
    'ATTENDANCE_SENDER_MISMATCH',
    'ATTENDANCE_SESSION_UNKNOWN',
    'ATTENDANCE_ID_CONFLICT',
    'ATTENDANCE_SEQUENCE_CONFLICT',
    'ATTENDANCE_SESSION_RECORD_LIMIT',
    'ATTENDANCE_FORMAT_VERSION_UNKNOWN',
    'ATTENDANCE_SECOND_ANCHOR_REQUIRED',
  ),
  receipt_scan: errors(
    'ATTENDANCE_ENVELOPE_INVALID',
    'ATTENDANCE_TEXT_INVALID',
    'ATTENDANCE_KEY_UNKNOWN',
    'ATTENDANCE_SIGNATURE_KIND_MISMATCH',
    'ATTENDANCE_KEY_DEVICE_MISMATCH',
    'ATTENDANCE_SIGNATURE_INVALID',
    'ATTENDANCE_STUDENT_DEVICE_MISMATCH',
    'ATTENDANCE_SESSION_UNKNOWN',
    'ATTENDANCE_ID_CONFLICT',
    'ATTENDANCE_SEQUENCE_CONFLICT',
    'ATTENDANCE_SESSION_RECORD_LIMIT',
    'ATTENDANCE_NOT_LECTURERS_COURSE',
    'ATTENDANCE_ACCOUNT_MISMATCH',
    'ATTENDANCE_FORMAT_VERSION_UNKNOWN',
  ),
} as const;

// The item codes that answer RETRY: the item stays on the phone and comes again. Every
// other item code answers REJECTED, and those are the reasons a scan row may store.
export const ATTENDANCE_RETRY_CODES = [
  'ATTENDANCE_FORMAT_VERSION_UNKNOWN',
  'ATTENDANCE_SECOND_ANCHOR_REQUIRED',
] as const satisfies readonly AttendanceErrorCode[];
export type AttendanceRejectCode = Exclude<
  AttendanceErrorCode,
  'ATTENDANCE_NOT_FOUND' | (typeof ATTENDANCE_RETRY_CODES)[number]
>;
const retryCodes: readonly string[] = ATTENDANCE_RETRY_CODES;
export const ATTENDANCE_REJECT_CODES = (
  Object.keys(ATTENDANCE_ERROR_CODES) as AttendanceErrorCode[]
).filter(
  (code): code is AttendanceRejectCode =>
    ATTENDANCE_ERROR_CODES[code].http === null && !retryCodes.includes(code),
);

// Routes.

// The counted record of a roster row: of the counted records of the row's accounts, the
// first in the attendance module's order.
const sessionRecordSchema = z.object({
  termId: termIdSchema,
  recordId: recordIdSchema,
  computedAt: instantSchema,
  clockStatus: extensibleEnum(CLOCK_STATUSES),
  clockSource: extensibleEnum(CLOCK_SOURCES),
  labels: z.array(extensibleEnum(RECORD_LABELS)),
  decision: extensibleEnum(RECORD_DECISIONS),
  decisionReason: decisionReasonSchema,
  decisionSource: extensibleEnum(DECISION_SOURCES),
  arrivalPath: extensibleEnum(ARRIVAL_PATHS),
  arrivedAt: instantSchema,
});

export const ATTENDANCE_ROUTES = {
  listSessionRecords: defineRoute({
    module: 'attendance',
    name: 'listSessionRecords',
    method: 'GET',
    path: '/v1/attendance/sessions/{sessionId}/records',
    auth: ['session'],
    roles: ['lecturer'],
    // Joins thousands of roster rows with several modules' reads.
    rate: 'heavy',
    request: { params: z.object({ sessionId: sessionIdSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        sessionId: sessionIdSchema,
        visibility: extensibleEnum(RECORD_VISIBILITIES),
        held: z.boolean().nullable(),
        headCountEntered: z.boolean(),
        // The sending time is not over: some records may still be on their way.
        recordsMayArrive: z.boolean(),
        sendWindowEndAt: instantSchema,
        // Every active row of the session's sections and the inactive rows with a record or
        // a correction in this session, by section and roster order; never cut. Empty
        // while the head count is pending.
        students: z.array(
          z.object({
            rowId: rosterRowIdSchema,
            sectionId: sectionIdSchema,
            // Every account of the number, deleted ones too; empty without an account.
            studentIds: z.array(personIdSchema),
            studentNumber: z.string(),
            fullName: z.string(),
            rowStatus: extensibleEnum(ROW_STATUSES),
            exempt: z.boolean(),
            record: sessionRecordSchema.nullable(),
            rawRecordCount: countSchema,
            finalStatus: absenceFinalStatusSchema.nullable(),
          }),
        ),
        // Records from students not on the roster; null while the head count is pending.
        offRosterRecordCount: countSchema.nullable(),
        // Over the active rows, each in the first set it fits; null while pending.
        counts: z
          .object({
            students: countSchema,
            present: countSchema,
            absent: countSchema,
            rejectedRecords: countSchema,
            inReviewAndPending: z.object({
              total: countSchema,
              inReview: countSchema,
              pending: countSchema,
            }),
            correctionsAndExempt: countSchema,
          })
          .nullable(),
      }),
    },
    errors: errors('ATTENDANCE_NOT_FOUND'),
    summary: "A session's roster with each student's counted record and final status.",
  }),
};

// Audit events: only from an envelope whose signature verified, at most 20 a day per
// device and reason. Details carry internal ids and the envelope digest only; the
// envelope names the session, the student and, with the course, its unit.

// base64url SHA-256 of the envelope bytes.
const envelopeDigestSchema = z.string().max(43).regex(SHA256_BASE64URL);
const signedEnvelope = {
  recordId: recordIdSchema,
  deviceId: idSchema('Device'),
  envelopeDigest: envelopeDigestSchema,
};

export const ATTENDANCE_AUDIT_EVENTS = {
  // The stored record with the same id: its term.
  'attendance.id_conflict': z.strictObject({ ...signedEnvelope, storedTermId: termIdSchema }),
  'attendance.student_device_mismatch': z.strictObject(signedEnvelope),
  // The package's person, who is not the record's student.
  'attendance.sender_mismatch': z.strictObject({ ...signedEnvelope, senderId: personIdSchema }),
} as const satisfies Readonly<Record<string, z.ZodObject>>;

export type AttendanceAuditEvent = keyof typeof ATTENDANCE_AUDIT_EVENTS;
