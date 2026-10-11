import { durationMsSchema, instantSchema } from '@iu-attendance/contracts/shared/time';
import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type PgBossTestClock, pgBossClock } from './fake-clock.ts';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const START_MS = Date.UTC(2026, 9, 5, 6);
const yearStartMs = (year: number): number => new Date(0).setUTCFullYear(year, 0, 1);

// Stand-in for pg-boss's TestClock (pg-boss may not be imported here). Like the real
// one, a move first lets pending work run (a macrotask) and only then changes the time.
function standInTestClock(startMs: number): { testClock: PgBossTestClock; moves: string[] } {
  let currentMs = startMs;
  const moves: string[] = [];
  const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
  const testClock: PgBossTestClock = {
    now: () => currentMs,
    async setTime(time) {
      moves.push(`setTime ${time}`);
      await settle();
      currentMs = time;
    },
    async tick(ms) {
      moves.push(`tick ${ms}`);
      await settle();
      currentMs += ms;
    },
  };
  return { testClock, moves };
}

describe('pgBossClock', () => {
  it('reads the time of the TestClock it drives', () => {
    const { testClock } = standInTestClock(START_MS);
    const clock = pgBossClock(testClock);
    expect(clock.now()).toBe(START_MS);
    expect(clock.nowDate().getTime()).toBe(START_MS);
  });

  it('set resolves only after the TestClock has jumped, in either direction', async () => {
    const { testClock, moves } = standInTestClock(START_MS);
    const clock = pgBossClock(testClock);
    const pending = clock.set('2026-10-06T06:00:00.000Z');
    expect(clock.now()).toBe(START_MS);
    await pending;
    expect(clock.now()).toBe(START_MS + DAY_MS);
    await clock.set('2026-10-05T05:00:00.000Z');
    expect(clock.now()).toBe(START_MS - HOUR_MS);
    expect(moves).toEqual([`setTime ${START_MS + DAY_MS}`, `setTime ${START_MS - HOUR_MS}`]);
  });

  it('advance resolves only after the TestClock has ticked', async () => {
    const { testClock, moves } = standInTestClock(START_MS);
    const clock = pgBossClock(testClock);
    const pending = clock.advance(90_000);
    expect(clock.now()).toBe(START_MS);
    await pending;
    expect(clock.now()).toBe(START_MS + 90_000);
    await clock.advance(0);
    expect(moves).toEqual(['tick 90000', 'tick 0']);
  });

  it('refuses text that is not a UTC instant with Z and does not move', async () => {
    const { testClock, moves } = standInTestClock(START_MS);
    const clock = pgBossClock(testClock);
    for (const text of [
      '2026-10-05 09:00',
      '2026-10-05T09:00:00+03:00',
      '2026-10-05T06:00:00Z',
      '2026-10-05T06:00:00.000',
      '2026-02-30T06:00:00.000Z',
      '+275760-09-13T00:00:00.000Z',
      'tomorrow',
    ]) {
      await expect(clock.set(text)).rejects.toThrow(RangeError);
    }
    expect(moves).toEqual([]);
    // Positive control: a well-formed instant does move it.
    await clock.set('2026-10-05T07:00:00.000Z');
    expect(moves).toEqual([`setTime ${START_MS + HOUR_MS}`]);
  });

  it('refuses negative, fractional and unsafe steps and does not move', async () => {
    const { testClock, moves } = standInTestClock(START_MS);
    const clock = pgBossClock(testClock);
    for (const ms of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
      await expect(clock.advance(ms)).rejects.toThrow(RangeError);
    }
    expect(moves).toEqual([]);
    await clock.advance(1);
    expect(moves).toEqual(['tick 1']);
  });

  it('refuses a step past the last instant set accepts and does not move', async () => {
    const { testClock, moves } = standInTestClock(START_MS);
    const clock = pgBossClock(testClock);
    // The refusal names the reason, also where the landing is past the Date range.
    const pastTheEnd = /lands past the last instant set\(\) accepts/;
    await expect(clock.advance(Number.MAX_SAFE_INTEGER)).rejects.toThrow(RangeError);
    await expect(clock.advance(Number.MAX_SAFE_INTEGER)).rejects.toThrow(pastTheEnd);
    await clock.set('9999-12-31T23:59:59.000Z');
    // Positive control: landing exactly on the last instant set accepts is allowed.
    await clock.advance(999);
    expect(clock.nowDate().toISOString()).toBe('9999-12-31T23:59:59.999Z');
    await expect(clock.advance(1)).rejects.toThrow(RangeError);
    await expect(clock.advance(1)).rejects.toThrow(pastTheEnd);
    expect(clock.nowDate().toISOString()).toBe('9999-12-31T23:59:59.999Z');
    expect(moves).toEqual([`setTime ${Date.parse('9999-12-31T23:59:59.000Z')}`, 'tick 999']);
  });

  it('takes a step exactly when the contracts accept the step and the instant it lands on', async () => {
    const lastInstantMs = yearStartMs(10000) - 1;
    const start = fc.oneof(
      fc.integer({ min: yearStartMs(1970), max: yearStartMs(2100) }),
      fc.integer({ min: lastInstantMs - 400 * DAY_MS, max: lastInstantMs }),
    );
    const step = fc.oneof(
      fc.integer({ min: 0, max: 800 * DAY_MS }),
      fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
      fc.integer({ min: -DAY_MS, max: -1 }),
      fc.double(),
      fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53),
    );
    let taken = 0;
    let refused = 0;
    await fc.assert(
      fc.asyncProperty(start, step, async (startMs, ms) => {
        const { testClock, moves } = standInTestClock(startMs);
        const clock = pgBossClock(testClock);
        const landing = new Date(startMs + ms);
        const allowed =
          durationMsSchema.safeParse(ms).success &&
          !Number.isNaN(landing.getTime()) &&
          instantSchema.safeParse(landing.toISOString()).success;
        if (allowed) {
          await clock.advance(ms);
          expect(clock.now()).toBe(startMs + ms);
          expect(moves).toEqual([`tick ${ms}`]);
          taken += 1;
        } else {
          await expect(clock.advance(ms)).rejects.toThrow(RangeError);
          expect(clock.now()).toBe(startMs);
          expect(moves).toEqual([]);
          refused += 1;
        }
      }),
      { numRuns: 500 },
    );
    // Control: both sides of the rule were exercised.
    expect(taken).toBeGreaterThan(50);
    expect(refused).toBeGreaterThan(50);
  });
});

