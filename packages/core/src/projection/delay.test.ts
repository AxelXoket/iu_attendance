import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { anchorRange } from '../clock/anchor.ts';
import { DAY_MS } from '../clock/constants.ts';
import type { ClockEstimate } from '../clock/result.ts';
import { DELAY_LIMIT_DEFAULTS_MS, QR_DELAY_RESULTS, SLICE_MAX } from './constants.ts';
import { type DelayDisplay, type DelayLimits, qrDelay } from './delay.ts';
import type { LecturerClock } from './lecturer-clock.ts';
import { sliceStartMs } from './slice.ts';

// The plan sentence's numbers, written out (the defaults are a different unit's, checked
// against these in constants.test.ts).
const SECOND = 1_000;
// A slice in October 2026 and its start.
const SLICE = 358_416_000;
const START = sliceStartMs(SLICE);
const DEFAULTS: DelayLimits = DELAY_LIMIT_DEFAULTS_MS;

const verified = (estimateMs: number, lowMs = estimateMs, highMs = estimateMs): ClockEstimate => ({
  status: 'VERIFIED',
  source: 'FIRST_ANCHOR',
  range: { lowMs, highMs },
  estimateMs,
  marginMs: Math.max(estimateMs - lowMs, highMs - estimateMs),
});
// A student clock with no margin, ms after the slice start.
const at = (ms: number) => verified(START + ms);
const PROJECTION: DelayDisplay = { source: 'PROJECTION', insideConnection: true };
const VALID_ANCHORS = { firstAnchorStatus: 'VALID', secondAnchorStatus: 'VALID' } as const;
const lecturer = (correctionMs = 0, marginMs = 0): LecturerClock => ({
  status: 'VERIFIED',
  correctionMs,
  marginMs,
  ...VALID_ANCHORS,
});
const NO_LECTURER_CLOCK: LecturerClock = {
  status: 'NONE',
  firstAnchorStatus: 'NO_DOCUMENT',
  secondAnchorStatus: 'NOT_SENT',
};
const DISAGREEING_LECTURER: LecturerClock = { status: 'ANCHORS_DISAGREE', ...VALID_ANCHORS };
const phone = (patch: Partial<Extract<DelayDisplay, { source: 'LECTURER_PHONE' }>> = {}) =>
  ({
    source: 'LECTURER_PHONE',
    evidenceKind: 'QR',
    slotRevokedAtMs: null,
    lecturerClock: lecturer(),
    ...patch,
  }) as const;
const full = (
  studentClock: ClockEstimate,
  display: DelayDisplay = PROJECTION,
  limits: DelayLimits = DEFAULTS,
) => qrDelay({ studentClock, slice: SLICE, display, limits });
const delay = (studentClock: ClockEstimate, display?: DelayDisplay, limits?: DelayLimits) =>
  full(studentClock, display, limits).delay;
const NO_TERMS = {
  studentMarginMs: null,
  lecturerCorrectionMs: null,
  lecturerMarginMs: null,
  delayLowMs: null,
  delayHighMs: null,
};

