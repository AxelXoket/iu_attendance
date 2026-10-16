// Verification contract (D07): the device verification value, the head count answer and
// item, the random name and not-in-class routes, the VERIFICATION_ error catalog, the
// audit events, the four advisory key functions, and the types the attendance, identity
// and corrections modules call the verification module with. The code lists (decision
// reasons, labels, events, proof reasons) live in core (verification/codes.ts) beside the
// rules that read them; this file re-exports them.

import { compareText } from '@iu-attendance/core/shared/text';
import { idKey } from '@iu-attendance/core/shared/uuid';
import {
  CONTEXT_CHANGING_CODE,
  DECISION_REASON_CODES,
  type DECISION_VERSION,
  type DecisionEvent,
  type DecisionReason,
  type DecisionSource,
  IOS_ANOMALY_KINDS,
  type Labels,
  type ProofReason,
  type ProofResult,
  RECORD_DECISIONS,
  REVOCATION_STATUSES,
  type RecordDecision,
  type SessionFlagKind,
  VERIFICATION_PURPOSES,
  type VerificationPurpose,
} from '@iu-attendance/core/verification/codes';
import {
  HEAD_COUNT_MAX,
  LOCK_EVENT_RECORDS_MAX,
  RANDOM_NAME_PICKS_MAX,
  RANDOM_NAME_PRESS_LIMIT,
  VERIFICATION_VALUE_BYTES,
  VERIFICATION_VALUE_LIFETIME_MS,
} from '@iu-attendance/core/verification/constants';
import { z } from 'zod';
import type { Platform } from './api.ts';
import {
  attendancePairKey,
  type RecordKey,
  recordIdSchema,
  recordKeySchema,
} from './attendance.ts';
import {
  type CourseId,
  courseIdSchema,
  type SectionId,
  type SessionId,
  sessionIdSchema,
  type TermId,
  termIdSchema,
} from './courses.ts';
import type { SECRET_KEY_PURPOSES } from './operations.ts';
import {
  base64UrlBytesSchema,
  type DeviceId,
  type DeviceKeyId,
  defineErrorCodes,
  defineItemType,
  defineRoute,
  deviceIdSchema,
  extensibleEnum,
  type Id,
  instantSchema,
  OPERATIONAL_CODE,
  type PersonId,
  personIdSchema,
  sameText,
  sessionAccess,
  studentNumberSchema,
  unitIdSchema,
  v7IdSchema,
} from './shared/index.ts';

export {
  CONTEXT_CHANGING_CODE,
  DECISION_EVENTS,
  DECISION_PRIORITY,
  DECISION_REASON_CODES,
  DECISION_REASONS,
  DECISION_SOURCES,
  DECISION_VERSION,
  type DecisionEvent,
  type DecisionReason,
  type DecisionSource,
  HISTORY_EVENTS,
  type HistoryEvent,
  INTERNAL_REEVALUATION_REASONS,
  IOS_ANOMALY_KINDS,
  type Labels,
  PROOF_REASONS,
  PROOF_RESULTS,
  type ProofReason,
  type ProofResult,
  RECORD_LABELS,
  REEVALUATION_REASONS,
  REVOCATION_STATUSES,
  type RecordLabel,
  type ReevaluationReason,
  SESSION_FLAG_KINDS,
  type SessionFlagKind,
  VERIFICATION_PURPOSES,
  type VerificationPurpose,
} from '@iu-attendance/core/verification/codes';

// Identifiers.

export type ProofId = Id<'Proof'>;
export const proofIdSchema = v7IdSchema('Proof');
export type SessionFlagId = Id<'SessionFlag'>;
export const sessionFlagIdSchema = v7IdSchema('SessionFlag');
// The phone makes one per press; the same id answers the same students.
export const randomPickIdSchema = v7IdSchema('RandomPick');

// Advisory keys; their layers are ADVISORY_LAYERS in the database contract. Ids are
// written in lower case, as the database returns them, so a key built from signed text
// and one built from a stored row are the same key.

/** The key a roster write takes for each changed section, and a decision tries shared. */
export function verificationRosterKey(sectionId: string): string {
  return `verification:roster:${idKey(sectionId)}`;
}

/** The key a confirmation or account write takes for the student, and a decision tries shared. */
export function verificationConfirmationKey(studentId: string): string {
  return `verification:confirmation:${idKey(studentId)}`;
}

/** The key of one App Attest signing key's counter. */
export function verificationCounterKey(keyId: string): string {
  if (keyId === '') throw new RangeError('a signing key id is not empty');
  return `verification:counter:${idKey(keyId)}`;
}

