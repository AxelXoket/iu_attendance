import { dateSchema, localTimeSchema } from '@iu-attendance/contracts/shared/time';
import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

type ClockEntry = typeof import('./index.ts');

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// The first instant of a year, years 0 to 99 included (Date.UTC moves those to 19xx).
const yearStartMs = (year: number): number => new Date(0).setUTCFullYear(year, 0, 1);
const iso = (instantMs: number): string => new Date(instantMs).toISOString();
// Local wall times are carried as milliseconds from 1970-01-01T00:00 local time.
const dateOf = (localMs: number): string => iso(localMs).slice(0, 10);
const timeOf = (localMs: number): string => iso(localMs).slice(11, 16);

// Frozen reference for the zone data, independent of the Node ICU data the helpers
// read: every transition in zoneinfo/Europe/Istanbul as zic compiled it from IANA
// tzdata 2026d, [instant in Unix seconds, UTC offset in seconds from that instant on].
// Local mean time (+01:55:52) holds before the first entry and +03:00 after the last
// (the file footer <+03>-3). The 1978 and 2016 entries change only the abbreviation;
// PostgreSQL treats them as boundaries too. When Node's ICU data differs (a new rule
// for Turkey, a Node built with older tz data) these tests turn red: check the change
// against PostgreSQL's tz data (the D04 contract test) before updating this copy.
const FIXTURE_LOCAL_MEAN_TIME_OFFSET_S = 6952;
const FIXTURE_TRANSITIONS: readonly (readonly [atS: number, offsetS: number])[] = [
  [-2840147752, 7016], // 1879-12-31T22:04:08Z IMT
  [-1869875816, 7200], // 1910-09-30T22:03:04Z EET
  [-1693706400, 10800], // 1916-04-30T22:00:00Z EEST
  [-1680490800, 7200], // 1916-09-30T21:00:00Z EET
  [-1570413600, 10800], // 1920-03-27T22:00:00Z EEST
  [-1552186800, 7200], // 1920-10-24T21:00:00Z EET
  [-1538359200, 10800], // 1921-04-02T22:00:00Z EEST
  [-1522551600, 7200], // 1921-10-02T21:00:00Z EET
  [-1507514400, 10800], // 1922-03-25T22:00:00Z EEST
  [-1490583600, 7200], // 1922-10-07T21:00:00Z EET
  [-1440208800, 10800], // 1924-05-12T22:00:00Z EEST
  [-1428030000, 7200], // 1924-09-30T21:00:00Z EET
  [-1409709600, 10800], // 1925-04-30T22:00:00Z EEST
  [-1396494000, 7200], // 1925-09-30T21:00:00Z EET
  [-931053600, 10800], // 1940-06-30T22:00:00Z EEST
  [-922676400, 7200], // 1940-10-05T21:00:00Z EET
  [-917834400, 10800], // 1940-11-30T22:00:00Z EEST
  [-892436400, 7200], // 1941-09-20T21:00:00Z EET
  [-875844000, 10800], // 1942-03-31T22:00:00Z EEST
  [-764737200, 7200], // 1945-10-07T21:00:00Z EET
  [-744343200, 10800], // 1946-05-31T22:00:00Z EEST
  [-733806000, 7200], // 1946-09-30T21:00:00Z EET
  [-716436000, 10800], // 1947-04-19T22:00:00Z EEST
  [-701924400, 7200], // 1947-10-04T21:00:00Z EET
  [-684986400, 10800], // 1948-04-17T22:00:00Z EEST
  [-670474800, 7200], // 1948-10-02T21:00:00Z EET
  [-654141600, 10800], // 1949-04-09T22:00:00Z EEST
  [-639025200, 7200], // 1949-10-01T21:00:00Z EET
  [-622087200, 10800], // 1950-04-15T22:00:00Z EEST
  [-606970800, 7200], // 1950-10-07T21:00:00Z EET
  [-590032800, 10800], // 1951-04-21T22:00:00Z EEST
  [-575521200, 7200], // 1951-10-06T21:00:00Z EET
  [-235620000, 10800], // 1962-07-14T22:00:00Z EEST
  [-194842800, 7200], // 1963-10-29T21:00:00Z EET
  [-177732000, 10800], // 1964-05-14T22:00:00Z EEST
  [-165726000, 7200], // 1964-09-30T21:00:00Z EET
  [107910000, 10800], // 1973-06-02T23:00:00Z EEST
  [121215600, 7200], // 1973-11-03T23:00:00Z EET
  [133920000, 10800], // 1974-03-31T00:00:00Z EEST
  [152665200, 7200], // 1974-11-02T23:00:00Z EET
  [164678400, 10800], // 1975-03-22T00:00:00Z EEST
  [184114800, 7200], // 1975-11-01T23:00:00Z EET
  [196214400, 10800], // 1976-03-21T00:00:00Z EEST
  [215564400, 7200], // 1976-10-30T23:00:00Z EET
  [228873600, 10800], // 1977-04-03T00:00:00Z EEST
  [245804400, 7200], // 1977-10-15T23:00:00Z EET
  [260323200, 10800], // 1978-04-02T00:00:00Z EEST
  [267915600, 10800], // 1978-06-28T21:00:00Z +03
  [428454000, 14400], // 1983-07-30T23:00:00Z +04
  [433893600, 10800], // 1983-10-01T22:00:00Z +03
  [468111600, 7200], // 1984-10-31T23:00:00Z EET
  [482799600, 10800], // 1985-04-19T23:00:00Z EEST
  [496710000, 7200], // 1985-09-27T23:00:00Z EET
  [512521200, 10800], // 1986-03-29T23:00:00Z EEST
  [528246000, 7200], // 1986-09-27T23:00:00Z EET
  [543970800, 10800], // 1987-03-28T23:00:00Z EEST
  [559695600, 7200], // 1987-09-26T23:00:00Z EET
  [575420400, 10800], // 1988-03-26T23:00:00Z EEST
  [591145200, 7200], // 1988-09-24T23:00:00Z EET
  [606870000, 10800], // 1989-03-25T23:00:00Z EEST
  [622594800, 7200], // 1989-09-23T23:00:00Z EET
  [638319600, 10800], // 1990-03-24T23:00:00Z EEST
  [654649200, 7200], // 1990-09-29T23:00:00Z EET
  [670374000, 10800], // 1991-03-30T23:00:00Z EEST
  [686098800, 7200], // 1991-09-28T23:00:00Z EET
  [701823600, 10800], // 1992-03-28T23:00:00Z EEST
  [717548400, 7200], // 1992-09-26T23:00:00Z EET
  [733273200, 10800], // 1993-03-27T23:00:00Z EEST
  [748998000, 7200], // 1993-09-25T23:00:00Z EET
  [764118000, 10800], // 1994-03-19T23:00:00Z EEST
  [780447600, 7200], // 1994-09-24T23:00:00Z EET
  [796172400, 10800], // 1995-03-25T23:00:00Z EEST
  [811897200, 7200], // 1995-09-23T23:00:00Z EET
  [828226800, 10800], // 1996-03-30T23:00:00Z EEST
  [846370800, 7200], // 1996-10-26T23:00:00Z EET
  [859676400, 10800], // 1997-03-29T23:00:00Z EEST
  [877820400, 7200], // 1997-10-25T23:00:00Z EET
  [891126000, 10800], // 1998-03-28T23:00:00Z EEST
  [909270000, 7200], // 1998-10-24T23:00:00Z EET
  [922575600, 10800], // 1999-03-27T23:00:00Z EEST
  [941324400, 7200], // 1999-10-30T23:00:00Z EET
  [954025200, 10800], // 2000-03-25T23:00:00Z EEST
  [972774000, 7200], // 2000-10-28T23:00:00Z EET
  [985474800, 10800], // 2001-03-24T23:00:00Z EEST
  [1004223600, 7200], // 2001-10-27T23:00:00Z EET
  [1017529200, 10800], // 2002-03-30T23:00:00Z EEST
  [1035673200, 7200], // 2002-10-26T23:00:00Z EET
  [1048978800, 10800], // 2003-03-29T23:00:00Z EEST
  [1067122800, 7200], // 2003-10-25T23:00:00Z EET
  [1080428400, 10800], // 2004-03-27T23:00:00Z EEST
  [1099177200, 7200], // 2004-10-30T23:00:00Z EET
  [1111878000, 10800], // 2005-03-26T23:00:00Z EEST
  [1130626800, 7200], // 2005-10-29T23:00:00Z EET
  [1143327600, 10800], // 2006-03-25T23:00:00Z EEST
  [1162076400, 7200], // 2006-10-28T23:00:00Z EET
  [1174784400, 10800], // 2007-03-25T01:00:00Z EEST
  [1193533200, 7200], // 2007-10-28T01:00:00Z EET
  [1206838800, 10800], // 2008-03-30T01:00:00Z EEST
  [1224982800, 7200], // 2008-10-26T01:00:00Z EET
  [1238288400, 10800], // 2009-03-29T01:00:00Z EEST
  [1256432400, 7200], // 2009-10-25T01:00:00Z EET
  [1269738000, 10800], // 2010-03-28T01:00:00Z EEST
  [1288486800, 7200], // 2010-10-31T01:00:00Z EET
  [1301274000, 10800], // 2011-03-28T01:00:00Z EEST
  [1319936400, 7200], // 2011-10-30T01:00:00Z EET
  [1332637200, 10800], // 2012-03-25T01:00:00Z EEST
  [1351386000, 7200], // 2012-10-28T01:00:00Z EET
  [1364691600, 10800], // 2013-03-31T01:00:00Z EEST
  [1382835600, 7200], // 2013-10-27T01:00:00Z EET
  [1396227600, 10800], // 2014-03-31T01:00:00Z EEST
  [1414285200, 7200], // 2014-10-26T01:00:00Z EET
  [1427590800, 10800], // 2015-03-29T01:00:00Z EEST
  [1446944400, 7200], // 2015-11-08T01:00:00Z EET
  [1459040400, 10800], // 2016-03-27T01:00:00Z EEST
  [1473195600, 10800], // 2016-09-06T21:00:00Z +03
];

