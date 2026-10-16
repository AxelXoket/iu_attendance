// The decision table (D07, karar-tablosu): rows of a record's facts and what the decision
// rule gives for them. The core test runs every row through computeLabels and
// decideRecord; the phone and the panel run the same rows against the same functions, so
// all three show a record the same way, comparing tableView(outcome) with the row. Every
// reason the rule gives is the primary reason of a row and every label is in one; the
// four rulings only a lecturer gives (D07 kararDegistir) are not. Each field of the clock
// result has rows of its own.

import { DAY_MS, MINUTE_MS } from '../clock/constants.ts';
import type { ClockResult } from '../clock/result.ts';
import type { PersonId } from '../clock/types.ts';
import type { QrDelay, QrVerification } from '../projection/constants.ts';
import { sendWindowEndAtMs } from '../sync/send-window.ts';
import {
  type DecisionReason,
  type DecisionSource,
  labelList,
  type RecordDecision,
  type RecordLabel,
} from './codes.ts';
import type { DecisionFacts, DecisionOutcome, DeviceStatusFacts } from './decision.ts';
import type { LabelFacts, QrEvidence } from './labels.ts';
import type { SharedLimitCounter } from './shared-limit.ts';

/** An outcome in the table's terms. */
export type TableOutcome = {
  readonly decision: RecordDecision;
  readonly reasonCode: DecisionReason | null;
  readonly extraReasons: readonly DecisionReason[];
  /** The labels set on the record, in RECORD_LABELS order; the others are false. */
  readonly labels: readonly RecordLabel[];
  readonly late: boolean;
  readonly decisionSource: DecisionSource;
  readonly actorPersonId: PersonId | null;
  /** Whether the record takes a new shared limit right; null when the shared limit did not decide. */
  readonly spendsRight: boolean | null;
};

/** A record when it arrives: what the labels read and what the decision reads. */
export type DecisionTableRow = {
  readonly name: string;
  readonly facts: DecisionFacts & LabelFacts;
  readonly expected: TableOutcome;
};

/** An outcome of decideRecord as the table writes it. */
export function tableView(outcome: DecisionOutcome): TableOutcome {
  return {
    decision: outcome.decision,
    reasonCode: outcome.reasonCode,
    extraReasons: outcome.extraReasons,
    labels: labelList(outcome.labels),
    late: outcome.late,
    decisionSource: outcome.decisionSource,
    actorPersonId: outcome.actorPersonId,
    spendsRight: outcome.sharedLimit?.spendsRight ?? null,
  };
}

// One session, 09:00 to 09:50 in Istanbul; the record is taken at 09:02 and reaches the
// server a minute later. The term locks 30 days after the class, so the sending time ends
// 7 days after it.
const SESSION_ID = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d01';
const OTHER_SESSION_IDS = [
  '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d02',
  '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d03',
] as const;
const LECTURER_ID = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d04' as PersonId;
const START_AT_MS = Date.UTC(2026, 9, 6, 6, 0);
const END_AT_MS = START_AT_MS + 50 * MINUTE_MS;
const TAKEN_AT_MS = START_AT_MS + 2 * MINUTE_MS;
const ARRIVAL_MS = TAKEN_AT_MS + MINUTE_MS;
const LOCK_AT_MS = END_AT_MS + 30 * DAY_MS;
const SEND_WINDOW_END_AT_MS = sendWindowEndAtMs(END_AT_MS, LOCK_AT_MS);
const MARGIN_MS = 500;

