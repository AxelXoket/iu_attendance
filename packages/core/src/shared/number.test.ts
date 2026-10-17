import { describe, expect, it } from 'vitest';
import { isWholeFromOne, isWholeFromZero, isWholeIn, UINT64_MAX_TEXT } from './number.ts';

describe('isWholeFromZero', () => {
  it('takes the safe integers from 0 and nothing else', () => {
    for (const value of [0, 1, Number.MAX_SAFE_INTEGER]) expect(isWholeFromZero(value)).toBe(true);
    for (const value of [-1, 0.5, 2 ** 53, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isWholeFromZero(value), String(value)).toBe(false);
    }
  });
});

describe('isWholeFromOne', () => {
  it('takes the safe integers from 1 and nothing else', () => {
    for (const value of [1, 2, Number.MAX_SAFE_INTEGER]) expect(isWholeFromOne(value)).toBe(true);
    for (const value of [0, -1, 1.5, 2 ** 53, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isWholeFromOne(value), String(value)).toBe(false);
    }
  });
});

describe('isWholeIn', () => {
  it('takes the safe integers from min to max, both ends included, and nothing else', () => {
    for (const value of [1, 5, 9]) expect(isWholeIn(value, 1, 9), String(value)).toBe(true);
    for (const value of [0, 10, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isWholeIn(value, 1, 9), String(value)).toBe(false);
    }
    // Above the safe integers nothing is whole, even within the bounds.
    expect(isWholeIn(2 ** 53, 0, 2 ** 54)).toBe(false);
    expect(isWholeIn(2 ** 53 - 1, 0, 2 ** 54)).toBe(true);
    // A range may start below 0.
    expect(isWholeIn(-1, -5, 5)).toBe(true);
  });
});

describe('UINT64_MAX_TEXT', () => {
  it('is 2^64 - 1 in decimal', () => {
    expect(UINT64_MAX_TEXT).toBe((2n ** 64n - 1n).toString());
  });
});
