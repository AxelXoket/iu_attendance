// Type and course results (D08): the AKSIS decision of each hour type, the course's
// overall result, and the best and worst outcome of the decisions still open. Pure; the
// absence job, the live course results and the phone share it.
//   absent (devamsiz) = absent + pending + in review hours = T - attended - excused
//   a type is MET exactly when absent <= allowance
//   the course: MET_EXEMPT when exempt, otherwise NOT_MET when a type with a row is
//   NOT_MET, otherwise MET
// A type has a row when the course has hours of it in the base or still planned for the
// student; a type with neither has no row and plays no part in the result.
// The caller passes the open hours as they stand: once the term is locked, decisions
// are frozen and only an open issue report is still open.

import { allowance, attendedPerMille, isHours, isRatePercent, typeDecision } from './allowance.ts';
import type { CourseResult, HourType, RatePercent, TypeDecision } from './types.ts';

export type TypeResultInput = {
  readonly type: HourType;
  readonly ratePercent: RatePercent;
  /** T: hours of the sessions in the base. */
  readonly baseHours: number;
  /** Planned hours in scope not yet in the base. */
  readonly plannedRemainingHours: number;
  /** Absent, pending and in review hours. */
  readonly absentHours: number;
  /** Of absentHours, those still open: pending, in review, or under an open issue report. */
  readonly openAbsentHours: number;
  /** Counted present but still open: a self-declared record awaiting approval. */
  readonly openPresentHours: number;
};

export type TypeResult = {
  readonly type: HourType;
  /** Kept for the stored row and the AKSIS summary's held hours. */
  readonly baseHours: number;
  readonly absentHours: number;
  readonly allowance: number;
  /** Attended share per mille, rounded down; null while the base is 0. */
  readonly attendedPerMille: number | null;
  readonly decision: TypeDecision;
  /** Every open decision resolved for the student. */
  readonly best: TypeDecision;
  /** Every open decision resolved against the student. */
  readonly worst: TypeDecision;
};

export type CourseRange = {
  readonly current: CourseResult;
  readonly best: CourseResult;
  readonly worst: CourseResult;
};

/**
 * The result of one hour type, or null when it has no row. The rate is a whole percent
 * from 0 to 100; hours are whole numbers with absent <= T and each open part within the
 * hours it may leave; anything else throws RangeError.
 */
export function typeResult(input: TypeResultInput): TypeResult | null {
  const { type, ratePercent, baseHours, plannedRemainingHours, absentHours } = input;
  const { openAbsentHours, openPresentHours } = input;
  const hours = [baseHours, plannedRemainingHours, absentHours, openAbsentHours, openPresentHours];
  if (!isRatePercent(ratePercent)) {
    throw new RangeError(`${type} rate is not a whole percent`);
  }
  if (
    !hours.every(isHours) ||
    absentHours > baseHours ||
    openAbsentHours > absentHours ||
    openPresentHours > baseHours - absentHours
  ) {
    throw new RangeError(`${type} hours are not whole numbers within their base`);
  }
  if (baseHours + plannedRemainingHours === 0) return null;
  const decide = (absent: number) => typeDecision(baseHours, ratePercent, absent);
  return {
    type,
    baseHours,
    absentHours,
    allowance: allowance(baseHours, ratePercent),
    attendedPerMille: attendedPerMille(baseHours, absentHours),
    decision: decide(absentHours),
    best: decide(absentHours - openAbsentHours),
    worst: decide(absentHours + openPresentHours),
  };
}

/** The course result over the types with a row. */
export function courseResult(exempt: boolean, decisions: readonly TypeDecision[]): CourseResult {
  if (exempt) return 'MET_EXEMPT';
  return decisions.includes('NOT_MET') ? 'NOT_MET' : 'MET';
}

/** The course result now, and with every open decision resolved for and against the student. */
export function courseRange(exempt: boolean, rows: readonly TypeResult[]): CourseRange {
  const over = (pick: (row: TypeResult) => TypeDecision) => courseResult(exempt, rows.map(pick));
  return {
    current: over((row) => row.decision),
    best: over((row) => row.best),
    worst: over((row) => row.worst),
  };
}