/** The key a head count comparison takes for its session's flag. */
export function verificationFlagKey(sessionId: string): string {
  return `verification:flag:${idKey(sessionId)}`;
}

/**
 * The keys every decision path takes for these records, each once, in (layer, key)
 * order: the attendance pair key of each (session, student) and the counter key of each
 * signing key given. No context or flag key: those are tried or taken apart.
 */
export function decisionKeys(
  inputs: readonly { sessionId: string; studentId: string; keyId: string | null }[],
): readonly string[] {
  const pairs = new Set<string>();
  const counters = new Set<string>();
  for (const { sessionId, studentId, keyId } of inputs) {
    pairs.add(attendancePairKey(sessionId, studentId));
    if (keyId !== null) counters.add(verificationCounterKey(keyId));
  }
  return [...[...pairs].sort(compareText), ...[...counters].sort(compareText)];
}

// Item and the decision types shared with the attendance, identity and corrections modules.

const headCountSchema = z.number().int().min(0).max(HEAD_COUNT_MAX);

// The lecturer's head count, sent from the phone queue.
export const HEAD_COUNT_ITEM = defineItemType(
  'head_count',
  z.object({ sessionId: sessionIdSchema, headCount: headCountSchema }),
  { module: 'verification' },
);
export type HeadCountBody = z.infer<typeof HEAD_COUNT_ITEM.body>;

// One submission transaction's cache: the attendance module opens it once and hands the
// same object to every decision of the transaction; only the verification module reads it.
export type DecisionContext = { readonly cache: Map<string, unknown> };

declare const decisionHistory: unique symbol;
/** The verification module's history fields; the attendance module hands them back unread. */
export type DecisionHistory = { readonly [decisionHistory]: true };

// A decision as both modules write it, and what only the verification module adds: who
// decided, and the history fields.
export type DecisionResult = {
  readonly decision: RecordDecision;
  readonly reasonCode: DecisionReason | null;
  readonly extraReasons: readonly DecisionReason[];
  readonly labels: Labels;
  readonly late: boolean;
  readonly decisionVersion: typeof DECISION_VERSION;
  readonly decisionSource: DecisionSource;
  readonly actorPersonId: PersonId | null;
  readonly history: DecisionHistory;
};
export type FirstDecisionSource = { readonly event: 'RECORD_ARRIVED' };
export type NewDecision = {
  readonly decision: Extract<RecordDecision, 'PRESENT' | 'REJECTED'>;
  readonly expectedDecision: RecordDecision;
};
export type LecturerDecisionSource = {
  readonly kind: 'LECTURER';
  readonly personId: PersonId;
  readonly event: DecisionEvent;
  readonly operationId: string;
};
// One step of a record's decision history; sequence is the step's place in it.
type DecisionStep = {
  readonly decision: RecordDecision;
  readonly reasonCode: DecisionReason | null;
  readonly sequence: number;
};
// StoredRecord is the attendance module's record row; the corrections module reads its
// counted flag. Generic until the attendance contract types its record.
export type DecisionChange<StoredRecord extends { readonly counted: boolean }> = {
  readonly changed: boolean;
  readonly previous: DecisionStep;
  readonly next: DecisionStep;
  readonly record: StoredRecord;
};

// The device proof the identity module hands over with a registration, a phone change or
// an App Attest key renewal. Keys and signatures are DER bytes; the device id is part of
// neither the binding text nor the challenge.
export type DeviceEvidence = {
  readonly deviceId: DeviceId;
  readonly keyId: DeviceKeyId;
  readonly platform: Platform;
  readonly purpose: VerificationPurpose;
  readonly studentNumber: string;
  readonly value: string;
  /** null on an iPhone. */
  readonly isSystemUser: boolean | null;
  /** The Secure Enclave key (SPKI); null on Android. */
  readonly secureEnclaveKey: Uint8Array | null;
  readonly bindingSignature: { readonly signature: Uint8Array; readonly publicKey: Uint8Array };
  readonly proof:
    | {
        readonly kind: 'android_key_attestation';
        /** Leaf first, at most 10 certificates. */
        readonly chain: readonly Uint8Array[];
        readonly publicKey: Uint8Array;
      }
    | {
        readonly kind: 'app_attest';
        readonly keyIdentifier: Uint8Array;
        readonly attestationObject: Uint8Array;
      }
    | { readonly kind: 'none' };
};
export type ProofOutcome = {
  readonly result: ProofResult;
  readonly reason: ProofReason | null;
  /** null when rejected: a rejected proof leaves no row. */
  readonly proofId: ProofId | null;
  readonly securityLevel: string | null;
  /** null on an iPhone. */
  readonly verifiedBoot: boolean | null;
  readonly iosBootVerificationKind: string | null;
  readonly iosBundleVersion: string | null;
  readonly appAttestEnvironment: 'production' | 'development' | null;
};