type Transition = { readonly atMs: number; readonly beforeMs: number; readonly afterMs: number };

const FIXTURE_LOCAL_MEAN_TIME_OFFSET_MS = FIXTURE_LOCAL_MEAN_TIME_OFFSET_S * SECOND_MS;
// Each entry in milliseconds, with the offsets in force on both sides of it.
const FIXTURE: readonly Transition[] = FIXTURE_TRANSITIONS.map(([atS, offsetS], index) => ({
  atMs: atS * SECOND_MS,
  beforeMs: (FIXTURE_TRANSITIONS[index - 1]?.[1] ?? FIXTURE_LOCAL_MEAN_TIME_OFFSET_S) * SECOND_MS,
  afterMs: offsetS * SECOND_MS,
}));
// The entries that change the offset; the others change only the abbreviation.
const FIXTURE_CHANGES = FIXTURE.filter((entry) => entry.afterMs !== entry.beforeMs);
const FIXTURE_LAST = FIXTURE.at(-1);
if (FIXTURE_LAST === undefined) throw new Error('The tz fixture is empty');
const FIXTURE_FINAL_OFFSET_MS = FIXTURE_LAST.afterMs;

// The offset in force at an instant: that of the last entry at or before it.
function fixtureOffsetMs(instantMs: number): number {
  let offsetMs = FIXTURE_LOCAL_MEAN_TIME_OFFSET_MS;
  for (const entry of FIXTURE) {
    if (entry.atMs > instantMs) break;
    offsetMs = entry.afterMs;
  }
  return offsetMs;
}

