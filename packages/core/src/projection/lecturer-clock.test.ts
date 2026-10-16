import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type AnchorRange, anchorRange, driftMs } from '../clock/anchor.ts';
import { DAY_MS } from '../clock/constants.ts';
import type { FirstAnchorInput, SecondAnchorInput } from '../clock/result.ts';
import type { ClockSubject, DeviceId, PersonId } from '../clock/types.ts';
import { clockDocument } from '../testing/clock.ts';
import { LECTURER_CLOCK_STATUSES } from './constants.ts';
import { lecturerClock } from './lecturer-clock.ts';

const LECTURER_ID = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d10' as PersonId;
const LECTURER: ClockSubject = { kind: 'STAFF', personId: LECTURER_ID };
const S = 1_792_000_000_000;
const HOUR_MS = 3_600_000;

const document = (serverTimeMs: number, subject: ClockSubject = LECTURER) =>
  clockDocument({ subject, serverTimeMs });
const first = (serverTimeMs: number, requestDurationMs: number, documentToEventMs: number) => ({
  document: document(serverTimeMs),
  requestDurationMs,
  documentToEventMs,
});
const second = (serverTimeMs: number, requestDurationMs: number, eventToDocumentMs: number) => ({
  document: document(serverTimeMs),
  requestDurationMs,
  eventToDocumentMs,
});
const NO_FIRST: FirstAnchorInput = { phoneReport: 'NO_DOCUMENT' };
const NO_SECOND: SecondAnchorInput = { absentReason: 'NOT_SENT' };
const BOTH_VALID = { firstAnchorStatus: 'VALID', secondAnchorStatus: 'VALID' } as const;
const clock = (input: {
  first: FirstAnchorInput;
  second: SecondAnchorInput;
  labelBaseMs: number;
  displayDurationMs: number;
  arrivedAtMs?: number;
}) => lecturerClock({ lecturerId: LECTURER_ID, arrivedAtMs: S + 30 * DAY_MS, ...input });

// A display shown from S + 60 s for 20 s, the phone's clock 7 s behind. The first
// document came 60 s before the start (request 300 ms), the second 300 s after the end
// (request 50 ms). Worked out by hand from D04's anchor ranges, k(x) = ceil(x / 10,000):
//   start: first [s - 6, s + 307], second (320 s back) [s - 32, s + 83]; meet [s - 6, s + 83]
//   end:   first (80 s on) [e - 8, e + 309], second [e - 30, e + 81];   meet [e - 8, e + 81]
const AGREEING = {
  first: first(S, 300, 60_000),
  second: second(S + 380_000, 50, 300_000),
  labelBaseMs: S + 53_000,
  displayDurationMs: 20_000,
};
// A display of 600 s from S + 1 s whose labels run 5 s behind; the second document is
// stamped extraMs later than the first implies.
//   start: first precise (11 ms), estimate S + 1 s, far margin 11
//   end:   second precise (41 ms), estimate S + 601 s + extraMs, far margin 41
const LONG = (extraMs: number, labelBaseMs = S + 1_000 - 5_000) => ({
  first: first(S, 10, 1_000),
  second: second(S + 1_000 + 600_000 + 1_000 + extraMs, 40, 1_000),
  labelBaseMs,
  displayDurationMs: 600_000,
});

