import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  computeLevel,
  type DisplayedLevel,
  type LevelInput,
  type NextSessionCandidate,
  nextDisplayedLevel,
  nextSessionHours,
} from './level.ts';
import type { ScopeRow } from './scope.ts';

// T is the whole estimate (no planned hours); used hours equal absent hours.
const input = (
  ratePercent: number,
  total: number,
  absentHours: number,
  nextSessionHours: number | null,
): LevelInput => ({
  ratePercent,
  ratesConfirmed: true,
  exempt: false,
  active: true,
  baseHours: 0,
  plannedRemainingHours: total,
  absentHours,
  pendingHours: 0,
  nextSessionHours,
  dataKey: 'k',
});

const level = (...args: Parameters<typeof input>) => {
  const { level: value, message } = computeLevel(input(...args));
  return [value, message];
};

describe('computeLevel: the explicit tables', () => {
  it('small allowance with one-hour sessions, p = 80', () => {
    expect(level(80, 3, 0, 1)).toEqual([3, 'NO_ALLOWANCE_LEFT']);
    expect(level(80, 5, 0, 1)).toEqual([2, 'ONE_MORE_ENDS_ALLOWANCE']);
    expect(level(80, 5, 1, 1)).toEqual([3, 'NO_ALLOWANCE_LEFT']);
  });

  it('opens level 1 at exactly half, p = 70', () => {
    // T = 14, allowance 4, next session one hour.
    expect(level(70, 14, 1, 1)).toEqual([0, null]);
    expect(level(70, 14, 2, 1)).toEqual([1, 'HALF_USED']);
    // T = 10, allowance 3, no next session.
    expect(level(70, 10, 1, null)).toEqual([0, null]);
    expect(level(70, 10, 2, null)).toEqual([1, 'HALF_USED']);
    // T = 10 with a one-hour next session: remaining 1 equals it.
    expect(level(70, 10, 1, 1)).toEqual([0, null]);
    expect(level(70, 10, 2, 1)).toEqual([2, 'ONE_MORE_ENDS_ALLOWANCE']);
  });

  it('chooses between the two level 2 messages by the next session, p = 70, T = 42, 10 hours absent', () => {
    expect(level(70, 42, 10, 1)).toEqual([1, 'HALF_USED']);
    expect(level(70, 42, 10, 2)).toEqual([2, 'ONE_MORE_ENDS_ALLOWANCE']);
    expect(level(70, 42, 10, 3)).toEqual([2, 'ONE_MORE_MAKES_ABSENT']);
    expect(level(70, 42, 10, null)).toEqual([1, 'HALF_USED']);
  });

  it('shows an exceeded allowance as level 4', () => {
    expect(level(70, 10, 4, null)).toEqual([4, 'ALLOWANCE_EXCEEDED']);
    expect(computeLevel(input(70, 10, 4, null)).remaining).toBe(-1);
  });

  it('counts pending hours as present and splits the estimate into base and planned hours', () => {
    const computed = computeLevel({
      ...input(70, 0, 3, null),
      baseHours: 6,
      plannedRemainingHours: 4,
      pendingHours: 1,
    });
    expect(computed).toMatchObject({
      allowance: 1,
      estimatedAllowance: 3,
      usedHours: 2,
      remaining: 1,
      level: 1,
    });
    expect(computed.typeDecision).toBe('NOT_MET');
  });
});

