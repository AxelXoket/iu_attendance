import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { codeSlices, connectionLastSlice } from './code-window.ts';
import { DISPLAY_SLICE_MS as SLICE_MS } from './constants.ts';

// The rule's numbers, written out: codes up to 30 s ahead, at most seven.
const AHEAD_MS = 30_000;
const at = (iso: string) => Date.parse(iso);
const T = at('2026-10-16T09:00:00.000Z');
const D = T / SLICE_MS;

describe('codeSlices (D11 Projeksiyona kod verme)', () => {
  it('gives the current slice and six ahead while the window stays open', () => {
    expect(codeSlices(T, T + 600_000)).toEqual([D, D + 1, D + 2, D + 3, D + 4, D + 5, D + 6]);
    // Mid-slice: the current one still first, the last starting 30 s after its start.
    expect(codeSlices(T + 4_999, T + 600_000)).toEqual(codeSlices(T, T + 600_000));
    expect(codeSlices(T + 5_000, T + 600_000)[0]).toBe(D + 1);
  });

  it('gives no slice that starts at or after the window close', () => {
    expect(codeSlices(T, T + 12_000)).toEqual([D, D + 1, D + 2]);
    expect(codeSlices(T, T + 10_000)).toEqual([D, D + 1]);
    expect(codeSlices(T, T + 10_001)).toEqual([D, D + 1, D + 2]);
    expect(codeSlices(T + 10_000, T + 10_000)).toEqual([]);
    expect(codeSlices(T + 60_000, T + 10_000)).toEqual([]);
  });

  it('refuses instants that are not integer milliseconds', () => {
    expect(() => codeSlices(T + 0.5, T + 600_000)).toThrow(RangeError);
    expect(() => codeSlices(T, Number.NaN)).toThrow(RangeError);
  });

  it('keeps every code within 30 s and the window, consecutive, and covered by the last slice', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000_000_000 }),
        fc.integer({ min: -3_600_000, max: 3_600_000 }),
        // Short windows half of the time, so the close often cuts the seven codes.
        fc.oneof(fc.integer({ min: 0, max: 60_000 }), fc.integer({ min: 0, max: 7_200_000 })),
        fc.integer({ min: 0, max: 3_600_000 }),
        (nowMs, fromNowMs, lengthMs, endAfterMs) => {
          const openAtMs = nowMs + fromNowMs;
          const closeAtMs = openAtMs + lengthMs;
          const slices = codeSlices(nowMs, closeAtMs);
          expect(slices.length).toBeLessThanOrEqual(7);
          slices.forEach((slice, index) => {
            expect(slice * SLICE_MS).toBeLessThanOrEqual(nowMs + AHEAD_MS);
            expect(slice * SLICE_MS).toBeLessThan(closeAtMs);
            expect(slice).toBe(Math.floor(nowMs / SLICE_MS) + index);
          });
          if (openAtMs <= nowMs && nowMs < closeAtMs) {
            expect(slices).toContain(Math.floor(nowMs / SLICE_MS));
            // Seven unless the window closes within them.
            const sevenFit = (Math.floor(nowMs / SLICE_MS) + 6) * SLICE_MS < closeAtMs;
            expect(slices.length === 7).toBe(sevenFit);
          }
          // A connection open at now ends at now or later; son_dilim as the spec writes it.
          const endAtMs = nowMs + endAfterMs;
          const last = connectionLastSlice(endAtMs, closeAtMs);
          expect(last).toBe(
            Math.min(Math.floor(endAtMs / SLICE_MS) + 6, Math.floor((closeAtMs - 1) / SLICE_MS)),
          );
          for (const slice of slices) expect(slice).toBeLessThanOrEqual(last);
        },
      ),
      { numRuns: 10_000 },
    );
  });
});

describe('connectionLastSlice (son_dilim)', () => {
  const classEnd = at('2026-10-16T10:50:00.000Z');
  const E = classEnd / SLICE_MS;

  it('stops at the close when the window closes 10 s before the class end: no six added', () => {
    const closeAtMs = classEnd - 10_000;
    expect(connectionLastSlice(classEnd, closeAtMs)).toBe(E - 3);
    // Control: the last code given before the close lies within.
    expect(codeSlices(closeAtMs - 1, closeAtMs).at(-1)).toBe(E - 3);
  });

  it('adds six slices to the slice of the end when the connection ends before the close', () => {
    // The lecturer cut the connection a minute before the class end; the window runs on.
    const endAtMs = classEnd - 60_000;
    expect(connectionLastSlice(endAtMs, classEnd)).toBe(E - 6);
    // The slice of the end counts, wherever in it the end falls.
    expect(connectionLastSlice(endAtMs + 4_999, classEnd)).toBe(E - 6);
    expect(connectionLastSlice(endAtMs - 1, classEnd)).toBe(E - 7);
    expect(connectionLastSlice(classEnd, classEnd)).toBe(E - 1);
    // Control: the last code given just before the end lies within.
    expect(codeSlices(endAtMs - 1, classEnd).at(-1)).toBe(E - 7);
  });

  it("keeps the codes given before an early close inside, by the window's latest close", () => {
    // Codes given at T + 300 s while the window closed at T + 600 s; the lecturer then
    // closed it early at T + 305 s. The connection runs on to the class end.
    const given = codeSlices(T + 300_000, T + 600_000);
    expect(given.at(-1)).toBe(D + 66);
    expect(connectionLastSlice(classEnd, T + 600_000)).toBeGreaterThanOrEqual(D + 66);
    // Control: the shortened close would leave the last six codes outside.
    expect(connectionLastSlice(classEnd, T + 305_000)).toBe(D + 60);
  });

  it('refuses instants that are not integer milliseconds', () => {
    expect(() => connectionLastSlice(classEnd + 0.5, classEnd)).toThrow(RangeError);
    expect(() => connectionLastSlice(classEnd, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
