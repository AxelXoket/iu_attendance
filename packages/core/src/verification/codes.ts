// Verification code lists (D07): the decision reason catalog, the record labels, the
// decision events, the re-evaluation reasons, the history events and the device proof
// reasons. The verification contract re-exports them, the database CHECK lists and the
// answers' extensible enums come from them, and the decision rule reads the catalog's
// order: core never imports contracts, so the lists live here.

import { nonEmpty } from '../shared/list.ts';

// The four decisions of an attendance record. D07 is their one writer; the corrections
// module's final status rule and the contracts read them from here.
export const RECORD_DECISIONS = ['PRESENT', 'PENDING', 'IN_REVIEW', 'REJECTED'] as const;
export type RecordDecision = (typeof RECORD_DECISIONS)[number];

// Who set a record's decision: the verification rule or a lecturer.
export const DECISION_SOURCES = ['AUTOMATIC', 'LECTURER'] as const;
export type DecisionSource = (typeof DECISION_SOURCES)[number];

// Which decision wins when several rules fit: a rejection, then a missing precondition,
// then a doubt, then present.
export const DECISION_PRIORITY = [
  'REJECTED',
  'PENDING',
  'IN_REVIEW',
  'PRESENT',
] as const satisfies readonly RecordDecision[];

type ReasonDefinition = {
  readonly code: string;
  readonly decision: RecordDecision;
  readonly source: DecisionSource;
  /** 2: produced only once QR check-in runs (stage 2); listed from the start. */
  readonly stage: 1 | 2;
  /** The decision may still change the outcome: the absence module waits for it. */
  readonly openFlag: boolean;
};

// Most reasons are automatic, stage 1, and open exactly while pending or in review; the
// rows below name only what differs.
const reason = <const Code extends string, const Decision extends RecordDecision>(
  code: Code,
  decision: Decision,
  differs: { readonly source?: DecisionSource; readonly stage?: 2; readonly openFlag?: false } = {},
): ReasonDefinition & { readonly code: Code; readonly decision: Decision } => ({
  code,
  decision,
  source: differs.source ?? 'AUTOMATIC',
  stage: differs.stage ?? 1,
  openFlag: differs.openFlag ?? (decision === 'PENDING' || decision === 'IN_REVIEW'),
});
const lecturer = { source: 'LECTURER' } as const;
const stageTwo = { stage: 2 } as const;

