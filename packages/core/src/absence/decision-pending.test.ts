import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { typeRow } from '../testing/absence.ts';
import { typeDecision } from './allowance.ts';
import {
  type AbsentSession,
  type DecisionPendingInput,
  decisionPendingReasons,
  singleRecordSessions,
} from './decision-pending.ts';
import { courseResult } from './result.ts';

const HOUR = 60 * 60 * 1000;
const LAST_END = 100 * HOUR;
const LOCK = 300 * HOUR;
const absentSession = (
  sessionId: string,
  startHour: number,
  theory: number,
  practice = 0,
): AbsentSession => ({
  sessionId,
  startAtMs: startHour * HOUR,
  absentHours: { THEORY: theory, PRACTICE: practice },
});
const input = (patch: Partial<DecisionPendingInput>): DecisionPendingInput => ({
  active: true,
  exempt: false,
  types: [],
  nowMs: LAST_END + HOUR,
  lastSessionEndAtMs: LAST_END,
  lockAtMs: LOCK,
  confirmedAccount: true,
  lastContact: null,
  absentSessions: [],
  ...patch,
});
const reasons = (patch: Partial<DecisionPendingInput>) => decisionPendingReasons(input(patch));

// Theory: 10 hours at 70 percent allow 3. Practice: 5 hours at 80 percent allow 1.
const theory = (absentHours: number, openAbsentHours = 0) =>
  typeRow({ absentHours, openAbsentHours });
const practice = (absentHours: number) =>
  typeRow({ type: 'PRACTICE', ratePercent: 80, baseHours: 5, absentHours });

describe('open flags', () => {
  it('hold the result when the two ends differ', () => {
    // 4 theory hours absent, one in review: not met now, met if the review approves.
    expect(reasons({ types: [theory(4, 1), practice(1)] })).toEqual(['OPEN_FLAG']);
    // Practice definitely not met: no resolution changes the result.
    expect(reasons({ types: [theory(4, 1), practice(2)] })).toEqual([]);
    // Ground control: nothing open, nothing pending.
    expect(reasons({ types: [theory(4), practice(1)] })).toEqual([]);
  });

  it('count a self-declared record awaiting approval against the student too', () => {
    const declared = typeRow({ absentHours: 3, openPresentHours: 1 });
    // Met now: one record could not add a no-connection reason, only the open flag holds.
    const s1 = absentSession('s1', 90, 2);
    expect(reasons({ types: [declared], absentSessions: [s1] })).toEqual(['OPEN_FLAG']);
  });

  it('leave an inactive or exempt student out', () => {
    const types = [theory(4, 1)];
    expect(reasons({ types, active: false })).toEqual([]);
    expect(reasons({ types, exempt: true })).toEqual([]);
  });

  it('flag exactly when some resolution of the open hours changes the result', () => {
    const typeInput = fc
      .record({
        ratePercent: fc.constantFrom(0, 50, 70, 80, 100),
        baseHours: fc.integer({ min: 0, max: 12 }),
        absent: fc.nat(),
        up: fc.nat(),
        down: fc.nat(),
      })
      .map(({ ratePercent, baseHours, absent, up, down }) => {
        const absentHours = absent % (baseHours + 1);
        return {
          ratePercent,
          baseHours,
          absentHours,
          openAbsentHours: up % (absentHours + 1),
          openPresentHours: down % (baseHours - absentHours + 1),
        };
      });
    const seen = new Set<string>();
    fc.assert(
      fc.property(typeInput, typeInput, (theoryInput, practiceInput) => {
        const types = [typeRow(theoryInput), typeRow({ ...practiceInput, type: 'PRACTICE' })];
        // Every way the open hours may resolve, hour by hour.
        const span = (entry: typeof theoryInput) =>
          Array.from(
            { length: entry.openAbsentHours + entry.openPresentHours + 1 },
            (_, step) => entry.absentHours - entry.openAbsentHours + step,
          );
        const outcomes = new Set<string>();
        for (const a of span(theoryInput)) {
          for (const b of span(practiceInput)) {
            outcomes.add(
              courseResult(false, [
                typeDecision(theoryInput.baseHours, theoryInput.ratePercent, a),
                typeDecision(practiceInput.baseHours, practiceInput.ratePercent, b),
              ]),
            );
          }
        }
        const flagged = reasons({ types, lastSessionEndAtMs: null }).includes('OPEN_FLAG');
        expect(flagged).toBe(outcomes.size > 1);
        seen.add(String(flagged));
      }),
      { numRuns: 2000 },
    );
    expect([...seen].sort()).toEqual(['false', 'true']);
  });
});