// The Istanbul date of an instant by the fixture. toISOString writes the years 0000
// to 9999 with four digits and any other year in a form dateSchema refuses.
const fixtureDate = (instantMs: number): string => dateOf(instantMs + fixtureOffsetMs(instantMs));

// Reference for local time to instant: PostgreSQL's algorithm run over the fixture,
// written apart from the helper (which states the rule through ICU offsets).
// localtime.c pg_next_dst_boundary takes the first entry after the local time read as
// UTC minus one day (local mean time before the first entry, no boundary after the
// last); datetime.c DetermineTimeZoneOffsetInternal then compares both candidates
// with that boundary.
function postgresInstant(localMs: number): number {
  const probeMs = localMs - DAY_MS;
  const boundary = FIXTURE.find((entry) => entry.atMs > probeMs);
  if (boundary === undefined) return localMs - FIXTURE_FINAL_OFFSET_MS;
  const beforeInstant = localMs - boundary.beforeMs;
  const afterInstant = localMs - boundary.afterMs;
  if (beforeInstant < boundary.atMs && afterInstant < boundary.atMs) return beforeInstant;
  if (beforeInstant > boundary.atMs && afterInstant >= boundary.atMs) return afterInstant;
  return beforeInstant > afterInstant ? beforeInstant : afterInstant;
}

