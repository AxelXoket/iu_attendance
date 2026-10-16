// The 5-second display slices (D11): pure arithmetic on UTC milliseconds, no Intl.

import { DISPLAY_SLICE_MS } from './constants.ts';

/** The slice an instant falls in: floor(Unix seconds / 5). */
export function sliceOf(ms: number): number {
  return Math.floor(ms / DISPLAY_SLICE_MS);
}

/** The first millisecond of a slice: slice x 5 s. */
export function sliceStartMs(slice: number): number {
  return slice * DISPLAY_SLICE_MS;
}
