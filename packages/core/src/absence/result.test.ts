import { describe, expect, it } from 'vitest';
import { typeInput, typeRow } from '../testing/absence.ts';
import { allowance } from './allowance.ts';
import { computeLevel } from './level.ts';
import { courseRange, courseResult, type TypeResultInput, typeResult } from './result.ts';
import { COUNT_BASES, COURSE_RESULTS, TYPE_DECISIONS } from './types.ts';

// The largest T for which T x 100 + 99 stays a safe integer (the allowance's arithmetic).
const LARGEST_EXACT_HOURS = Math.floor((Number.MAX_SAFE_INTEGER - 99) / 100);

describe('type result', () => {
  it('decides by the allowance and gives the share in tenths', () => {
    expect(typeRow({ baseHours: 200, ratePercent: 70, absentHours: 61 })).toEqual({
      type: 'THEORY',
      baseHours: 200,
      absentHours: 61,
      allowance: 60,
      attendedPerMille: 695,
      decision: 'NOT_MET',
      best: 'NOT_MET',
      worst: 'NOT_MET',
    });
    expect(typeRow({ baseHours: 200, ratePercent: 70, absentHours: 60 }).decision).toBe('MET');
  });

  it('counts the allowance on the base alone, not the planned hours', () => {
    // Ground control: the two totals give different allowances.
    expect(allowance(15, 70)).not.toBe(allowance(10, 70));
    const row = typeRow({ baseHours: 10, plannedRemainingHours: 5, absentHours: 4 });
    expect(row).toMatchObject({ allowance: allowance(10, 70), decision: 'NOT_MET' });
  });

  it('gives a type the course does not plan no row', () => {
    // A course with theory sessions only: no practice row, the result from theory alone.
    const practice = typeResult(
      typeInput({ type: 'PRACTICE', baseHours: 0, plannedRemainingHours: 0 }),
    );
    expect(practice).toBeNull();
    expect(courseRange(false, [typeRow({ absentHours: 4 })]).current).toBe('NOT_MET');
    // The spec's case: no base yet, 3 hours planned. A row, no share, met.
    const planned = typeRow({ baseHours: 0, plannedRemainingHours: 3 });
    expect(planned).toMatchObject({ attendedPerMille: null, decision: 'MET', allowance: 0 });
    // The level's estimate counts the planned hours on top of the base: 10 planned
    // hours allow 3 where the base alone allows none.
    const level = computeLevel({
      ratePercent: 70,
      ratesConfirmed: true,
      exempt: false,
      active: true,
      baseHours: 0,
      plannedRemainingHours: 10,
      absentHours: 0,
      pendingHours: 0,
      nextSessionHours: 3,
      dataKey: 'k',
    });
    expect(level).toMatchObject({ allowance: 0, estimatedAllowance: allowance(10, 70) });
    expect(allowance(10, 70)).toBe(3);
  });

  it('meets the requirement wherever the rate is 0', () => {
    const both = [
      typeRow({ ratePercent: 0, absentHours: 10 }),
      typeRow({ type: 'PRACTICE', ratePercent: 0, baseHours: 4, absentHours: 4 }),
    ];
    expect(courseRange(false, both)).toEqual({ current: 'MET', best: 'MET', worst: 'MET' });
  });

  it('resolves the open hours for and against the student', () => {
    // 10 hours at 70 percent allow 3; 4 absent, one of them in review.
    const inReview = typeRow({ absentHours: 4, openAbsentHours: 1 });
    expect(inReview).toMatchObject({ absentHours: 4, attendedPerMille: 600 });
    expect(courseRange(false, [inReview])).toEqual({
      current: 'NOT_MET',
      best: 'MET',
      worst: 'NOT_MET',
    });
    // A self-declared hour awaiting approval may become absent.
    const declared = typeRow({ absentHours: 3, openPresentHours: 1 });
    expect(courseRange(false, [declared])).toEqual({
      current: 'MET',
      best: 'MET',
      worst: 'NOT_MET',
    });
  });

  it('refuses a rate or hours outside their range', () => {
    const bad: Partial<TypeResultInput>[] = [
      { ratePercent: Number.NaN },
      { ratePercent: 101 },
      { ratePercent: -1 },
      { ratePercent: 70.5 },
      { absentHours: 11 },
      { absentHours: -1 },
      { absentHours: 1.5 },
      { baseHours: Number.NaN },
      { baseHours: 2 ** 53 },
      { baseHours: Number.MAX_SAFE_INTEGER },
      { plannedRemainingHours: -1 },
      { absentHours: 4, openAbsentHours: -1 },
      { absentHours: 4, openAbsentHours: 0.5 },
      { openPresentHours: -1 },
      { openPresentHours: 0.5 },
      { absentHours: 2, openAbsentHours: 3 },
      { absentHours: 8, openPresentHours: 3 },
      { baseHours: LARGEST_EXACT_HOURS + 1 },
    ];
    for (const patch of bad) {
      expect(() => typeResult(typeInput(patch)), JSON.stringify(patch)).toThrow(RangeError);
    }
    // Ground control: the edges pass, a large base among them.
    expect(typeRow({ absentHours: 10, openAbsentHours: 10 }).best).toBe('MET');
    expect(typeRow({ absentHours: 0, openPresentHours: 10 }).worst).toBe('NOT_MET');
    expect(typeRow({ ratePercent: 100, baseHours: 2 ** 40 }).allowance).toBe(0);
    expect(typeRow({ ratePercent: 100, baseHours: LARGEST_EXACT_HOURS }).allowance).toBe(0);
  });
});

