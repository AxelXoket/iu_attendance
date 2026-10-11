import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Clock, systemClock, wallClockOffsetMs } from './index.ts';
import { MAX_READ_ATTEMPTS, MAX_READ_SPREAD_NS } from './system-clock.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('systemClock', () => {
  it('reads the wall clock on every call', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 5, 6));
    // Typed through the entry, where consumers (D14) read the Clock type.
    const clock: Clock = systemClock();
    expect(clock.now()).toBe(Date.UTC(2026, 9, 5, 6));
    expect(clock.nowDate().toISOString()).toBe('2026-10-05T06:00:00.000Z');
    vi.setSystemTime(Date.UTC(2026, 9, 5, 6, 0, 1, 500));
    expect(clock.now()).toBe(Date.UTC(2026, 9, 5, 6, 0, 1, 500));
    expect(clock.nowDate().getTime()).toBe(Date.UTC(2026, 9, 5, 6, 0, 1, 500));
  });

  it('hands out a new Date each time', () => {
    const clock = systemClock();
    const first = clock.nowDate();
    first.setUTCFullYear(1999);
    expect(clock.nowDate().getUTCFullYear()).toBeGreaterThan(2020);
  });

  it('follows the real clock', () => {
    const before = Date.now();
    const now = systemClock().now();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

const NANOSECONDS_PER_MILLISECOND = 1_000_000n;
// Scripted clocks for the reading rules: the wall clock runs WALL_AHEAD_NS ahead of
// the monotonic counter and, like the real one, is cut to whole milliseconds. Before
// the k-th clock read (both clocks counted) the process spends pausesNs[k], or stepNs
// where the list has no entry.
const WALL_AHEAD_NS = 1_791_643_858_309_600_000n;
const OFFSET_MS = Number(WALL_AHEAD_NS / NANOSECONDS_PER_MILLISECOND);
const STALL_NS = 300n * NANOSECONDS_PER_MILLISECOND;

function scriptClocks(pausesNs: readonly bigint[], stepNs = 0n): { monotonicReads(): number } {
  let monotonicNs = 7_000n * NANOSECONDS_PER_MILLISECOND;
  let reads = 0;
  let monotonicReads = 0;
  const pass = () => {
    monotonicNs += pausesNs[reads] ?? stepNs;
    reads += 1;
  };
  vi.spyOn(process.hrtime, 'bigint').mockImplementation(() => {
    pass();
    monotonicReads += 1;
    return monotonicNs;
  });
  vi.spyOn(Date, 'now').mockImplementation(() => {
    pass();
    return Number((monotonicNs + WALL_AHEAD_NS) / NANOSECONDS_PER_MILLISECOND);
  });
  return { monotonicReads: () => monotonicReads };
}

describe('wallClockOffsetMs', () => {
  it('is unchanged while both clocks run and moves by the size of a wall clock step', () => {
    vi.useFakeTimers({ toFake: ['Date', 'hrtime'] });
    const start = wallClockOffsetMs();
    vi.advanceTimersByTime(10_000);
    expect(wallClockOffsetMs()).toBe(start);
    vi.setSystemTime(Date.now() + 500);
    expect(wallClockOffsetMs()).toBe(start + 500);
    vi.setSystemTime(Date.now() - 2000);
    expect(wallClockOffsetMs()).toBe(start - 1500);
  });

  it('reads the real clocks in milliseconds', () => {
    const first = wallClockOffsetMs();
    const second = wallClockOffsetMs();
    expect(Number.isInteger(first)).toBe(true);
    // The monotonic counter starts at some point after 1970, so the offset is the
    // wall clock time of that point; nanoseconds left unconverted would make it negative.
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThanOrEqual(Date.now());
    expect(Math.abs(second - first)).toBeLessThan(1000);
  });

  it('stays within 1 ms of itself while the clocks run together', () => {
    // 0.3 ms passes before every read, so the sub-millisecond phase keeps moving.
    scriptClocks([], 300_000n);
    const readings = new Set<number>();
    for (let call = 0; call < 200; call += 1) readings.add(wallClockOffsetMs());
    // Both whole-millisecond values occur (control): readings are compared with a
    // threshold, never with !==.
    expect([...readings].sort((a, b) => a - b)).toEqual([OFFSET_MS, OFFSET_MS + 1]);
  });

  it('reads again when the process stalls between its clock reads', () => {
    // A stall right before the wall clock read (read 1), then right before the second
    // monotonic read (read 2): the stalled attempt is dropped, the next one is used.
    for (const stalledRead of [1, 2]) {
      vi.restoreAllMocks();
      const clocks = scriptClocks(
        Array.from({ length: stalledRead + 1 }, (_, read) =>
          read === stalledRead ? STALL_NS : 0n,
        ),
      );
      expect(wallClockOffsetMs()).toBe(OFFSET_MS);
      expect(clocks.monotonicReads()).toBe(4);
    }
    // Ground control: without a stall one attempt is enough.
    vi.restoreAllMocks();
    const clocks = scriptClocks([]);
    expect(wallClockOffsetMs()).toBe(OFFSET_MS);
    expect(clocks.monotonicReads()).toBe(2);
  });

  it('accepts a spread up to the limit and reads again just above it', () => {
    let clocks = scriptClocks([0n, MAX_READ_SPREAD_NS]);
    wallClockOffsetMs();
    expect(clocks.monotonicReads()).toBe(2);
    vi.restoreAllMocks();
    clocks = scriptClocks([0n, MAX_READ_SPREAD_NS + 1n]);
    expect(wallClockOffsetMs()).toBe(OFFSET_MS);
    expect(clocks.monotonicReads()).toBe(4);
  });

  it('uses the attempt with the narrowest spread, read at its midpoint, when every attempt stalls', () => {
    expect(MAX_READ_ATTEMPTS).toBeGreaterThan(1);
    // Every allowed attempt stalls before its wall clock read; the second one, 40 ms,
    // is the narrowest. A clean attempt would follow, but it must not be made.
    const stallsMs = Array.from({ length: MAX_READ_ATTEMPTS }, (_, attempt) =>
      attempt === 1 ? 40n : 300n + 20n * BigInt(attempt),
    );
    const clocks = scriptClocks(
      stallsMs.flatMap((ms) => [0n, ms * NANOSECONDS_PER_MILLISECOND, 0n]),
    );
    // Wall clock read 40 ms after the first monotonic read: 20 ms past the midpoint.
    expect(wallClockOffsetMs()).toBe(OFFSET_MS + 20);
    expect(clocks.monotonicReads()).toBe(2 * MAX_READ_ATTEMPTS);
  });
});
