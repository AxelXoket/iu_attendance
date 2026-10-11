import { durationMsSchema, instantSchema } from '@iu-attendance/contracts/shared/time';
import type { Clock } from '@iu-attendance/core/clock/clock';

// The part of pg-boss's TestClock that the fake clock drives. Written out because
// pg-boss may be imported only in infra/jobs and test steps; TestClock fits it.
export interface PgBossTestClock {
  now(): number;
  setTime(time: number): Promise<void>;
  tick(ms: number): Promise<void>;
}

// A Clock for tests that runs off pg-boss's TestClock, so the application and
// pg-boss (job_now() in the database) read one time. Both moves are async because
// TestClock first lets in-flight pg-boss statements finish. Moves are sequential:
// await each one before the next move and before reading the time (TestClock refuses
// a move while another is in progress). Never move time while a test holds an open
// transaction.
export interface FakeClock extends Clock {
  // Jumps to a UTC instant written like 2026-10-05T06:00:00.000Z, forwards or
  // backwards, without firing each timer on the way; for long jumps. Timers it jumps
  // past fire once on the next advance(), even advance(0); a backward jump leaves the
  // timers armed where they were, so they stay silent until time passes them again.
  set(instant: string): Promise<void>;
  // Moves forward by ms, firing due pg-boss timers in order. Like set(), it lands
  // only on instants the contracts can carry (up to 9999-12-31T23:59:59.999Z).
  advance(ms: number): Promise<void>;
}

// True when set() would accept the instant written as UTC text.
function isSettableInstant(instantMs: number): boolean {
  const instant = new Date(instantMs);
  return !Number.isNaN(instant.getTime()) && instantSchema.safeParse(instant.toISOString()).success;
}

export function pgBossClock(testClock: PgBossTestClock): FakeClock {
  return {
    now: () => testClock.now(),
    nowDate: () => new Date(testClock.now()),
    async set(instant) {
      // Only UTC text with Z: a local time string would parse differently per TZ.
      if (!instantSchema.safeParse(instant).success) {
        throw new RangeError(`Expected a UTC instant with Z, got ${JSON.stringify(instant)}`);
      }
      await testClock.setTime(Date.parse(instant));
    },
    async advance(ms) {
      if (!durationMsSchema.safeParse(ms).success) {
        throw new RangeError(`Expected whole non-negative milliseconds, got ${ms}`);
      }
      if (!isSettableInstant(testClock.now() + ms)) {
        throw new RangeError(`A step of ${ms} ms lands past the last instant set() accepts`);
      }
      await testClock.tick(ms);
    },
  };
}
