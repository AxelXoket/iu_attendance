// Warning level of one hour type (D08-B03, B04, the levels and the no-going-back rule).
// Pure: the absence job computes it, the phone repeats it for unsent records.
//   4  ALLOWANCE_EXCEEDED       remaining < 0
//   3  NO_ALLOWANCE_LEFT        remaining = 0
//   2  ONE_MORE_ENDS_ALLOWANCE  a next session exists and remaining = its hours
//      ONE_MORE_MAKES_ABSENT    a next session exists and remaining < its hours
//   1  HALF_USED                2 x used >= estimated allowance
//   0  none
// The highest level that holds wins. No warning (level 0) while the rates are not
// confirmed, where p is 0, for an exempt student and for an inactive one; the allowance
// figures are computed all the same.

import { compareText } from '../shared/text.ts';
import { idKey } from '../shared/uuid.ts';
import { allowance, isHours, isRatePercent, typeDecision } from './allowance.ts';
import { isInScope, type ScopeRow, type ScopeSession, sessionHours } from './scope.ts';
import type { HourType, RatePercent, TypeDecision } from './types.ts';

export const LEVEL_MESSAGES = [
  'HALF_USED',
  'ONE_MORE_ENDS_ALLOWANCE',
  'ONE_MORE_MAKES_ABSENT',
  'NO_ALLOWANCE_LEFT',
  'ALLOWANCE_EXCEEDED',
] as const;
export type LevelMessage = (typeof LEVEL_MESSAGES)[number];
export type Level = 0 | 1 | 2 | 3 | 4;

// What moved a displayed level: DATA (used hours, p, rate confirmation, exemption,
// activity or the caller's other data), ESTIMATE (only the end-of-term estimate, which
// may only raise it), NEXT_SESSION (only the next session's hours, either way), FIRST.
export const LEVEL_CAUSES = ['DATA', 'ESTIMATE', 'NEXT_SESSION', 'FIRST'] as const;
export type LevelCause = (typeof LEVEL_CAUSES)[number];

export type LevelInput = {
  readonly ratePercent: RatePercent;
  readonly ratesConfirmed: boolean;
  readonly exempt: boolean;
  readonly active: boolean;
  /** T: hours of sessions already in the base. */
  readonly baseHours: number;
  /** Planned hours in scope not yet in the base (future and unanswered past sessions). */
  readonly plannedRemainingHours: number;
  readonly absentHours: number;
  /** Absent hours of pending records, which count as present for the level. */
  readonly pendingHours: number;
  /** Hours of the next session in scope with hours of this type, or null when there is none. */
  readonly nextSessionHours: number | null;
  /** The caller's other data (membership summary, rule version, count base); a change is a data change. */
  readonly dataKey: string;
};

export type ComputedLevel = {
  readonly allowance: number;
  readonly decision: TypeDecision;
  readonly estimatedAllowance: number;
  readonly usedHours: number;
  readonly remaining: number;
  readonly level: Level;
  readonly message: LevelMessage | null;
};

/** The level, message and remaining allowance shown to the student. */
export type DisplayedLevel = {
  readonly level: Level;
  readonly message: LevelMessage | null;
  readonly remaining: number;
};

export type NextSessionCandidate = ScopeSession & {
  readonly sessionId: string;
  readonly theoryHours: number;
  readonly practiceHours: number;
  readonly cancelled: boolean;
};

/**
 * The next session's hours of a type (D08-B04): of the sessions that start after the
 * calculation instant, are not cancelled, lie in the student's scope and have hours of the
 * type (makeups too), the first by start, then by id. A running session is not next; null
 * when there is none, and level 2 is then not weighed.
 */
export function nextSessionHours(
  sessions: readonly NextSessionCandidate[],
  rows: readonly ScopeRow[],
  type: HourType,
  nowMs: number,
): number | null {
  let next: NextSessionCandidate | null = null;
  for (const session of sessions) {
    if (session.cancelled || session.startAtMs <= nowMs) continue;
    if (sessionHours(session)[type] === 0 || !isInScope(rows, session)) continue;
    const earlier =
      next === null ||
      session.startAtMs < next.startAtMs ||
      (session.startAtMs === next.startAtMs &&
        compareText(idKey(session.sessionId), idKey(next.sessionId)) < 0);
    if (earlier) next = session;
  }
  return next === null ? null : sessionHours(next)[type];
}

