import { describe, expect, it } from 'vitest';
import { isWholeFromZero } from './number.ts';

describe('isWholeFromZero', () => {
  it('takes the safe integers from 0 and nothing else', () => {
    for (const value of [0, 1, Number.MAX_SAFE_INTEGER]) expect(isWholeFromZero(value)).toBe(true);
    for (const value of [-1, 0.5, 2 ** 53, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isWholeFromZero(value), String(value)).toBe(false);
    }
  });
});
