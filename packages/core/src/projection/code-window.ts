// The lectern's code window (D11, Projeksiyona kod verme): a connected lectern gets the
// codes of the current 5-second slice and of up to six ahead, so none starts more than 30 s
// after now, and none for a slice that starts at or after the window's close. A
// connection's last slice is the one formula the closing job, an open connection's upper
// bound and the evidence's outside-display check share: six slices past the connection's
// end, never past the window's latest close, so the codes given before an early close stay
// inside it.

import { LECTERN_CODE_SLICES } from './constants.ts';
import { sliceOf } from './slice.ts';

const checkInstants = (name: string, ...instants: number[]) => {
  if (!instants.every(Number.isSafeInteger)) {
    throw new RangeError(`${name} expects integer milliseconds`);
  }
};

// Six slices past the one at fromMs, and none that starts at or after closeMs.
const lastSliceFrom = (fromMs: number, closeMs: number) =>
  Math.min(sliceOf(fromMs) + LECTERN_CODE_SLICES - 1, sliceOf(closeMs - 1));

/**
 * The slices whose codes a connected lectern gets at now: consecutive from the current
 * one, at most seven, each starting before the window's close. Throws RangeError for an
 * instant that is not integer milliseconds.
 */
export function codeSlices(nowMs: number, closeAtMs: number): number[] {
  checkInstants('codeSlices', nowMs, closeAtMs);
  const first = sliceOf(nowMs);
  const count = lastSliceFrom(nowMs, closeAtMs) - first + 1;
  return Array.from({ length: Math.max(count, 0) }, (_, offset) => first + offset);
}

/**
 * A connection's last slice (son_dilim): min(slice(end) + 6, slice(window's latest close
 * - 1 ms)). The end is the connection's closing instant, or the reading instant while it
 * is open; the latest close is D04's, the close before any shortening. Throws RangeError
 * for an instant that is not integer milliseconds.
 */
export function connectionLastSlice(endAtMs: number, latestCloseAtMs: number): number {
  checkInstants('connectionLastSlice', endAtMs, latestCloseAtMs);
  return lastSliceFrom(endAtMs, latestCloseAtMs);
}