describe('qrDelay: the plan sentence (D11 Gecikme kurali)', () => {
  it('takes a scan 4 s after the slice start as normal, 15 s for review, 45 s as rejected', () => {
    expect([4, 15, 45].map((s) => delay(at(s * SECOND)))).toEqual([
      'NORMAL',
      'IN_REVIEW',
      'REJECTED',
    ]);
  });

  it('keeps the limits exact: 10 s is not normal, 30 s is not rejected, 30.001 s is', () => {
    expect(delay(at(10 * SECOND - 1))).toBe('NORMAL');
    expect(delay(at(10 * SECOND))).toBe('IN_REVIEW');
    expect(delay(at(30 * SECOND))).toBe('IN_REVIEW');
    expect(delay(at(30 * SECOND + 1))).toBe('REJECTED');
  });

  it('trusts the projection 1 s before the slice start and a lecturer phone not at all', () => {
    expect(delay(at(-SECOND))).toBe('NORMAL');
    expect(delay(at(-SECOND - 1))).toBe('SCANNED_BEFORE');
    expect(delay(at(0), phone())).toBe('NORMAL');
    expect(delay(at(-1), phone())).toBe('SCANNED_BEFORE');
  });

  it('follows the plan example: a day-old document leaves about 9 s of margin, a 2-day one 17.6 s', () => {
    // Anchored by a document a day (then two) before the scan, the request taking 300 ms;
    // the plan's 17.3 s leaves the request out.
    const anchored = (scanMs: number, ageMs: number) => {
      const range = anchorRange({
        documentTimeMs: START + scanMs - ageMs,
        requestDurationMs: 300,
        elapsedMs: ageMs,
        direction: 'FORWARD',
      });
      return verified(range.estimateMs, range.lowMs, range.highMs);
    };
    expect(full(anchored(2 * SECOND, DAY_MS)).studentMarginMs).toBe(8_941);
    expect(full(anchored(2 * SECOND, 2 * DAY_MS)).studentMarginMs).toBe(17_581);
    // A day old: in review 2 s into the slice, normal 1 s into it (latest instant 9.941 s).
    expect(delay(anchored(2 * SECOND, DAY_MS))).toBe('IN_REVIEW');
    expect(delay(anchored(SECOND, DAY_MS))).toBe('NORMAL');
    // Two days old: stale even at the projection's 1 s before the start...
    expect(delay(anchored(-SECOND, 2 * DAY_MS))).toBe('ANCHORS_STALE');
    // ...and normal only when even its latest instant is on time: the rule's order.
    expect(delay(anchored(-10 * SECOND, 2 * DAY_MS))).toBe('NORMAL');
    // Ground control: the day-old scan at the projection's 1 s before the start is on time.
    expect(delay(anchored(-SECOND, DAY_MS))).toBe('NORMAL');
  });

  it("is stale once the student's margin alone reaches the normal limit", () => {
    // 1 ms after the slice start, so the latest instant is never normal.
    const margin = (ms: number) => verified(START + 1, START + 1 - ms, START + 1 + ms);
    expect(delay(margin(10 * SECOND))).toBe('ANCHORS_STALE');
    expect(delay(margin(10 * SECOND - 1))).toBe('IN_REVIEW');
  });

  it("adds the lecturer's margin: 3 s after the start with 2 s and 6 s of margin is 11 s", () => {
    const student = verified(START + 3 * SECOND, START + SECOND, START + 5 * SECOND);
    expect(delay(student, phone({ lecturerClock: lecturer(0, 6 * SECOND) }))).toBe('IN_REVIEW');
    expect(delay(student)).toBe('NORMAL');
  });

  it("reads the slice start on the lecturer's real clock", () => {
    // The lecturer's phone runs 8 s behind: the slice was shown 8 s after its label.
    const late = phone({ lecturerClock: lecturer(8 * SECOND) });
    expect(delay(at(12 * SECOND), late)).toBe('NORMAL');
    expect(delay(at(12 * SECOND), phone())).toBe('IN_REVIEW');
    expect(delay(at(7 * SECOND), late)).toBe('SCANNED_BEFORE');
  });

  it('gives a backup code 20 s: 15 s is normal (a QR would be in review), 35 s rejected', () => {
    const backup = phone({ evidenceKind: 'BACKUP_CODE' });
    expect(delay(at(15 * SECOND), backup)).toBe('NORMAL');
    expect(delay(at(15 * SECOND), phone())).toBe('IN_REVIEW');
    expect(delay(at(20 * SECOND - 1), backup)).toBe('NORMAL');
    expect(delay(at(20 * SECOND), backup)).toBe('IN_REVIEW');
    expect(delay(at(35 * SECOND), backup)).toBe('REJECTED');
  });

  it("measures the student's margin to the far end of the range, not D04's margin", () => {
    // D04's margin says 2,000 ms, the range reaches 2,001 ms past the estimate.
    const wide: ClockEstimate = { ...verified(START + 7_999, START + 7_999, START + 10_000) };
    expect(wide.status === 'VERIFIED' && wide.marginMs).toBe(2_001);
    expect(delay({ ...wide, marginMs: 2_000 } as ClockEstimate)).toBe('IN_REVIEW');
    // Positive control: the range 1 ms shorter is normal.
    expect(delay(verified(START + 7_999, START + 7_999, START + 9_999))).toBe('NORMAL');
  });

  it('returns the terms the evidence row stores', () => {
    // 3.5 s by the student's clock, 2 s of margin; the lecturer's phone 0.5 s behind with
    // 6 s of margin: g = 3 s, P = 8 s.
    const student = verified(START + 3_500, START + 1_500, START + 5_500);
    expect(full(student, phone({ lecturerClock: lecturer(500, 6 * SECOND) }))).toEqual({
      delay: 'IN_REVIEW',
      studentMarginMs: 2_000,
      lecturerCorrectionMs: 500,
      lecturerMarginMs: 6_000,
      delayLowMs: -5_000,
      delayHighMs: 11_000,
    });
    expect(full(student)).toEqual({
      delay: 'NORMAL',
      studentMarginMs: 2_000,
      lecturerCorrectionMs: 0,
      lecturerMarginMs: 0,
      delayLowMs: 1_500,
      delayHighMs: 5_500,
    });
  });
});

