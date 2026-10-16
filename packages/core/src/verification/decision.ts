// The decision rule (D07, kararVer), one function for the server, the phone and the panel.
// Every rule that fits a record is collected; the decision is the highest class among them
// (rejected, pending, in review, present), the primary reason the first fitting one in the
// catalog's order (the catalog runs by class in that order) and the others the extra
// reasons. A record that arrived after the unit's last day is in review AFTER_LAST_DAY
// unless a rejection fits. The shared limit comes last: only a record no rule fits and
// that carries the clock-unverified or backup code label uses it. Pure: the instants come
// in (nowMs is the decision's instant), no clock or time zone is read.

import type { WindowResult } from '../clock/codes.ts';
import type { ClockResult } from '../clock/result.ts';
import type { PersonId } from '../clock/types.ts';
import { isLockedAt } from '../courses/calendar.ts';
import type { ConfirmationStatus } from '../identity/confirmation.ts';
import type { DeviceStatus } from '../identity/device-status.ts';
import type { QrDelay, QrVerification } from '../projection/constants.ts';
import { sendWindowEndAtMs } from '../sync/send-window.ts';
import {
  DECISION_REASONS,
  type DecisionReason,
  type DecisionSource,
  type Labels,
  type RecordDecision,
  reasonDefinition,
} from './codes.ts';
import type { QrEvidence } from './labels.ts';
import {
  type SharedLimitCounter,
  type SharedLimitResult,
  sharedLimitDecision,
  usesSharedLimit,
} from './shared-limit.ts';

/** The window mapping (D07 pencereEslemesi): D04's result read as it is. */
const WINDOW_REASONS: Readonly<
  Record<WindowResult, (settingFinal: boolean) => DecisionReason | null>
> = {
  INSIDE: () => null,
  // A record in a mid-class change's slice waits until the setting is final.
  CHANGE_SLICE: (settingFinal) => (settingFinal ? 'OUTSIDE_WINDOW' : 'SETTING_NOT_FINAL'),
  OLD_SCHEDULE: () => 'OLD_SCHEDULE',
  OUTSIDE: () => 'OUTSIDE_WINDOW',
};

/** The reason D04's window result gives; the setting is final once the head count came or the sending time ended. */
export const windowReason = (result: WindowResult, settingFinal: boolean): DecisionReason | null =>
  WINDOW_REASONS[result](settingFinal);

/** The QR mapping (D07 qrEslemesi), verification side: null where the delay and the QR-free rules decide. */
export const QR_VERIFICATION_REASONS: Readonly<Record<QrVerification, DecisionReason | null>> = {
  VALID: null,
  MALFORMED: 'QR_MAC_INVALID',
  VERSION_UNKNOWN: 'QR_MAC_INVALID',
  SESSION_MISMATCH: 'QR_SESSION_MISMATCH',
  KEY_NOT_FOUND: 'QR_LECTURER_UNAUTHORIZED',
  KEY_RETIRED: 'QR_KEY_REVOKED',
  KEY_COMPROMISED: 'QR_KEY_COMPROMISED',
  // In review while D11-A16 is open: the code matches the lecturer's key.
  NO_DOWNLOAD_RECORD: 'QR_KEY_REVOKED',
  MAC_INVALID: 'QR_MAC_INVALID',
  BACKUP_CODE_MISMATCH: 'BACKUP_CODE_WRONG',
  BACKUP_CODE_LIMIT: 'BACKUP_CODE_LIMIT',
  NONE: null,
};

