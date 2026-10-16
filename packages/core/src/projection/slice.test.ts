import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DISPLAY_SLICE_MS, SLICE_MAX } from './constants.ts';
import { sliceOf, sliceStartMs } from './slice.ts';

describe('display slices (D11)', () => {
  it('are 5 seconds from the Unix epoch', () => {
    expect(DISPLAY_SLICE_MS).toBe(5_000);
    expect([sliceOf(0), sliceOf(4_999), sliceOf(5_000)]).toEqual([0, 0, 1]);
    const start = Date.parse('2026-10-16T09:00:00.000Z');
    expect(sliceOf(start + 4_999)).toBe(sliceOf(start));
    expect(sliceOf(start + 5_000)).toBe(sliceOf(start) + 1);
    expect(sliceOf(start)).toBe(Math.floor(start / 1000 / 5));
  });

  it('start at slice x 5 s, the first millisecond sliceOf maps to the slice', () => {
    expect([sliceStartMs(0), sliceStartMs(1), sliceStartMs(-1)]).toEqual([0, 5_000, -5_000]);
    fc.assert(
      fc.property(fc.integer({ min: -SLICE_MAX, max: SLICE_MAX }), (slice) => {
        expect(sliceOf(sliceStartMs(slice))).toBe(slice);
        expect(sliceOf(sliceStartMs(slice) - 1)).toBe(slice - 1);
      }),
    );
  });
});
