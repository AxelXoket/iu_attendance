import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type BackoffLimits, backoffSeconds } from './backoff.ts';

// Limits as the rule allows them: the wait starts at some wrong code from the 1st, and the
// first wait is at most the longest.
const limitsArb: fc.Arbitrary<BackoffLimits> = fc
  .record({
    backoffStartWrong: fc.integer({ min: 1, max: 20 }),
    backoffFirstSeconds: fc.integer({ min: 1, max: 10_000 }),
    extraSeconds: fc.integer({ min: 0, max: 100_000 }),
  })
  .map(({ backoffStartWrong, backoffFirstSeconds, extraSeconds }) => ({
    backoffStartWrong,
    backoffFirstSeconds,
    backoffMaxSeconds: backoffFirstSeconds + extraSeconds,
  }));
const countArb = fc.oneof(fc.nat(200), fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER - 1 }));

describe('Bekleme süresi tekdüze ve sınırlı (backoff is monotone and capped)', () => {
  it('waits nothing before the starting wrong code, then never less and never past the cap', () => {
    fc.assert(
      fc.property(limitsArb, countArb, (limits, wrong) => {
        const seconds = backoffSeconds(wrong, limits);
        expect(Number.isSafeInteger(seconds)).toBe(true);
        if (wrong < limits.backoffStartWrong) expect(seconds).toBe(0);
        else expect(seconds).toBeGreaterThanOrEqual(limits.backoffFirstSeconds);
        expect(seconds).toBeLessThanOrEqual(limits.backoffMaxSeconds);
        expect(backoffSeconds(wrong + 1, limits)).toBeGreaterThanOrEqual(seconds);
      }),
    );
  });

  it('starts at the first wait and doubles with each further wrong code until the cap', () => {
    fc.assert(
      fc.property(limitsArb, fc.nat(60), (limits, past) => {
        const wrong = limits.backoffStartWrong + past;
        const doubled = limits.backoffFirstSeconds * 2 ** past;
        expect(backoffSeconds(wrong, limits)).toBe(Math.min(doubled, limits.backoffMaxSeconds));
      }),
    );
  });

  it('reaches the cap and stays there however long the run', () => {
    fc.assert(
      fc.property(limitsArb, (limits) => {
        // log2(max / first) doublings reach the cap.
        const toCap = Math.ceil(Math.log2(limits.backoffMaxSeconds / limits.backoffFirstSeconds));
        const atCap = limits.backoffStartWrong + toCap;
        expect(backoffSeconds(atCap, limits)).toBe(limits.backoffMaxSeconds);
        expect(backoffSeconds(Number.MAX_SAFE_INTEGER, limits)).toBe(limits.backoffMaxSeconds);
        // Ground control: one wrong code earlier is still under the cap when doubling is needed.
        if (toCap > 0)
          expect(backoffSeconds(atCap - 1, limits)).toBeLessThan(limits.backoffMaxSeconds);
      }),
    );
  });

  it('gives the spec walk for a 3rd-code start, 30 s first and 900 s cap', () => {
    // The shape of D01-B07 with stand-in limits; the server scenario runs the contract's own.
    const limits = { backoffStartWrong: 3, backoffFirstSeconds: 30, backoffMaxSeconds: 900 };
    const walk = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((wrong) => backoffSeconds(wrong, limits));
    expect(walk).toEqual([0, 0, 0, 30, 60, 120, 240, 480, 900, 900]);
  });

  it('keeps a first wait equal to the cap flat from the start', () => {
    const limits = { backoffStartWrong: 1, backoffFirstSeconds: 5, backoffMaxSeconds: 5 };
    expect([0, 1, 2, 50].map((wrong) => backoffSeconds(wrong, limits))).toEqual([0, 5, 5, 5]);
  });

  it('rejects counts and limits the rule does not take', () => {
    const limits = { backoffStartWrong: 3, backoffFirstSeconds: 30, backoffMaxSeconds: 900 };
    for (const wrong of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
      expect(() => backoffSeconds(wrong, limits), String(wrong)).toThrow(RangeError);
    }
    for (const bad of [
      { backoffStartWrong: 0 },
      { backoffStartWrong: 1.5 },
      { backoffFirstSeconds: 0 },
      { backoffFirstSeconds: -30 },
      { backoffFirstSeconds: 901 },
      { backoffMaxSeconds: Number.NaN },
    ]) {
      expect(() => backoffSeconds(5, { ...limits, ...bad }), JSON.stringify(bad)).toThrow(
        RangeError,
      );
    }
    // The limits are checked before the free wrong codes answer 0.
    expect(() => backoffSeconds(0, { ...limits, backoffFirstSeconds: 901 })).toThrow(RangeError);
    expect(() => backoffSeconds(0, { ...limits, backoffStartWrong: 0 })).toThrow(RangeError);
    // Ground control: the same limits pass untouched.
    expect(backoffSeconds(5, limits)).toBe(120);
    expect(backoffSeconds(0, limits)).toBe(0);
  });
});