describe('computeLevel: properties', () => {
  it('returns the highest level that holds, over the whole grid (40,260 cases)', () => {
    let cases = 0;
    let warned = 0;
    for (const p of [0, 50, 70, 80, 100]) {
      for (let total = 0; total <= 60; total += 1) {
        for (let absent = 0; absent <= total + 2; absent += 1) {
          for (const next of [null, 1, 2, 3]) {
            cases += 1;
            const computed = computeLevel(input(p, total, absent, next));
            const remaining = computed.estimatedAllowance - absent;
            const holds = [
              true,
              2 * absent >= computed.estimatedAllowance,
              next !== null && remaining <= next,
              remaining === 0,
              remaining < 0,
            ];
            const expected = p === 0 ? 0 : holds.lastIndexOf(true);
            expect(computed.level).toBe(expected);
            const messages = [null, 'HALF_USED', null, 'NO_ALLOWANCE_LEFT', 'ALLOWANCE_EXCEEDED'];
            const levelTwo =
              remaining === next ? 'ONE_MORE_ENDS_ALLOWANCE' : 'ONE_MORE_MAKES_ABSENT';
            expect(computed.message).toBe(expected === 2 ? levelTwo : messages[expected]);
            if (expected > 0) warned += 1;
          }
        }
      }
    }
    expect(cases).toBe(40_260);
    expect(warned).toBeGreaterThan(10_000);
  });

  it('gives no warning without confirmed rates or with p = 0, yet computes the figures the same', () => {
    const arbitrary = fc.record({
      base: fc.integer({ min: 0, max: 60 }),
      planned: fc.integer({ min: 0, max: 60 }),
      absentShare: fc.double({ min: 0, max: 1, noNaN: true }),
      next: fc.option(fc.integer({ min: 1, max: 3 }), { nil: null }),
      p: fc.constantFrom(50, 70, 80, 100),
    });
    let raised = 0;
    fc.assert(
      fc.property(arbitrary, ({ base, planned, absentShare, next, p }) => {
        const confirmed: LevelInput = {
          ...input(p, 0, Math.floor(absentShare * base), next),
          baseHours: base,
          plannedRemainingHours: planned,
        };
        const unconfirmed = computeLevel({ ...confirmed, ratesConfirmed: false });
        const withRates = computeLevel(confirmed);
        if (withRates.level > 0) raised += 1;
        expect(unconfirmed).toEqual({ ...withRates, level: 0, message: null });
        const zero = computeLevel({ ...confirmed, ratePercent: 0 });
        expect(zero).toMatchObject({
          level: 0,
          message: null,
          allowance: base,
          typeDecision: 'MET',
        });
      }),
      { numRuns: 2000 },
    );
    // Ground control: the same inputs with confirmed rates do warn.
    expect(raised).toBeGreaterThan(0);
  });

  it('gives no warning to an exempt or an inactive student', () => {
    expect(computeLevel({ ...input(70, 10, 4, null), exempt: true }).level).toBe(0);
    expect(computeLevel({ ...input(70, 10, 4, null), active: false }).level).toBe(0);
  });
});