const TAKEN_RANGE = { lowMs: TAKEN_AT_MS - MARGIN_MS, highMs: TAKEN_AT_MS + MARGIN_MS };
const VERIFIED_CLOCK: ClockResult = {
  status: 'VERIFIED',
  source: 'BOTH_ANCHORS',
  range: TAKEN_RANGE,
  estimateMs: TAKEN_AT_MS,
  marginMs: MARGIN_MS,
  firstAnchorStatus: 'VALID',
  secondAnchorStatus: 'VALID',
  startsAfterArrival: false,
  arrivedWhileSyncBroken: false,
};
// A range that starts after the arrival, from a phone clock set ahead.
const AFTER_ARRIVAL_CLOCK: ClockResult = {
  ...VERIFIED_CLOCK,
  range: { lowMs: ARRIVAL_MS + 1000, highMs: ARRIVAL_MS + 2000 },
  estimateMs: ARRIVAL_MS + 1500,
  startsAfterArrival: true,
};
const DISAGREE_CLOCK: ClockResult = {
  status: 'ANCHORS_DISAGREE',
  source: 'BOTH_ANCHORS',
  range: { lowMs: TAKEN_AT_MS - 5000, highMs: TAKEN_AT_MS + 5000 },
  estimateMs: TAKEN_AT_MS,
  marginMs: 5000,
  firstAnchorStatus: 'VALID',
  secondAnchorStatus: 'VALID',
  startsAfterArrival: false,
  arrivedWhileSyncBroken: false,
};
const NO_CLOCK: ClockResult = {
  status: 'UNVERIFIED',
  source: 'NONE',
  range: null,
  estimateMs: null,
  marginMs: null,
  firstAnchorStatus: 'NO_DOCUMENT',
  secondAnchorStatus: 'NOT_SENT',
  startsAfterArrival: false,
  arrivedWhileSyncBroken: false,
};
const PHONE_CLOCK: ClockResult = {
  status: 'UNVERIFIED',
  source: 'PHONE_CLOCK',
  range: TAKEN_RANGE,
  estimateMs: TAKEN_AT_MS,
  marginMs: null,
  firstAnchorStatus: 'BEFORE_RESTART',
  secondAnchorStatus: 'AFTER_RESTART',
  startsAfterArrival: false,
  arrivedWhileSyncBroken: false,
};

const EMPTY_COUNTER: SharedLimitCounter = { used: 0, usedSessionIds: [] };
const FULL_COUNTER: SharedLimitCounter = { used: 2, usedSessionIds: OTHER_SESSION_IDS };
const HELD_COUNTER: SharedLimitCounter = {
  used: 2,
  usedSessionIds: [OTHER_SESSION_IDS[0], SESSION_ID],
};

const DEVICE_FLAGS = { verified: true, secondProfile: false, appAttestCounterOk: true } as const;
const ACTIVE_DEVICE: DeviceStatusFacts = { status: 'active', openChangeRequest: false };

// A plain present stage 1 record, the one every row changes: a confirmed student on the
// roster, an active verified device, a verified clock inside the window, no QR in a class
// without QR.
export const PLAIN_RECORD: DecisionFacts & LabelFacts = {
  nowMs: ARRIVAL_MS,
  arrivedAtMs: ARRIVAL_MS,
  session: {
    id: SESSION_ID,
    endAtMs: END_AT_MS,
    cancelled: false,
    lockAtMs: LOCK_AT_MS,
    headCountEntered: false,
    qrClass: false,
  },
  student: {
    confirmation: 'confirmed',
    deletedAtMs: null,
    accountClosed: false,
    onRoster: true,
    notInClassBy: null,
    overlappingSession: false,
  },
  device: { ...DEVICE_FLAGS, ...ACTIVE_DEVICE },
  clock: VERIFIED_CLOCK,
  window: { result: 'INSIDE', windowChosenAtRecord: true },
  faultyVersion: false,
  qr: { evidenceKind: 'NONE' },
  sharedLimitCounter: null,
};

type RowFacts = DecisionTableRow['facts'];
type Change = Partial<
  Pick<RowFacts, 'nowMs' | 'arrivedAtMs' | 'clock' | 'faultyVersion' | 'qr' | 'sharedLimitCounter'>
> & {
  readonly session?: Partial<RowFacts['session']>;
  readonly student?: Partial<RowFacts['student']>;
  readonly window?: Partial<RowFacts['window']>;
  readonly device?: DeviceStatusFacts;
  readonly deviceFlags?: Partial<
    Pick<RowFacts['device'], 'verified' | 'secondProfile' | 'appAttestCounterOk'>
  >;
};

