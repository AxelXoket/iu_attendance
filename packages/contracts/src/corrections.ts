// Corrections contract (D09): the 16 routes with their request and answer schemas, the
// CORRECTIONS_ error catalog with the item codes of the four multi-item routes, the
// audit event envelope every module writes through, the corrections audit events, and the
// bodies of the two phone queue items. Reason and issue reason codes derive from the core
// catalog. Request and answer objects drop unknown keys (D13-B24); requests use closed
// enums, answers extensible ones. The audit envelope and the audit schemas are strict.

import { COURSE_RESULTS, HOUR_TYPES } from '@iu-attendance/core/absence/types';
import {
  CORRECTION_REASONS,
  FINAL_STATUSES,
  ISSUE_REASONS,
} from '@iu-attendance/core/corrections/catalog';
import { DOCUMENT_NUMBER_MAX_LENGTH } from '@iu-attendance/core/corrections/document-number';
import type { FinalStatusCorrection } from '@iu-attendance/core/corrections/final-status';
import { nonEmpty } from '@iu-attendance/core/shared/list';
import { idKey } from '@iu-attendance/core/shared/uuid';
import { RECORD_DECISIONS, type RecordDecision } from '@iu-attendance/core/verification/codes';
import { z } from 'zod';
import { recordIdSchema, recordKeySchema } from './attendance.ts';
import { PRESSED_AT_SOURCES } from './clock.ts';
import { courseIdSchema, sessionIdSchema, termIdSchema } from './courses.ts';
import {
  clientIdSchema,
  countSchema,
  dateSchema,
  defineErrorCodes,
  defineItemType,
  defineRoute,
  extensibleEnum,
  fullListSchema,
  type Id,
  type Identity,
  ITEM_RESULTS,
  instantSchema,
  isUnique,
  itemResultsSchema,
  MODULES,
  noDetailsSchema,
  PERSON_ROLES,
  pageQuerySchema,
  pageSchema,
  personIdSchema,
  REQUEST_ITEMS_MAX,
  rosterRowIdSchema,
  sameText,
  sessionAccess,
  unitIdSchema,
  v7IdSchema,
} from './shared/index.ts';
import { sessionFlagIdSchema } from './verification.ts';

// Value lists.

const codesOf = <const C extends string>(entries: readonly { code: C }[]) =>
  nonEmpty(entries.map(({ code }) => code));

export const CORRECTION_REASON_CODES = codesOf(CORRECTION_REASONS);
export const ISSUE_REASON_CODES = codesOf(ISSUE_REASONS);
// The codes a lecturer's phone may queue as a manual add (selectableInQueue).
export const QUEUE_REASON_CODES = codesOf(
  CORRECTION_REASONS.filter((entry) => entry.selectableInQueue),
);
const FINAL_STATUS_CODES = codesOf(FINAL_STATUSES);
export const reasonCodeSchema = z.enum(CORRECTION_REASON_CODES);
export const issueReasonCodeSchema = z.enum(ISSUE_REASON_CODES);

export const CORRECTION_KINDS = [
  'CORRECTION',
  'REVERSAL',
] as const satisfies readonly FinalStatusCorrection['kind'][];
// Where a correction was written: the panel, the lecturer phone's online request, or a
// manual add queue item.
export const CORRECTION_SOURCES = ['PANEL', 'PHONE', 'PHONE_QUEUE'] as const;
export const ISSUE_REPORT_STATUSES = ['OPEN', 'CORRECTED', 'NO_CHANGE', 'EXPIRED'] as const;
const REVIEW_EXPECTED_DECISIONS = [
  'IN_REVIEW',
  'PRESENT',
  'REJECTED',
] as const satisfies readonly RecordDecision[];
const REVIEW_NEW_DECISIONS = ['PRESENT', 'REJECTED'] as const satisfies readonly RecordDecision[];
export const SELF_DECLARED_DECISIONS = ['APPROVE', 'REJECT'] as const;
export const CONFIRMATION_DECISIONS = ['CONFIRM', 'REJECT'] as const;
// The identity module receives these in lower case.
export const CONFIRMATION_REJECT_REASONS = ['NOT_THIS_STUDENT', 'OTHER'] as const;
// REVIEW decides a record in review; CHANGE_DECISION turns the lecturer's own decision
// in this course before the lock (D09-B34).
export const REVIEW_CONTEXTS = ['REVIEW', 'CHANGE_DECISION'] as const;
// TODAY: the latest nightly batch whose day is not after today (Istanbul).
export const REVIEW_VIEWS = ['TODAY', 'ALL'] as const;
export const ISSUE_REPORT_VIEWS = ['TODAY', 'OPEN', 'CLOSED', 'EXPIRED'] as const;
export const LATER_CHANGE_PARTS = [
  'LATE_ARRIVED',
  'RESULT_CHANGED',
  'WOULD_CHANGE_IF_COUNTED',
] as const;
const LATE_ARRIVAL_REASONS = ['ARRIVED_LATE', 'DECIDED_LATE'] as const;
const RESULT_TYPES = [...HOUR_TYPES, 'OVERALL'] as const;
const CHANGE_SOURCE_KINDS = ['CORRECTION', 'DECISION', 'LATE_RECORD'] as const;
export const AUDIT_ACTOR_KINDS = ['PERSON', 'SYSTEM', 'COMMAND_LINE'] as const;
// The identity's clients, plus the server for events no request caused.
export const AUDIT_CLIENTS = ['phone', 'panel', 'lectern', 'server'] as const satisfies readonly (
  | Identity['client']
  | 'server'
)[];

export type CorrectionKind = (typeof CORRECTION_KINDS)[number];
export type CorrectionSource = (typeof CORRECTION_SOURCES)[number];
export type IssueReportStatus = (typeof ISSUE_REPORT_STATUSES)[number];

// Identifiers. Correction and issue report ids are UUIDv7s the client makes (the replay
// key). Records belong to the attendance module and flags to the verification module.

export type CorrectionId = Id<'Correction'>;
export type IssueReportId = Id<'IssueReport'>;
export const correctionIdSchema = v7IdSchema('Correction');
export const issueReportIdSchema = v7IdSchema('IssueReport');

// Error catalog. The codes with http null are item codes: they come back in a result of
// a multi-item route or of a queue item, never as an error answer.