describe('nextDisplayedLevel', () => {
  const at = (patch: Partial<LevelInput>): LevelInput => ({ ...input(70, 20, 0, null), ...patch });

  it('starts at the computed level, naming FIRST only above 0', () => {
    expect(nextDisplayedLevel(null, at({ absentHours: 3 }))).toMatchObject({
      displayed: { level: 1 },
      cause: 'FIRST',
    });
    expect(nextDisplayedLevel(null, at({}))).toEqual({
      displayed: { level: 0, message: null, remaining: 6 },
      cause: null,
    });
  });

  it('raises to the computed level when the rates get confirmed, as a data change', () => {
    const before = at({ ratesConfirmed: false, absentHours: 3 });
    const displayed = nextDisplayedLevel(null, before).displayed;
    expect(displayed.level).toBe(0);
    expect(nextDisplayedLevel({ input: before, displayed }, at({ absentHours: 3 }))).toMatchObject({
      displayed: { level: 1 },
      cause: 'DATA',
    });
  });

  it('drops to the computed level when the rates go to 0, the student turns exempt or inactive', () => {
    // p = 70, T = 20, 6 hours absent: no allowance left.
    const before = at({ absentHours: 6 });
    const displayed = nextDisplayedLevel(null, before).displayed;
    expect(displayed.level).toBe(3);
    for (const patch of [{ ratePercent: 0 }, { exempt: true }, { active: false }]) {
      expect(nextDisplayedLevel({ input: before, displayed }, { ...before, ...patch })).toEqual({
        displayed: { level: 0, message: null, remaining: expect.any(Number) },
        cause: 'DATA',
      });
    }
  });

  it('lowers the level when only the next session gets shorter', () => {
    // p = 70, T = 42, 10 hours used: remaining 2.
    const before = at({ absentHours: 10, plannedRemainingHours: 42, nextSessionHours: 3 });
    const displayed = nextDisplayedLevel(null, before).displayed;
    expect(displayed.level).toBe(2);
    expect(
      nextDisplayedLevel({ input: before, displayed }, { ...before, nextSessionHours: 1 }),
    ).toEqual({
      displayed: { level: 1, message: 'HALF_USED', remaining: 2 },
      cause: 'NEXT_SESSION',
    });
  });

  it('keeps the triple when only the estimate grows, and follows a next session change both ways', () => {
    const before = at({ absentHours: 3 });
    const displayed = nextDisplayedLevel(null, before).displayed;
    const grown = nextDisplayedLevel(
      { input: before, displayed },
      at({ absentHours: 3, plannedRemainingHours: 60 }),
    );
    expect(grown).toEqual({ displayed, cause: null });
    const near = at({ absentHours: 3, nextSessionHours: 3 });
    expect(nextDisplayedLevel({ input: before, displayed }, near)).toMatchObject({
      displayed: { level: 2 },
      cause: 'NEXT_SESSION',
    });
    const raisedByEstimate = nextDisplayedLevel(
      { input: before, displayed },
      at({ absentHours: 3, plannedRemainingHours: 0 }),
    );
    expect(raisedByEstimate).toMatchObject({ displayed: { level: 4 }, cause: 'ESTIMATE' });
    expect(nextDisplayedLevel({ input: before, displayed }, before)).toEqual({
      displayed,
      cause: null,
    });
  });

  it("names a cause only when the shown level changes, and treats the caller's other data as data", () => {
    // p = 70, T = 20: estimated allowance 6; 3 hours used is half.
    const before = at({ absentHours: 3 });
    const displayed = nextDisplayedLevel(null, before).displayed;
    expect(displayed.level).toBe(1);
    expect(nextDisplayedLevel({ input: before, displayed }, at({ absentHours: 4 }))).toEqual({
      displayed: { level: 1, message: 'HALF_USED', remaining: 2 },
      cause: null,
    });
    const grown = at({ absentHours: 3, plannedRemainingHours: 60 });
    const held = nextDisplayedLevel({ input: before, displayed }, grown).displayed;
    expect(held).toBe(displayed);
    expect(
      nextDisplayedLevel({ input: grown, displayed: held }, { ...grown, dataKey: 'other' }),
    ).toMatchObject({
      displayed: { level: 0 },
      cause: 'DATA',
    });
  });

  // One step changes only the estimate, only data, or only the next session.
  const step = fc.oneof(
    fc.record({ kind: fc.constant('ESTIMATE'), planned: fc.integer({ min: 0, max: 40 }) }),
    fc.record({ kind: fc.constant('DATA'), absent: fc.integer({ min: 0, max: 30 }) }),
    fc.record({
      kind: fc.constant('NEXT'),
      next: fc.option(fc.integer({ min: 1, max: 3 }), { nil: null }),
    }),
  );

  it('never lowers the level on an estimate change, equals the computed one on a data change (20,000 runs)', () => {
    const start = fc.record({
      p: fc.constantFrom(50, 70, 80, 100),
      base: fc.integer({ min: 1, max: 40 }),
      planned: fc.integer({ min: 0, max: 40 }),
      absent: fc.integer({ min: 0, max: 30 }),
    });
    fc.assert(
      fc.property(start, fc.array(step, { minLength: 1, maxLength: 8 }), (first, steps) => {
        let current: LevelInput = {
          ...input(first.p, 0, first.absent, null),
          baseHours: first.base,
          plannedRemainingHours: first.planned,
        };
        let displayed: DisplayedLevel = nextDisplayedLevel(null, current).displayed;
        for (const change of steps) {
          const next: LevelInput =
            change.kind === 'ESTIMATE'
              ? { ...current, plannedRemainingHours: change.planned }
              : change.kind === 'DATA'
                ? { ...current, absentHours: change.absent }
                : { ...current, nextSessionHours: change.next };
          const result = nextDisplayedLevel({ input: current, displayed }, next);
          const computed = computeLevel(next);
          expect(result.displayed.level).toBeGreaterThanOrEqual(computed.level);
          if (change.kind === 'ESTIMATE') {
            expect(result.displayed.level).toBeGreaterThanOrEqual(displayed.level);
            if (computed.level <= displayed.level) expect(result.displayed).toBe(displayed);
          }
          if (change.kind === 'DATA' && change.absent !== current.absentHours) {
            expect(result.displayed.level).toBe(computed.level);
          }
          // Only the next session changed: recalculated freely, in both directions.
          if (change.kind === 'NEXT' && change.next !== current.nextSessionHours) {
            expect(result.displayed.level).toBe(computed.level);
          }
          current = next;
          displayed = result.displayed;
        }
      }),
      { numRuns: 20_000 },
    );
  });
});

