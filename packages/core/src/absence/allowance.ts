import type { RatePercent, TypeDecision } from './types.ts';

// Every input is an integer and is not checked here: D02 stores a session's theory and
// practice hours as whole numbers (together 1 to 12) and the rates as whole percents from
// 0 to 100, so the hour totals are integers too. The caller (the absence calculation) also
// keeps 0 <= absentHours <= totalHours.

// The absence allowance: the largest k with (T - k) * 100 >= p * T, in integer
// arithmetic only. (T * p + 99) div 100 is the ceiling of the hours that must be
// attended; floating point would get T = 15, p = 80 wrong (2 instead of 3).
export function allowance(totalHours: number, ratePercent: RatePercent): number {
  return totalHours - Math.floor((totalHours * ratePercent + 99) / 100);
}

// The decision for one hour type: met while the absent hours stay within the allowance.
export function typeDecision(
  totalHours: number,
  ratePercent: RatePercent,
  absentHours: number,
): TypeDecision {
  return absentHours <= allowance(totalHours, ratePercent) ? 'MET' : 'NOT_MET';
}

// The attended share in tenths of a percent (695 is 69.5 percent), rounded down;
// null when there are no hours yet.
export function percentTenths(totalHours: number, absentHours: number): number | null {
  if (totalHours === 0) return null;
  return Math.floor(((totalHours - absentHours) * 1000) / totalHours);
}
