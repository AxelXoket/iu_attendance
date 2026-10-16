import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { OUTPUT_STATES, type OutputStatusInput, outputStatus } from './output-state.ts';

const HOUR = 60 * 60 * 1000;
const END = 100 * HOUR;
const LOCK = 300 * HOUR;
const at = (nowMs: number, patch: Partial<OutputStatusInput> = {}) =>
  outputStatus({
    nowMs,
    lastSessionEndAtMs: END,
    lockAtMs: LOCK,
    unansweredSessionCount: 0,
    ...patch,
  });
const rank = (state: (typeof OUTPUT_STATES)[number]) => OUTPUT_STATES.indexOf(state);

describe('output state', () => {
  it('moves from term to term end at the last session end and to locked at the lock', () => {
    expect(at(END - 1)).toEqual({ state: 'IN_TERM', block: null, snapshotAllowed: false });
    expect(at(END)).toEqual({ state: 'TERM_END', block: null, snapshotAllowed: true });
    expect(at(LOCK - 1).state).toBe('TERM_END');
    expect(at(LOCK)).toEqual({ state: 'LOCKED', block: null, snapshotAllowed: false });
  });

  it('locks at the lock instant even before the last session ends', () => {
    expect(at(LOCK, { lastSessionEndAtMs: LOCK + HOUR }).state).toBe('LOCKED');
    // No session at all: in term until the lock.
    expect(at(END, { lastSessionEndAtMs: null }).state).toBe('IN_TERM');
    expect(at(LOCK, { lastSessionEndAtMs: null }).state).toBe('LOCKED');
  });

  it('goes back to term while a session added after the last one runs', () => {
    expect(at(END + HOUR).state).toBe('TERM_END');
    expect(at(END + HOUR, { lastSessionEndAtMs: END + 2 * HOUR }).state).toBe('IN_TERM');
  });

  it('blocks the output on an unanswered session from term end on, and writes no snapshot', () => {
    const unanswered = { unansweredSessionCount: 1 };
    expect(at(END - 1, unanswered)).toEqual({
      state: 'IN_TERM',
      block: null,
      snapshotAllowed: false,
    });
    expect(at(END, unanswered)).toEqual({
      state: 'TERM_END',
      block: 'UNANSWERED_SESSIONS',
      snapshotAllowed: false,
    });
    expect(at(LOCK, unanswered).block).toBe('UNANSWERED_SESSIONS');
    // A lock before the last session's end blocks too: D10 sets the block when LOCKED.
    const early = { ...unanswered, lastSessionEndAtMs: LOCK + HOUR };
    expect(at(LOCK, early)).toEqual({
      state: 'LOCKED',
      block: 'UNANSWERED_SESSIONS',
      snapshotAllowed: false,
    });
  });

  it('never locks and writes no snapshot without a calendar', () => {
    const noCalendar = { lockAtMs: null };
    expect(at(END, noCalendar)).toEqual({ state: 'TERM_END', block: null, snapshotAllowed: false });
    expect(at(Number.MAX_SAFE_INTEGER, noCalendar).state).toBe('TERM_END');
  });

  it('refuses instants and counts that are not whole numbers', () => {
    const bad: Partial<OutputStatusInput>[] = [
      { lastSessionEndAtMs: 1.5 },
      { lockAtMs: Number.NaN },
      { unansweredSessionCount: -1 },
      { unansweredSessionCount: 0.5 },
      { unansweredSessionCount: 2 ** 53 },
      // A missing instant is null, never undefined: undefined would read as no lock.
      { lockAtMs: undefined as unknown as null },
      { lastSessionEndAtMs: undefined as unknown as null },
    ];
    for (const patch of bad)
      expect(() => at(END, patch), JSON.stringify(patch)).toThrow(RangeError);
    expect(() => at(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => at(2 ** 53)).toThrow(RangeError);
    // Ground control: the largest safe instant and count pass.
    const largest = Number.MAX_SAFE_INTEGER;
    expect(at(largest, { unansweredSessionCount: largest }).state).toBe('LOCKED');
  });

  it('runs forward over time while no session is added', () => {
    const instant = fc.integer({ min: 0, max: 1000 });
    const seen = new Set<string>();
    fc.assert(
      fc.property(
        fc.option(instant, { nil: null }),
        fc.option(instant, { nil: null }),
        fc.integer({ min: 0, max: 2 }),
        fc.array(instant, { minLength: 1, maxLength: 20 }),
        (lastSessionEndAtMs, lockAtMs, unansweredSessionCount, nows) => {
          let previous = -1;
          for (const nowMs of [...nows].sort((a, b) => a - b)) {
            const output = outputStatus({
              nowMs,
              lastSessionEndAtMs,
              lockAtMs,
              unansweredSessionCount,
            });
            seen.add(output.state);
            // The order never goes back.
            expect(rank(output.state)).toBeGreaterThanOrEqual(previous);
            previous = rank(output.state);
            // The block only at term end and after the lock, exactly with an unanswered session.
            expect(output.block !== null).toBe(
              output.state !== 'IN_TERM' && unansweredSessionCount > 0,
            );
            // A snapshot only at term end, with a known lock and no block.
            expect(output.snapshotAllowed).toBe(
              output.state === 'TERM_END' && lockAtMs !== null && output.block === null,
            );
            if (lockAtMs === null) expect(output.state).not.toBe('LOCKED');
          }
        },
      ),
      { numRuns: 2000 },
    );
    // Ground control: every state occurs.
    expect([...seen].sort()).toEqual([...OUTPUT_STATES].sort());
  });
});