export function computeLevel(input: LevelInput): ComputedLevel {
  const { ratePercent, baseHours, absentHours, nextSessionHours } = input;
  if (!isRatePercent(ratePercent)) throw new RangeError('the rate is not a whole percent');
  // D08's row: absent hours lie within the base (absent = T - attended - excused), pending
  // within absent, and a type has hours in the base or still planned (saat_ck).
  const hours = [baseHours, input.plannedRemainingHours, absentHours, input.pendingHours];
  if (
    !hours.every(isHours) ||
    absentHours > baseHours ||
    input.pendingHours > absentHours ||
    baseHours + input.plannedRemainingHours === 0 ||
    (nextSessionHours !== null && !(isHours(nextSessionHours) && nextSessionHours > 0))
  ) {
    throw new RangeError('the hours are not whole numbers within their base, or the type has none');
  }
  const estimatedAllowance = allowance(baseHours + input.plannedRemainingHours, ratePercent);
  const usedHours = absentHours - input.pendingHours;
  const remaining = estimatedAllowance - usedHours;
  const figures = {
    allowance: allowance(baseHours, ratePercent),
    decision: typeDecision(baseHours, ratePercent, absentHours),
    estimatedAllowance,
    usedHours,
    remaining,
  };
  const warns = input.ratesConfirmed && ratePercent > 0 && !input.exempt && input.active;
  const [level, message]: [Level, LevelMessage | null] = warns
    ? warning(remaining, nextSessionHours, usedHours, estimatedAllowance)
    : [0, null];
  return { ...figures, level, message };
}

// The highest level that holds; the rows below are checked from the top.
function warning(
  remaining: number,
  nextSessionHours: number | null,
  usedHours: number,
  estimatedAllowance: number,
): [Level, LevelMessage | null] {
  if (remaining < 0) return [4, 'ALLOWANCE_EXCEEDED'];
  if (remaining === 0) return [3, 'NO_ALLOWANCE_LEFT'];
  if (nextSessionHours !== null && remaining === nextSessionHours)
    return [2, 'ONE_MORE_ENDS_ALLOWANCE'];
  if (nextSessionHours !== null && remaining < nextSessionHours)
    return [2, 'ONE_MORE_MAKES_ABSENT'];
  if (2 * usedHours >= estimatedAllowance) return [1, 'HALF_USED'];
  return [0, null];
}

const shown = (computed: ComputedLevel): DisplayedLevel => ({
  level: computed.level,
  message: computed.message,
  remaining: computed.remaining,
});

const dataChanged = (a: LevelInput, b: LevelInput) =>
  a.absentHours - a.pendingHours !== b.absentHours - b.pendingHours ||
  a.ratePercent !== b.ratePercent ||
  a.ratesConfirmed !== b.ratesConfirmed ||
  a.exempt !== b.exempt ||
  a.active !== b.active ||
  a.dataKey !== b.dataKey;

/**
 * The displayed level after a recalculation. A data change, or a change of the next
 * session alone, shows the computed level. A change of the end-of-term estimate alone
 * never lowers it: the shown triple stays as it was unless the computed level is higher.
 * Nothing changed keeps the shown triple. cause is null when the shown level did not change.
 */
export function nextDisplayedLevel(
  previous: { readonly input: LevelInput; readonly displayed: DisplayedLevel } | null,
  input: LevelInput,
): { displayed: DisplayedLevel; cause: LevelCause | null } {
  const computed = shown(computeLevel(input));
  if (previous === null) return { displayed: computed, cause: computed.level > 0 ? 'FIRST' : null };
  const before = previous.input;
  const changed = (displayed: DisplayedLevel, cause: LevelCause) => ({
    displayed,
    cause: displayed.level === previous.displayed.level ? null : cause,
  });
  if (dataChanged(before, input)) return changed(computed, 'DATA');
  const estimate = (value: LevelInput) => value.baseHours + value.plannedRemainingHours;
  if (estimate(before) !== estimate(input)) {
    return computed.level > previous.displayed.level
      ? changed(computed, 'ESTIMATE')
      : { displayed: previous.displayed, cause: null };
  }
  if (before.nextSessionHours !== input.nextSessionHours) return changed(computed, 'NEXT_SESSION');
  return { displayed: previous.displayed, cause: null };
}