export const CORRECTIONS_ERROR_CODES = defineErrorCodes('corrections', {
  CORRECTIONS_CURSOR_INVALID: {
    http: 400,
    ...sameText(
      'Bu sayfa imleci başka bir listeye ait; listeyi baştan açın.',
      'This page cursor belongs to another list; open the list again.',
    ),
  },
  CORRECTIONS_NOT_FOUND: {
    http: 404,
    ...sameText('Aranan kayıt bulunamadı.', 'The requested item was not found.'),
  },
  CORRECTIONS_CORRECTION_CHANGED: {
    http: 409,
    ...sameText(
      'Bu düzeltme bu arada değişti; güncel hâlini açıp yeniden deneyin.',
      'This correction changed in the meantime; open its current state and try again.',
    ),
  },
  CORRECTIONS_ALREADY_REVERSED: {
    http: 409,
    ...sameText('Bu düzeltme zaten geri alınmış.', 'This correction has already been undone.'),
  },
  CORRECTIONS_ID_CONFLICT: {
    http: 409,
    ...sameText(
      'Bu kimlik başka bir içerikle zaten kullanılmış.',
      'This id was already used with different content.',
    ),
  },
  CORRECTIONS_REPORT_NOT_OPEN: {
    http: 409,
    ...sameText('Bu bildirim artık açık değil.', 'This report is no longer open.'),
  },
  CORRECTIONS_ALREADY_REVIEWED: {
    http: 409,
    ...sameText(
      'Bu ders saati başka bir işlemle zaten incelendi.',
      'This class session was already reviewed in another action.',
    ),
  },
  CORRECTIONS_SNAPSHOT_PENDING: {
    http: 409,
    ...sameText(
      'Dönem kilitlendi; gün sonu kaydı yazılınca yeniden deneyin.',
      'The term is locked; try again once the end of day snapshot is written.',
    ),
  },
  CORRECTIONS_TRANSIENT_CONFLICT: {
    http: null,
    ...sameText(
      'Bu satır şu anda başka bir işlemle değişiyor; birazdan yeniden deneyin.',
      'This row is being changed by another action; try again shortly.',
    ),
  },
  CORRECTIONS_ITEM_INVALID: {
    http: null,
    ...sameText('Gönderilen satır okunamadı.', 'The sent item could not be read.'),
  },
  CORRECTIONS_NOT_AUTHORIZED: {
    http: null,
    ...sameText(
      'Elle eklemeyi yalnız dersin hocası yapabilir.',
      'Only the lecturer of the course can add a student by hand.',
    ),
  },
  CORRECTIONS_SESSION_NOT_STARTED: {
    http: null,
    ...sameText('Ders saati henüz başlamadı.', 'The class session has not started yet.'),
  },
  CORRECTIONS_SESSION_CANCELLED: {
    http: null,
    ...sameText('Ders saati iptal edilmiş.', 'The class session was cancelled.'),
  },
  CORRECTIONS_SESSION_NOT_HELD: {
    http: null,
    ...sameText(
      'Bu ders saati için ders yapılmadı denmiş.',
      'This class session was marked as not held.',
    ),
  },
  CORRECTIONS_NOT_ON_ROSTER: {
    http: null,
    ...sameText(
      'Öğrenci bu ders saatinin listesinde değil.',
      'The student is not on the roster of this class session.',
    ),
  },
  CORRECTIONS_DOCUMENT_NUMBER_REQUIRED: {
    http: null,
    ...sameText('Bu sebep için belge numarası gerekli.', 'This reason needs a document number.'),
  },
  CORRECTIONS_DOCUMENT_NUMBER_FORBIDDEN: {
    http: null,
    ...sameText('Bu sebepte belge numarası girilmez.', 'This reason takes no document number.'),
  },
  CORRECTIONS_DOCUMENT_NUMBER_INVALID: {
    http: null,
    ...sameText(
      'Belge numarası boş, çok uzun ya da geçersiz karakterli.',
      'The document number is empty, too long or has invalid characters.',
    ),
  },
  CORRECTIONS_HOURS_INVALID: {
    http: null,
    ...sameText(
      'Seçilen saatler bu ders saatine uymuyor.',
      'The chosen hours do not fit this class session.',
    ),
  },
  CORRECTIONS_HOUR_TYPE_FORBIDDEN: {
    http: null,
    ...sameText(
      'Bu sebep bu saat türünde kullanılamaz.',
      'This reason cannot be used for this hour type.',
    ),
  },
  CORRECTIONS_CORRECTION_EXISTS: {
    http: null,
    ...sameText(
      'Öğrencinin bu ders saatinde geçerli bir düzeltmesi var; önce onu açın.',
      'The student already has an active correction for this class session; open it first.',
    ),
  },
  CORRECTIONS_ISSUE_REPORT_MISMATCH: {
    http: null,
    ...sameText(
      'Seçilen bildirim bu öğrencinin bu ders saatindeki açık bildirimi değil.',
      "The chosen report is not this student's open report for this class session.",
    ),
  },
  CORRECTIONS_RECORD_MISMATCH: {
    http: null,
    ...sameText(
      'Seçilen yoklama kaydı bu öğrenciye ya da bu ders saatine ait değil.',
      'The chosen attendance record belongs to another student or class session.',
    ),
  },
  CORRECTIONS_NOT_COUNTED_PRESENT_RECORD: {
    http: null,
    ...sameText(
      'Kısmi devam yalnız öğrencinin sayılan ve var kararlı kaydında seçilir.',
      "Partial attendance needs the student's counted record marked present.",
    ),
  },
  CORRECTIONS_SESSION_NOT_FLAGGED: {
    http: null,
    ...sameText('Bu ders saatinde açık bir işaret yok.', 'This class session has no open flag.'),
  },
  CORRECTIONS_ALREADY_DECIDED: {
    http: null,
    ...sameText(
      'Bu kayıt ya da hesap artık karar beklemiyor.',
      'This record or account is no longer waiting for a decision.',
    ),
  },
  CORRECTIONS_NOT_SELF_DECLARED: {
    http: null,
    ...sameText(
      'Bu kayıt onay bekleyen bir kendi beyanı değil.',
      'This record is not a self-declared record waiting for approval.',
    ),
  },
  CORRECTIONS_DECISION_NOT_CHANGEABLE: {
    http: null,
    ...sameText(
      'Yalnız bu derste sizin verdiğiniz bir karar değiştirilebilir.',
      'Only a decision you made in this course can be changed.',
    ),
  },
  CORRECTIONS_HEAD_COUNT_PENDING: {
    http: null,
    ...sameText(
      'Önce bu ders saatinin kafa sayısını ya da ders yapıldı cevabını girin.',
      'Enter the head count or the held answer of this class session first.',
    ),
  },
  CORRECTIONS_TERM_LOCKED: {
    http: null,
    ...sameText(
      'Dönem kilitli; sayım yalnız düzeltmeyle değişir.',
      'The term is locked; the count changes only through a correction.',
    ),
  },
  CORRECTIONS_COUNTED_RECORD_EXISTS: {
    http: null,
    ...sameText(
      'Kayıt onaylandı, ancak öğrencinin daha önce ulaşan kaydı sayılmaya devam ediyor.',
      "The record was approved, but the student's earlier record still counts.",
    ),
  },
  CORRECTIONS_CONFIRM_ONE_BY_ONE: {
    http: null,
    ...sameText(
      'Bu hesap toplu onaylanamaz; tek tek onaylayın.',
      'This account cannot be confirmed in bulk; confirm it on its own.',
    ),
  },
  CORRECTIONS_OPEN_REPORT_EXISTS: {
    http: null,
    ...sameText(
      'Bu ders saati için açık bir bildirimin zaten var.',
      'You already have an open report for this class session.',
    ),
  },
  CORRECTIONS_REPORT_REPEATED: {
    http: null,
    ...sameText(
      'Hocan bu bildirimi inceledi; o zamandan beri bir değişiklik yok.',
      'Your lecturer reviewed this report; nothing has changed since.',
    ),
  },
  CORRECTIONS_REPORT_EXPIRED: {
    http: null,
    ...sameText(
      'Bildirim süresi geçtikten sonra ulaştı; kaydedildi ama hocanın listesine düşmedi.',
      "The report arrived after its time limit; it was kept but does not reach the lecturer's list.",
    ),
  },
});

