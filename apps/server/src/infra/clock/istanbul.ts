import { dateSchema, localTimeSchema } from '@iu-attendance/contracts/shared/time';

// Europe/Istanbul calendar helpers for server code. Offsets come from Node's ICU time
// zone data through Intl with the zone named explicitly, never from the process time
// zone (TZ), so every result is the same under any TZ. Instants are UTC milliseconds,
// dates YYYY-MM-DD, times HH:MM. PostgreSQL converts the same local times with its own
// tz data; the D04 contract test checks that both agree, and istanbul.test.ts checks
// the ICU data against a frozen copy of the zone's history.

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;

// The Istanbul wall clock to the second. hourCycle h23 writes midnight as 00, never as
// 24. The era is requested because Intl counts years from 1 AD: year 0000 is 1 BC.
const WALL_CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Istanbul',
  era: 'short',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hourCycle: 'h23',
});

type WallClock = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

function wallClockAt(instantMs: number): WallClock {
  const fields: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const { type, value } of WALL_CLOCK.formatToParts(instantMs)) fields[type] = value;
  const yearOfEra = Number(fields.year);
  return {
    // Astronomical numbering, as in ISO 8601: 1 BC is year 0, 2 BC is year -1.
    year: fields.era === 'BC' ? 1 - yearOfEra : yearOfEra,
    month: Number(fields.month),
    day: Number(fields.day),
    hour: Number(fields.hour),
    minute: Number(fields.minute),
    second: Number(fields.second),
  };
}

// The UTC offset in force at a whole-second instant: the wall clock, as milliseconds
// from 1970-01-01T00:00 local time, minus the instant. Exact, because the tz data
// keeps offsets and their changes in whole seconds. setUTCFullYear keeps years 0 to
// 99 as written (Date.UTC would move them to the 1900s).
function offsetAtMs(instantMs: number): number {
  const wall = wallClockAt(instantMs);
  const wallDayMs = new Date(0).setUTCFullYear(wall.year, wall.month - 1, wall.day);
  return wallDayMs + ((wall.hour * 60 + wall.minute) * 60 + wall.second) * SECOND_MS - instantMs;
}

// A local wall time (milliseconds from 1970-01-01T00:00 local) to its instant, as
// PostgreSQL resolves (date + time) AT TIME ZONE 'Europe/Istanbul' (datetime.c,
// DetermineTimeZoneOffsetInternal): it takes the first offset change after the local
// time read as UTC minus one day, and a local time that did not exist (clocks jumped
// forward) or occurred twice (clocks went back) gets the later of its two candidate
// instants: the offset before a jump forward, the offset after a change back. With
// offsets under a day and changes more than two days apart (istanbul.test.ts checks
// the zone's history), that rule is: the offset one day later if the instant it gives
// really has that offset, otherwise the offset one day earlier.
function localToInstantMs(localMs: number): number {
  const laterOffsetMs = offsetAtMs(localMs + DAY_MS);
  const laterOffsetInstantMs = localMs - laterOffsetMs;
  if (offsetAtMs(laterOffsetInstantMs) === laterOffsetMs) return laterOffsetInstantMs;
  return localMs - offsetAtMs(localMs - DAY_MS);
}

// Local midnight of a YYYY-MM-DD date.
function localDayStartMs(date: string): number {
  if (!dateSchema.safeParse(date).success) {
    throw new RangeError(`Expected a YYYY-MM-DD date, got ${JSON.stringify(date)}`);
  }
  return new Date(0).setUTCFullYear(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
}

const pad = (value: number, digits: number): string => String(value).padStart(digits, '0');

// The Istanbul calendar date (YYYY-MM-DD) of a UTC instant. The instant must be whole
// milliseconds and its date one dateSchema accepts (years 0000 to 9999), otherwise
// RangeError.
export function istanbulDate(instantMs: number): string {
  if (!Number.isInteger(instantMs)) {
    throw new RangeError(`Expected an instant in whole milliseconds, got ${instantMs}`);
  }
  const { year, month, day } = wallClockAt(instantMs);
  const date = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  if (!dateSchema.safeParse(date).success) {
    throw new RangeError(`Instant ${instantMs} falls outside the years 0000 to 9999`);
  }
  return date;
}

// The UTC instant of an Istanbul date and HH:MM time. A time that did not exist or
// occurred twice resolves as in PostgreSQL (localToInstantMs); Istanbul has been
// +03:00 all year since 2016-09-07, so only older dates have such times.
export function istanbulInstant(date: string, time: string): number {
  const dayStartMs = localDayStartMs(date);
  if (!localTimeSchema.safeParse(time).success) {
    throw new RangeError(`Expected an HH:MM time, got ${JSON.stringify(time)}`);
  }
  const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return localToInstantMs(dayStartMs + minutes * MINUTE_MS);
}

// The end of an Istanbul day, exclusive: the instant of the next day's 00:00.
export function istanbulDayEndInstant(date: string): number {
  return localToInstantMs(localDayStartMs(date) + DAY_MS);
}