const ROW_DEFAULTS: TableOutcome = {
  decision: 'PRESENT',
  reasonCode: null,
  extraReasons: [],
  labels: ['NO_QR'],
  late: false,
  decisionSource: 'AUTOMATIC',
  actorPersonId: null,
  spendsRight: null,
};

function row(
  name: string,
  change: Change,
  expected: Partial<TableOutcome> & Pick<TableOutcome, 'decision' | 'reasonCode'>,
): DecisionTableRow {
  const { session, student, window, device, deviceFlags, ...top } = change;
  return {
    name,
    facts: {
      ...PLAIN_RECORD,
      ...top,
      session: { ...PLAIN_RECORD.session, ...session },
      student: { ...PLAIN_RECORD.student, ...student },
      window: { ...PLAIN_RECORD.window, ...window },
      device: { ...DEVICE_FLAGS, ...deviceFlags, ...(device ?? ACTIVE_DEVICE) },
    },
    expected: { ...ROW_DEFAULTS, ...expected },
  };
}

const scanned = (
  verification: Exclude<QrVerification, 'NONE'>,
  delay: QrDelay | null = null,
): QrEvidence => ({
  evidenceKind: 'QR',
  verification,
  delay,
});
const QR_SESSION = { session: { qrClass: true } } as const;