export type CorrectionsErrorCode = keyof typeof CORRECTIONS_ERROR_CODES;
const errors = (...codes: CorrectionsErrorCode[]) => codes;

// Shared schema parts.

// The hours CHECK of the corrections table; the session's own hours bound each item
// (CORRECTIONS_HOURS_INVALID).
const hoursSchema = z.number().int().min(0).max(24);
// A decision version: an integer column, at least 1.
const decisionVersionSchema = z.number().int().min(1).max(2_147_483_647);
// The 64-character rule applies after normalization (NFC, trimmed), item by item
// (CORRECTIONS_DOCUMENT_NUMBER_INVALID); the raw text leaves room for what it removes.
const DOCUMENT_NUMBER_INPUT_MAX = 4 * DOCUMENT_NUMBER_MAX_LENGTH;
const BULK_BODY_LIMIT = 256 * 1024;
// An audit event type is <module>.<event>.
const AUDIT_EVENT_TYPE_MAX = 96;
const requestItems = <T extends z.ZodType>(item: T) => z.array(item).min(1).max(REQUEST_ITEMS_MAX);
const withOperation = <S extends z.ZodObject>(answer: S) =>
  answer.extend({ operationId: clientIdSchema });
const courseQuery = z.object({ courseId: courseIdSchema.optional() });
const headCountPendingSessionSchema = z.object({
  sessionId: sessionIdSchema,
  courseId: courseIdSchema,
  startAt: instantSchema,
});
const batchPositionSchema = z.number().int().nullable();

// A correction row as the panel reads it. Instants are UTC ISO 8601.
export const correctionSchema = z.object({
  id: correctionIdSchema,
  operationId: clientIdSchema,
  kind: extensibleEnum(CORRECTION_KINDS),
  // Both null on a reversal.
  reasonCode: extensibleEnum(CORRECTION_REASON_CODES).nullable(),
  finalStatus: extensibleEnum(FINAL_STATUS_CODES).nullable(),
  unitId: unitIdSchema.nullable(),
  courseId: courseIdSchema,
  sessionId: sessionIdSchema,
  rosterRowId: rosterRowIdSchema,
  record: recordKeySchema.nullable(),
  documentNumber: z.string().nullable(),
  theoryHours: z.number().int().nullable(),
  practiceHours: z.number().int().nullable(),
  previousCorrectionId: correctionIdSchema.nullable(),
  issueReportId: issueReportIdSchema.nullable(),
  source: extensibleEnum(CORRECTION_SOURCES),
  actorPersonId: personIdSchema,
  // Only a queue item has the clock range, its source and the arrival.
  clientLowerAt: instantSchema.nullable(),
  clientUpperAt: instantSchema.nullable(),
  clockSource: extensibleEnum(PRESSED_AT_SOURCES).nullable(),
  arrivedAt: instantSchema.nullable(),
  createdAt: instantSchema,
});

export const issueReportSchema = z.object({
  id: issueReportIdSchema,
  courseId: courseIdSchema,
  sessionId: sessionIdSchema,
  studentId: personIdSchema,
  // Null when the student had no row in the session's sections (a record in a wrong course).
  rosterRowId: rosterRowIdSchema.nullable(),
  record: recordKeySchema.nullable(),
  issueReasonCode: extensibleEnum(ISSUE_REASON_CODES),
  status: extensibleEnum(ISSUE_REPORT_STATUSES),
  clientLowerAt: instantSchema,
  arrivedAt: instantSchema,
  windowEndAt: instantSchema,
  closedAt: instantSchema.nullable(),
  closedByPersonId: personIdSchema.nullable(),
  correctionId: correctionIdSchema.nullable(),
});

const issueReportListItemSchema = issueReportSchema.extend({
  courseName: z.string(),
  sessionStartAt: instantSchema,
  studentFullName: z.string(),
  // Null, like record, while the session waits for its head count.
  recordDecision: extensibleEnum(RECORD_DECISIONS).nullable(),
  suggestedReasonCode: extensibleEnum(CORRECTION_REASON_CODES).nullable(),
  batchPosition: batchPositionSchema,
  critical: z.boolean().nullable(),
});

const confirmationItemSchema = z.object({
  studentId: personIdSchema,
  studentNumber: z.string(),
  rosterFullName: z.string(),
  // The name the student typed; only in the name mismatch and same number groups.
  enteredFullName: z.string().nullable(),
  courses: z.array(z.object({ courseId: courseIdSchema, courseName: z.string() })),
  registeredAt: instantSchema,
});