describe('no connection', () => {
  // 5 theory hours absent of an allowance of 3: one 2-hour session would turn it.
  const notMet = [theory(5)];
  const s1 = absentSession('s1', 10, 2);
  const s2 = absentSession('s2', 60, 2);
  const s3 = absentSession('s3', 90, 1);
  const sessions = [s1, s2, s3];
  const contact = { atMs: 50 * HOUR, unsentReported: false };

  it('lists the sessions one record after the last contact could turn', () => {
    const base = input({ types: notMet, lastContact: contact, absentSessions: sessions });
    expect(singleRecordSessions(base)).toEqual([s2]);
    // Every turning session, in the given order.
    const s4 = absentSession('s4', 95, 3);
    const two = input({ types: notMet, lastContact: contact, absentSessions: [s4, s3, s2] });
    expect(singleRecordSessions(two)).toEqual([s4, s2]);
    expect(decisionPendingReasons(base)).toEqual(['NO_CONNECTION']);
    // A session starting at the contact instant is not after it.
    const atContact = absentSession('s0', 50, 2);
    expect(reasons({ types: notMet, lastContact: contact, absentSessions: [atContact] })).toEqual(
      [],
    );
    // Only sessions starting after the contact are candidates: s1 alone is not one.
    expect(reasons({ types: notMet, lastContact: contact, absentSessions: [s1] })).toEqual([]);
  });

  it('takes none once the last contact came at or after the last session end', () => {
    for (const atMs of [LAST_END, LAST_END + HOUR]) {
      const late = { atMs, unsentReported: false };
      // Even a session listed after the contact, which consistent data never gives.
      const after = absentSession('s4', atMs / HOUR + 1, 2);
      expect(reasons({ types: notMet, lastContact: late, absentSessions: [after] })).toEqual([]);
    }
  });

  it('takes every absent session when unsent records were reported or no contact is known', () => {
    const after = { atMs: LAST_END + 1, unsentReported: true };
    expect(reasons({ types: notMet, lastContact: after, absentSessions: [s1] })).toEqual([
      'NO_CONNECTION',
    ]);
    expect(reasons({ types: notMet, lastContact: null, absentSessions: [s1] })).toEqual([
      'NO_CONNECTION',
    ]);
    // Ground control: the same contact with nothing unsent.
    const clean = { ...after, unsentReported: false };
    expect(reasons({ types: notMet, lastContact: clean, absentSessions: [s1] })).toEqual([]);
  });

  it('needs an ended last session, an open term, a confirmed account and one record', () => {
    const base = { types: notMet, absentSessions: sessions };
    expect(reasons(base)).toEqual(['NO_CONNECTION']);
    expect(reasons({ ...base, nowMs: LAST_END - 1 })).toEqual([]);
    // At its end instant the last session has ended.
    expect(reasons({ ...base, nowMs: LAST_END })).toEqual(['NO_CONNECTION']);
    expect(reasons({ ...base, lastSessionEndAtMs: null })).toEqual([]);
    // Locked from the lock instant on; a unit without a calendar never locks.
    expect(reasons({ ...base, nowMs: LOCK })).toEqual([]);
    expect(reasons({ ...base, nowMs: LOCK - 1 })).toEqual(['NO_CONNECTION']);
    expect(reasons({ ...base, nowMs: LOCK, lockAtMs: null })).toEqual(['NO_CONNECTION']);
    expect(reasons({ ...base, confirmedAccount: false })).toEqual([]);
    // Two records needed: 6 absent hours and 2-hour sessions.
    expect(reasons({ ...base, types: [theory(6)] })).toEqual([]);
    // Already met: nothing to turn.
    expect(reasons({ ...base, types: [theory(3)] })).toEqual([]);
  });

  it('starts from the current result, not from the open hours resolved', () => {
    // 6 absent, one in review: a 2-hour record leaves 4, still over the allowance of 3,
    // and approving the review leaves 5: nothing is pending.
    const types = [theory(6, 1)];
    expect(reasons({ types, absentSessions: [s2] })).toEqual([]);
    // Ground control: 5 absent with the same session turns it.
    expect(reasons({ types: notMet, absentSessions: [s2] })).toEqual(['NO_CONNECTION']);
  });

  it('makes both types present with one record of a mixed session', () => {
    const types = [theory(4), practice(2)];
    const mixed = absentSession('m', 95, 1, 1);
    expect(reasons({ types, absentSessions: [mixed] })).toEqual(['NO_CONNECTION']);
    // A theory-only session leaves practice not met.
    expect(reasons({ types, absentSessions: [absentSession('t', 95, 1)] })).toEqual([]);
  });

  it('can hold with an open flag at the same time', () => {
    const types = [theory(5, 2)];
    expect(reasons({ types, absentSessions: sessions })).toEqual(['OPEN_FLAG', 'NO_CONNECTION']);
  });

  it('refuses a session with hours outside the absent hours', () => {
    for (const hours of [6, -1, 1.5]) {
      const session = absentSession('x', 95, hours);
      expect(() => reasons({ types: notMet, absentSessions: [session] }), `${hours}`).toThrow(
        RangeError,
      );
    }
    // Ground control: all five absent hours in one session pass.
    expect(reasons({ types: notMet, absentSessions: [absentSession('y', 95, 5)] })).toEqual([
      'NO_CONNECTION',
    ]);
  });
});
