import type { Clock } from '@iu-attendance/core/clock/clock';

// The real clock. Only infra/clock reads the wall clock; everything else receives
// this object (a fake one in tests) from the composition root.
export function systemClock(): Clock {
  return {
    now: () => Date.now(),
    // Built from Date.now() so both methods read the same source.
    nowDate: () => new Date(Date.now()),
  };
}

const NANOSECONDS_PER_MILLISECOND = 1_000_000n;

// The monotonic counter is read just before and just after the wall clock; normally
// the two reads lie well under a microsecond apart. A wider spread means the process
// stalled in between (a GC pause, CPU throttling), which would read as a wall clock
// step, so the reading is taken again, up to MAX_READ_ATTEMPTS times.
export const MAX_READ_SPREAD_NS = 1_000_000n;
export const MAX_READ_ATTEMPTS = 5;

type Reading = { readonly spreadNs: bigint; readonly offsetMs: number };

function readClocks(): Reading {
  const beforeNs = process.hrtime.bigint();
  const wallMs = Date.now();
  const afterNs = process.hrtime.bigint();
  // The wall clock was read at about the midpoint of the two monotonic reads.
  const midpointMs = Number((beforeNs + afterNs) / 2n / NANOSECONDS_PER_MILLISECOND);
  return { spreadNs: afterNs - beforeNs, offsetMs: wallMs - midpointMs };
}

// Wall clock minus the monotonic counter (process.hrtime), in whole milliseconds. It
// moves by the size of the step when the wall clock is set, so comparing two readings
// reveals a jump. Both clocks are cut to whole milliseconds, so readings taken while
// time passes normally still differ by up to 1 ms: compare them with a threshold,
// never with !==. When every attempt stalls, the one with the narrowest spread is
// used. The fake clock does not change it; tests inject their own function. Only
// the clock module uses it.
export function wallClockOffsetMs(): number {
  let narrowest = readClocks();
  for (
    let attempt = 1;
    attempt < MAX_READ_ATTEMPTS && narrowest.spreadNs > MAX_READ_SPREAD_NS;
    attempt += 1
  ) {
    const reading = readClocks();
    if (reading.spreadNs < narrowest.spreadNs) narrowest = reading;
  }
  return narrowest.offsetMs;
}