describe('qrDelay: the checks before the arithmetic, in the rule order', () => {
  const LATE = at(60 * SECOND);

  it('revokes a slot revoked at or before the slice start, before anything else', () => {
    const revoked = (slotRevokedAtMs: number) => phone({ slotRevokedAtMs, lecturerClock: null });
    expect(full(verified(START, START - 1, START + 1), revoked(START))).toEqual({
      delay: 'KEY_REVOKED',
      ...NO_TERMS,
    });
    const unverified: ClockEstimate = {
      status: 'UNVERIFIED',
      source: 'NONE',
      range: null,
      estimateMs: null,
      marginMs: null,
    };
    expect(delay(unverified, revoked(START - 1))).toBe('KEY_REVOKED');
    // Revoked after the slice was shown: the rest of the rule decides.
    expect(delay(at(0), phone({ slotRevokedAtMs: START + 1 }))).toBe('NORMAL');
  });

  it("stops at a student clock that is not verified, before the lecturer's record", () => {
    const disagree: ClockEstimate = {
      status: 'ANCHORS_DISAGREE',
      source: 'BOTH_ANCHORS',
      range: { lowMs: START, highMs: START + 100 },
      estimateMs: START,
      marginMs: 10,
    };
    const phoneClock: ClockEstimate = {
      status: 'UNVERIFIED',
      source: 'PHONE_CLOCK',
      range: { lowMs: START, highMs: START },
      estimateMs: START,
      marginMs: null,
    };
    for (const student of [disagree, phoneClock]) {
      expect(full(student)).toEqual({ delay: 'CLOCK_UNVERIFIED', ...NO_TERMS });
      expect(delay(student, phone({ lecturerClock: null }))).toBe('CLOCK_UNVERIFIED');
    }
  });

  it("waits for the lecturer's display record, and never rejects without the lecturer's clock", () => {
    expect(full(LATE, phone({ lecturerClock: null }))).toEqual({ delay: 'PENDING', ...NO_TERMS });
    expect(delay(LATE, phone({ lecturerClock: NO_LECTURER_CLOCK }))).toBe('NO_LECTURER_CLOCK');
    expect(delay(LATE, phone({ lecturerClock: DISAGREEING_LECTURER }))).toBe(
      'LECTURER_ANCHORS_DIVERGE',
    );
    // Ground control: with the lecturer's clock the same scan is rejected.
    expect(delay(LATE, phone())).toBe('REJECTED');
  });

  it('puts a projection code outside its connection after the rejection and early checks', () => {
    const outside: DelayDisplay = { source: 'PROJECTION', insideConnection: false };
    expect(delay(at(4 * SECOND), outside)).toBe('OUTSIDE_DISPLAY');
    expect(delay(at(15 * SECOND), outside)).toBe('OUTSIDE_DISPLAY');
    expect(delay(LATE, outside)).toBe('REJECTED');
    expect(delay(at(-2 * SECOND), outside)).toBe('SCANNED_BEFORE');
  });

  it('refuses inputs that are not integer milliseconds', () => {
    expect(() =>
      qrDelay({ studentClock: at(0), slice: 1.5, display: PROJECTION, limits: DEFAULTS }),
    ).toThrow(RangeError);
    expect(() => delay(verified(START + 0.5))).toThrow(RangeError);
    expect(() => delay(at(0), phone({ lecturerClock: lecturer(0.5) }))).toThrow(RangeError);
    expect(() => delay(at(0), PROJECTION, { ...DEFAULTS, rejectLimitMs: Number.NaN })).toThrow(
      RangeError,
    );
    for (const slotRevokedAtMs of [START + 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => delay(at(0), phone({ slotRevokedAtMs }))).toThrow(RangeError);
    }
    // Ground control: the same inputs as integers are fine, and extra settings fields too.
    expect(delay(at(0), phone({ lecturerClock: lecturer(1) }))).toBe('SCANNED_BEFORE');
    expect(delay(at(0), phone({ slotRevokedAtMs: START + 1 }))).toBe('NORMAL');
    const settings = { ...DEFAULTS, backupCodeSearchMs: 60_000, qrCapable: true };
    expect(delay(at(0), PROJECTION, settings)).toBe('NORMAL');
  });
});

