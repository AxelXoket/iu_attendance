/** True for a safe integer from 0: a count, an instant or a duration in whole milliseconds. */
export const isWholeFromZero = (value: number) => Number.isSafeInteger(value) && value >= 0;