const changeRowFields = {
  rosterRowId: rosterRowIdSchema,
  studentFullName: z.string(),
};

const knownLaterChangeSchema = z.discriminatedUnion('part', [
  z.object({
    part: z.literal('LATE_ARRIVED'),
    ...changeRowFields,
    record: recordKeySchema,
    sessionId: sessionIdSchema,
    sessionStartAt: instantSchema,
    reason: extensibleEnum(LATE_ARRIVAL_REASONS),
    arrivedAt: instantSchema,
    decidedAt: instantSchema.nullable(),
    sendWindowEndAt: instantSchema,
    decision: extensibleEnum(RECORD_DECISIONS),
  }),
  z.object({
    part: z.literal('RESULT_CHANGED'),
    ...changeRowFields,
    resultType: extensibleEnum(RESULT_TYPES),
    baseResult: extensibleEnum(COURSE_RESULTS),
    currentResult: extensibleEnum(COURSE_RESULTS),
    baseAt: instantSchema,
    // The reports module's change class (the unjustified absence classification).
    changeClass: z.string(),
    sources: z.array(
      z.object({
        kind: extensibleEnum(CHANGE_SOURCE_KINDS),
        reasonCode: extensibleEnum(CORRECTION_REASON_CODES).nullable(),
        correctionId: correctionIdSchema.nullable(),
        record: recordKeySchema.nullable(),
        at: instantSchema,
      }),
    ),
  }),
  z.object({
    part: z.literal('WOULD_CHANGE_IF_COUNTED'),
    ...changeRowFields,
    record: recordKeySchema,
    sessionId: sessionIdSchema,
    arrivedAt: instantSchema,
    // The suggested action: a correction on this record (D09-A06).
    action: z.object({
      route: z.string(),
      suggestedReasonCode: extensibleEnum(CORRECTION_REASON_CODES),
      record: recordKeySchema,
    }),
  }),
]);

// A part added later reaches an older client as a row it can skip: only its part is
// read, and a known part must keep its own shape.
const laterChangeSchema = z.union([
  knownLaterChangeSchema,
  z.object({
    part: extensibleEnum(LATER_CHANGE_PARTS).refine(
      (part) => !(LATER_CHANGE_PARTS as readonly string[]).includes(part),
      { message: 'A known part has its own shape' },
    ),
  }),
]);

const jsonObjectSchema = z.record(z.string(), z.unknown());

// An audit event as the audit list shows it.
export const auditEventSchema = z.object({
  id: v7IdSchema('AuditEvent'),
  eventType: z.string(),
  at: instantSchema,
  actor: z.object({
    kind: extensibleEnum(AUDIT_ACTOR_KINDS),
    personId: personIdSchema.nullable(),
    role: extensibleEnum(PERSON_ROLES).nullable(),
    fullName: z.string().nullable(),
  }),
  client: extensibleEnum(AUDIT_CLIENTS),
  // The client's id of the operation (D13-B12): a UUIDv7, as every request carries it.
  operationId: clientIdSchema.nullable(),
  clientAt: instantSchema.nullable(),
  termId: termIdSchema.nullable(),
  unitId: unitIdSchema.nullable(),
  courseId: courseIdSchema.nullable(),
  sessionId: sessionIdSchema.nullable(),
  studentId: personIdSchema.nullable(),
  rosterRowId: rosterRowIdSchema.nullable(),
  record: recordKeySchema.nullable(),
  target: z.object({ kind: z.string(), id: z.string() }).nullable(),
  code: z.string().nullable(),
  before: jsonObjectSchema.nullable(),
  after: jsonObjectSchema.nullable(),
  details: jsonObjectSchema.nullable(),
});

// Request parts.

const correctionInputSchema = z.object({
  id: correctionIdSchema,
  sessionId: sessionIdSchema,
  rosterRowId: rosterRowIdSchema,
  reasonCode: reasonCodeSchema,
  // Required by the documented reasons, null otherwise. The name is the one the request
  // digest normalizes (DIGEST_DOCUMENT_NUMBER_FIELD).
  documentNumber: z.string().max(DOCUMENT_NUMBER_INPUT_MAX).nullable(),
  // null: all of the session's hours of the type.
  theoryHours: hoursSchema.nullable(),
  practiceHours: hoursSchema.nullable(),
  // The chain's last row when replacing; null on a new chain or after a reversal.
  previousCorrectionId: correctionIdSchema.nullable(),
  // The student's open report on this session, closed by this correction.
  issueReportId: issueReportIdSchema.nullable(),
  record: recordKeySchema.nullable(),
});

const isConfirmationValid = (item: {
  decision: (typeof CONFIRMATION_DECISIONS)[number];
  bulk: boolean;
  rejectReason: string | null;
}) =>
  item.decision === 'CONFIRM'
    ? item.rejectReason === null
    : item.rejectReason !== null && !item.bulk;
const CONFIRMATION_RULE = {
  message: 'A rejection names its reason and is never bulk; a confirmation has no reason',
};

// A decision request names each record or student once: a repeat would be answered as
// already written although its own decision was never applied. UUIDs compare without case.
const eachRecordOnce = (items: readonly { record: { recordId: string } }[]) =>
  isUnique(items.map(({ record }) => idKey(record.recordId)));
const eachStudentOnce = (items: readonly { studentId: string }[]) =>
  isUnique(items.map(({ studentId }) => idKey(studentId)));
const UNIQUE_ITEMS = { message: 'Each record or student comes once' };

const isReviewValid = (item: {
  context: (typeof REVIEW_CONTEXTS)[number];
  expectedDecision: (typeof REVIEW_EXPECTED_DECISIONS)[number];
  newDecision: (typeof REVIEW_NEW_DECISIONS)[number];
}) =>
  item.context === 'REVIEW'
    ? item.expectedDecision === 'IN_REVIEW'
    : item.expectedDecision !== 'IN_REVIEW' && item.expectedDecision !== item.newDecision;
const REVIEW_RULE = {
  message:
    'A review decides a record in review; a change turns present into rejected or the reverse',
};

const lecturer = sessionAccess('lecturer');
const lecturerOrAdmin = {
  auth: ['session'],
  roles: ['lecturer', 'admin'],
  rate: 'session',
} as const;
const bulk = { ...lecturer, bodyLimit: BULK_BODY_LIMIT } as const;