// The decision reason catalog, by decision in priority order; within a decision the
// first reason that fits is the primary one, the others go to the history's extra reasons.
export const DECISION_REASONS = [
  reason('CONFIRMATION_REJECTED', 'REJECTED'),
  reason('DELETED_ACCOUNT', 'REJECTED'),
  reason('DEVICE_NOT_APPROVED', 'REJECTED'),
  reason('OLD_DEVICE', 'REJECTED'),
  reason('SESSION_CANCELLED', 'REJECTED'),
  reason('NOT_ON_ROSTER', 'REJECTED'),
  reason('AFTER_ARRIVAL', 'REJECTED'),
  reason('OUTSIDE_WINDOW', 'REJECTED'),
  reason('QR_SESSION_MISMATCH', 'REJECTED', stageTwo),
  reason('QR_LECTURER_UNAUTHORIZED', 'REJECTED', stageTwo),
  reason('QR_MAC_INVALID', 'REJECTED', stageTwo),
  reason('BACKUP_CODE_WRONG', 'REJECTED', stageTwo),
  reason('QR_DELAY_EXCEEDED', 'REJECTED', stageTwo),
  reason('NOT_IN_CLASS_AT_CHECK', 'REJECTED', lecturer),
  reason('SELF_DECLARED_REJECTED', 'REJECTED', lecturer),
  reason('LECTURER_REJECTED', 'REJECTED', lecturer),
  reason('CONFIRMATION_PENDING', 'PENDING'),
  reason('DEVICE_CHANGE_PENDING', 'PENDING'),
  reason('SETTING_NOT_FINAL', 'PENDING'),
  reason('QR_DISPLAY_PENDING', 'PENDING', stageTwo),
  // Frozen once given: the only review reason without an open flag.
  reason('AFTER_LAST_DAY', 'IN_REVIEW', { openFlag: false }),
  reason('CLOSED_DEVICE_TIME_UNCERTAIN', 'IN_REVIEW'),
  reason('DEVICE_CHANGE_EXPIRED', 'IN_REVIEW'),
  reason('COUNTER_NOT_INCREASED', 'IN_REVIEW'),
  reason('CLOCK_KEY_COMPROMISED', 'IN_REVIEW'),
  reason('ANCHORS_DISAGREE', 'IN_REVIEW'),
  // The server's own clock sync, not the clock module's phone-side SYNC_BROKEN.
  reason('SERVER_SYNC_BROKEN', 'IN_REVIEW'),
  reason('FAULTY_VERSION', 'IN_REVIEW'),
  reason('OLD_SCHEDULE', 'IN_REVIEW'),
  reason('OVERLAPPING_SESSION', 'IN_REVIEW'),
  reason('NO_QR_IN_QR_CLASS', 'IN_REVIEW', stageTwo),
  reason('QR_DELAY_UNCERTAIN', 'IN_REVIEW', stageTwo),
  reason('QR_SCANNED_EARLY', 'IN_REVIEW', stageTwo),
  reason('QR_OUTSIDE_DISPLAY', 'IN_REVIEW', stageTwo),
  reason('QR_DISPLAY_MISSING', 'IN_REVIEW', stageTwo),
  reason('QR_LECTURER_CLOCK_MISSING', 'IN_REVIEW', stageTwo),
  reason('QR_KEY_COMPROMISED', 'IN_REVIEW', stageTwo),
  reason('QR_KEY_REVOKED', 'IN_REVIEW', stageTwo),
  reason('QR_ANCHORS_OLD', 'IN_REVIEW', stageTwo),
  reason('BACKUP_CODE_LIMIT', 'IN_REVIEW', stageTwo),
  reason('SHARED_LIMIT_EXCEEDED', 'IN_REVIEW'),
  reason('ACCEPTED_BY_SHARED_LIMIT', 'PRESENT'),
  reason('LECTURER_APPROVED', 'PRESENT', lecturer),
  reason('SELF_DECLARED_APPROVED', 'PRESENT', lecturer),
] as const;

export type DecisionReason = (typeof DECISION_REASONS)[number]['code'];
export const DECISION_REASON_CODES = nonEmpty(DECISION_REASONS.map((entry) => entry.code));

export type DecisionReasonDefinition = (typeof DECISION_REASONS)[number];

/** A reason's catalog row. RangeError for a code not in the catalog. */
export function reasonDefinition(code: DecisionReason): DecisionReasonDefinition {
  const definition = DECISION_REASONS.find((entry) => entry.code === code);
  if (definition === undefined) throw new RangeError(`unknown decision reason ${code}`);
  return definition;
}

// The labels of a record: seven flags set once, when the record arrives.
export const RECORD_LABELS = [
  'NO_QR',
  'SELF_DECLARED',
  'CLOCK_UNVERIFIED',
  'DEVICE_UNVERIFIED',
  'SECOND_PROFILE',
  'BACKUP_CODE',
  'VERIFIED',
] as const;
export type RecordLabel = (typeof RECORD_LABELS)[number];
export type Labels = Readonly<Record<RecordLabel, boolean>>;

// A lecturer's decision events, for the corrections module's decisions; the verification
// module derives the reason from the event. CHANGE_DECISION is the corrections module's
// review context of the same name.
export const DECISION_EVENTS = [
  'SELF_DECLARED_APPROVE',
  'SELF_DECLARED_REJECT',
  'REVIEW_APPROVE',
  'REVIEW_REJECT',
  'FLAGGED_SESSION_REJECT',
  'CHANGE_DECISION',
  'NOT_IN_CLASS',
  'NOT_IN_CLASS_UNDONE',
] as const;
export type DecisionEvent = (typeof DECISION_EVENTS)[number];

