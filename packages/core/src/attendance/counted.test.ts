import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  FinalStatusInputError,
  type FinalStatusRecord,
  resolveFinalStatus,
} from '../corrections/final-status.ts';
import { permutations } from '../testing/orders.ts';
import { RECORD_DECISIONS, type RecordDecision } from '../verification/codes.ts';
import { COUNTED_DECISION_ORDER, chooseCounted } from './counted.ts';

// Arrivals in one class, a few milliseconds apart, so the tie breaks are reached often.
const CLASS_AT = Date.UTC(2026, 9, 6, 7, 1);
const candidateFields = {
  id: fc.uuid(),
  decision: fc.constantFrom(...RECORD_DECISIONS),
  arrivedAtMs: fc.integer({ min: CLASS_AT, max: CLASS_AT + 3 }),
};
const recordSets = fc.uniqueArray(fc.record(candidateFields), {
  minLength: 1,
  maxLength: 6,
  selector: (record) => record.id,
});

const record = (id: string, decision: RecordDecision, arrivedAtMs: number) => ({
  id,
  decision,
  arrivedAtMs,
});

describe('counted record', () => {
  it('ranks every decision once', () => {
    expect([...COUNTED_DECISION_ORDER].sort()).toEqual([...RECORD_DECISIONS].sort());
  });

  it('orders by decision, then arrival, then id', () => {
    const present = record('b', 'PRESENT', 9);
    expect(chooseCounted([record('a', 'PENDING', 1), present])).toBe(present);
    expect(chooseCounted([record('a', 'IN_REVIEW', 1), record('c', 'PENDING', 9)])?.id).toBe('c');
    expect(chooseCounted([record('a', 'REJECTED', 1), record('c', 'IN_REVIEW', 9)])?.id).toBe('c');
    expect(chooseCounted([record('a', 'PRESENT', 5), record('b', 'PRESENT', 4)])?.id).toBe('b');
    expect(chooseCounted([record('b', 'PRESENT', 4), record('a', 'PRESENT', 4)])?.id).toBe('a');
    // A student whose only record is rejected counts that record.
    const rejected = record('a', 'REJECTED', 1);
    expect(chooseCounted([rejected])).toBe(rejected);
    expect(chooseCounted([])).toBeNull();
  });

  it('orders ids as the database orders uuids, whatever their case', () => {
    const lower = record('0192f5c4-7d2a-7b3c-8d4e-a00000000000', 'PRESENT', 1);
    const upper = record('0192F5C4-7D2A-7B3C-8D4E-B00000000000', 'PRESENT', 1);
    // In code unit order 'B' comes before 'a'; as uuids a000 comes first.
    expect(chooseCounted([upper, lower])).toBe(lower);
    expect(chooseCounted([lower, upper])).toBe(lower);
    // The same uuid in two cases is one record listed twice.
    const again = record(lower.id.toUpperCase(), 'PENDING', 2);
    expect(() => chooseCounted([lower, again])).toThrow(RangeError);
  });

  // Every permutation of up to six records, 2,000 times: slow under coverage on a busy machine.
  it('chooses the same record whatever order the records arrive in', { timeout: 60_000 }, () => {
    fc.assert(
      fc.property(recordSets, (records) => {
        const chosen = chooseCounted(records);
        if (chosen === null) throw new Error('a set of one record or more has a counted one');
        expect(records).toContain(chosen);
        // It comes before every other record of the set.
        for (const other of records) {
          if (other !== chosen) expect(chooseCounted([other, chosen])).toBe(chosen);
        }
        for (const order of permutations(records)) expect(chooseCounted(order)).toBe(chosen);
      }),
      { numRuns: 2000 },
    );
  });

  it('refuses a list whose choice would depend on its order', () => {
    const ok = record('a', 'PRESENT', 1);
    const bad = [
      [ok, record('a', 'PENDING', 2)],
      // A repeat of a record that is no longer the best is caught too.
      [record('a', 'PENDING', 1), record('b', 'PRESENT', 1), record('a', 'PRESENT', 0)],
      [ok, record('b', 'PRESENT', 2 ** 53)],
      [ok, record('b', 'PRESENT', Number.NaN)],
      [ok, record('b', 'PRESENT', 1.5)],
      [ok, { id: 'b', decision: 'MAYBE' as RecordDecision, arrivedAtMs: 1 }],
    ];
    for (const records of bad) expect(() => chooseCounted(records)).toThrow(RangeError);
    // Ground control: real instants, the largest safe one and a negative one pass.
    const late = record('b', 'PRESENT', Number.MAX_SAFE_INTEGER);
    expect(chooseCounted([ok, late, record('c', 'PRESENT', CLASS_AT)])).toBe(ok);
    expect(chooseCounted([ok, record('b', 'PRESENT', -1)])?.id).toBe('b');
  });
});

describe('counted record as input to the final status', () => {
  const finalRecords = fc.uniqueArray(
    fc.record({ ...candidateFields, selfDeclared: fc.boolean(), approved: fc.boolean() }),
    { minLength: 1, maxLength: 6, selector: (entry) => entry.id },
  );
  const session = fc.record({
    theoryHours: fc.integer({ min: 0, max: 4 }),
    practiceHours: fc.integer({ min: 0, max: 4 }),
    held: fc.constantFrom(true, false, null),
    locked: fc.boolean(),
  });
  type Entry = { decision: RecordDecision; selfDeclared: boolean; approved: boolean };
  const asFinal = (
    entries: readonly Entry[],
    counted: (entry: Entry) => boolean,
  ): FinalStatusRecord[] =>
    entries.map((entry) => ({
      counted: counted(entry),
      decision: entry.decision,
      selfDeclared: entry.selfDeclared,
      approved: entry.approved,
      excludedFromCount: false,
    }));

  it('gives the final status exactly one counted record, and the hours add up', () => {
    fc.assert(
      fc.property(finalRecords, session, fc.nat(), (entries, sessionState, pick) => {
        const chosen = chooseCounted(entries);
        const records = asFinal(entries, (entry) => entry === chosen);
        expect(records.filter((entry) => entry.counted)).toHaveLength(1);
        const status = resolveFinalStatus(records, [], sessionState);
        for (const [type, hours] of [
          [status.theory, sessionState.theoryHours],
          [status.practice, sessionState.practiceHours],
        ] as const) {
          // A session that did not take place has no hours to split.
          const split = sessionState.held === false ? 0 : hours;
          expect(type.present + type.absent + type.excused + type.open).toBe(split);
        }
        // Positive control: no counted record, or two, is refused.
        expect(() =>
          resolveFinalStatus(
            asFinal(entries, () => false),
            [],
            sessionState,
          ),
        ).toThrow(FinalStatusInputError);
        const others = entries.filter((entry) => entry !== chosen);
        const other = others[pick % Math.max(others.length, 1)];
        if (other !== undefined) {
          const twice = asFinal(entries, (entry) => entry === chosen || entry === other);
          expect(() => resolveFinalStatus(twice, [], sessionState)).toThrow(FinalStatusInputError);
        }
      }),
      { numRuns: 2000 },
    );
  });
});
