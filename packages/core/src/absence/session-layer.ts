// The absence module's session layer (D08-B10, D08-A15): which held sessions belong to
// the student, the two inputs of the final status rule only this module fills, and the
// exemption overlay. Hours and final statuses come from the corrections module's
// resolveFinalStatus; this layer writes no second split rule.

import type { FinalStatus } from '../corrections/catalog.ts';
import {
  type FinalStatusCorrection,
  type FinalStatusRecord,
  resolveFinalStatus,
  type SessionFinalStatus,
} from '../corrections/final-status.ts';
import { coveringRow, type ScopeRow } from './scope.ts';

/** A final status of the absence module: the corrections module's, or EXEMPT. */
export type AbsenceFinalStatus = FinalStatus | 'EXEMPT';

/** The cell letter of an exempt student (the reports' M cell). */
export const EXEMPT_LETTER = 'M';

/**
 * A record as stored: its account, its arrival and whether it came past the last day
 * (reason AFTER_LAST_DAY). counted is the attendance module's choice within the account.
 */
export type LayerRecord = Omit<FinalStatusRecord, 'excludedFromCount'> & {
  readonly recordId: string;
  readonly accountId: string;
  readonly arrivedAtMs: number;
  readonly afterLastDay: boolean;
};

export type LayerSession = {
  readonly sessionId: string;
  readonly sectionIds: readonly string[];
  readonly startAtMs: number;
  readonly theoryHours: number;
  readonly practiceHours: number;
  /**
   * The held answer; a conflicting head count maps to null. Only a held session gets a
   * row: an unanswered or future one counts in the planned hours only (D08-A02).
   */
  readonly held: boolean | null;
  /** The student's records in this session, of every account of the student number. */
  readonly records: readonly LayerRecord[];
  readonly corrections: readonly FinalStatusCorrection[];
};

export type LayerInput = {
  /** The student's roster rows in the course. */
  readonly rows: readonly ScopeRow[];
  /** The course's planned sessions; cancelled ones are not passed. */
  readonly sessions: readonly LayerSession[];
  /** The number's confirmed account, if it has one (D08-B12). */
  readonly confirmedAccountId: string | null;
  readonly exempt: boolean;
  /** The unit term's lock instant: from then on the term is locked. */
  readonly lockAtMs: number | null;
  readonly nowMs: number;
};

type TypeStatus = Omit<SessionFinalStatus['theory'], 'finalStatus'> & {
  readonly finalStatus: AbsenceFinalStatus | null;
};

export type AbsenceSessionStatus = Omit<
  SessionFinalStatus,
  'finalStatus' | 'theory' | 'practice'
> & {
  readonly finalStatus: AbsenceFinalStatus | null;
  readonly theory: TypeStatus;
  readonly practice: TypeStatus;
};

export type LayerRow = {
  readonly sessionId: string;
  /** The section that receives the (student, session) cell. */
  readonly sectionId: string;
  readonly status: AbsenceSessionStatus;
};

// The attendance module's order among records: decision, then arrival, then id.
const DECISION_RANK: Readonly<Record<FinalStatusRecord['decision'], number>> = {
  PRESENT: 0,
  PENDING: 1,
  IN_REVIEW: 2,
  REJECTED: 3,
};
const comesFirst = (a: LayerRecord, b: LayerRecord) =>
  DECISION_RANK[a.decision] !== DECISION_RANK[b.decision]
    ? DECISION_RANK[a.decision] < DECISION_RANK[b.decision]
    : a.arrivedAtMs !== b.arrivedAtMs
      ? a.arrivedAtMs < b.arrivedAtMs
      : a.recordId < b.recordId;

// Which account's records count (D08-B12): with a confirmed account only its records,
// the others neither count nor raise a flag; without one, the first counted record in
// the attendance module's order counts for the session and the other accounts' do not.
function accountRecords(
  records: readonly LayerRecord[],
  confirmedAccountId: string | null,
): readonly LayerRecord[] {
  if (confirmedAccountId !== null) {
    return records.filter((record) => record.accountId === confirmedAccountId);
  }
  let chosen: LayerRecord | null = null;
  for (const record of records) {
    if (record.counted && (chosen === null || comesFirst(record, chosen))) chosen = record;
  }
  return records.map((record) =>
    record.counted && record !== chosen ? { ...record, counted: false } : record,
  );
}

const participated = (status: SessionFinalStatus) =>
  status.theory.present +
    status.theory.excused +
    status.practice.present +
    status.practice.excused >
  0;

// An exempt student's session shows EXEMPT in every hour type the session has; only the
// final status and its letter change: hours and the provisional flag stay as the rule
// gave them.
function exemptOverlay(status: SessionFinalStatus, session: LayerSession): AbsenceSessionStatus {
  const overlay = (type: SessionFinalStatus['theory'], hours: number): TypeStatus =>
    hours > 0 ? { ...type, finalStatus: 'EXEMPT', letter: EXEMPT_LETTER } : type;
  return {
    ...status,
    finalStatus: 'EXEMPT',
    letter: EXEMPT_LETTER,
    theory: overlay(status.theory, session.theoryHours),
    practice: overlay(status.practice, session.practiceHours),
  };
}

/**
 * The student's rows of the course: one per held session in the student's calculation
 * scope, in the given order. A record that arrived once the term was locked, or past the
 * last day, counts as no record; in a locked term open decisions freeze as absent.
 */
export function sessionLayer(input: LayerInput): LayerRow[] {
  const { rows, exempt, lockAtMs, nowMs } = input;
  const locked = lockAtMs !== null && nowMs >= lockAtMs;
  const result: LayerRow[] = [];
  for (const session of input.sessions) {
    if (session.held !== true) continue;
    const records = accountRecords(session.records, input.confirmedAccountId).map(
      ({ recordId: _id, accountId: _account, arrivedAtMs, afterLastDay, ...record }) => ({
        ...record,
        excludedFromCount: afterLastDay || (lockAtMs !== null && arrivedAtMs >= lockAtMs),
      }),
    );
    const status = resolveFinalStatus(records, session.corrections, {
      theoryHours: session.theoryHours,
      practiceHours: session.practiceHours,
      held: session.held,
      locked,
    });
    const row = coveringRow(rows, session, participated(status));
    if (row === null) continue;
    result.push({
      sessionId: session.sessionId,
      sectionId: row.sectionId,
      status: exempt ? exemptOverlay(status, session) : status,
    });
  }
  return result;
}
