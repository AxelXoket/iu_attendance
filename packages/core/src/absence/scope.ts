import { isEmptySpan, isMemberAt } from '../rosters/interval.ts';
import type { LateChoice } from '../rosters/late-choice.ts';
import type { HourType } from './types.ts';

// Hours of a session per hour type. The spec makes this the one hours function of the
// absence calculation and of the correction hour check (D09).
export function sessionHours(session: {
  theoryHours: number;
  practiceHours: number;
}): Record<HourType, number> {
  return { THEORY: session.theoryHours, PRACTICE: session.practiceHours };
}

// One roster row of the student in the course: a member in [addedAt, inactiveAt); a row
// trimmed by a revival can have length zero (D03). A trimmed row still marks an addition
// but holds no membership. lateEnrollmentChoice is the student's late choice in the
// course (D03-B12, late-choice.ts).
export type ScopeRow = {
  sectionId: string;
  addedAtMs: number;
  inactiveAtMs: number | null;
  lateEnrollmentChoice: LateChoice;
};

export type ScopeSession = { sectionIds: readonly string[]; startAtMs: number };

// The fixed order among candidate rows: earliest addedAtMs; at one instant the row the
// student holds before a trimmed one (D03 keeps that one and trims the other, state
// transitions 5 and 8); then the smaller sectionId in code units. D03 keeps one row per
// section and student, so these keys settle every tie D03 can store and the answer depends
// only on the row values. The end (open last) and the choice (PREVIOUS_ABSENT first) only
// order rows of one section, which D03 never stores; of rows equal in all four fields the
// first given is returned.
function precedes(a: ScopeRow, b: ScopeRow): boolean {
  if (a.addedAtMs !== b.addedAtMs) return a.addedAtMs < b.addedAtMs;
  if (isEmptySpan(a) !== isEmptySpan(b)) return isEmptySpan(b);
  if (a.sectionId !== b.sectionId) return a.sectionId < b.sectionId;
  const aEnd = a.inactiveAtMs ?? Number.POSITIVE_INFINITY;
  const bEnd = b.inactiveAtMs ?? Number.POSITIVE_INFINITY;
  if (aEnd !== bEnd) return aEnd < bEnd;
  return (
    a.lateEnrollmentChoice === 'PREVIOUS_ABSENT' && b.lateEnrollmentChoice !== 'PREVIOUS_ABSENT'
  );
}

function earliest<R extends ScopeRow>(rows: readonly R[]): R | null {
  let found: R | null = null;
  for (const row of rows) if (found === null || precedes(row, found)) found = row;
  return found;
}

// The student's first row in the course: the first of all rows in the order above, also
// when it is trimmed (D03-B12 calls it the oldest row). Md.9/4 reads its choice and section,
// and the late-addition check of D03-B12 needs the same row.
export function firstRow<R extends ScopeRow>(rows: readonly R[]): R | null {
  return earliest(rows);
}

// The row whose section receives the (student, session) cell (D08 invariants.24), or null
// when the session is out of scope. The rules, in this order:
// 1. Membership: a row of one of the session's sections has the start in [addedAt, inactiveAt).
// 2. Md.9/4: the first row (firstRow) has PREVIOUS_ABSENT, belongs to one of the session's
//    sections, and the session starts before its addition.
// 3. Participation, for the calculation only (D08-B12): participated means the student has
//    present or excused hours in this session; the session counts when a row of one of its
//    sections was added after it began, and the first such row receives the cell. A
//    dropped student's later sessions and the sections the student never joined stay out.
export function coveringRow<R extends ScopeRow>(
  rows: readonly R[],
  session: ScopeSession,
  participated: boolean,
): R | null {
  const ofSession = rows.filter((row) => session.sectionIds.includes(row.sectionId));
  const member = earliest(ofSession.filter((row) => isMemberAt(row, session.startAtMs)));
  if (member !== null) return member;
  const first = firstRow(rows);
  if (
    first !== null &&
    first.lateEnrollmentChoice === 'PREVIOUS_ABSENT' &&
    session.sectionIds.includes(first.sectionId) &&
    session.startAtMs < first.addedAtMs
  ) {
    return first;
  }
  if (!participated) return null;
  return earliest(ofSession.filter((row) => session.startAtMs < row.addedAtMs));
}

// The scope predicate, which corrections share: rules 1 and 2 of coveringRow.
export function isInScope(rows: readonly ScopeRow[], session: ScopeSession): boolean {
  return coveringRow(rows, session, false) !== null;
}

// The absence calculation's scope: the predicate widened by participation (rule 3).
export function isInCalculationScope(
  rows: readonly ScopeRow[],
  session: ScopeSession,
  participated: boolean,
): boolean {
  return coveringRow(rows, session, participated) !== null;
}