// Node's ICU data read directly, only to compare it with the fixture.
const icuFormat = new Intl.DateTimeFormat('en-US', {
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

function icuOffsetMs(instantMs: number): number {
  const parts: Record<string, string> = {};
  for (const { type, value } of icuFormat.formatToParts(instantMs)) parts[type] = value;
  if (parts.era !== 'AD') throw new Error(`The ICU check covers AD years only: ${instantMs}`);
  const local = new Date(0);
  local.setUTCFullYear(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  local.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second));
  return local.getTime() - Math.floor(instantMs / SECOND_MS) * SECOND_MS;
}

// Every ICU offset change between two instants: a daily scan, each change pinned to
// the millisecond.
function icuChanges(fromMs: number, toMs: number): Transition[] {
  const changes: Transition[] = [];
  let previousAt = fromMs;
  let previousMs = icuOffsetMs(fromMs);
  for (let t = fromMs + DAY_MS; t <= toMs; t += DAY_MS) {
    const offsetMs = icuOffsetMs(t);
    if (offsetMs !== previousMs) {
      let low = previousAt;
      let high = t;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (icuOffsetMs(middle) === previousMs) low = middle;
        else high = middle;
      }
      changes.push({ atMs: high, beforeMs: previousMs, afterMs: offsetMs });
    }
    previousAt = t;
    previousMs = offsetMs;
  }
  return changes;
}

const localMinute = (fromYear: number, toYear: number) =>
  fc
    .integer({ min: yearStartMs(fromYear) / MINUTE_MS, max: yearStartMs(toYear) / MINUTE_MS - 1 })
    .map((minute) => minute * MINUTE_MS);
const instantIn = (fromYear: number, toYear: number) =>
  fc.integer({ min: yearStartMs(fromYear), max: yearStartMs(toYear) - 1 });
const localDay = (fromYear: number, toYear: number) =>
  fc
    .integer({ min: yearStartMs(fromYear) / DAY_MS, max: yearStartMs(toYear) / DAY_MS - 1 })
    .map((day) => day * DAY_MS);

// The zone the file started in. It is restored by assigning it back: on Windows,
// deleting TZ leaves the last assigned zone in force, so a run that started without
// TZ gets its own zone back by name.
const startZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const startTz = process.env.TZ ?? startZone;

const ZONES = [
  { tz: 'UTC', localHourAtUtcMidnight: 0 },
  { tz: 'Europe/Istanbul', localHourAtUtcMidnight: 3 },
] as const;