describe('lecturerClock (D11 Hoca saati)', () => {
  it("corrects the labels by the lecturer's real clock, to the far end of the meeting range", () => {
    // Both corrections are 7 s; the margin is the start's 83 ms, the larger of 83 and 81,
    // and k(10 s) = 1 ms for the labels in between.
    expect(clock(AGREEING)).toEqual({
      status: 'VERIFIED',
      correctionMs: 7_000,
      marginMs: 84,
      ...BOTH_VALID,
    });
  });

  it('averages the start and end corrections and widens the margin by half their difference', () => {
    // Corrections 5,000 and 5,030: their mean 5,015; the margin 41 + 15 and k(300 s) = 30.
    expect(clock(LONG(30))).toEqual({
      status: 'VERIFIED',
      correctionMs: 5_015,
      marginMs: 86,
      ...BOTH_VALID,
    });
    // 31 ms later: corrections 5,000 and 5,031, the mean rounded down, the half difference
    // up; the end's meeting range now stops at the first anchor's high end (far margin 40).
    expect(clock(LONG(31))).toEqual({
      status: 'VERIFIED',
      correctionMs: 5_015,
      marginMs: 86,
      ...BOTH_VALID,
    });
    // The same with the labels 5 s ahead: corrections -5,000 and -4,969, the mean -4,984.5
    // rounded down to -4,985, not toward zero.
    expect(clock(LONG(31, S + 1_000 + 5_000))).toEqual({
      status: 'VERIFIED',
      correctionMs: -4_985,
      marginMs: 86,
      ...BOTH_VALID,
    });
  });

  it("reaches 1 ms past D04's own margin with one anchor", () => {
    // The first anchor alone: D04's margin 300 + k(60,000) = 306, the range's high end
    // 300 + k(60,300) = 307 past the estimate.
    const range = anchorRange({
      documentTimeMs: S,
      requestDurationMs: 300,
      elapsedMs: 60_000,
      direction: 'FORWARD',
    });
    expect([range.marginMs, range.highMs - range.estimateMs]).toEqual([306, 307]);
    const firstOnly = { firstAnchorStatus: 'VALID', secondAnchorStatus: 'NOT_SENT' } as const;
    // The end event's first anchor runs 80 s: k(80,300) = 9 past 300, and k(10 s) = 1.
    expect(clock({ ...AGREEING, second: NO_SECOND })).toEqual({
      status: 'VERIFIED',
      correctionMs: 7_000,
      marginMs: 310,
      ...firstOnly,
    });
    expect(clock({ ...AGREEING, second: NO_SECOND, displayDurationMs: 0 })).toEqual({
      status: 'VERIFIED',
      correctionMs: 7_000,
      marginMs: 307,
      ...firstOnly,
    });
  });

  it('builds the clock from the second anchor alone when the phone had no first document', () => {
    expect(clock({ ...AGREEING, first: NO_FIRST })).toEqual({
      status: 'VERIFIED',
      correctionMs: 7_000,
      marginMs: 84,
      firstAnchorStatus: 'NO_DOCUMENT',
      secondAnchorStatus: 'VALID',
    });
  });

  it('stores each anchor status from the event it was measured to', () => {
    // A first document 7 days less an hour before a 2-hour display: valid at the start,
    // over 7 days at the end. The status stored is the start's.
    const oldFirst = clock({
      first: first(S, 10, 7 * DAY_MS - HOUR_MS),
      second: NO_SECOND,
      labelBaseMs: S + 7 * DAY_MS - HOUR_MS,
      displayDurationMs: 2 * HOUR_MS,
    });
    expect(oldFirst).toEqual({
      status: 'NONE',
      firstAnchorStatus: 'VALID',
      secondAnchorStatus: 'NOT_SENT',
    });
    // A second document 7 days less an hour after the display: over 7 days at the start,
    // valid at the end. The status stored is the end's.
    const lateSecond = clock({
      first: NO_FIRST,
      second: second(S + 2 * HOUR_MS + 7 * DAY_MS - HOUR_MS, 10, 7 * DAY_MS - HOUR_MS),
      labelBaseMs: S,
      displayDurationMs: 2 * HOUR_MS,
      arrivedAtMs: S + 30 * DAY_MS,
    });
    expect(lateSecond).toEqual({
      status: 'NONE',
      firstAnchorStatus: 'NO_DOCUMENT',
      secondAnchorStatus: 'VALID',
    });
  });

  it('has no clock without anchors, with another subject, or starting after the arrival', () => {
    expect(clock({ ...AGREEING, first: NO_FIRST, second: NO_SECOND })).toEqual({
      status: 'NONE',
      firstAnchorStatus: 'NO_DOCUMENT',
      secondAnchorStatus: 'NOT_SENT',
    });
    const student: ClockSubject = {
      kind: 'STUDENT_DEVICE',
      deviceId: '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e' as DeviceId,
    };
    const otherLecturer: ClockSubject = {
      kind: 'STAFF',
      personId: '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d11' as PersonId,
    };
    for (const subject of [student, otherLecturer]) {
      expect(
        clock({
          ...AGREEING,
          first: { ...AGREEING.first, document: document(S, subject) },
          second: NO_SECOND,
        }),
      ).toEqual({
        status: 'NONE',
        firstAnchorStatus: 'SUBJECT_MISMATCH',
        secondAnchorStatus: 'NOT_SENT',
      });
    }
    // The display's end can be no earlier than S + 80 s - 8 ms (its meeting range's low end):
    // a record that arrived before that has no clock; arriving at that instant is fine.
    expect(clock({ ...AGREEING, arrivedAtMs: S + 80_000 - 9 })).toEqual({
      status: 'NONE',
      ...BOTH_VALID,
    });
    expect(clock({ ...AGREEING, arrivedAtMs: S + 80_000 - 8 }).status).toBe('VERIFIED');
  });

  it('reports disagreeing anchors, even when the other event has no clock', () => {
    // The second document 10 s off: the ranges at both events miss each other.
    const off = { ...AGREEING, second: second(S + 390_000, 50, 300_000) };
    expect(clock(off)).toEqual({ status: 'ANCHORS_DISAGREE', ...BOTH_VALID });
    // The second anchor is under 7 days at the end and over them at the start, so the
    // start rests on the first anchor alone, which begins after the arrival (no clock),
    // while the two disagree at the end.
    const e2 = 7 * DAY_MS - 1_000;
    const lateSecond = (offsetMs: number) => ({
      first: first(S, 10, 1_000),
      second: second(S + 1_000 + 2_000 + e2 + offsetMs, 10, e2),
      labelBaseMs: S + 1_000,
      displayDurationMs: 2_000,
      arrivedAtMs: S,
    });
    expect(clock(lateSecond(200_000))).toEqual({ status: 'ANCHORS_DISAGREE', ...BOTH_VALID });
    // Control: with the second document consistent, the start's missing clock decides.
    expect(clock(lateSecond(0))).toEqual({ status: 'NONE', ...BOTH_VALID });
  });

  it('refuses a label base or a display length that is not whole milliseconds', () => {
    expect(() => clock({ ...AGREEING, labelBaseMs: S + 0.5 })).toThrow(RangeError);
    expect(() => clock({ ...AGREEING, displayDurationMs: -1 })).toThrow(RangeError);
    expect(() => clock({ ...AGREEING, displayDurationMs: 1.5 })).toThrow(RangeError);
  });
});