// The QR mapping, delay side. CLOCK_UNVERIFIED has no reason of its own: D11 gives it for
// the record's own clock, so an unverified clock reaches the shared limit through its
// label and disagreeing anchors are in review ANCHORS_DISAGREE.
const QR_DELAY_REASONS: Readonly<Record<QrDelay, (sendingOver: boolean) => DecisionReason | null>> =
  {
    NORMAL: () => null,
    IN_REVIEW: () => 'QR_DELAY_UNCERTAIN',
    REJECTED: () => 'QR_DELAY_EXCEEDED',
    SCANNED_BEFORE: () => 'QR_SCANNED_EARLY',
    OUTSIDE_DISPLAY: () => 'QR_OUTSIDE_DISPLAY',
    // A display record still awaited when the sending time ends will not come.
    PENDING: (sendingOver) => (sendingOver ? 'QR_DISPLAY_MISSING' : 'QR_DISPLAY_PENDING'),
    CLOCK_UNVERIFIED: () => null,
    NO_LECTURER_CLOCK: () => 'QR_LECTURER_CLOCK_MISSING',
    LECTURER_ANCHORS_DIVERGE: () => 'QR_LECTURER_CLOCK_MISSING',
    KEY_REVOKED: () => 'QR_KEY_REVOKED',
    // In review while D11-A04 is open; approved, it would go to the shared limit.
    ANCHORS_STALE: () => 'QR_ANCHORS_OLD',
  };

/** The reason D11's delay result gives, once or before the sending time has ended. */
export const qrDelayReason = (delay: QrDelay, sendingOver: boolean): DecisionReason | null =>
  QR_DELAY_REASONS[delay](sendingOver);

// What the rule reads of the signing device's row (D01 cihazlar), by its status; a new
// D01 status does not compile until its facts are named here.
type DeviceRowFacts = {
  /** openChangeRequest: the student's change request is open, so this is the old device. */
  readonly active: { readonly openChangeRequest: boolean };
  /** A new device waiting for its change approval. */
  readonly change_pending: object;
  /**
   * Closed at closedAtMs (kapanma_ani). activated: etkinlesme_ani is set, whatever closed
   * the device. A device closed before it ever became active is not approved; the closing
   * rule is for the others.
   */
  readonly closed: { readonly closedAtMs: number; readonly activated: boolean };
};

/** The signing device's status and what the rule reads with it. */
export type DeviceStatusFacts = {
  readonly [Status in DeviceStatus]: { readonly status: Status } & DeviceRowFacts[Status];
}[DeviceStatus];

/** The signing device. */
export type DeviceFacts = {
  /** The App Attest counter passed its check; true for a key that has no counter. */
  readonly appAttestCounterOk: boolean;
} & DeviceStatusFacts;

/**
 * Everything the rule reads about one record, gathered by the caller. The labels are not
 * among them: computeLabels sets them when the record arrives, from LabelFacts.
 */
export type DecisionFacts = {
  /** The decision's instant (D04 simdi). */
  readonly nowMs: number;
  /** When the record reached the server. */
  readonly arrivedAtMs: number;
  readonly session: {
    readonly id: string;
    readonly endAtMs: number;
    readonly cancelled: boolean;
    /** The unit term's lock (D02 kilitAni); null when the course has no unit term. */
    readonly lockAtMs: number | null;
    readonly headCountEntered: boolean;
    /**
     * A QR session (D07-A02): the course's QR setting is on and the session has a QR
     * display record; without one the stage 1 rules decide. The caller decides.
     */
    readonly qrClass: boolean;
  };
  readonly student: {
    readonly confirmation: ConfirmationStatus;
    /** When the account was deleted (D05 ogrenciSilinmeAni). */
    readonly deletedAtMs: number | null;
    /** The account was closed when its confirmation wait ended (D01 HESAP_KAPANDI). */
    readonly accountClosed: boolean;
    /** An active roster row of the session's sections at the record's time (D03 uyelikDenetle). */
    readonly onRoster: boolean;
    /** The lecturer who marked the student not in class in this session. */
    readonly notInClassBy: PersonId | null;
    /** An earlier, not rejected, current record of the student in an overlapping session. */
    readonly overlappingSession: boolean;
  };
  readonly device: DeviceFacts;
  /** D04's clock result for the record (D07-B19). */
  readonly clock: ClockResult;
  readonly window: { readonly result: WindowResult };
  /** Sent by a version declared faulty, after the declaration's start (D13 hataliSurumler). */
  readonly faultyVersion: boolean;
  readonly qr: QrEvidence;
  /**
   * The (term, student, course) shared limit counter, read under its row lock for every
   * record whose labels use the shared limit (usesSharedLimit); null otherwise.
   */
  readonly sharedLimitCounter: SharedLimitCounter | null;
};