for (const zone of ZONES) {
  describe(`Clock helpers under TZ=${zone.tz}`, () => {
    let helpers: ClockEntry;

    // Each zone gets fresh copies of the modules, so a value cached at import time
    // under one TZ cannot leak into the other run. Imported through the entry, as
    // consumers do.
    beforeAll(async () => {
      process.env.TZ = zone.tz;
      vi.resetModules();
      helpers = await import('./index.ts');
    });

    afterAll(() => {
      process.env.TZ = startTz;
    });

    it('really runs in that zone (control: local-time Date methods follow TZ)', () => {
      expect(new Date(Date.UTC(2026, 9, 5)).getHours()).toBe(zone.localHourAtUtcMidnight);
    });

    it('converts the spec examples with and without summer time', () => {
      expect(iso(helpers.istanbulInstant('2015-07-01', '12:00'))).toBe('2015-07-01T09:00:00.000Z');
      // +02:00 in December 2015: a conversion that always adds 3 hours fails here.
      expect(iso(helpers.istanbulInstant('2015-12-01', '12:00'))).toBe('2015-12-01T10:00:00.000Z');
      expect(iso(helpers.istanbulInstant('2026-10-05', '00:00'))).toBe('2026-10-04T21:00:00.000Z');
      // Turkey kept summer time until 2015-11-08, two weeks past the EU date; tz data
      // older than 2015g gives 10:00Z here, PostgreSQL 18.3 gives 09:00Z.
      expect(iso(helpers.istanbulInstant('2015-11-01', '12:00'))).toBe('2015-11-01T09:00:00.000Z');
      expect(helpers.istanbulDate(Date.UTC(2026, 9, 4, 21))).toBe('2026-10-05');
      expect(helpers.istanbulDate(Date.UTC(2026, 9, 4, 21) - 1)).toBe('2026-10-04');
      expect(helpers.istanbulDayEndInstant('2026-10-04')).toBe(Date.UTC(2026, 9, 4, 21));
    });

    it('reads a skipped time with the offset before the jump and a repeated one with the offset after', () => {
      // The instants PostgreSQL 18.3 gives for the same local times.
      // 2015-03-29: 03:00 jumped to 04:00, so 03:30 never happened; read at +02:00.
      expect(iso(helpers.istanbulInstant('2015-03-29', '03:30'))).toBe('2015-03-29T01:30:00.000Z');
      // 2015-11-08: 04:00 went back to 03:00, so 03:30 happened twice; the +02:00 one.
      expect(iso(helpers.istanbulInstant('2015-11-08', '03:30'))).toBe('2015-11-08T01:30:00.000Z');
      // 1984-11-01: +03:00 to +02:00 with both called standard time; the +02:00 one.
      expect(iso(helpers.istanbulInstant('1984-11-01', '01:30'))).toBe('1984-10-31T23:30:00.000Z');
      // 1880-01-01: local mean time (+01:55:52) became +01:56:56, skipping 00:00.
      expect(iso(helpers.istanbulInstant('1880-01-01', '00:00'))).toBe('1879-12-31T22:04:08.000Z');
      // Ground control: the first full minute after each change is unambiguous.
      expect(iso(helpers.istanbulInstant('2015-03-29', '04:00'))).toBe('2015-03-29T01:00:00.000Z');
      expect(iso(helpers.istanbulInstant('2015-11-08', '04:00'))).toBe('2015-11-08T02:00:00.000Z');
    });

    it('dates any instant like the frozen tz history', () => {
      const expectFixtureDate = (instantMs: number) => {
        const expected = fixtureDate(instantMs);
        if (dateSchema.safeParse(expected).success) {
          expect(helpers.istanbulDate(instantMs)).toBe(expected);
        } else {
          expect(() => helpers.istanbulDate(instantMs)).toThrow(RangeError);
        }
      };
      fc.assert(fc.property(instantIn(1870, 2100), expectFixtureDate), { numRuns: 2000 });
      fc.assert(fc.property(instantIn(0, 10000), expectFixtureDate), { numRuns: 500 });
    });

    it('times any instant like the frozen tz history, the seconds dropped', () => {
      const expectFixtureTime = (instantMs: number) => {
        expect(helpers.istanbulTime(instantMs)).toBe(
          timeOf(instantMs + fixtureOffsetMs(instantMs)),
        );
      };
      fc.assert(fc.property(instantIn(1870, 2100), expectFixtureTime), { numRuns: 2000 });
      // 2015-11-08 04:00 went back to 03:00: the same wall time twice, an hour apart.
      expect(helpers.istanbulTime(Date.UTC(2015, 10, 8, 0, 30))).toBe('03:30');
      expect(helpers.istanbulTime(Date.UTC(2015, 10, 8, 1, 30))).toBe('03:30');
      expect(helpers.istanbulTime(Date.UTC(2026, 9, 6, 6, 58, 59, 999))).toBe('09:58');
      for (const instantMs of [Number.NaN, 0.5, Number.POSITIVE_INFINITY]) {
        expect(() => helpers.istanbulTime(instantMs)).toThrow(RangeError);
      }
    });

    it('converts random local times like PostgreSQL over the frozen tz history', () => {
      const expectPostgresInstant = (localMs: number) => {
        const actual = helpers.istanbulInstant(dateOf(localMs), timeOf(localMs));
        expect(iso(actual)).toBe(iso(postgresInstant(localMs)));
      };
      fc.assert(fc.property(localMinute(1870, 2100), expectPostgresInstant), { numRuns: 2000 });
      fc.assert(fc.property(localMinute(0, 10000), expectPostgresInstant), { numRuns: 500 });
    });

    it('converts every local minute around every tz entry like PostgreSQL and dates each entry like the fixture', () => {
      const mismatches: string[] = [];
      let checked = 0;
      const checkMinutes = (fromLocalMs: number, toLocalMs: number) => {
        const firstMinuteMs = Math.ceil(fromLocalMs / MINUTE_MS) * MINUTE_MS;
        for (let localMs = firstMinuteMs; localMs <= toLocalMs; localMs += MINUTE_MS) {
          const actual = helpers.istanbulInstant(dateOf(localMs), timeOf(localMs));
          const expected = postgresInstant(localMs);
          if (actual !== expected) {
            mismatches.push(`${iso(localMs)} ${iso(actual)} ${iso(expected)}`);
          }
          checked += 1;
        }
      };
      for (const entry of FIXTURE) {
        // PostgreSQL uses an abbreviation-only entry as the boundary for the day after
        // it, while ICU does not see it at all, so that whole stretch is scanned.
        const marginMs = entry.afterMs === entry.beforeMs ? DAY_MS : 2 * HOUR_MS;
        checkMinutes(
          entry.atMs + Math.min(entry.beforeMs, entry.afterMs) - marginMs,
          entry.atMs + Math.max(entry.beforeMs, entry.afterMs) + marginMs,
        );
        for (const instantMs of [entry.atMs - 1, entry.atMs, entry.atMs + 1]) {
          expect(helpers.istanbulDate(instantMs)).toBe(fixtureDate(instantMs));
        }
      }
      expect(mismatches.slice(0, 5)).toEqual([]);
      // Control: the scan covered the whole history, not an empty list.
      expect(checked).toBeGreaterThan(30_000);
    });

    it('starts and ends every day exactly where the date changes', () => {
      const checkDay = (dayLocalMs: number) => {
        const date = dateOf(dayLocalMs);
        const previous = dateOf(dayLocalMs - DAY_MS);
        const next = dateOf(dayLocalMs + DAY_MS);
        const start = helpers.istanbulInstant(date, '00:00');
        const end = helpers.istanbulDayEndInstant(date);
        expect(helpers.istanbulDate(start - 1)).toBe(previous);
        expect(helpers.istanbulDate(start)).toBe(date);
        expect(helpers.istanbulDate(end - 1)).toBe(date);
        expect(helpers.istanbulDate(end)).toBe(next);
        expect(end).toBe(helpers.istanbulInstant(next, '00:00'));
      };
      fc.assert(fc.property(localDay(1870, 2100), checkDay), { numRuns: 1000 });
      fc.assert(fc.property(localDay(1, 9999), checkDay), { numRuns: 200 });
      for (const change of FIXTURE_CHANGES) {
        const changeDayMs = Math.floor((change.atMs + change.beforeMs) / DAY_MS) * DAY_MS;
        for (const dayLocalMs of [changeDayMs - DAY_MS, changeDayMs, changeDayMs + DAY_MS]) {
          checkDay(dayLocalMs);
        }
      }
    });

    it('accepts exactly the dates and times the contract schemas accept', () => {
      const edit = (text: fc.Arbitrary<string>) =>
        fc
          .tuple(text, fc.nat(), fc.constantFrom(...'0123456789-: Tx'.split('')))
          .map(([value, at, char]) => {
            const index = at % (value.length + 1);
            return value.slice(0, index) + char + value.slice(index + 1);
          });
      const validDate = localDay(0, 10000).map(dateOf);
      const validTime = fc.integer({ min: 0, max: 24 * 60 - 1 }).map((m) => timeOf(m * MINUTE_MS));
      const anyDate = fc.oneof(validDate, edit(validDate), fc.string({ maxLength: 12 }));
      const anyTime = fc.oneof(validTime, edit(validTime), fc.string({ maxLength: 6 }));
      let accepted = 0;
      let rejected = 0;
      fc.assert(
        fc.property(anyDate, anyTime, (date, time) => {
          const valid =
            dateSchema.safeParse(date).success && localTimeSchema.safeParse(time).success;
          if (valid) {
            expect(Number.isInteger(helpers.istanbulInstant(date, time))).toBe(true);
            accepted += 1;
          } else {
            expect(() => helpers.istanbulInstant(date, time)).toThrow(RangeError);
            rejected += 1;
          }
          const validDay = dateSchema.safeParse(date).success;
          if (validDay) expect(Number.isInteger(helpers.istanbulDayEndInstant(date))).toBe(true);
          else expect(() => helpers.istanbulDayEndInstant(date)).toThrow(RangeError);
        }),
        { numRuns: 2000 },
      );
      // Control: both sides of the rule were exercised.
      expect(accepted).toBeGreaterThan(100);
      expect(rejected).toBeGreaterThan(100);
      for (const [date, time] of [
        ['2026-02-29', '10:00'],
        ['2026-13-01', '10:00'],
        ['2026-10-5', '10:00'],
        ['2026-10-05', '24:00'],
        ['2026-10-05', '9:30'],
        ['2026-10-05', '09:30:00'],
      ] as const) {
        expect(() => helpers.istanbulInstant(date, time)).toThrow(RangeError);
      }
      const notText = 20261005 as unknown as string;
      expect(() => helpers.istanbulInstant(notText, '10:00')).toThrow(RangeError);
      expect(() => helpers.istanbulDayEndInstant(notText)).toThrow(RangeError);
      expect(iso(helpers.istanbulInstant('2024-02-29', '23:59'))).toBe('2024-02-29T20:59:00.000Z');
    });

    it('covers the years 0000 to 9999 and rejects instants outside them', () => {
      const first = helpers.istanbulInstant('0000-01-01', '00:00');
      const last = helpers.istanbulDayEndInstant('9999-12-31') - 1;
      expect(iso(first)).toBe(iso(postgresInstant(yearStartMs(0))));
      expect(helpers.istanbulDate(first)).toBe('0000-01-01');
      expect(helpers.istanbulDate(last)).toBe('9999-12-31');
      expect(() => helpers.istanbulDate(first - 1)).toThrow(RangeError);
      expect(() => helpers.istanbulDate(last + 1)).toThrow(RangeError);
      // Intl names year 0000 "1 BC" and writes years below 1000 without leading zeros.
      expect(helpers.istanbulDate(new Date(0).setUTCFullYear(0, 5, 15))).toBe('0000-06-15');
      expect(helpers.istanbulDate(helpers.istanbulInstant('0050-06-15', '12:00'))).toBe(
        '0050-06-15',
      );
      // Far outside, up to and past the ends of the Date range.
      for (const instantMs of [
        8.64e15,
        -8.64e15,
        Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
      ]) {
        expect(() => helpers.istanbulDate(instantMs)).toThrow(RangeError);
      }
    });

    it('rejects instants that are not whole milliseconds', () => {
      const bad = [Number.NaN, Number.POSITIVE_INFINITY, 0.5, -1.25, '0' as unknown as number];
      for (const instantMs of bad) {
        expect(() => helpers.istanbulDate(instantMs)).toThrow(RangeError);
      }
      expect(helpers.istanbulDate(0)).toBe('1970-01-01');
    });
  });
}