export const CORRECTIONS_ROUTES = {
  addCorrections: defineRoute({
    module: 'corrections',
    name: 'addCorrections',
    method: 'POST',
    path: '/v1/corrections',
    ...bulk,
    request: {
      body: z.object({
        operationId: clientIdSchema,
        items: requestItems(correctionInputSchema),
      }),
    },
    response: {
      statuses: [200],
      schema: withOperation(
        itemResultsSchema(ITEM_RESULTS, { correction: correctionSchema.nullable() }),
      ),
    },
    errors: errors(),
    summary: 'Writes corrections item by item; one result per item in request order.',
  }),
  listCorrections: defineRoute({
    module: 'corrections',
    name: 'listCorrections',
    method: 'GET',
    path: '/v1/corrections',
    ...lecturerOrAdmin,
    request: {
      // A lecturer names a course; an admin reads the units in scope.
      query: z.object({
        ...pageQuerySchema.shape,
        courseId: courseIdSchema.optional(),
        sessionId: sessionIdSchema.optional(),
        rosterRowId: rosterRowIdSchema.optional(),
        reasonCode: reasonCodeSchema.optional(),
        // Only the active rows of the chains.
        activeOnly: z
          .enum(['true', 'false'])
          .default('false')
          .transform((value) => value === 'true'),
      }),
    },
    response: {
      statuses: [200],
      // Newest first, ties by id.
      schema: pageSchema(
        correctionSchema.extend({
          sessionStartAt: instantSchema,
          studentFullName: z.string(),
          active: z.boolean(),
          afterLock: z.boolean(),
        }),
      ),
    },
    errors: errors('CORRECTIONS_CURSOR_INVALID', 'CORRECTIONS_NOT_FOUND'),
    summary: 'Corrections of a course, or of the units in scope for an admin.',
  }),
  undoCorrection: defineRoute({
    module: 'corrections',
    name: 'undoCorrection',
    method: 'POST',
    path: '/v1/corrections/{correctionId}/undo',
    ...lecturer,
    request: {
      params: z.object({ correctionId: correctionIdSchema }),
      // The id of the reversal row to write: the replay key.
      body: z.object({ reversalId: correctionIdSchema }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        reversal: correctionSchema,
        reversed: correctionSchema,
        reopenedIssueReportId: issueReportIdSchema.nullable(),
      }),
    },
    errors: errors(
      'CORRECTIONS_NOT_FOUND',
      'CORRECTIONS_CORRECTION_CHANGED',
      'CORRECTIONS_ALREADY_REVERSED',
      'CORRECTIONS_ID_CONFLICT',
      'CORRECTIONS_SNAPSHOT_PENDING',
    ),
    summary: 'Undoes the last row of a correction chain; reopens the report it closed.',
  }),
  approvalSummary: defineRoute({
    module: 'corrections',
    name: 'approvalSummary',
    method: 'GET',
    path: '/v1/corrections/approvals/summary',
    ...lecturer,
    request: {},
    response: {
      statuses: [200],
      schema: z.object({
        selfDeclared: countSchema,
        confirmations: z.object({ bulk: countSchema, oneByOne: countSchema }),
        reviews: countSchema,
        issueReports: countSchema,
        flaggedSessions: countSchema,
        headCountPendingSessions: countSchema,
        // day: the latest batch whose day is not after today (Istanbul); null before the first.
        todaysBatch: z.object({
          day: dateSchema.nullable(),
          total: countSchema,
          remaining: countSchema,
        }),
        // Every waiting count except the sessions without a head count.
        total: countSchema,
      }),
    },
    errors: errors(),
    summary: "Waiting approvals across the lecturer's open-term courses.",
  }),
  listSelfDeclared: defineRoute({
    module: 'corrections',
    name: 'listSelfDeclared',
    method: 'GET',
    path: '/v1/corrections/self-declared',
    ...lecturer,
    request: {
      query: courseQuery.extend({ sessionId: sessionIdSchema.optional() }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        sessions: z.array(
          z.object({
            sessionId: sessionIdSchema,
            courseId: courseIdSchema,
            courseName: z.string(),
            startAt: instantSchema,
            records: fullListSchema(
              z.object({
                record: recordKeySchema,
                rosterRowId: rosterRowIdSchema,
                studentFullName: z.string(),
                arrivedAt: instantSchema,
                labels: z.array(z.string()),
              }),
            ),
          }),
        ),
        // Sessions without a head count or held answer show no records or counts.
        headCountPendingSessions: z.array(headCountPendingSessionSchema),
        total: countSchema,
      }),
    },
    errors: errors('CORRECTIONS_NOT_FOUND'),
    summary: 'Self-declared records waiting for approval, by session.',
  }),
  decideSelfDeclared: defineRoute({
    module: 'corrections',
    name: 'decideSelfDeclared',
    method: 'POST',
    path: '/v1/corrections/self-declared/decisions',
    ...bulk,
    request: {
      body: z.object({
        operationId: clientIdSchema,
        items: requestItems(
          z.object({ record: recordKeySchema, decision: z.enum(SELF_DECLARED_DECISIONS) }),
        ).refine(eachRecordOnce, UNIQUE_ITEMS),
      }),
    },
    // An item result's id is the record id.
    response: { statuses: [200], schema: withOperation(itemResultsSchema(ITEM_RESULTS)) },
    errors: errors(),
    summary: 'Approves or rejects self-declared records; one result per record.',
  }),
  listConfirmations: defineRoute({
    module: 'corrections',
    name: 'listConfirmations',
    method: 'GET',
    path: '/v1/corrections/confirmations',
    auth: ['session'],
    roles: ['lecturer'],
    // Built live from several modules on every request.
    rate: 'heavy',
    request: { query: courseQuery },
    response: {
      statuses: [200],
      schema: z.object({
        bulk: fullListSchema(confirmationItemSchema),
        unverifiedDevice: fullListSchema(confirmationItemSchema),
        nameMismatch: fullListSchema(confirmationItemSchema),
        sameNumber: z.array(
          z.object({
            studentNumber: z.string(),
            rosterFullName: z.string(),
            accounts: fullListSchema(confirmationItemSchema),
          }),
        ),
        total: countSchema,
      }),
    },
    errors: errors('CORRECTIONS_NOT_FOUND'),
    summary: "Unconfirmed student accounts on the lecturer's rosters, in decision groups.",
  }),
  decideConfirmations: defineRoute({
    module: 'corrections',
    name: 'decideConfirmations',
    method: 'POST',
    path: '/v1/corrections/confirmations/decisions',
    ...bulk,
    request: {
      body: z.object({
        operationId: clientIdSchema,
        items: requestItems(
          z
            .object({
              studentId: personIdSchema,
              decision: z.enum(CONFIRMATION_DECISIONS),
              bulk: z.boolean(),
              rejectReason: z.enum(CONFIRMATION_REJECT_REASONS).nullable(),
            })
            .refine(isConfirmationValid, CONFIRMATION_RULE),
        ).refine(eachStudentOnce, UNIQUE_ITEMS),
      }),
    },
    // An item result's id is the student id.
    response: { statuses: [200], schema: withOperation(itemResultsSchema(ITEM_RESULTS)) },
    errors: errors(),
    summary: 'Confirms or rejects student accounts through the identity module.',
  }),
  listReviews: defineRoute({
    module: 'corrections',
    name: 'listReviews',
    method: 'GET',
    path: '/v1/corrections/reviews',
    ...lecturer,
    request: {
      query: courseQuery.extend({
        view: z.enum(REVIEW_VIEWS).default('TODAY'),
        sessionId: sessionIdSchema.optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        // The batch day the TODAY view used; null without a batch.
        day: dateSchema.nullable(),
        items: fullListSchema(
          z.object({
            record: recordKeySchema,
            sessionId: sessionIdSchema,
            courseId: courseIdSchema,
            courseName: z.string(),
            sessionStartAt: instantSchema,
            rosterRowId: rosterRowIdSchema,
            studentFullName: z.string(),
            // The verification module's reason for the review.
            decisionReason: z.string(),
            labels: z.array(z.string()),
            arrivedAt: instantSchema,
            decidedAt: instantSchema,
            batchPosition: batchPositionSchema,
            critical: z.boolean().nullable(),
          }),
        ),
        headCountPendingSessions: z.array(headCountPendingSessionSchema),
        total: countSchema,
      }),
    },
    errors: errors('CORRECTIONS_NOT_FOUND'),
    summary: 'Records in review that the lecturer can decide.',
  }),
  decideReviews: defineRoute({
    module: 'corrections',
    name: 'decideReviews',
    method: 'POST',
    path: '/v1/corrections/reviews/decisions',
    ...bulk,
    request: {
      body: z.object({
        operationId: clientIdSchema,
        items: requestItems(
          z
            .object({
              record: recordKeySchema,
              context: z.enum(REVIEW_CONTEXTS),
              expectedDecision: z.enum(REVIEW_EXPECTED_DECISIONS),
              newDecision: z.enum(REVIEW_NEW_DECISIONS),
            })
            .refine(isReviewValid, REVIEW_RULE),
        ).refine(eachRecordOnce, UNIQUE_ITEMS),
      }),
    },
    response: {
      statuses: [200],
      // An item result's id is the record id.
      schema: withOperation(
        itemResultsSchema(ITEM_RESULTS, {
          newDecision: extensibleEnum(REVIEW_NEW_DECISIONS).nullable(),
          counted: z.boolean().nullable(),
        }),
      ),
    },
    errors: errors(),
    summary: "Decides records in review, or turns the lecturer's own decision.",
  }),
  listFlaggedSessions: defineRoute({
    module: 'corrections',
    name: 'listFlaggedSessions',
    method: 'GET',
    path: '/v1/corrections/flagged-sessions',
    ...lecturer,
    request: { query: courseQuery },
    response: {
      statuses: [200],
      // Sessions, not class-sized rows: the spec gives this list no size limit.
      schema: z.object({
        items: z.array(
          z.object({
            sessionId: sessionIdSchema,
            flagId: sessionFlagIdSchema,
            courseId: courseIdSchema,
            courseName: z.string(),
            startAt: instantSchema,
            headCount: countSchema,
            recordCount: countSchema,
            firstFlaggedAt: instantSchema,
            settled: z.boolean(),
            batchPosition: batchPositionSchema,
          }),
        ),
        total: countSchema,
      }),
    },
    errors: errors('CORRECTIONS_NOT_FOUND'),
    summary: 'Sessions with an open, unreviewed head count flag.',
  }),
  markFlaggedSessionReviewed: defineRoute({
    module: 'corrections',
    name: 'markFlaggedSessionReviewed',
    method: 'POST',
    path: '/v1/corrections/flagged-sessions/{sessionId}/reviewed',
    ...lecturer,
    request: {
      params: z.object({ sessionId: sessionIdSchema }),
      body: z.object({ operationId: clientIdSchema }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        sessionId: sessionIdSchema,
        flagId: sessionFlagIdSchema,
        reviewedAt: instantSchema,
      }),
    },
    errors: errors('CORRECTIONS_NOT_FOUND', 'CORRECTIONS_ALREADY_REVIEWED'),
    summary:
      "Closes a flagged session's review; a repeat with the same operation answers the same.",
  }),
  listIssueReports: defineRoute({
    module: 'corrections',
    name: 'listIssueReports',
    method: 'GET',
    path: '/v1/corrections/issue-reports',
    ...lecturer,
    request: {
      // Only the CLOSED and EXPIRED views are paged.
      query: z.object({
        ...pageQuerySchema.shape,
        view: z.enum(ISSUE_REPORT_VIEWS).default('OPEN'),
        courseId: courseIdSchema.optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        // The unpaged OPEN and TODAY views are class-sized lists; a page holds at most 500.
        items: fullListSchema(issueReportListItemSchema),
        nextCursor: z.string().nullable(),
        // Only in the TODAY view.
        day: dateSchema.nullable(),
      }),
    },
    errors: errors('CORRECTIONS_CURSOR_INVALID', 'CORRECTIONS_NOT_FOUND'),
    summary: "Students' issue reports on the lecturer's courses.",
  }),
  closeIssueReport: defineRoute({
    module: 'corrections',
    name: 'closeIssueReport',
    method: 'POST',
    path: '/v1/corrections/issue-reports/{issueReportId}/close',
    ...lecturer,
    request: {
      params: z.object({ issueReportId: issueReportIdSchema }),
      body: z.object({ operationId: clientIdSchema }),
    },
    // The report with status NO_CHANGE.
    response: { statuses: [200], schema: z.object({ issueReport: issueReportSchema }) },
    errors: errors('CORRECTIONS_NOT_FOUND', 'CORRECTIONS_REPORT_NOT_OPEN'),
    summary: 'Closes an open report without a change.',
  }),
  listLaterChanges: defineRoute({
    module: 'corrections',
    name: 'listLaterChanges',
    method: 'GET',
    path: '/v1/corrections/later-changes',
    auth: ['session'],
    roles: ['lecturer'],
    // Built live from several modules on every request.
    rate: 'heavy',
    request: {
      // Without part, the three parts in order.
      query: z.object({
        ...pageQuerySchema.shape,
        courseId: courseIdSchema,
        part: z.enum(LATER_CHANGE_PARTS).optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: pageSchema(laterChangeSchema).extend({
        lock: z.object({ locked: z.boolean(), lockAt: instantSchema.nullable() }),
      }),
    },
    errors: errors('CORRECTIONS_CURSOR_INVALID', 'CORRECTIONS_NOT_FOUND'),
    summary: 'Records and results of a course that changed after it was reported.',
  }),
  listAuditEvents: defineRoute({
    module: 'corrections',
    name: 'listAuditEvents',
    method: 'GET',
    path: '/v1/corrections/audit',
    ...lecturerOrAdmin,
    request: {
      // A lecturer names a course; an admin reads the units in scope.
      query: z
        .object({
          ...pageQuerySchema.shape,
          courseId: courseIdSchema.optional(),
          sessionId: sessionIdSchema.optional(),
          rosterRowId: rosterRowIdSchema.optional(),
          studentId: personIdSchema.optional(),
          recordTermId: termIdSchema.optional(),
          recordId: recordIdSchema.optional(),
          // A prefix of the event type, such as "corrections.".
          eventType: z.string().max(AUDIT_EVENT_TYPE_MAX).optional(),
          // Istanbul days.
          from: dateSchema.optional(),
          to: dateSchema.optional(),
        })
        // A record id alone may match the record in any term; a term needs its record.
        .refine((query) => query.recordTermId === undefined || query.recordId !== undefined, {
          message: 'recordTermId goes with recordId',
          path: ['recordId'],
        }),
    },
    response: { statuses: [200], schema: pageSchema(auditEventSchema) },
    errors: errors('CORRECTIONS_CURSOR_INVALID', 'CORRECTIONS_NOT_FOUND'),
    summary: 'Audit events of a course, or of the units in scope for an admin.',
  }),
};

export type CorrectionsRouteName = keyof typeof CORRECTIONS_ROUTES;

// The item codes each multi-item route may put in a result, besides the generic API
// codes. A result is RETRY only with CORRECTIONS_TRANSIENT_CONFLICT or
// CORRECTIONS_SNAPSHOT_PENDING. The queue items' own codes (ITEM_INVALID,
// NOT_AUTHORIZED, OPEN_REPORT_EXISTS, REPORT_REPEATED, REPORT_EXPIRED) travel in the
// sync answer.
export const CORRECTIONS_ITEM_CODES = {
  addCorrections: errors(
    'CORRECTIONS_NOT_FOUND',
    'CORRECTIONS_ID_CONFLICT',
    'CORRECTIONS_SESSION_NOT_STARTED',
    'CORRECTIONS_SESSION_CANCELLED',
    'CORRECTIONS_SESSION_NOT_HELD',
    'CORRECTIONS_NOT_ON_ROSTER',
    'CORRECTIONS_DOCUMENT_NUMBER_REQUIRED',
    'CORRECTIONS_DOCUMENT_NUMBER_FORBIDDEN',
    'CORRECTIONS_DOCUMENT_NUMBER_INVALID',
    'CORRECTIONS_HOURS_INVALID',
    'CORRECTIONS_HOUR_TYPE_FORBIDDEN',
    'CORRECTIONS_CORRECTION_EXISTS',
    'CORRECTIONS_CORRECTION_CHANGED',
    'CORRECTIONS_ISSUE_REPORT_MISMATCH',
    'CORRECTIONS_RECORD_MISMATCH',
    'CORRECTIONS_SESSION_NOT_FLAGGED',
    'CORRECTIONS_NOT_COUNTED_PRESENT_RECORD',
    'CORRECTIONS_SNAPSHOT_PENDING',
    'CORRECTIONS_TRANSIENT_CONFLICT',
  ),
  decideSelfDeclared: errors(
    'CORRECTIONS_NOT_FOUND',
    'CORRECTIONS_NOT_SELF_DECLARED',
    'CORRECTIONS_ALREADY_DECIDED',
    'CORRECTIONS_HEAD_COUNT_PENDING',
    'CORRECTIONS_TERM_LOCKED',
    'CORRECTIONS_TRANSIENT_CONFLICT',
  ),
  decideConfirmations: errors(
    'CORRECTIONS_NOT_FOUND',
    'CORRECTIONS_CONFIRM_ONE_BY_ONE',
    'CORRECTIONS_ALREADY_DECIDED',
    'CORRECTIONS_TRANSIENT_CONFLICT',
  ),
  // COUNTED_RECORD_EXISTS comes with ACCEPTED, as information.
  decideReviews: errors(
    'CORRECTIONS_NOT_FOUND',
    'CORRECTIONS_ALREADY_DECIDED',
    'CORRECTIONS_DECISION_NOT_CHANGEABLE',
    'CORRECTIONS_HEAD_COUNT_PENDING',
    'CORRECTIONS_TERM_LOCKED',
    'CORRECTIONS_COUNTED_RECORD_EXISTS',
    'CORRECTIONS_TRANSIENT_CONFLICT',
  ),
} as const satisfies Partial<Record<CorrectionsRouteName, readonly CorrectionsErrorCode[]>>;

// Phone queue items. The sync module parses the text body with these schemas; a body that
// does not fit is rejected with CORRECTIONS_ITEM_INVALID.
export const MANUAL_ADD_ITEM = defineItemType(
  'manual_add',
  z.object({
    id: correctionIdSchema,
    sessionId: sessionIdSchema,
    rosterRowId: rosterRowIdSchema,
    reasonCode: z.enum(QUEUE_REASON_CODES),
    theoryHours: hoursSchema.nullable(),
    practiceHours: hoursSchema.nullable(),
  }),
  { module: 'corrections' },
);
export const ISSUE_REPORT_ITEM = defineItemType(
  'issue_report',
  z
    .object({
      id: issueReportIdSchema,
      sessionId: sessionIdSchema,
      record: recordKeySchema.nullable(),
      // The decision version the phone showed for the record, a JSON number; a trace only,
      // it does not move the report's time limit. Only a report on a record has one.
      decisionVersion: decisionVersionSchema.nullable(),
      issueReasonCode: issueReasonCodeSchema,
    })
    .refine((item) => item.decisionVersion === null || item.record !== null, {
      message: 'A decision version needs its record',
      path: ['decisionVersion'],
    }),
  { module: 'corrections' },
);

// The audit event envelope (denetimeYaz). Every module writes its events through the
// corrections module's writer, which checks the envelope with this schema and the details
// with the event type's registered schema, upper-cases code and target.kind, and refuses
// details over 8 KB. The actor's role is the role of the route that allowed the action.
// An event that names a course names its unit too: null for a course without a unit (I045).

/** The largest audit event details, as UTF-8 JSON. */
export const AUDIT_DETAILS_MAX_BYTES = 8 * 1024;

// The bounds of the audit table's CHECKs, so a wrong value fails here, not at INSERT.
const AUDIT_EVENT_NAME = /^[a-z][a-z0-9_]{1,62}$/;
const AUDIT_TARGET_KIND = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const isAuditEventType = (type: string) => {
  const [module, event, ...rest] = type.split('.');
  return (
    rest.length === 0 &&
    (MODULES as readonly string[]).includes(module ?? '') &&
    AUDIT_EVENT_NAME.test(event ?? '')
  );
};

export const auditEventInputSchema = z
  .strictObject({
    type: z
      .string()
      .max(AUDIT_EVENT_TYPE_MAX)
      .refine(isAuditEventType, { message: 'An event type is <module>.<event>' }),
    at: z.date(),
    actor: z.discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('PERSON'),
        personId: personIdSchema,
        role: z.enum(PERSON_ROLES),
      }),
      z.strictObject({ kind: z.literal('SYSTEM') }),
      z.strictObject({ kind: z.literal('COMMAND_LINE') }),
    ]),
    client: z.enum(AUDIT_CLIENTS),
    requestId: z.string().min(1).max(64).optional(),
    operationId: clientIdSchema.optional(),
    clientAt: z.date().optional(),
    termId: termIdSchema.optional(),
    unitId: unitIdSchema.nullable().optional(),
    courseId: courseIdSchema.optional(),
    sessionId: sessionIdSchema.optional(),
    studentId: personIdSchema.optional(),
    rosterRowId: rosterRowIdSchema.optional(),
    record: z.strictObject(recordKeySchema.shape).optional(),
    // The writer upper-cases kind.
    target: z
      .strictObject({ kind: z.string().max(40).regex(AUDIT_TARGET_KIND), id: z.uuid() })
      .optional(),
    code: z.string().min(1).max(64).optional(),
    before: jsonObjectSchema.optional(),
    after: jsonObjectSchema.optional(),
    details: jsonObjectSchema.optional(),
  })
  .refine((event) => event.courseId === undefined || event.unitId !== undefined, {
    message: 'An event with courseId carries unitId, null for a course without a unit',
    path: ['unitId'],
  });

