import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { idKey } from '../shared/uuid.ts';
import { SHARED_LIMIT_SESSIONS } from './constants.ts';
import {
  type SharedLimitCounter,
  type SharedLimitInput,
  sharedLimitDecision,
} from './shared-limit.ts';

const counterOf = (...usedSessionIds: string[]): SharedLimitCounter =>
  Object.freeze({ used: usedSessionIds.length, usedSessionIds: Object.freeze(usedSessionIds) });
const EMPTY = counterOf();
const unverified = { CLOCK_UNVERIFIED: true, BACKUP_CODE: false } as const;
const decide = (
  sessionId: string,
  counter: SharedLimitCounter,
  patch: Partial<SharedLimitInput> = {},
) =>
  sharedLimitDecision({ labels: unverified, otherRuleFits: false, sessionId, counter, ...patch });
// A counter whose every right is spent, on sessions 'held-0', 'held-1', ...
const full = counterOf(...Array.from({ length: SHARED_LIMIT_SESSIONS }, (_, n) => `held-${n}`));

describe('sharedLimitDecision (D07 shared limit)', () => {
  it("keeps the plan's limit: two sessions per (term, student, course)", () => {
    expect(SHARED_LIMIT_SESSIONS).toBe(2);
  });

  it('spends one right per new session up to the limit, then sends a new session to review', () => {
    let counter = EMPTY;
    for (let n = 0; n < SHARED_LIMIT_SESSIONS; n += 1) {
      const result = decide(`held-${n}`, counter);
      expect(result.reason).toBe('ACCEPTED_BY_SHARED_LIMIT');
      expect(result.spendsRight).toBe(true);
      counter = result.counter;
    }
    expect(counter).toEqual(full);
    const over = decide('another', counter);
    expect(over).toEqual({ reason: 'SHARED_LIMIT_EXCEEDED', spendsRight: false, counter });
    expect(over.counter).toBe(counter);
  });

  it('accepts every later record of a session that holds a right, past the limit too, in either case', () => {
    const one = counterOf('held-0');
    const again = decide('held-0', one);
    expect(again).toEqual({ reason: 'ACCEPTED_BY_SHARED_LIMIT', spendsRight: false, counter: one });
    expect(again.counter).toBe(one);
    expect(decide('HELD-1', full)).toEqual({
      reason: 'ACCEPTED_BY_SHARED_LIMIT',
      spendsRight: false,
      counter: full,
    });
  });

  it('uses one right for a record with both labels, and none without a label or when another rule fits', () => {
    const both = decide('s', EMPTY, { labels: { CLOCK_UNVERIFIED: true, BACKUP_CODE: true } });
    expect(both.counter).toEqual(counterOf('s'));
    const backup = decide('s', EMPTY, { labels: { CLOCK_UNVERIFIED: false, BACKUP_CODE: true } });
    expect(backup.reason).toBe('ACCEPTED_BY_SHARED_LIMIT');
    const none = { CLOCK_UNVERIFIED: false, BACKUP_CODE: false };
    for (const patch of [{ labels: none }, { otherRuleFits: true }]) {
      const result = decide('s', EMPTY, patch);
      expect(result).toEqual({ reason: null, spendsRight: false, counter: EMPTY });
      expect(result.counter).toBe(EMPTY);
      // Past the limit too: the record does not reach review through the limit.
      expect(decide('another', full, patch).reason).toBeNull();
    }
  });

  it('leaves the counter it was given alone, so a record that is not inserted spends nothing', () => {
    const before = counterOf('held-0');
    const result = decide('new', before);
    expect(result.counter).toEqual(counterOf('held-0', 'new'));
    expect(before).toEqual(counterOf('held-0'));
  });

  it('refuses a counter the table cannot hold, before anything else', () => {
    const bad: SharedLimitCounter[] = [
      { used: 1, usedSessionIds: [] },
      { used: 0, usedSessionIds: ['s'] },
      { used: -1, usedSessionIds: [] },
      { used: 0.5, usedSessionIds: [] },
      { used: Number.NaN, usedSessionIds: [] },
      // The same session twice, in two cases: counted twice, or counted once.
      { used: 2, usedSessionIds: ['s-a', 'S-A'] },
      { used: 1, usedSessionIds: ['s-a', 'S-A'] },
    ];
    for (const counter of bad) {
      expect(() => decide('s', counter), JSON.stringify(counter)).toThrow(RangeError);
      expect(() => decide('s', counter, { otherRuleFits: true })).toThrow(RangeError);
    }
    // Ground control: a counter above today's limit (a larger limit earlier) is a real row.
    const above = counterOf('a', 'b', 'c');
    expect(decide('d', above).reason).toBe('SHARED_LIMIT_EXCEEDED');
    expect(decide('B', above).reason).toBe('ACCEPTED_BY_SHARED_LIMIT');
  });

  it('never lets more sessions than the limit in, never lowers the count, never spends twice for a session (10,000 runs)', () => {
    const SESSIONS = ['s-a', 's-b', 's-c', 's-d'];
    const arrive = fc.record({
      kind: fc.constant('ARRIVE' as const),
      session: fc.integer({ min: 0, max: SESSIONS.length - 1 }),
      upper: fc.boolean(),
      clockUnverified: fc.boolean(),
      backupCode: fc.boolean(),
      // Another rule fits: rejected, in review, or pending first (resolved by a later step).
      otherRuleFits: fc.boolean(),
      inserted: fc.boolean(),
    });
    const resolve = fc.record({ kind: fc.constant('RESOLVE' as const), pick: fc.nat() });
    type Waiting = Pick<SharedLimitInput, 'labels' | 'sessionId'>;
    fc.assert(
      fc.property(fc.array(fc.oneof(arrive, arrive, resolve), { maxLength: 30 }), (steps) => {
        let counter = EMPTY;
        const waiting: Waiting[] = [];
        const accepted = new Set<string>();
        for (const step of steps) {
          let input: SharedLimitInput;
          if (step.kind === 'ARRIVE') {
            const id = SESSIONS[step.session] as string;
            input = {
              labels: { CLOCK_UNVERIFIED: step.clockUnverified, BACKUP_CODE: step.backupCode },
              otherRuleFits: step.otherRuleFits,
              sessionId: step.upper ? id.toUpperCase() : id,
              counter,
            };
          } else {
            if (waiting.length === 0) continue;
            const [record] = waiting.splice(step.pick % waiting.length, 1) as [Waiting];
            input = { ...record, otherRuleFits: false, counter };
          }
          const result = sharedLimitDecision(input);
          const held = counter.usedSessionIds.some((id) => idKey(id) === idKey(input.sessionId));
          const applies =
            (input.labels.CLOCK_UNVERIFIED || input.labels.BACKUP_CODE) && !input.otherRuleFits;
          expect(result.reason !== null).toBe(applies);
          expect(result.spendsRight).toBe(applies && !held && counter.used < SHARED_LIMIT_SESSIONS);
          expect(result.counter.used).toBe(counter.used + (result.spendsRight ? 1 : 0));
          if (!result.spendsRight) expect(result.counter).toBe(counter);
          // The new session is written in lower case after the ones already held.
          else
            expect(result.counter.usedSessionIds).toEqual([
              ...counter.usedSessionIds,
              idKey(input.sessionId),
            ]);
          // Only an inserted record writes its counter.
          if (step.kind === 'RESOLVE' || step.inserted) {
            counter = counterOf(...result.counter.usedSessionIds);
            if (result.reason === 'ACCEPTED_BY_SHARED_LIMIT') accepted.add(idKey(input.sessionId));
            if (step.kind === 'ARRIVE' && step.otherRuleFits) waiting.push(input);
          }
        }
        expect(accepted.size).toBeLessThanOrEqual(SHARED_LIMIT_SESSIONS);
        expect(counter.used).toBe(accepted.size);
      }),
      { numRuns: 10_000 },
    );
  });
});