// The zone the file started in. It is restored by assigning it back: on Windows,
// deleting TZ leaves the last assigned zone in force.
const startZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const startTz = process.env.TZ ?? startZone;

const ZONES = [
  { tz: 'UTC', localHourAtUtcMidnight: 0 },
  { tz: 'Europe/Istanbul', localHourAtUtcMidnight: 3 },
] as const;

for (const zone of ZONES) {
  describe(`pgBossClock under TZ=${zone.tz}`, () => {
    beforeAll(() => {
      process.env.TZ = zone.tz;
    });

    afterAll(() => {
      process.env.TZ = startTz;
    });

    it('really runs in that zone (control: local-time Date methods follow TZ)', () => {
      expect(new Date(Date.UTC(2026, 9, 5)).getHours()).toBe(zone.localHourAtUtcMidnight);
    });

    it('lands on the same UTC instant', async () => {
      const { testClock } = standInTestClock(0);
      const clock = pgBossClock(testClock);
      await clock.set('2026-10-05T06:00:00.000Z');
      expect(clock.now()).toBe(START_MS);
      expect(clock.nowDate().toISOString()).toBe('2026-10-05T06:00:00.000Z');
    });
  });
}

describe('process time zone', () => {
  it('is the zone the file started in once the zone runs are over', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(startZone);
  });
});