export type DecisionOutcome = {
  readonly decision: RecordDecision;
  readonly reasonCode: DecisionReason | null;
  readonly extraReasons: readonly DecisionReason[];
  readonly labels: Labels;
  /** Arrived after the sending time (D05 gec_geldi). */
  readonly late: boolean;
  readonly decisionSource: DecisionSource;
  /** The lecturer behind a not-in-class rejection; null for an automatic decision. */
  readonly actorPersonId: PersonId | null;
  /** The shared limit's answer when it decided; its counter is written once the record is inserted. */
  readonly sharedLimit: SharedLimitResult | null;
};

// Where the record falls against a closing instant (the device's, the account's). A record
// that reached the server by the closing was taken before it. Otherwise the verified range
// decides: after only when it starts after the closing, before when it ends at the closing
// or earlier (the instant itself in the student's favour, as D04 counts a range's high end
// at a window's opening), and anything else, any clock not verified included, is unknown.
function againstClosing(facts: DecisionFacts, atMs: number) {
  if (facts.arrivedAtMs <= atMs) return 'BEFORE';
  const { clock } = facts;
  if (clock.status !== 'VERIFIED') return 'UNKNOWN';
  if (clock.range.lowMs > atMs) return 'AFTER';
  return clock.range.highMs <= atMs ? 'BEFORE' : 'UNKNOWN';
}

function fittingReasons(facts: DecisionFacts, sendingOver: boolean): Set<DecisionReason> {
  const { student, device, session, clock, qr } = facts;
  const fits = new Set<DecisionReason>();
  const add = (reason: DecisionReason | null) => {
    if (reason !== null) fits.add(reason);
  };
  if (student.confirmation !== 'confirmed') {
    // An unconfirmed account deleted or closed can never confirm.
    const ended = student.deletedAtMs !== null || student.accountClosed;
    add(
      student.confirmation === 'rejected' || ended
        ? 'CONFIRMATION_REJECTED'
        : 'CONFIRMATION_PENDING',
    );
  }
  const closings = [
    [student.deletedAtMs, 'DELETED_ACCOUNT'],
    [device.status === 'closed' && device.activated ? device.closedAtMs : null, 'OLD_DEVICE'],
  ] as const;
  for (const [atMs, reason] of closings) {
    if (atMs === null) continue;
    const place = againstClosing(facts, atMs);
    if (place === 'AFTER') add(reason);
    if (place === 'UNKNOWN') add('CLOSED_DEVICE_TIME_UNCERTAIN');
  }
  if (device.status === 'closed' && !device.activated) add('DEVICE_NOT_APPROVED');
  if (
    device.status === 'change_pending' ||
    (device.status === 'active' && device.openChangeRequest)
  ) {
    add(sendingOver ? 'DEVICE_CHANGE_EXPIRED' : 'DEVICE_CHANGE_PENDING');
  }
  if (!device.appAttestCounterOk) add('COUNTER_NOT_INCREASED');
  if (session.cancelled) add('SESSION_CANCELLED');
  if (!student.onRoster) add('NOT_ON_ROSTER');
  if (student.notInClassBy !== null) add('NOT_IN_CLASS_AT_CHECK');
  if (student.overlappingSession) add('OVERLAPPING_SESSION');
  // Each field of D04's clock result keeps its own rule.
  if (clock.startsAfterArrival) {
    add(clock.arrivedWhileSyncBroken ? 'SERVER_SYNC_BROKEN' : 'AFTER_ARRIVAL');
  }
  if (clock.status === 'ANCHORS_DISAGREE') add('ANCHORS_DISAGREE');
  if (
    clock.firstAnchorStatus === 'KEY_COMPROMISED' ||
    clock.secondAnchorStatus === 'KEY_COMPROMISED'
  ) {
    add('CLOCK_KEY_COMPROMISED');
  }
  add(windowReason(facts.window.result, session.headCountEntered || sendingOver));
  if (facts.faultyVersion) add('FAULTY_VERSION');
  if (qr.evidenceKind === 'NONE') {
    if (session.qrClass) add('NO_QR_IN_QR_CLASS');
  } else {
    add(QR_VERIFICATION_REASONS[qr.verification]);
    if (qr.delay !== null) add(qrDelayReason(qr.delay, sendingOver));
  }
  return fits;
}