// Which records a re-evaluation looks at; the fields given apply together. The reason
// matches the primary or an extra reason; the module's own wait expiry uses it alone.
export type ReevaluationFilter = {
  readonly recordKeys?: readonly RecordKey[];
  readonly sessionId?: SessionId;
  readonly reasonCode?: DecisionReason;
  readonly studentId?: PersonId;
  readonly deviceId?: DeviceId;
  readonly courseId?: CourseId;
  readonly sectionIds?: readonly SectionId[];
  readonly studentNumbers?: readonly string[];
  readonly documentKid?: {
    readonly purpose: Extract<
      (typeof SECRET_KEY_PURPOSES)[number],
      'clock_document' | 'qr_key_source'
    >;
    readonly kid: string;
  };
};
export type ReevaluationCounts = {
  readonly examined: number;
  readonly changed: number;
  readonly kept: number;
};

// The corrections module reads session flags for a lecturer's courses, for its nightly
// batch and for one session; the fields given apply together.
export type SessionFlagFilter = {
  readonly termId?: TermId;
  readonly courseIds?: readonly CourseId[];
  readonly sessionIds?: readonly SessionId[];
  readonly kind?: SessionFlagKind;
  readonly valid?: boolean;
  readonly reviewed?: boolean;
};
export type SessionFlag = {
  readonly id: SessionFlagId;
  readonly termId: TermId;
  readonly courseId: CourseId;
  readonly sessionId: SessionId;
  readonly kind: SessionFlagKind;
  /** Whether the latest count still crosses the threshold; frozen once final. */
  readonly valid: boolean;
  readonly firstFlaggedAt: Date | null;
  /** Whether the first flag came before the session ended; null without one. */
  readonly duringClass: boolean | null;
  /** Set for a head count flag; null for a QR display flag. */
  readonly lastHeadCount: number | null;
  readonly lastRecordCount: number | null;
  readonly lastCountedAt: Date;
  readonly finalAt: Date | null;
  readonly reviewedAt: Date | null;
  readonly reviewerId: PersonId | null;
};

// Error catalog. Item codes keep a text because the lecturer's phone shows them; the
// outer-face results map to the caller's own codes and reach no client as they are.

export const VERIFICATION_ERROR_CODES = defineErrorCodes('verification', {
  VERIFICATION_NOT_FOUND: {
    http: 404,
    ...sameText('Aranan oturum bulunamadı.', 'The requested session was not found.'),
  },
  VERIFICATION_SESSION_CANCELLED: {
    http: 409,
    ...sameText('Bu oturum iptal edilmiş.', 'This session was cancelled.'),
  },
  VERIFICATION_SESSION_DAY_PASSED: {
    http: 409,
    ...sameText('Oturumun günü geçti.', 'The day of the session has passed.'),
  },
  VERIFICATION_TERM_LOCKED: {
    http: 409,
    ...sameText(
      'Dönem kilitli; kararlar artık değişmez.',
      'The term is locked; decisions no longer change.',
    ),
  },
  VERIFICATION_PICK_ID_CONFLICT: {
    http: 409,
    ...sameText(
      'Bu seçim başka bir oturum için kullanılmış.',
      'This pick was used for another session.',
    ),
  },
  VERIFICATION_PICK_LIMIT: {
    http: 409,
    ...sameText(
      `Kafa sayısından önce en çok ${RANDOM_NAME_PRESS_LIMIT} kez rastgele isim seçilebilir.`,
      `A random name can be picked at most ${RANDOM_NAME_PRESS_LIMIT} times before the head count.`,
    ),
  },
  VERIFICATION_STUDENT_RECORD_MISSING: {
    http: 404,
    ...sameText('Öğrencinin bu oturumda kaydı yok.', 'The student has no record in this session.'),
  },
  VERIFICATION_STUDENT_NOT_PICKED: {
    http: 409,
    ...sameText('Öğrenci bu oturumda seçilmedi.', 'The student was not picked in this session.'),
  },
  VERIFICATION_MARK_MISSING: {
    http: 404,
    ...sameText(
      'Geri alınacak bir burada değil işareti yok.',
      'There is no not-in-class mark to undo.',
    ),
  },
  VERIFICATION_MARKED_BY_OTHER_LECTURER: {
    http: 409,
    ...sameText(
      'İşareti başka bir hoca koydu; yalnız o geri alabilir.',
      'Another lecturer set the mark; only they can undo it.',
    ),
  },
  VERIFICATION_LECTURER_UNAUTHORIZED: {
    http: null,
    ...sameText(
      'Bu dersin hocası olmadığınız için kafa sayısı yazılmadı.',
      'The head count was not written: you are not the lecturer of this course.',
    ),
  },
  VERIFICATION_BODY_INVALID: {
    http: null,
    ...sameText('Kafa sayısı okunamadı.', 'The head count could not be read.'),
  },
  [CONTEXT_CHANGING_CODE]: {
    http: null,
    ...sameText(
      'Kayıt birkaç saniye sonra yeniden gönderilecek.',
      'The record is sent again in a few seconds.',
    ),
  },
  VERIFICATION_VALUE_INVALID: OPERATIONAL_CODE,
  VERIFICATION_DECISION_CHANGED: OPERATIONAL_CODE,
  VERIFICATION_TRANSITION_INVALID: OPERATIONAL_CODE,
});