// One display, built from its parts: the real start S + e1, the first document e1 before
// it and the second e2 after the end (offset off the true time), each anchor present or
// not, and a label base off the real start.
const displayArb = fc.record({
  e1: fc.integer({ min: 0, max: 600_000 }),
  q1: fc.integer({ min: 0, max: 10_000 }),
  e2: fc.integer({ min: 0, max: 600_000 }),
  q2: fc.integer({ min: 0, max: 10_000 }),
  displayDurationMs: fc.integer({ min: 0, max: 14_400_000 }),
  offsetMs: fc.integer({ min: -200, max: 200 }),
  labelOffsetMs: fc.integer({ min: -120_000, max: 120_000 }),
  hasFirst: fc.oneof({ arbitrary: fc.constant(true), weight: 4 }, fc.constant(false)),
  hasSecond: fc.oneof({ arbitrary: fc.constant(true), weight: 4 }, fc.constant(false)),
  // Where a label inside the display sits, as a share of the display.
  labelShare: fc.double({ min: 0, max: 1, noNaN: true }),
});
type Display = typeof displayArb extends fc.Arbitrary<infer T> ? T : never;

// What D04 says about one event: its anchors' ranges meet, and the estimate is the one of
// the anchor with the smaller margin (the first on a tie), kept inside the meeting range.
function event(anchors: AnchorRange[]) {
  if (anchors.length === 0) return 'NONE' as const;
  const lowMs = Math.max(...anchors.map((anchor) => anchor.lowMs));
  const highMs = Math.min(...anchors.map((anchor) => anchor.highMs));
  if (lowMs > highMs) return 'ANCHORS_DISAGREE' as const;
  const [a, b] = anchors;
  const precise = b !== undefined && a !== undefined && b.marginMs < a.marginMs ? b : a;
  const estimateMs = Math.min(Math.max(precise?.estimateMs ?? lowMs, lowMs), highMs);
  return { lowMs, highMs, estimateMs };
}

