import { describe, expect, it } from 'vitest';
import { allowance, attendedPerMille, typeDecision } from './allowance.ts';

// The definition, independent of the formula: the largest k with (T - k) * 100 >= p * T.
function allowanceByDefinition(total: number, rate: number): number {
  let k = total;
  while (k > 0 && (total - k) * 100 < rate * total) k -= 1;
  return k;
}

// The definition-based check: compares a candidate with the definition at every (T, p)
// pair and returns how many pairs it saw and the values of T where they disagree.
function checkAgainstDefinition(
  candidate: (total: number, rate: number) => number,
  totals: readonly number[],
  rates: readonly number[],
): { checked: number; differingTotals: number[] } {
  let checked = 0;
  const differingTotals: number[] = [];
  for (const total of totals) {
    for (const rate of rates) {
      checked += 1;
      if (candidate(total, rate) !== allowanceByDefinition(total, rate)) {
        differingTotals.push(total);
      }
    }
  }
  return { checked, differingTotals };
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

// The floating point calculation the plan warns about.
const decimal = (total: number, rate: number) => Math.floor(total * (1 - rate / 100));

describe('Allowance formula equals its definition', () => {
  it('for every T from 0 to 1000 and every p from 0 to 100 (101,101 cases)', () => {
    const result = checkAgainstDefinition(allowance, range(0, 1000), range(0, 100));
    expect(result.checked).toBe(101_101);
    expect(result.differingTotals).toHaveLength(0);
  });
});

describe('Decimal calculation counter example', () => {
  it('the definition check catches the decimal calculation: 39 values of T in 1..199 at p = 80, none at p = 70', () => {
    const at80 = checkAgainstDefinition(decimal, range(1, 199), [80]);
    expect(at80.checked).toBe(199);
    expect(at80.differingTotals).toHaveLength(39);
    expect(checkAgainstDefinition(decimal, range(1, 199), [70]).differingTotals).toHaveLength(0);
  });

  it('gives 3 for T = 15, p = 80 where floating point gives 2', () => {
    expect(allowanceByDefinition(15, 80)).toBe(3);
    expect(allowance(15, 80)).toBe(3);
    expect(decimal(15, 80)).toBe(2);
  });
});

describe('Percentage and decision agree', () => {
  it('NOT_MET exactly when the attended share per mille is below 10 x p, for T 1..400, every p and every absence', () => {
    let checked = 0;
    let mismatches = 0;
    for (let total = 1; total <= 400; total += 1) {
      for (let rate = 0; rate <= 100; rate += 1) {
        for (let absent = 0; absent <= total; absent += 1) {
          const percent = attendedPerMille(total, absent) as number;
          if ((typeDecision(total, rate, absent) === 'NOT_MET') !== percent < 10 * rate)
            mismatches += 1;
          checked += 1;
        }
      }
    }
    expect(checked).toBe(8_140_600);
    expect(mismatches).toBe(0);
  });

  it('gives 695 and NOT_MET for T = 200, p = 70 with 61 absent hours', () => {
    expect(attendedPerMille(200, 61)).toBe(695);
    expect(typeDecision(200, 70, 61)).toBe('NOT_MET');
    expect(typeDecision(200, 70, 60)).toBe('MET');
  });

  it('gives no percentage and MET when there are no hours', () => {
    expect(attendedPerMille(0, 0)).toBeNull();
    expect(typeDecision(0, 70, 0)).toBe('MET');
  });

  it('never fails a type whose rate is 0 (no requirement)', () => {
    expect(allowance(40, 0)).toBe(40);
    expect(typeDecision(40, 0, 40)).toBe('MET');
  });
});