/**
 * The primary reason and the extra reasons of a set of fitting reasons: the first in the
 * catalog's order is primary, so the decision is the highest class that fits; the others
 * follow in that order. AFTER_LAST_DAY is primary over any class but a rejection, so a
 * record that reached the server after the last day stays in review, frozen. null when
 * nothing fits.
 */
export function rankReasons(fits: ReadonlySet<DecisionReason>): {
  readonly reasonCode: DecisionReason | null;
  readonly extraReasons: readonly DecisionReason[];
} {
  const fitting = DECISION_REASONS.map((entry) => entry.code).filter((code) => fits.has(code));
  const first = fitting[0] ?? null;
  const reasonCode =
    first !== null && reasonDefinition(first).decision !== 'REJECTED' && fits.has('AFTER_LAST_DAY')
      ? 'AFTER_LAST_DAY'
      : first;
  return { reasonCode, extraReasons: fitting.filter((code) => code !== reasonCode) };
}

const isInstant = (ms: number | null) => ms === null || Number.isSafeInteger(ms);

/**
 * The decision for a record: the labels are the record's own, computed by computeLabels
 * when it arrives and read back afterwards. Throws RangeError for an instant that is not
 * integer milliseconds, or when the shared limit decides and no counter was read.
 */
export function decideRecord(facts: DecisionFacts, labels: Labels): DecisionOutcome {
  const { session, student, device } = facts;
  const instants = [
    facts.nowMs,
    facts.arrivedAtMs,
    session.endAtMs,
    session.lockAtMs,
    student.deletedAtMs,
    device.status === 'closed' ? device.closedAtMs : null,
  ];
  if (!instants.every(isInstant)) throw new RangeError('decideRecord expects integer milliseconds');
  const sendingEndAtMs = sendWindowEndAtMs(session.endAtMs, session.lockAtMs);
  const fits = fittingReasons(facts, facts.nowMs >= sendingEndAtMs);
  if (isLockedAt(session.lockAtMs, facts.arrivedAtMs)) fits.add('AFTER_LAST_DAY');
  const ranked = rankReasons(fits);
  let { reasonCode } = ranked;
  // The shared limit, last: only for a record that would be present without a reason.
  let sharedLimit: SharedLimitResult | null = null;
  if (reasonCode === null && usesSharedLimit(labels)) {
    if (facts.sharedLimitCounter === null) {
      throw new RangeError('decideRecord needs the shared limit counter for this record');
    }
    sharedLimit = sharedLimitDecision({
      labels,
      otherRuleFits: false,
      sessionId: session.id,
      counter: facts.sharedLimitCounter,
    });
    reasonCode = sharedLimit.reason;
  }
  const definition = reasonCode === null ? null : reasonDefinition(reasonCode);
  return {
    decision: definition?.decision ?? 'PRESENT',
    reasonCode,
    extraReasons: ranked.extraReasons,
    labels,
    late: facts.arrivedAtMs >= sendingEndAtMs,
    decisionSource: definition?.source ?? 'AUTOMATIC',
    actorPersonId: reasonCode === 'NOT_IN_CLASS_AT_CHECK' ? student.notInClassBy : null,
    sharedLimit,
  };
}
