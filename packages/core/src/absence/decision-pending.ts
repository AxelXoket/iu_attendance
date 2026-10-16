// Decision pending (D08, KARAR BEKLIYOR): why a course result is not final yet. Pure; the
// absence job, the live course results and the lecturer's list share it.
//   OPEN_FLAG: the open decisions (pending, in review, a self-declared record awaiting
//     approval, an open issue report) give another course result when all resolve for the
//     student than when all resolve against; the result is monotone in each session, so the
//     two ends decide it exactly.
//   NO_CONNECTION: the last session in scope has ended, the term is not locked, the number
//     has a confirmed account, and the phone may still hold a record: its last contact
//     came before the last session ended, or some phone of the person reported unsent
//     records at its own last contact. One such record, making one candidate session
//     present in all its hours, would turn NOT_MET into MET.
// Only for an active student who is not exempt; both reasons may hold together.

import { isLockedAt } from '../courses/calendar.ts';
import { withinAllowance } from './allowance.ts';
import { courseRange, type TypeResult } from './result.ts';
import type { HourType } from './types.ts';

export const DECISION_PENDING_REASONS = ['OPEN_FLAG', 'NO_CONNECTION'] as const;
export type DecisionPendingReason = (typeof DECISION_PENDING_REASONS)[number];

// What keeps a session's decision open, as the lecturer's list shows it. An issue report
// may stand on a session counted either way, so the kind alone gives no direction.
export const OPEN_FLAG_KINDS = [
  'PENDING',
  'IN_REVIEW',
  'SELF_DECLARED_APPROVAL',
  'ISSUE_REPORT',
] as const;
export type OpenFlagKind = (typeof OPEN_FLAG_KINDS)[number];

/** A held session where the student is absent, with its absent hours per type. */
export type AbsentSession = {
  readonly sessionId: string;
  readonly startAtMs: number;
  readonly absentHours: Readonly<Record<HourType, number>>;
};

export type DecisionPendingInput = {
  readonly active: boolean;
  readonly exempt: boolean;
  /** The types with a row, with the open hours as they stand at nowMs. */
  readonly types: readonly TypeResult[];
  readonly nowMs: number;
  /** The end of the last session in scope that is not cancelled; null without one. */
  readonly lastSessionEndAtMs: number | null;
  /** The unit term's lock instant; null without a calendar. */
  readonly lockAtMs: number | null;
  readonly confirmedAccount: boolean;
  /**
   * The person's last contact, and whether any of their phones reported unsent records at
   * its own last contact; null when they never made contact.
   */
  readonly lastContact: { readonly atMs: number; readonly unsentReported: boolean } | null;
  /** The held sessions in scope where the student is absent, counted ones only. */
  readonly absentSessions: readonly AbsentSession[];
};

// The absent sessions one record might still turn present. With no contact known, or
// unsent records reported, every one, in the student's favour; with a contact before the
// last session's end, those starting after it; otherwise none.
function candidates(input: DecisionPendingInput): readonly AbsentSession[] {
  const { lastContact, lastSessionEndAtMs } = input;
  if (lastContact === null || lastContact.unsentReported) return input.absentSessions;
  if (lastSessionEndAtMs === null || lastContact.atMs >= lastSessionEndAtMs) return [];
  return input.absentSessions.filter((session) => session.startAtMs > lastContact.atMs);
}

// Whether making the session present in all its hours turns every type MET. A session's
// hours of a type lie within the type's absent hours.
function turnsMet(rows: readonly TypeResult[], session: AbsentSession): boolean {
  const met = rows.map((row) => {
    const hours = session.absentHours[row.type];
    if (!Number.isInteger(hours) || hours < 0 || hours > row.absentHours) {
      throw new RangeError(`session ${session.sessionId} has hours outside the ${row.type} base`);
    }
    return withinAllowance(row.absentHours - hours, row.allowance);
  });
  return met.every(Boolean);
}

/**
 * The sessions one record would turn the course from NOT_MET to MET, in the given order;
 * empty unless the no-connection conditions hold. The lecturer's list shows them.
 */
export function singleRecordSessions(input: DecisionPendingInput): readonly AbsentSession[] {
  const { lastSessionEndAtMs, nowMs } = input;
  const ended = lastSessionEndAtMs !== null && lastSessionEndAtMs <= nowMs;
  if (
    !input.active ||
    input.exempt ||
    !ended ||
    isLockedAt(input.lockAtMs, nowMs) ||
    !input.confirmedAccount ||
    courseRange(false, input.types).current !== 'NOT_MET'
  ) {
    return [];
  }
  return candidates(input).filter((session) => turnsMet(input.types, session));
}

/** The reasons the course result is not final yet; empty when it is. */
export function decisionPendingReasons(
  input: DecisionPendingInput,
): readonly DecisionPendingReason[] {
  if (!input.active || input.exempt) return [];
  const reasons: DecisionPendingReason[] = [];
  const range = courseRange(false, input.types);
  if (range.best !== range.worst) reasons.push('OPEN_FLAG');
  if (singleRecordSessions(input).length > 0) reasons.push('NO_CONNECTION');
  return reasons;
}
