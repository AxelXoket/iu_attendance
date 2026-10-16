// Old schedule (D04-B23): a session moved to another time still takes a record given
// offline under the schedule it had, which then goes to review. Each old schedule (from
// the session's history, D02) is rebuilt with the window rule, using only the changes
// pressed while that schedule held: from the move before it up to the move away from it.
// A record outside the current window that falls in an old schedule's [open, latest
// close) gets OLD_SCHEDULE with the first such schedule.

import type { ClockRange } from './types.ts';
import { computeWindow, type WindowChange, windowPlacement } from './window.ts';

/** A schedule the session had before a move, with the instants it held between. */
export type OldSchedule = {
  readonly openAtMs: number;
  readonly classEndAtMs: number;
  readonly plannedWindowMinutes: number | null;
  /** The move that started this schedule; null for the session's first one. */
  readonly heldFromMs: number | null;
  /** The move away from this schedule. */
  readonly heldUntilMs: number;
};

/**
 * The first old schedule whose window the record's range meets, or null. The caller
 * asks only for a record outside the current window, in the history's order.
 */
export function oldSchedule(
  range: ClockRange,
  schedules: readonly OldSchedule[],
  changes: readonly WindowChange[],
): OldSchedule | null {
  for (const schedule of schedules) {
    const window = computeWindow({
      openAtMs: schedule.openAtMs,
      classEndAtMs: schedule.classEndAtMs,
      plannedWindowMinutes: schedule.plannedWindowMinutes,
      movedAtMs: schedule.heldFromMs,
      // Pressed before the move away: in integer milliseconds, by the instant before it.
      pressedByMs: schedule.heldUntilMs - 1,
      arrivedByMs: null,
      changes,
    });
    if (windowPlacement(range, window) !== 'OUTSIDE') return schedule;
  }
  return null;
}
