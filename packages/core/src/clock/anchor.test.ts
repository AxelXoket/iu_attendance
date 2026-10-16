import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { anchorRange } from './anchor.ts';
import { DOCUMENT_MAX_AGE_MS, DOCUMENT_REQUEST_MAX_MS, DRIFT_PPM } from './constants.ts';

const DAY_MS = 86_400_000;
const PPM = 1_000_000n;
const PER_MILLE = 1000n;

describe('anchor range', () => {
  // The model: the server stamps S at some point of the request (a fraction t/1000 of it)
  // with its own exact clock; the phone's counter measures q and g, and the real
  // durations are those times (1 + p/10^6) for a drift p within DRIFT_PPM (the drift
  // allowance bounds the real duration against the measured one). The real
  // event instant, scaled by 10^9 to stay in integers:
  //   forward:  S + (1 - t) q (1 + p) + g (1 + p)   (g from the answer to the event)
  //   backward: S + (1 - t) q (1 + p) - g (1 + p)   (g from the event to the answer)
  it('holds the real instant for any drift, stamp point, request and elapsed time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_600_000_000_000, max: 2_000_000_000_000 }),
        fc.integer({ min: 0, max: DOCUMENT_REQUEST_MAX_MS }),
        fc.integer({ min: 0, max: DOCUMENT_MAX_AGE_MS }),
        fc.integer({ min: -DRIFT_PPM, max: DRIFT_PPM }),
        fc.integer({ min: 0, max: 1000 }),
        fc.constantFrom('FORWARD', 'BACKWARD'),
        (s, q, g, p, t, direction) => {
          const rate = PPM + BigInt(p);
          const afterStamp = (PER_MILLE - BigInt(t)) * BigInt(q) * rate;
          const elapsed = BigInt(g) * rate * PER_MILLE;
          const scale = PPM * PER_MILLE;
          const real =
            BigInt(s) * scale + afterStamp + (direction === 'FORWARD' ? elapsed : -elapsed);
          const range = anchorRange({
            documentTimeMs: s,
            requestDurationMs: q,
            elapsedMs: g,
            direction,
          });
          expect(BigInt(range.lowMs) * scale <= real).toBe(true);
          expect(real <= BigInt(range.highMs) * scale).toBe(true);
          expect(range.lowMs <= range.estimateMs && range.estimateMs <= range.highMs).toBe(true);
        },
      ),
      { numRuns: 10_000 },
    );
  });

  it('takes the margin of the plan: request time plus 100 ppm of the elapsed time', () => {
    const margin = (q: number, g: number) =>
      anchorRange({ documentTimeMs: 0, requestDurationMs: q, elapsedMs: g, direction: 'FORWARD' })
        .marginMs;
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: DOCUMENT_REQUEST_MAX_MS }),
        fc.integer({ min: 0, max: DOCUMENT_MAX_AGE_MS }),
        (q, g) => {
          // The definition, ceil(g * DRIFT_PPM / 10^6), in integers.
          const drift = Math.floor((g * DRIFT_PPM + 999_999) / 1_000_000);
          expect(margin(q, g)).toBe(q + drift);
        },
      ),
    );
    // The plan's figures: about 9 seconds a day, about a minute a week.
    expect(margin(0, DAY_MS)).toBe(8640);
    expect(margin(0, DOCUMENT_MAX_AGE_MS)).toBe(60_480);
    expect(margin(0, 1)).toBe(1);
    expect(margin(0, 0)).toBe(0);
  });

  it('allows drift on the whole span after the stamp, not on its parts apart', () => {
    // k(g + q) with g = q = 1 is 1; k(g) + k(q) would be 2.
    const range = anchorRange({
      documentTimeMs: 0,
      requestDurationMs: 1,
      elapsedMs: 1,
      direction: 'FORWARD',
    });
    expect(range.highMs).toBe(3);
  });

  it("matches the module's worked example", () => {
    // 09:00:00.000 in Istanbul (UTC+3), a 300 ms request, 7 minutes later.
    const s = Date.UTC(2026, 9, 16, 6, 0, 0, 0);
    const forward = anchorRange({
      documentTimeMs: s,
      requestDurationMs: 300,
      elapsedMs: 7 * 60_000,
      direction: 'FORWARD',
    });
    expect(forward).toEqual({
      lowMs: Date.UTC(2026, 9, 16, 6, 6, 59, 958),
      highMs: Date.UTC(2026, 9, 16, 6, 7, 0, 343),
      estimateMs: Date.UTC(2026, 9, 16, 6, 7, 0, 0),
      marginMs: 342,
    });
    const backward = anchorRange({
      documentTimeMs: s,
      requestDurationMs: 300,
      elapsedMs: 7 * 60_000,
      direction: 'BACKWARD',
    });
    expect(backward).toEqual({
      lowMs: Date.UTC(2026, 9, 16, 5, 52, 59, 958),
      highMs: Date.UTC(2026, 9, 16, 5, 53, 0, 343),
      estimateMs: Date.UTC(2026, 9, 16, 5, 53, 0, 0),
      marginMs: 342,
    });
  });

  it('refuses a time or a duration outside its form', () => {
    const valid = {
      documentTimeMs: 0,
      requestDurationMs: 0,
      elapsedMs: 0,
      direction: 'FORWARD',
    } as const;
    expect(() => anchorRange(valid)).not.toThrow();
    for (const patch of [
      { documentTimeMs: 0.5 },
      { documentTimeMs: 2 ** 60 },
      { documentTimeMs: Number.NaN },
      { requestDurationMs: -1 },
      { requestDurationMs: 1.5 },
      { elapsedMs: -1 },
      { elapsedMs: Number.POSITIVE_INFINITY },
    ]) {
      expect(() => anchorRange({ ...valid, ...patch }), JSON.stringify(patch)).toThrow(RangeError);
    }
  });
});