export type VerificationErrorCode = keyof typeof VERIFICATION_ERROR_CODES;
const errors = (...codes: VerificationErrorCode[]) => codes;

// The item codes the head count item may return, besides the sync module's own.
export const VERIFICATION_ITEM_CODES = {
  head_count: errors(
    'VERIFICATION_NOT_FOUND',
    'VERIFICATION_LECTURER_UNAUTHORIZED',
    'VERIFICATION_BODY_INVALID',
  ),
} as const;

// Routes. The key is the route name.

const staff = sessionAccess('staff');
const sessionParams = z.object({ sessionId: sessionIdSchema });
// A record as the not-in-class routes answer it.
const markedRecordSchema = recordKeySchema.extend({
  decision: extensibleEnum(RECORD_DECISIONS),
  reason: extensibleEnum(DECISION_REASON_CODES).nullable(),
});

export const VERIFICATION_ROUTES = {
  issueValue: defineRoute({
    module: 'verification',
    name: 'issueValue',
    method: 'POST',
    path: '/v1/verification/value',
    auth: ['anonymous'],
    audience: 'student',
    rate: 'anonymous',
    request: { body: z.object({ purpose: z.enum(VERIFICATION_PURPOSES) }) },
    response: {
      statuses: [200],
      schema: z.object({
        // Shown only in this answer and never logged; it grants nothing alone.
        value: base64UrlBytesSchema(VERIFICATION_VALUE_BYTES),
        expiresAt: instantSchema,
      }),
    },
    errors: errors(),
    summary: `A one-time value for a device proof, alive for ${VERIFICATION_VALUE_LIFETIME_MS / 60_000} minutes.`,
  }),
  getHeadCount: defineRoute({
    module: 'verification',
    name: 'getHeadCount',
    method: 'GET',
    path: '/v1/verification/sessions/{sessionId}/head-count',
    ...staff,
    request: { params: sessionParams },
    response: {
      statuses: [200],
      schema: z.object({
        sessionId: sessionIdSchema,
        headCount: z.number().int().nullable(),
        held: z.boolean().nullable(),
        // null while both the head count and the held answer are missing.
        recordCount: z.number().int().nullable(),
        // Within the record count: roster rows counted by a manual add, with no record.
        manuallyAddedCount: z.number().int().nullable(),
        // Record count minus head count; null without a head count.
        difference: z.number().int().nullable(),
        flagged: z.boolean(),
        flaggedAt: instantSchema.nullable(),
        duringClass: z.boolean().nullable(),
        reviewed: z.boolean(),
        final: z.boolean(),
        finalAt: instantSchema,
        // Before the sending time ends, some records may still be on their way.
        mayBeIncomplete: z.boolean(),
      }),
    },
    errors: errors('VERIFICATION_NOT_FOUND'),
    summary: "A session's head count against its records, and whether it is flagged.",
  }),
  pickRandomNames: defineRoute({
    module: 'verification',
    name: 'pickRandomNames',
    method: 'POST',
    path: '/v1/verification/sessions/{sessionId}/random-name',
    ...staff,
    // The button is on the lecturer's phone.
    authSources: ['bearer'],
    request: { params: sessionParams, body: z.object({ pickId: randomPickIdSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        pickId: randomPickIdSchema,
        // Empty when no candidate is left.
        students: z
          .array(
            z.object({
              studentId: personIdSchema,
              fullName: z.string(),
              studentNumber: studentNumberSchema,
            }),
          )
          .max(RANDOM_NAME_PICKS_MAX),
      }),
    },
    errors: errors(
      'VERIFICATION_NOT_FOUND',
      'VERIFICATION_SESSION_CANCELLED',
      'VERIFICATION_SESSION_DAY_PASSED',
      'VERIFICATION_TERM_LOCKED',
      'VERIFICATION_PICK_ID_CONFLICT',
      'VERIFICATION_PICK_LIMIT',
    ),
    summary: `Picks up to ${RANDOM_NAME_PICKS_MAX} students to call; the same pick id answers the same students.`,
  }),
  markNotInClass: defineRoute({
    module: 'verification',
    name: 'markNotInClass',
    method: 'POST',
    path: '/v1/verification/sessions/{sessionId}/not-in-class',
    ...staff,
    request: { params: sessionParams, body: z.object({ studentId: personIdSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        studentId: personIdSchema,
        status: extensibleEnum(['NOT_IN_CLASS']),
        markedAt: instantSchema,
        records: z.array(markedRecordSchema),
      }),
    },
    errors: errors(
      'VERIFICATION_NOT_FOUND',
      'VERIFICATION_STUDENT_RECORD_MISSING',
      'VERIFICATION_STUDENT_NOT_PICKED',
      'VERIFICATION_SESSION_DAY_PASSED',
      'VERIFICATION_TERM_LOCKED',
    ),
    summary: "Rejects a picked student's records in the session; a repeat changes nothing.",
  }),
  undoNotInClass: defineRoute({
    module: 'verification',
    name: 'undoNotInClass',
    method: 'DELETE',
    path: '/v1/verification/sessions/{sessionId}/not-in-class/{studentId}',
    ...staff,
    request: { params: z.object({ sessionId: sessionIdSchema, studentId: personIdSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        studentId: personIdSchema,
        status: extensibleEnum(['UNDONE']),
        records: z.array(markedRecordSchema),
      }),
    },
    errors: errors(
      'VERIFICATION_NOT_FOUND',
      'VERIFICATION_MARK_MISSING',
      'VERIFICATION_MARKED_BY_OTHER_LECTURER',
      'VERIFICATION_SESSION_DAY_PASSED',
      'VERIFICATION_TERM_LOCKED',
    ),
    summary: 'Undoes the same day the mark the caller set; the records get their decisions back.',
  }),
};