// One scan, built from its parts: g after the slice start on the real clock, the student's
// range p1 below and p2 above the estimate, the lecturer's correction h and margin q.
type Scan = {
  slice: number;
  g: number;
  p1: number;
  p2: number;
  h: number;
  q: number;
  phone: boolean;
  backupCode: boolean;
  inside: boolean;
};
type Edge = 'REJECT' | 'EARLY' | 'NORMAL';
type ScanParts = Omit<Scan, 'g'> & { edge: Edge | null; offset: number; free: number };

// Margins of 0 a quarter of the time, so P = 0 is reached; g one ms either side of a limit
// half of the time, so each limit is crossed under any limits.
const marginArb = (max: number) =>
  fc.oneof(
    { arbitrary: fc.constant(0), weight: 1 },
    { arbitrary: fc.integer({ min: 0, max }), weight: 3 },
  );
const partsArb: fc.Arbitrary<ScanParts> = fc.record({
  slice: fc.integer({ min: 0, max: SLICE_MAX }),
  p1: marginArb(25_000),
  p2: marginArb(25_000),
  h: fc.integer({ min: -100_000, max: 100_000 }),
  q: marginArb(20_000),
  phone: fc.boolean(),
  backupCode: fc.boolean(),
  inside: fc.boolean(),
  edge: fc.oneof(
    { arbitrary: fc.constant(null), weight: 1 },
    { arbitrary: fc.constantFrom<Edge>('REJECT', 'EARLY', 'NORMAL'), weight: 1 },
  ),
  offset: fc.integer({ min: -1, max: 1 }),
  free: fc.integer({ min: -60_000, max: 60_000 }),
});
const termsOf = (scan: Omit<Scan, 'g'>, limits: DelayLimits) => {
  const p = Math.max(scan.p1, scan.p2);
  return {
    p,
    P: p + (scan.phone ? scan.q : 0),
    tolerance: scan.phone ? 0 : limits.projectionToleranceMs,
    N: scan.phone && scan.backupCode ? limits.backupCodeNormalLimitMs : limits.normalLimitMs,
    shown: scan.phone || scan.inside,
  };
};
const place = (parts: ScanParts, limits: DelayLimits): Scan => {
  const { edge, offset, free, ...scan } = parts;
  const { P, tolerance, N } = termsOf(scan, limits);
  const limit = { REJECT: limits.rejectLimitMs + P, EARLY: -tolerance - P, NORMAL: N - P };
  return { ...scan, g: edge === null ? free : limit[edge] + offset };
};
const resultOf = (scan: Scan, limits: DelayLimits, lecturerClock?: LecturerClock | null) => {
  const h = scan.phone ? scan.h : 0;
  const t = sliceStartMs(scan.slice) + h + scan.g;
  const display: DelayDisplay = scan.phone
    ? phone({
        evidenceKind: scan.backupCode ? 'BACKUP_CODE' : 'QR',
        lecturerClock: lecturerClock === undefined ? lecturer(h, scan.q) : lecturerClock,
      })
    : { source: 'PROJECTION', insideConnection: scan.inside };
  return qrDelay({
    studentClock: verified(t, t - scan.p1, t + scan.p2),
    slice: scan.slice,
    display,
    limits,
  });
};
const limitsArb: fc.Arbitrary<DelayLimits> = fc.record({
  normalLimitMs: fc.integer({ min: 1, max: 60_000 }),
  backupCodeNormalLimitMs: fc.integer({ min: 1, max: 60_000 }),
  rejectLimitMs: fc.integer({ min: 1, max: 120_000 }),
  projectionToleranceMs: fc.integer({ min: 0, max: 5_000 }),
});

