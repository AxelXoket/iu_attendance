// A type result for the absence tests: theory, 10 hours at 70 percent (allowance 3), one
// hour still planned so the row exists even at a base of 0.

import { type TypeResult, type TypeResultInput, typeResult } from '../absence/result.ts';

export const typeInput = (patch: Partial<TypeResultInput> = {}): TypeResultInput => ({
  type: 'THEORY',
  ratePercent: 70,
  baseHours: 10,
  plannedRemainingHours: 1,
  absentHours: 0,
  openAbsentHours: 0,
  openPresentHours: 0,
  ...patch,
});

export function typeRow(patch: Partial<TypeResultInput> = {}): TypeResult {
  const row = typeResult(typeInput(patch));
  if (row === null) throw new Error('a test type row needs base or planned hours');
  return row;
}
