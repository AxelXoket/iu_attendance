// The AKSIS summary's output state (D10): where a section stands on its way to the term's
// lock, whether an unanswered held question blocks the end-of-term output, and whether
// a lecturer's output writes a snapshot. Derived on every request from the clock and the
// courses module's data; never stored.
//   IN_TERM   until the end of the section's last session that is not cancelled
//   TERM_END  from that end until the unit's lock instant
//   LOCKED    from the lock instant on, even before the last session ends; never in a
//             unit without a calendar, whose lock instant is unknown
// A session added after the last one takes TERM_END back to IN_TERM until it ends.

import { isLockedAt } from '../courses/calendar.ts';

export const OUTPUT_STATES = ['IN_TERM', 'TERM_END', 'LOCKED'] as const;
export type OutputState = (typeof OUTPUT_STATES)[number];

// What keeps the end-of-term output closed: a held question still unanswered (D10-A05).
export const OUTPUT_BLOCKS = ['UNANSWERED_SESSIONS'] as const;
export type OutputBlock = (typeof OUTPUT_BLOCKS)[number];

export type OutputStatusInput = {
  readonly nowMs: number;
  /** The end of the section's last session that is not cancelled; null without one. */
  readonly lastSessionEndAtMs: number | null;
  /** The unit's lock instant for the term; null without a calendar. */
  readonly lockAtMs: number | null;
  /** How many of the section's ended sessions have an unanswered held question. */
  readonly unansweredSessionCount: number;
};

export type OutputStatus = {
  readonly state: OutputState;
  /**
   * Outside IN_TERM, so at TERM_END and LOCKED, even a lock before the last session's end;
   * in term an unanswered session only makes the summary provisional.
   */
  readonly block: OutputBlock | null;
  /** A lecturer's output writes a snapshot: at term end, with a known lock and no block. */
  readonly snapshotAllowed: boolean;
};

/**
 * The output status now. Instants are whole milliseconds and the count a whole number;
 * anything else, undefined for a missing instant included, throws RangeError.
 */
export function outputStatus(input: OutputStatusInput): OutputStatus {
  const { nowMs, lastSessionEndAtMs, lockAtMs, unansweredSessionCount } = input;
  const known = [lastSessionEndAtMs, lockAtMs].filter((ms) => ms !== null);
  if (![nowMs, ...known].every(Number.isSafeInteger)) {
    throw new RangeError('output state instants are whole milliseconds');
  }
  if (!Number.isSafeInteger(unansweredSessionCount) || unansweredSessionCount < 0) {
    throw new RangeError('unanswered sessions are a count');
  }
  const state: OutputState = isLockedAt(lockAtMs, nowMs)
    ? 'LOCKED'
    : lastSessionEndAtMs !== null && nowMs >= lastSessionEndAtMs
      ? 'TERM_END'
      : 'IN_TERM';
  const block = state !== 'IN_TERM' && unansweredSessionCount > 0 ? 'UNANSWERED_SESSIONS' : null;
  return {
    state,
    block,
    snapshotAllowed: state === 'TERM_END' && lockAtMs !== null && block === null,
  };
}
