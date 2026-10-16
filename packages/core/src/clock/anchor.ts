// Anchor range (D04): where one clock anchor puts an event. S is the server time in the
// clock document, q how long the document request took and g the time between the
// document's arrival and the event, both measured by the phone's own counter, whose real
// durations are within DRIFT_PPM of the measured ones: k(x) = ceil(x / 10000). The
// server stamped S while the request was in flight, so the event lies in
//   first anchor (event after the document):   [S + g - k(g), S + g + q + k(g + q)]
//   second anchor (event before the document): [S - g - k(g), S - g + q + k(g + q)]
// The estimate is the stored time plus (first) or minus (second) the elapsed time, as
// the phone counts it; the margin is q + k(g).

import { isWholeFromZero } from '../shared/number.ts';
import { DRIFT_PPM } from './constants.ts';
import type { ClockRange } from './types.ts';

export type AnchorDirection = 'FORWARD' | 'BACKWARD';
export type AnchorRange = ClockRange & { readonly estimateMs: number; readonly marginMs: number };

/** True for a duration the phone may report: a safe integer of 0 ms or more. */
const driftMs = (elapsedMs: number) => Math.ceil((elapsedMs * DRIFT_PPM) / 1_000_000);

/**
 * The range of one anchor. Throws RangeError for a time that is not a safe integer or a
 * duration that is not a safe integer of 0 or more: the caller checks them first
 * (clockResult does).
 */
export function anchorRange(input: {
  readonly documentTimeMs: number;
  readonly requestDurationMs: number;
  readonly elapsedMs: number;
  readonly direction: AnchorDirection;
}): AnchorRange {
  const { documentTimeMs, requestDurationMs, elapsedMs, direction } = input;
  if (
    !Number.isSafeInteger(documentTimeMs) ||
    !isWholeFromZero(requestDurationMs) ||
    !isWholeFromZero(elapsedMs)
  ) {
    throw new RangeError('anchorRange expects integer milliseconds and durations of 0 or more');
  }
  const estimateMs =
    direction === 'FORWARD' ? documentTimeMs + elapsedMs : documentTimeMs - elapsedMs;
  return {
    lowMs: estimateMs - driftMs(elapsedMs),
    highMs: estimateMs + requestDurationMs + driftMs(elapsedMs + requestDurationMs),
    estimateMs,
    marginMs: requestDurationMs + driftMs(elapsedMs),
  };
}
