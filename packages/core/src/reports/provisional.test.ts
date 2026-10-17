import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LOCK_SURVIVING_REASONS, PROVISIONAL_REASONS, type ProvisionalReason } from './codes.ts';
import { OUTPUT_STATES } from './output-state.ts';
import { type ProvisionalCounts, provisionalReasons } from './provisional.ts';

const countsOf = (count: (reason: ProvisionalReason) => number): ProvisionalCounts =>
  Object.fromEntries(
    PROVISIONAL_REASONS.map((reason) => [reason, count(reason)]),
  ) as ProvisionalCounts;
const ONE_EACH = countsOf(() => 1);
const NONE = countsOf(() => 0);
const countsArb = fc
  .array(fc.nat(5), {
    minLength: PROVISIONAL_REASONS.length,
    maxLength: PROVISIONAL_REASONS.length,
  })
  .map((values) => countsOf((reason) => values[PROVISIONAL_REASONS.indexOf(reason)] as number));

describe('the provisional rule (D10)', () => {
  it('counts every reason in term, all but the running sending time at term end, the surviving ones once locked', () => {
    const codes = (state: (typeof OUTPUT_STATES)[number]) =>
      provisionalReasons(ONE_EACH, state).map((reason) => reason.code);
    expect(codes('IN_TERM')).toEqual([...PROVISIONAL_REASONS]);
    expect(codes('TERM_END')).toEqual(
      PROVISIONAL_REASONS.filter((reason) => reason !== 'SENDING_TIME_RUNNING'),
    );
    expect(codes('LOCKED')).toEqual([...LOCK_SURVIVING_REASONS]);
  });

  it('lists the counted reasons with a count, in the fixed order, with their counts', () => {
    fc.assert(
      fc.property(countsArb, fc.constantFrom(...OUTPUT_STATES), (counts, state) => {
        const listed = provisionalReasons(counts, state);
        const all = provisionalReasons(counts, 'IN_TERM');
        // In term every reason with a count is listed, in the fixed order.
        expect(all.map((reason) => reason.code)).toEqual(
          PROVISIONAL_REASONS.filter((reason) => counts[reason] > 0),
        );
        // In another state the list keeps that order and drops reasons only.
        expect(all.filter((reason) => listed.some((kept) => kept.code === reason.code))).toEqual(
          listed,
        );
        for (const reason of listed) {
          expect(reason.count).toBe(counts[reason.code]);
          expect(reason.count).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 2000 },
    );
  });

  it('makes nothing provisional without a count, in any state', () => {
    for (const state of OUTPUT_STATES) expect(provisionalReasons(NONE, state)).toEqual([]);
    // Positive control: one unanswered session counts in every state.
    for (const state of OUTPUT_STATES) {
      expect(provisionalReasons({ ...NONE, UNANSWERED_SESSIONS: 1 }, state)).toEqual([
        { code: 'UNANSWERED_SESSIONS', count: 1 },
      ]);
    }
  });

  it('rejects a count that is not a whole number from 0', () => {
    // 2^53 and 1e21 are integers to JavaScript but past the whole numbers a count keeps.
    for (const bad of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, 1e21]) {
      expect(() => provisionalReasons({ ...NONE, HEAD_COUNT_FLAG: bad }, 'IN_TERM')).toThrow(
        RangeError,
      );
    }
    // A count the state leaves out is checked too.
    expect(() => provisionalReasons({ ...NONE, SENDING_TIME_RUNNING: -1 }, 'TERM_END')).toThrow(
      RangeError,
    );
    expect(() => provisionalReasons({ ...NONE, HEAD_COUNT_FLAG: 0.5 }, 'LOCKED')).toThrow(
      RangeError,
    );
    const missing = Object.fromEntries(
      PROVISIONAL_REASONS.filter((reason) => reason !== 'OPEN_DECISION_RECORD').map((reason) => [
        reason,
        0,
      ]),
    ) as ProvisionalCounts;
    expect(() => provisionalReasons(missing, 'IN_TERM')).toThrow(RangeError);
    // Ground control: whole counts are taken, the largest safe one too.
    expect(
      provisionalReasons({ ...NONE, HEAD_COUNT_FLAG: Number.MAX_SAFE_INTEGER }, 'IN_TERM'),
    ).toEqual([{ code: 'HEAD_COUNT_FLAG', count: Number.MAX_SAFE_INTEGER }]);
    expect(provisionalReasons({ ...NONE, HEAD_COUNT_FLAG: 2 }, 'IN_TERM')).toEqual([
      { code: 'HEAD_COUNT_FLAG', count: 2 },
    ]);
  });
});