function run(display: Display) {
  const { e1, q1, e2, q2, displayDurationMs: D, offsetMs, labelOffsetMs } = display;
  const realStart = S + e1;
  const secondTime = realStart + D + e2 + offsetMs;
  const labelBaseMs = realStart + labelOffsetMs;
  const result = clock({
    first: display.hasFirst ? first(S, q1, e1) : NO_FIRST,
    second: display.hasSecond ? second(secondTime, q2, e2) : NO_SECOND,
    labelBaseMs,
    displayDurationMs: D,
  });
  const range = (documentTimeMs: number, q: number, elapsedMs: number, forward: boolean) =>
    anchorRange({
      documentTimeMs,
      requestDurationMs: q,
      elapsedMs,
      direction: forward ? 'FORWARD' : 'BACKWARD',
    });
  const at = (firstElapsedMs: number, secondElapsedMs: number) =>
    event([
      ...(display.hasFirst ? [range(S, q1, firstElapsedMs, true)] : []),
      ...(display.hasSecond ? [range(secondTime, q2, secondElapsedMs, false)] : []),
    ]);
  return { result, labelBaseMs, start: at(e1, e2 + D), end: at(e1 + D, e2) };
}

describe('lecturerClock properties (D11 Hoca saati)', () => {
  it('reaches every outcome and both anchor counts (ground control for the property)', () => {
    const runs = fc.sample(displayArb, { numRuns: 5_000, seed: 1 }).map(run);
    const count = (test: (entry: (typeof runs)[number]) => boolean) => runs.filter(test).length;
    expect(count((r) => r.result.status === 'ANCHORS_DISAGREE')).toBeGreaterThan(20);
    expect(count((r) => r.result.status === 'NONE')).toBeGreaterThan(20);
    expect(count((r) => r.result.status === 'VERIFIED' && r.start !== 'NONE')).toBeGreaterThan(20);
    const single = (r: (typeof runs)[number]) =>
      r.result.status === 'VERIFIED' &&
      (r.result.firstAnchorStatus !== 'VALID' || r.result.secondAnchorStatus !== 'VALID');
    expect(count(single)).toBeGreaterThan(20);
    // The statuses it gives are exactly the list the display record's CHECK is made from.
    expect(new Set(runs.map((r) => r.result.status))).toEqual(new Set(LECTURER_CLOCK_STATUSES));
  });

  it("keeps every label's possible real instant within label + correction +- margin", () => {
    fc.assert(
      fc.property(displayArb, (display) => {
        const { result, labelBaseMs, start, end } = run(display);
        const D = display.displayDurationMs;
        if (start === 'ANCHORS_DISAGREE' || end === 'ANCHORS_DISAGREE') {
          expect(result.status).toBe('ANCHORS_DISAGREE');
          return;
        }
        if (start === 'NONE' || end === 'NONE') {
          expect(result.status).toBe('NONE');
          return;
        }
        if (result.status !== 'VERIFIED') throw new Error(`expected a clock, got ${result.status}`);
        // Each event uses its smaller-margin anchor; the two corrections are averaged.
        const startCorrectionMs = start.estimateMs - labelBaseMs;
        const endCorrectionMs = end.estimateMs - (labelBaseMs + D);
        expect(result.correctionMs).toBe(Math.floor((startCorrectionMs + endCorrectionMs) / 2));
        // A label e into the display is real at most k(e) off the start's instants plus e,
        // and k(D - e) off the end's minus D - e: both hold, so it lies where they meet.
        const { correctionMs, marginMs } = result;
        const middle = Math.floor(D / 2);
        const anywhere = Math.floor(display.labelShare * D);
        for (const e of [0, D, middle, anywhere]) {
          const lowMs = Math.max(
            start.lowMs + e - driftMs(e),
            end.lowMs - (D - e) - driftMs(D - e),
          );
          const highMs = Math.min(
            start.highMs + e + driftMs(e),
            end.highMs - (D - e) + driftMs(D - e),
          );
          const labelMs = labelBaseMs + e;
          expect(lowMs).toBeGreaterThanOrEqual(labelMs + correctionMs - marginMs);
          expect(highMs).toBeLessThanOrEqual(labelMs + correctionMs + marginMs);
        }
      }),
      { numRuns: 5_000 },
    );
  });
});