describe('frozen Europe/Istanbul history', () => {
  it("equals the zone data in Node's ICU to the millisecond", () => {
    const fromMs = yearStartMs(1870);
    expect(icuOffsetMs(fromMs)).toBe(FIXTURE_LOCAL_MEAN_TIME_OFFSET_MS);
    expect(icuChanges(fromMs, yearStartMs(2100))).toEqual(FIXTURE_CHANGES);
    // Outside the scan: local mean time in year 1, +03:00 in year 9999.
    expect(icuOffsetMs(yearStartMs(1))).toBe(FIXTURE_LOCAL_MEAN_TIME_OFFSET_MS);
    expect(icuOffsetMs(yearStartMs(9999))).toBe(FIXTURE_FINAL_OFFSET_MS);
    // Control: the comparison is over the whole history, not an empty list.
    expect(FIXTURE_CHANGES.length).toBeGreaterThan(100);
  });

  it('has entries more than two days apart, as the helpers and PostgreSQL assume', () => {
    let previousAtMs = Number.NEGATIVE_INFINITY;
    let shortestGapMs = Number.POSITIVE_INFINITY;
    for (const entry of FIXTURE) {
      shortestGapMs = Math.min(shortestGapMs, entry.atMs - previousAtMs);
      previousAtMs = entry.atMs;
    }
    expect(shortestGapMs).toBeGreaterThan(2 * DAY_MS);
  });
});