export type AuditEventInput = z.input<typeof auditEventInputSchema>;

// Audit events of this module. The detail schemas are registered with the audit writer,
// which rejects an unknown detail field; CORRECTIONS_AUDIT_CHANGES holds the before and
// after schemas of each type (null: the event has none). No detail carries a student
// number, a name or a document number.

export const CORRECTIONS_AUDIT_EVENTS = {
  // A new chain head, or the first row after a reversal; target CORRECTION, code the
  // reason code.
  'corrections.correction_added': noDetailsSchema,
  // A new row in place of the active one; target the new row.
  'corrections.correction_replaced': z.strictObject({ previousCorrectionId: correctionIdSchema }),
  // Target the reversal row.
  'corrections.correction_reversed': z.strictObject({
    reversedCorrectionId: correctionIdSchema,
    reopenedIssueReportId: issueReportIdSchema.nullable(),
  }),
  // A queued manual add that an active correction kept out; a resent item writes no
  // second event.
  'corrections.manual_add_rejected': z.strictObject({
    itemId: correctionIdSchema,
    activeCorrectionId: correctionIdSchema,
  }),
  // code APPROVE or REJECT.
  'corrections.self_declared_decided': noDetailsSchema,
  // code APPROVE or REJECT; counted only on an approval.
  'corrections.review_decided': z.strictObject({ counted: z.boolean().nullable() }),
  'corrections.decision_changed': z.strictObject({ decisionReason: z.string().max(64) }),
  // The close of a bulk review; target FLAG.
  'corrections.flagged_session_reviewed': noDetailsSchema,
  // code the issue reason code.
  'corrections.issue_report_received': z.strictObject({
    status: z.enum(['OPEN', 'EXPIRED']),
    clockSource: z.enum(PRESSED_AT_SOURCES),
    clientDecisionVersion: decisionVersionSchema.nullable(),
  }),
  // code CORRECTED or NO_CHANGE.
  'corrections.issue_report_closed': noDetailsSchema,
  // The correction that closed the report was undone.
  'corrections.issue_report_reopened': z.strictObject({ reversedCorrectionId: correctionIdSchema }),
} as const satisfies Readonly<Record<string, z.ZodObject>>;

export type CorrectionsAuditEvent = keyof typeof CORRECTIONS_AUDIT_EVENTS;

const decisionState = z.strictObject({ decision: z.enum(RECORD_DECISIONS) });
const decisionChange = { before: decisionState, after: decisionState };
const noChange = { before: null, after: null };

export const CORRECTIONS_AUDIT_CHANGES = {
  'corrections.correction_added': noChange,
  'corrections.correction_replaced': noChange,
  'corrections.correction_reversed': noChange,
  'corrections.manual_add_rejected': noChange,
  'corrections.self_declared_decided': decisionChange,
  // The expected decision before, the new one after.
  'corrections.review_decided': decisionChange,
  'corrections.decision_changed': decisionChange,
  'corrections.flagged_session_reviewed': noChange,
  'corrections.issue_report_received': noChange,
  'corrections.issue_report_closed': noChange,
  'corrections.issue_report_reopened': noChange,
} as const satisfies Record<
  CorrectionsAuditEvent,
  { before: z.ZodObject | null; after: z.ZodObject | null }
>;

// Answer types.

export type Correction = z.infer<typeof correctionSchema>;
export type IssueReport = z.infer<typeof issueReportSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