// Why other modules ask the verification module to decide records again; meant for the
// identity, roster, projection and operations modules to import, not to write again.
export const REEVALUATION_REASONS = [
  'CONFIRMATION_GIVEN',
  'CONFIRMATION_REJECTED',
  'DEVICE_CHANGE_APPROVED',
  'DEVICE_CHANGE_REJECTED',
  'CHANGE_CANCELLED',
  'ACCOUNT_DELETED',
  'ACCOUNT_CLOSED',
  'DEVICE_CLOSED',
  'ROSTER_CHANGED',
  'QR_DISPLAY_RECORDED',
  'KEY_COMPROMISED',
] as const;
export type ReevaluationReason = (typeof REEVALUATION_REASONS)[number];

// The verification module's own reasons to decide again; no other module passes them.
export const INTERNAL_REEVALUATION_REASONS = [
  'WINDOW_CHANGED',
  'HEAD_COUNT_ARRIVED',
  'SETTING_FINAL',
  'OUTAGE_CLOSED',
  'WAIT_EXPIRED',
] as const;

// What caused a step of a record's decision history.
export const HISTORY_EVENTS = [
  'RECORD_ARRIVED',
  ...REEVALUATION_REASONS,
  ...INTERNAL_REEVALUATION_REASONS,
  ...DECISION_EVENTS,
] as const;
export type HistoryEvent = (typeof HISTORY_EVENTS)[number];

// The device proof: rejected when the binding signature fails or the app is not ours,
// verified when every check holds, unverified otherwise.
export const PROOF_RESULTS = ['verified', 'unverified', 'rejected'] as const;
export type ProofResult = (typeof PROOF_RESULTS)[number];
export const PROOF_REASONS = {
  BINDING_SIGNATURE_INVALID: 'rejected',
  NO_EVIDENCE: 'unverified',
  CHAIN_INVALID: 'unverified',
  ROOT_UNKNOWN: 'unverified',
  ON_REVOCATION_LIST: 'unverified',
  CHALLENGE_MISMATCH: 'unverified',
  KEY_MISMATCH: 'unverified',
  PACKAGE_MISMATCH: 'rejected',
  SIGNING_CERTIFICATE_MISMATCH: 'rejected',
  APP_ID_MISMATCH: 'rejected',
  SOFTWARE_SECURITY_LEVEL: 'unverified',
  BOOT_NOT_VERIFIED: 'unverified',
  BOOTLOADER_UNLOCKED: 'unverified',
  APP_ATTEST_INVALID: 'unverified',
  APP_ATTEST_DEVELOPMENT: 'unverified',
} as const satisfies Readonly<Record<string, Exclude<ProofResult, 'verified'>>>;
export type ProofReason = keyof typeof PROOF_REASONS;

// What a device verification value is for; the identity module's three requests.
export const VERIFICATION_PURPOSES = [
  'registration',
  'device_change',
  'app_attest_renewal',
] as const;
export type VerificationPurpose = (typeof VERIFICATION_PURPOSES)[number];

// Session flags: a head count the records exceed, and (stage 2) a QR display without a
// valid clock document.
export const SESSION_FLAG_KINDS = ['HEAD_COUNT_EXCEEDED', 'QR_DISPLAY_WITHOUT_DOCUMENT'] as const;
export type SessionFlagKind = (typeof SESSION_FLAG_KINDS)[number];

// The decision's answer while a student's confirmation or a session's roster is being
// written: the attendance module passes it on as the item code, and the phone sends the
// record again a moment later.
export const CONTEXT_CHANGING_CODE = 'VERIFICATION_CONTEXT_CHANGING';

// The version of the decision rule a result was made with.
export const DECISION_VERSION = 1;

// A device's state on the attestation revocation list, as its audit event records it.
export const REVOCATION_STATUSES = ['REVOKED', 'SUSPENDED'] as const;

// An iPhone proof's unexpected field: an unpublished app version or an unexpected
// distribution kind; the event records the kind, never the value.
export const IOS_ANOMALY_KINDS = [
  'UNPUBLISHED_PACKAGE_VERSION',
  'UNEXPECTED_DISTRIBUTION_KIND',
] as const;