// Audit events. Every event that carries a course carries its unit too.

const courseScope = { sessionId: sessionIdSchema, courseId: courseIdSchema, unitId: unitIdSchema };
// A large session's records are split over several events of one lock.
const locked = z
  .strictObject({
    ...courseScope,
    termId: termIdSchema,
    lockedAt: instantSchema,
    part: z.number().int().min(1),
    partCount: z.number().int().min(1),
    recordIds: z.array(recordIdSchema).min(1).max(LOCK_EVENT_RECORDS_MAX),
  })
  .refine((event) => event.part <= event.partCount, { message: 'part is within partCount' });
const notInClass = z.strictObject({
  ...courseScope,
  studentId: personIdSchema,
  records: z.array(recordKeySchema.strict()),
  lecturerId: personIdSchema,
});
const revocation = z.strictObject({
  deviceId: deviceIdSchema,
  proofId: proofIdSchema,
  status: z.enum(REVOCATION_STATUSES),
});

export const VERIFICATION_AUDIT_EVENTS = {
  'verification.head_count_entered': z.strictObject({
    ...courseScope,
    previousHeadCount: headCountSchema.nullable(),
    headCount: headCountSchema,
    // What the courses module did with it: written, or a conflict with the held answer.
    coursesResult: z.enum(['written', 'conflict']),
    lecturerId: personIdSchema,
  }),
  'verification.not_in_class_marked': notInClass,
  'verification.not_in_class_undone': notInClass,
  'verification.unapproved_locked': locked,
  'verification.undecided_locked': locked,
  'verification.device_revoked': revocation,
  'verification.device_revocation_lifted': revocation,
  // The kind of anomaly, never the value's text.
  'verification.ios_unexpected_field': z.strictObject({
    deviceId: deviceIdSchema,
    anomaly: z.enum(IOS_ANOMALY_KINDS),
  }),
} as const satisfies Readonly<Record<string, z.ZodObject>>;

export type VerificationAuditEvent = keyof typeof VERIFICATION_AUDIT_EVENTS;