describe('clock entry (index.ts)', () => {
  it('exposes exactly the Istanbul helpers and the system clock of the source modules', async () => {
    vi.resetModules();
    const entry = await import('./index.ts');
    const istanbul = await import('./istanbul.ts');
    const system = await import('./system-clock.ts');
    expect(Object.keys(entry).sort()).toEqual([
      'DAY_MS',
      'ISTANBUL_TIME_ZONE',
      'MINUTE_MS',
      'istanbulDate',
      'istanbulDayEndInstant',
      'istanbulInstant',
      'istanbulTime',
      'systemClock',
      'wallClockOffsetMs',
    ]);
    expect([entry.ISTANBUL_TIME_ZONE, entry.MINUTE_MS, entry.DAY_MS]).toEqual([
      'Europe/Istanbul',
      60_000,
      86_400_000,
    ]);
    expect(entry.istanbulDate).toBe(istanbul.istanbulDate);
    expect(entry.istanbulInstant).toBe(istanbul.istanbulInstant);
    expect(entry.istanbulDayEndInstant).toBe(istanbul.istanbulDayEndInstant);
    expect(entry.istanbulTime).toBe(istanbul.istanbulTime);
    expect(entry.systemClock).toBe(system.systemClock);
    expect(entry.wallClockOffsetMs).toBe(system.wallClockOffsetMs);
  });
});

describe('process time zone', () => {
  it('is the zone the file started in once the zone runs are over', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(startZone);
  });
});