export const DECISION_TABLE: readonly DecisionTableRow[] = [
  // Stage 1: the plain record and its labels.
  row('a plain record is present with no reason', {}, { decision: 'PRESENT', reasonCode: null }),
  row(
    'no window length chosen when taken: present, self-declared',
    { window: { windowChosenAtRecord: false } },
    { decision: 'PRESENT', reasonCode: null, labels: ['NO_QR', 'SELF_DECLARED'] },
  ),
  row(
    'an unverified device key: present, device unverified',
    { deviceFlags: { verified: false } },
    { decision: 'PRESENT', reasonCode: null, labels: ['NO_QR', 'DEVICE_UNVERIFIED'] },
  ),
  row(
    'an Android second profile: present, second profile',
    { deviceFlags: { secondProfile: true } },
    { decision: 'PRESENT', reasonCode: null, labels: ['NO_QR', 'SECOND_PROFILE'] },
  ),
  // The account and the device.
  row(
    'confirmation rejected',
    { student: { confirmation: 'rejected' } },
    { decision: 'REJECTED', reasonCode: 'CONFIRMATION_REJECTED' },
  ),
  row(
    'confirmation still awaited',
    { student: { confirmation: 'pending' } },
    { decision: 'PENDING', reasonCode: 'CONFIRMATION_PENDING' },
  ),
  row(
    'an unconfirmed account deleted after the record arrived',
    { student: { confirmation: 'pending', deletedAtMs: ARRIVAL_MS + MINUTE_MS } },
    { decision: 'REJECTED', reasonCode: 'CONFIRMATION_REJECTED' },
  ),
  row(
    'an unconfirmed account closed when its wait ended',
    { student: { confirmation: 'pending', accountClosed: true } },
    { decision: 'REJECTED', reasonCode: 'CONFIRMATION_REJECTED' },
  ),
  row(
    'the account was deleted before the verified clock',
    { student: { deletedAtMs: TAKEN_RANGE.lowMs - 1 } },
    { decision: 'REJECTED', reasonCode: 'DELETED_ACCOUNT' },
  ),
  row(
    'the account was deleted when the verified clock ended: no rule',
    { student: { deletedAtMs: TAKEN_RANGE.highMs } },
    { decision: 'PRESENT', reasonCode: null },
  ),
  row(
    'the account was deleted inside the verified clock',
    { student: { deletedAtMs: TAKEN_AT_MS } },
    { decision: 'IN_REVIEW', reasonCode: 'CLOSED_DEVICE_TIME_UNCERTAIN' },
  ),
  row(
    'a device that was never active, closed before the clock: not approved, not old',
    { device: { status: 'closed', closedAtMs: TAKEN_RANGE.lowMs - 1, activated: false } },
    { decision: 'REJECTED', reasonCode: 'DEVICE_NOT_APPROVED' },
  ),
  row(
    'a device closed before the verified clock',
    { device: { status: 'closed', closedAtMs: TAKEN_RANGE.lowMs - 1, activated: true } },
    { decision: 'REJECTED', reasonCode: 'OLD_DEVICE' },
  ),
  row(
    'a device closed after the verified clock: no rule',
    { device: { status: 'closed', closedAtMs: TAKEN_RANGE.highMs + 1, activated: true } },
    { decision: 'PRESENT', reasonCode: null },
  ),
  row(
    'a device closed inside the verified clock',
    { device: { status: 'closed', closedAtMs: TAKEN_AT_MS, activated: true } },
    { decision: 'IN_REVIEW', reasonCode: 'CLOSED_DEVICE_TIME_UNCERTAIN' },
  ),
  row(
    'a closed device with no clock: uncertain, the shared limit does not decide',
    {
      device: { status: 'closed', closedAtMs: TAKEN_RANGE.lowMs - 1, activated: true },
      clock: NO_CLOCK,
      sharedLimitCounter: EMPTY_COUNTER,
    },
    {
      decision: 'IN_REVIEW',
      reasonCode: 'CLOSED_DEVICE_TIME_UNCERTAIN',
      labels: ['NO_QR', 'CLOCK_UNVERIFIED'],
    },
  ),
  row(
    'a device closed after the record reached the server: no rule, even with no clock',
    {
      device: { status: 'closed', closedAtMs: ARRIVAL_MS, activated: true },
      clock: NO_CLOCK,
      sharedLimitCounter: EMPTY_COUNTER,
    },
    {
      decision: 'PRESENT',
      reasonCode: 'ACCEPTED_BY_SHARED_LIMIT',
      labels: ['NO_QR', 'CLOCK_UNVERIFIED'],
      spendsRight: true,
    },
  ),
  row(
    'a new device awaiting its change approval',
    { device: { status: 'change_pending' } },
    { decision: 'PENDING', reasonCode: 'DEVICE_CHANGE_PENDING' },
  ),
  row(
    'the old device while a change request is open',
    { device: { status: 'active', openChangeRequest: true } },
    { decision: 'PENDING', reasonCode: 'DEVICE_CHANGE_PENDING' },
  ),
  row(
    'the sending time ended with the change still awaited',
    { device: { status: 'change_pending' }, nowMs: SEND_WINDOW_END_AT_MS },
    { decision: 'IN_REVIEW', reasonCode: 'DEVICE_CHANGE_EXPIRED' },
  ),
  row(
    "the sending time ended with the old device's change request still open",
    { device: { status: 'active', openChangeRequest: true }, nowMs: SEND_WINDOW_END_AT_MS },
    { decision: 'IN_REVIEW', reasonCode: 'DEVICE_CHANGE_EXPIRED' },
  ),
  row(
    'the App Attest counter did not increase',
    { deviceFlags: { appAttestCounterOk: false } },
    { decision: 'IN_REVIEW', reasonCode: 'COUNTER_NOT_INCREASED' },
  ),
  // The session and the roster.
  row(
    'a cancelled session',
    { session: { cancelled: true } },
    { decision: 'REJECTED', reasonCode: 'SESSION_CANCELLED' },
  ),
  row(
    'no roster row at the record time',
    { student: { onRoster: false } },
    { decision: 'REJECTED', reasonCode: 'NOT_ON_ROSTER' },
  ),
  row(
    'marked not in class by the lecturer',
    { student: { notInClassBy: LECTURER_ID } },
    {
      decision: 'REJECTED',
      reasonCode: 'NOT_IN_CLASS_AT_CHECK',
      decisionSource: 'LECTURER',
      actorPersonId: LECTURER_ID,
    },
  ),
  row(
    'a record in an overlapping session',
    { student: { overlappingSession: true } },
    { decision: 'IN_REVIEW', reasonCode: 'OVERLAPPING_SESSION' },
  ),
  row(
    'sent by a version declared faulty',
    { faultyVersion: true },
    { decision: 'IN_REVIEW', reasonCode: 'FAULTY_VERSION' },
  ),
  // Each field of the clock result.
  row(
    'arrived while the server sync was broken, the clock not past the arrival: no rule',
    { clock: { ...VERIFIED_CLOCK, arrivedWhileSyncBroken: true } },
    { decision: 'PRESENT', reasonCode: null },
  ),
  row(
    'the clock starts after the arrival, sync healthy',
    { clock: AFTER_ARRIVAL_CLOCK },
    { decision: 'REJECTED', reasonCode: 'AFTER_ARRIVAL' },
  ),
  row(
    'the clock starts after the arrival, sync broken',
    { clock: { ...AFTER_ARRIVAL_CLOCK, arrivedWhileSyncBroken: true } },
    { decision: 'IN_REVIEW', reasonCode: 'SERVER_SYNC_BROKEN' },
  ),
  row(
    'the anchors disagree',
    { clock: DISAGREE_CLOCK },
    { decision: 'IN_REVIEW', reasonCode: 'ANCHORS_DISAGREE' },
  ),
  row(
    'the anchors disagree and the clock starts after the arrival, sync healthy',
    { clock: { ...DISAGREE_CLOCK, startsAfterArrival: true } },
    { decision: 'REJECTED', reasonCode: 'AFTER_ARRIVAL', extraReasons: ['ANCHORS_DISAGREE'] },
  ),
  row(
    'the anchors disagree and the clock starts after the arrival, sync broken',
    { clock: { ...DISAGREE_CLOCK, startsAfterArrival: true, arrivedWhileSyncBroken: true } },
    { decision: 'IN_REVIEW', reasonCode: 'ANCHORS_DISAGREE', extraReasons: ['SERVER_SYNC_BROKEN'] },
  ),
  row(
    'the first anchor was signed with a compromised key',
    { clock: { ...VERIFIED_CLOCK, source: 'SECOND_ANCHOR', firstAnchorStatus: 'KEY_COMPROMISED' } },
    { decision: 'IN_REVIEW', reasonCode: 'CLOCK_KEY_COMPROMISED' },
  ),
  row(
    'the second anchor was signed with a compromised key',
    { clock: { ...VERIFIED_CLOCK, source: 'FIRST_ANCHOR', secondAnchorStatus: 'KEY_COMPROMISED' } },
    { decision: 'IN_REVIEW', reasonCode: 'CLOCK_KEY_COMPROMISED' },
  ),
  // The shared limit: an unverified clock or a backup code no other rule fits.
  row(
    'no clock, a right left: present, spends a right',
    { clock: NO_CLOCK, sharedLimitCounter: EMPTY_COUNTER },
    {
      decision: 'PRESENT',
      reasonCode: 'ACCEPTED_BY_SHARED_LIMIT',
      labels: ['NO_QR', 'CLOCK_UNVERIFIED'],
      spendsRight: true,
    },
  ),
  row(
    'a phone clock, the limit used up',
    { clock: PHONE_CLOCK, sharedLimitCounter: FULL_COUNTER },
    {
      decision: 'IN_REVIEW',
      reasonCode: 'SHARED_LIMIT_EXCEEDED',
      labels: ['NO_QR', 'CLOCK_UNVERIFIED'],
      spendsRight: false,
    },
  ),
  row(
    'no clock in a session that holds a right: present, spends nothing',
    { clock: NO_CLOCK, sharedLimitCounter: HELD_COUNTER },
    {
      decision: 'PRESENT',
      reasonCode: 'ACCEPTED_BY_SHARED_LIMIT',
      labels: ['NO_QR', 'CLOCK_UNVERIFIED'],
      spendsRight: false,
    },
  ),
  row(
    'no clock and another rule: that rule, the shared limit does not decide',
    { clock: NO_CLOCK, student: { overlappingSession: true }, sharedLimitCounter: EMPTY_COUNTER },
    {
      decision: 'IN_REVIEW',
      reasonCode: 'OVERLAPPING_SESSION',
      labels: ['NO_QR', 'CLOCK_UNVERIFIED'],
    },
  ),
  // The window (D04's result read as it is).
  row(
    'outside the window',
    { window: { result: 'OUTSIDE' } },
    { decision: 'REJECTED', reasonCode: 'OUTSIDE_WINDOW' },
  ),
  row(
    'in a mid-class change slice, the setting not final',
    { window: { result: 'CHANGE_SLICE' } },
    { decision: 'PENDING', reasonCode: 'SETTING_NOT_FINAL' },
  ),
  row(
    'in a mid-class change slice, the head count came',
    { window: { result: 'CHANGE_SLICE' }, session: { headCountEntered: true } },
    { decision: 'REJECTED', reasonCode: 'OUTSIDE_WINDOW' },
  ),
  row(
    'in a mid-class change slice, the sending time ended',
    { window: { result: 'CHANGE_SLICE' }, nowMs: SEND_WINDOW_END_AT_MS },
    { decision: 'REJECTED', reasonCode: 'OUTSIDE_WINDOW' },
  ),
  row(
    "in the old schedule's window",
    { window: { result: 'OLD_SCHEDULE' } },
    { decision: 'IN_REVIEW', reasonCode: 'OLD_SCHEDULE' },
  ),
  // The sending time and the last day.
  row(
    'reached the server after the sending time, before the last day: present, late',
    { arrivedAtMs: SEND_WINDOW_END_AT_MS, nowMs: SEND_WINDOW_END_AT_MS },
    { decision: 'PRESENT', reasonCode: null, late: true },
  ),
  row(
    'reached the server after the last day',
    { session: { lockAtMs: ARRIVAL_MS - 1 } },
    { decision: 'IN_REVIEW', reasonCode: 'AFTER_LAST_DAY', late: true },
  ),
  row(
    'after the last day a pending rule stays frozen in review',
    { session: { lockAtMs: ARRIVAL_MS - 1 }, student: { confirmation: 'pending' } },
    {
      decision: 'IN_REVIEW',
      reasonCode: 'AFTER_LAST_DAY',
      extraReasons: ['CONFIRMATION_PENDING'],
      late: true,
    },
  ),
  row(
    'after the last day a rejection still wins',
    { session: { lockAtMs: ARRIVAL_MS - 1 }, student: { onRoster: false } },
    {
      decision: 'REJECTED',
      reasonCode: 'NOT_ON_ROSTER',
      extraReasons: ['AFTER_LAST_DAY'],
      late: true,
    },
  ),
  row(
    'after the last day with no clock: the shared limit does not decide',
    { session: { lockAtMs: ARRIVAL_MS - 1 }, clock: NO_CLOCK, sharedLimitCounter: EMPTY_COUNTER },
    {
      decision: 'IN_REVIEW',
      reasonCode: 'AFTER_LAST_DAY',
      labels: ['NO_QR', 'CLOCK_UNVERIFIED'],
      late: true,
    },
  ),
  // Several rules: the highest class, the first in the catalog, the rest in its order.
  row(
    'pending, in review and rejected rules together',
    {
      student: { confirmation: 'pending', overlappingSession: true, onRoster: false },
      faultyVersion: true,
    },
    {
      decision: 'REJECTED',
      reasonCode: 'NOT_ON_ROSTER',
      extraReasons: ['CONFIRMATION_PENDING', 'FAULTY_VERSION', 'OVERLAPPING_SESSION'],
    },
  ),
  row(
    'two rejections: the first in the catalog',
    {
      session: { cancelled: true },
      device: { status: 'closed', closedAtMs: TAKEN_RANGE.lowMs - 1, activated: false },
    },
    {
      decision: 'REJECTED',
      reasonCode: 'DEVICE_NOT_APPROVED',
      extraReasons: ['SESSION_CANCELLED'],
    },
  ),
  // Stage 2: QR evidence in a QR session.
  row(
    'a valid QR scanned in time: present, verified',
    { ...QR_SESSION, qr: scanned('VALID', 'NORMAL') },
    { decision: 'PRESENT', reasonCode: null, labels: ['VERIFIED'] },
  ),
  row('no QR in a QR session', QR_SESSION, {
    decision: 'IN_REVIEW',
    reasonCode: 'NO_QR_IN_QR_CLASS',
  }),
  row(
    "another session's QR",
    { ...QR_SESSION, qr: scanned('SESSION_MISMATCH') },
    { decision: 'REJECTED', reasonCode: 'QR_SESSION_MISMATCH', labels: [] },
  ),
  row(
    'a QR from a key that was not found',
    { ...QR_SESSION, qr: scanned('KEY_NOT_FOUND') },
    { decision: 'REJECTED', reasonCode: 'QR_LECTURER_UNAUTHORIZED', labels: [] },
  ),
  row(
    "a QR whose code does not match the lecturer's key",
    { ...QR_SESSION, qr: scanned('MAC_INVALID') },
    { decision: 'REJECTED', reasonCode: 'QR_MAC_INVALID', labels: [] },
  ),
  row(
    'a malformed QR',
    { ...QR_SESSION, qr: scanned('MALFORMED') },
    { decision: 'REJECTED', reasonCode: 'QR_MAC_INVALID', labels: [] },
  ),
  row(
    'a QR of an unknown version',
    { ...QR_SESSION, qr: scanned('VERSION_UNKNOWN') },
    { decision: 'REJECTED', reasonCode: 'QR_MAC_INVALID', labels: [] },
  ),
  row(
    'a QR from a retired key',
    { ...QR_SESSION, qr: scanned('KEY_RETIRED') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_KEY_REVOKED', labels: [] },
  ),
  row(
    'a QR compromised key',
    { ...QR_SESSION, qr: scanned('KEY_COMPROMISED') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_KEY_COMPROMISED', labels: [] },
  ),
  row(
    'a QR whose key has no download record',
    { ...QR_SESSION, qr: scanned('NO_DOWNLOAD_RECORD') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_KEY_REVOKED', labels: [] },
  ),
  row(
    'a QR whose key slot was revoked before the slice',
    { ...QR_SESSION, qr: scanned('VALID', 'KEY_REVOKED') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_KEY_REVOKED', labels: ['VERIFIED'] },
  ),
  row(
    'a QR delay over the rejection limit',
    { ...QR_SESSION, qr: scanned('VALID', 'REJECTED') },
    { decision: 'REJECTED', reasonCode: 'QR_DELAY_EXCEEDED', labels: ['VERIFIED'] },
  ),
  row(
    'a QR delay between the normal and the rejection limits',
    { ...QR_SESSION, qr: scanned('VALID', 'IN_REVIEW') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_DELAY_UNCERTAIN', labels: ['VERIFIED'] },
  ),
  row(
    'a QR scanned before it was shown',
    { ...QR_SESSION, qr: scanned('VALID', 'SCANNED_BEFORE') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_SCANNED_EARLY', labels: ['VERIFIED'] },
  ),
  row(
    'a QR slice outside the display',
    { ...QR_SESSION, qr: scanned('VALID', 'OUTSIDE_DISPLAY') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_OUTSIDE_DISPLAY', labels: ['VERIFIED'] },
  ),
  row(
    "the lecturer phone's display record not yet arrived",
    { ...QR_SESSION, qr: scanned('VALID', 'PENDING') },
    { decision: 'PENDING', reasonCode: 'QR_DISPLAY_PENDING', labels: ['VERIFIED'] },
  ),
  row(
    'the sending time ended without the display record',
    { ...QR_SESSION, qr: scanned('VALID', 'PENDING'), nowMs: SEND_WINDOW_END_AT_MS },
    { decision: 'IN_REVIEW', reasonCode: 'QR_DISPLAY_MISSING', labels: ['VERIFIED'] },
  ),
  row(
    'the lecturer phone had no clock',
    { ...QR_SESSION, qr: scanned('VALID', 'NO_LECTURER_CLOCK') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_LECTURER_CLOCK_MISSING', labels: ['VERIFIED'] },
  ),
  row(
    "the lecturer phone's anchors disagree",
    { ...QR_SESSION, qr: scanned('VALID', 'LECTURER_ANCHORS_DIVERGE') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_LECTURER_CLOCK_MISSING', labels: ['VERIFIED'] },
  ),
  row(
    "the student's anchors are too old to prove the delay",
    { ...QR_SESSION, qr: scanned('VALID', 'ANCHORS_STALE') },
    { decision: 'IN_REVIEW', reasonCode: 'QR_ANCHORS_OLD', labels: ['VERIFIED'] },
  ),
  row(
    'a valid QR with no clock: the shared limit decides',
    {
      ...QR_SESSION,
      qr: scanned('VALID', 'CLOCK_UNVERIFIED'),
      clock: NO_CLOCK,
      sharedLimitCounter: EMPTY_COUNTER,
    },
    {
      decision: 'PRESENT',
      reasonCode: 'ACCEPTED_BY_SHARED_LIMIT',
      labels: ['CLOCK_UNVERIFIED', 'VERIFIED'],
      spendsRight: true,
    },
  ),
  row(
    'a matching backup code in time: the shared limit decides',
    {
      ...QR_SESSION,
      qr: { evidenceKind: 'BACKUP_CODE', verification: 'VALID', delay: 'NORMAL' },
      sharedLimitCounter: FULL_COUNTER,
    },
    {
      decision: 'IN_REVIEW',
      reasonCode: 'SHARED_LIMIT_EXCEEDED',
      labels: ['BACKUP_CODE'],
      spendsRight: false,
    },
  ),
  row(
    'a backup code that matches no slice',
    {
      ...QR_SESSION,
      qr: { evidenceKind: 'BACKUP_CODE', verification: 'BACKUP_CODE_MISMATCH', delay: null },
      sharedLimitCounter: EMPTY_COUNTER,
    },
    { decision: 'REJECTED', reasonCode: 'BACKUP_CODE_WRONG', labels: ['BACKUP_CODE'] },
  ),
  row(
    'a backup code scanned too late',
    {
      ...QR_SESSION,
      qr: { evidenceKind: 'BACKUP_CODE', verification: 'VALID', delay: 'REJECTED' },
      sharedLimitCounter: EMPTY_COUNTER,
    },
    { decision: 'REJECTED', reasonCode: 'QR_DELAY_EXCEEDED', labels: ['BACKUP_CODE'] },
  ),
  // Stage 1 rules hold for a record with QR evidence too.
  row(
    'a valid QR from a student not on the roster',
    { ...QR_SESSION, qr: scanned('VALID', 'NORMAL'), student: { onRoster: false } },
    { decision: 'REJECTED', reasonCode: 'NOT_ON_ROSTER', labels: ['VERIFIED'] },
  ),
  row(
    'a valid QR from a device awaiting its change approval',
    { ...QR_SESSION, qr: scanned('VALID', 'NORMAL'), device: { status: 'change_pending' } },
    { decision: 'PENDING', reasonCode: 'DEVICE_CHANGE_PENDING', labels: ['VERIFIED'] },
  ),
  row(
    'a valid QR whose clock anchors disagree',
    { ...QR_SESSION, qr: scanned('VALID', 'CLOCK_UNVERIFIED'), clock: DISAGREE_CLOCK },
    { decision: 'IN_REVIEW', reasonCode: 'ANCHORS_DISAGREE', labels: ['VERIFIED'] },
  ),
  row(
    'too many wrong backup codes',
    {
      ...QR_SESSION,
      qr: { evidenceKind: 'BACKUP_CODE', verification: 'BACKUP_CODE_LIMIT', delay: null },
      sharedLimitCounter: EMPTY_COUNTER,
    },
    { decision: 'IN_REVIEW', reasonCode: 'BACKUP_CODE_LIMIT', labels: ['BACKUP_CODE'] },
  ),
];
