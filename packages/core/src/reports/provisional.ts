// The provisional rule (D10): a report or AKSIS summary is provisional while a reason counts
// at least once. The reasons are listed in PROVISIONAL_REASONS order, each with the count
// the caller gives in its own unit. Which reasons count follows the output state: all of
// them in term; once locked only the reasons that survive the lock (D10-C04), so the
// end-of-day snapshot may still be provisional. TERM_END is the AKSIS summary's state
// between the last session's end and the lock: it leaves out the running sending time,
// which the summary tells apart there (D10-A03). A course or student report has no such
// state and passes IN_TERM until the lock is applied, LOCKED after.

import { isWholeFromZero } from '../shared/number.ts';
import { LOCK_SURVIVING_REASONS, PROVISIONAL_REASONS, type ProvisionalReason } from './codes.ts';
import type { OutputState } from './output-state.ts';

export type ProvisionalCounts = { readonly [Reason in ProvisionalReason]: number };
export type ProvisionalReasonCount = {
  readonly code: ProvisionalReason;
  readonly count: number;
};

const COUNTED: { readonly [State in OutputState]: (reason: ProvisionalReason) => boolean } = {
  IN_TERM: () => true,
  TERM_END: (reason) => reason !== 'SENDING_TIME_RUNNING',
  LOCKED: (reason) => (LOCK_SURVIVING_REASONS as readonly ProvisionalReason[]).includes(reason),
};

/**
 * The reasons that make the output provisional in this state, in the fixed order, each
 * with a count from 1. Throws RangeError for a count that is not a whole number from 0.
 */
export function provisionalReasons(
  counts: ProvisionalCounts,
  state: OutputState,
): ProvisionalReasonCount[] {
  if (!PROVISIONAL_REASONS.every((code) => isWholeFromZero(counts[code]))) {
    throw new RangeError('provisional reason counts are whole numbers from 0');
  }
  return PROVISIONAL_REASONS.filter((code) => COUNTED[state](code) && counts[code] > 0).map(
    (code) => ({ code, count: counts[code] }),
  );
}