describe('nextSessionHours (D08-B04)', () => {
  const NOW = 1_000;
  const rows: ScopeRow[] = [
    {
      sectionId: 'A',
      addedAtMs: 0,
      inactiveAtMs: null,
      lateEnrollmentChoice: 'PREVIOUS_NOT_COUNTED',
    },
  ];
  const candidate = (
    sessionId: string,
    startAtMs: number,
    patch: Partial<NextSessionCandidate> = {},
  ): NextSessionCandidate => ({
    sessionId,
    sectionIds: ['A'],
    startAtMs,
    theoryHours: 1,
    practiceHours: 0,
    cancelled: false,
    ...patch,
  });

  it('takes the first later session in scope with hours of the type, by start then id', () => {
    const sessions = [
      candidate('late', 3_000, { theoryHours: 3 }),
      candidate('b', 2_000, { theoryHours: 2 }),
      candidate('a', 2_000, { theoryHours: 1 }),
    ];
    expect(nextSessionHours(sessions, rows, 'THEORY', NOW)).toBe(1);
    expect(nextSessionHours(sessions.slice(0, 2), rows, 'THEORY', NOW)).toBe(2);
  });

  it('skips a running, cancelled, out of scope or other-type session, and gives null without one', () => {
    const skipped = [
      candidate('running', NOW, { theoryHours: 3 }),
      candidate('cancelled', 2_000, { cancelled: true }),
      candidate('other-section', 2_000, { sectionIds: ['B'] }),
      candidate('practice-only', 2_000, { theoryHours: 0, practiceHours: 2 }),
    ];
    expect(nextSessionHours(skipped, rows, 'THEORY', NOW)).toBeNull();
    expect(nextSessionHours(skipped, rows, 'PRACTICE', NOW)).toBe(2);
    const dropped = [{ ...rows[0], inactiveAtMs: 1_500 } as ScopeRow];
    expect(nextSessionHours([candidate('after-drop', 2_000)], dropped, 'THEORY', NOW)).toBeNull();
    expect(nextSessionHours([candidate('next', 1_001)], rows, 'THEORY', NOW)).toBe(1);
  });

  it('feeds level 2 only from a later session, not the running one', () => {
    // p 70, estimate 42 (allowance 12), 10 hours absent: remaining 2.
    const sessions = [candidate('running', NOW, { theoryHours: 3 }), candidate('next', 9_000)];
    const next = nextSessionHours(sessions, rows, 'THEORY', NOW);
    expect(next).toBe(1);
    expect(level(70, 42, 10, next)).toEqual([1, 'HALF_USED']);
    expect(level(70, 42, 10, 3)).toEqual([2, 'ONE_MORE_MAKES_ABSENT']);
  });
});
