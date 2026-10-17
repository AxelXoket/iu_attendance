/** True for a safe integer from 0: a count, an instant or a duration in whole milliseconds. */
export const isWholeFromZero = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** True for a safe integer from 1: a length, a limit or a speed that cannot be 0. */
export const isWholeFromOne = (value: number) => Number.isSafeInteger(value) && value >= 1;

/** True for a safe integer from min to max. */
export const isWholeIn = (value: number, min: number, max: number) =>
  Number.isSafeInteger(value) && value >= min && value <= max;

/** The largest unsigned 64-bit value, 2^64 - 1, in decimal digits (20 of them). */
export const UINT64_MAX_TEXT = '18446744073709551615';