describe('course result', () => {
  it('names the decisions, results and count bases the stored rows and reports use', () => {
    expect(TYPE_DECISIONS).toEqual(['MET', 'NOT_MET']);
    expect(COURSE_RESULTS).toEqual(['MET', 'NOT_MET', 'MET_EXEMPT']);
    expect(COUNT_BASES).toEqual(['HELD', 'PLANNED']);
    // Every result the rule gives is on the list.
    for (const exempt of [false, true]) {
      for (const decisions of [[], ['MET'], ['NOT_MET'], ['MET', 'NOT_MET']] as const) {
        expect(COURSE_RESULTS).toContain(courseResult(exempt, decisions));
      }
    }
  });

  it('is exempt, else not met when a type is not met', () => {
    expect(courseResult(true, ['NOT_MET'])).toBe('MET_EXEMPT');
    expect(courseResult(false, ['MET', 'NOT_MET'])).toBe('NOT_MET');
    expect(courseResult(false, ['MET', 'MET'])).toBe('MET');
    expect(courseResult(false, [])).toBe('MET');
  });

  it('never turns met into not met by one more present session', () => {
    // Exhaustive over the reference's domain (d08/ref.js case 10): 1,660,725 cases.
    let cases = 0;
    for (const ratePercent of [0, 50, 70, 80, 100]) {
      for (let baseHours = 0; baseHours <= 120; baseHours += 1) {
        for (let absentHours = 0; absentHours <= baseHours; absentHours += 1) {
          for (let turned = 0; turned <= absentHours; turned += 1) {
            const row = typeRow({ ratePercent, baseHours, absentHours, openAbsentHours: turned });
            if (row.decision === 'MET' && row.best !== 'MET') {
              throw new Error(`${ratePercent} ${baseHours} ${absentHours} ${turned}`);
            }
            cases += 1;
          }
          // A session added to the scope as present.
          for (let added = 1; added <= 4; added += 1) {
            const before = typeRow({ ratePercent, baseHours, absentHours });
            const after = typeRow({ ratePercent, baseHours: baseHours + added, absentHours });
            if (before.decision === 'MET' && after.decision !== 'MET') {
              throw new Error(`${ratePercent} ${baseHours} ${absentHours} +${added}`);
            }
            cases += 1;
          }
        }
      }
    }
    expect(cases).toBe(1_660_725);
  });
});