describe('qrDelay: properties of the plan sentence', () => {
  it('reaches P = 0 and both sides of every limit (ground control for the properties)', () => {
    const scans = fc.sample(partsArb, { numRuns: 5_000, seed: 1 }).map((parts) => {
      const scan = place(parts, DEFAULTS);
      return { scan, ...termsOf(scan, DEFAULTS), delay: resultOf(scan, DEFAULTS).delay };
    });
    const count = (test: (entry: (typeof scans)[number]) => boolean) => scans.filter(test).length;
    expect(count((s) => s.P === 0 && s.delay === 'NORMAL')).toBeGreaterThan(20);
    expect(count((s) => s.scan.g - s.P === 30 * SECOND)).toBeGreaterThan(20);
    expect(count((s) => s.scan.g - s.P === 30 * SECOND + 1)).toBeGreaterThan(20);
    expect(count((s) => s.scan.g + s.P === -s.tolerance)).toBeGreaterThan(20);
    expect(count((s) => s.scan.g + s.P === -s.tolerance - 1)).toBeGreaterThan(20);
    expect(count((s) => s.scan.g + s.P === s.N - 1)).toBeGreaterThan(20);
    expect(count((s) => s.scan.g + s.P === s.N)).toBeGreaterThan(20);
  });

  it('rejects only when late at the earliest, is normal only when on time at the latest', () => {
    fc.assert(
      fc.property(partsArb, (parts) => {
        const scan = place(parts, DEFAULTS);
        const result = resultOf(scan, DEFAULTS).delay;
        const { P, tolerance, N, shown } = termsOf(scan, DEFAULTS);
        expect(QR_DELAY_RESULTS).toContain(result);
        expect(result === 'REJECTED').toBe(scan.g - P > 30 * SECOND);
        const onTime = -tolerance <= scan.g + P && scan.g + P < N;
        expect(result === 'NORMAL').toBe(onTime && shown);
        // With no margin at all, normal is exactly the plan's band.
        if (P === 0 && result === 'NORMAL') {
          expect(-tolerance <= scan.g && scan.g < N).toBe(true);
        }
      }),
      { numRuns: 20_000 },
    );
  });

  it('lets a larger margin only lift a rejection or an early scan, and move normal only to review', () => {
    fc.assert(
      fc.property(
        partsArb,
        fc.integer({ min: 1, max: 20_000 }),
        fc.boolean(),
        (parts, extra, viaLecturer) => {
          const scan = place(parts, DEFAULTS);
          const wider =
            viaLecturer && scan.phone
              ? { ...scan, q: scan.q + extra }
              : { ...scan, p2: Math.max(scan.p1, scan.p2) + extra };
          const before = resultOf(scan, DEFAULTS).delay;
          const after = resultOf(wider, DEFAULTS).delay;
          if (after === 'REJECTED' || after === 'SCANNED_BEFORE') expect(before).toBe(after);
          if (after === 'NORMAL' && before !== 'NORMAL') expect(before).toBe('SCANNED_BEFORE');
          if (before === 'NORMAL' && after !== 'NORMAL') {
            expect(['IN_REVIEW', 'ANCHORS_STALE']).toContain(after);
          }
        },
      ),
      { numRuns: 20_000 },
    );
  });

  it('holds with any limits the settings may give, and returns the terms it read', () => {
    fc.assert(
      fc.property(partsArb, limitsArb, (parts, limits) => {
        const scan = place(parts, limits);
        const result = resultOf(scan, limits);
        const { p, P, tolerance, N, shown } = termsOf(scan, limits);
        const rejected = scan.g - P > limits.rejectLimitMs;
        const early = !rejected && scan.g + P < -tolerance;
        expect(result.delay === 'REJECTED').toBe(rejected);
        expect(result.delay === 'SCANNED_BEFORE').toBe(early);
        expect(result.delay === 'OUTSIDE_DISPLAY').toBe(!rejected && !early && !shown);
        expect(result.delay === 'NORMAL').toBe(!rejected && !early && shown && scan.g + P < N);
        expect(result.delay === 'ANCHORS_STALE').toBe(
          !rejected && !early && shown && scan.g + P >= N && p >= N,
        );
        expect(result).toMatchObject({
          studentMarginMs: p,
          lecturerCorrectionMs: scan.phone ? scan.h : 0,
          lecturerMarginMs: scan.phone ? scan.q : 0,
          delayLowMs: scan.g - P,
          delayHighMs: scan.g + P,
        });
      }),
      { numRuns: 5_000 },
    );
  });

  it("never rejects a phone code without the lecturer's clock", () => {
    fc.assert(
      fc.property(
        partsArb,
        fc.constantFrom(null, NO_LECTURER_CLOCK, DISAGREEING_LECTURER),
        (parts, lecturerClock) => {
          const scan = place({ ...parts, phone: true }, DEFAULTS);
          const expected =
            lecturerClock === null
              ? 'PENDING'
              : lecturerClock.status === 'NONE'
                ? 'NO_LECTURER_CLOCK'
                : 'LECTURER_ANCHORS_DIVERGE';
          expect(resultOf(scan, DEFAULTS, lecturerClock)).toEqual({
            delay: expected,
            ...NO_TERMS,
          });
        },
      ),
      { numRuns: 10_000 },
    );
  });
});
