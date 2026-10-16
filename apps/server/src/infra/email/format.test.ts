import { localTimeSchema } from '@iu-attendance/contracts/shared/time';
import { isTime } from '@iu-attendance/core/courses/calendar';
import fc from 'fast-check';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { formatIstanbulTime, timeSuffix } from './format.ts';

// Independent derivation of the suffix: the Turkish words of 0 to 59, the reading rule
// (the minute's last word, the hour's on the hour), then vowel harmony on the word's last
// vowel and the hard consonants of "fıstıkçı şahap".
const UNITS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli'];
const lastWord = (n: number) => (n % 10 !== 0 || n === 0 ? UNITS[n % 10] : TENS[n / 10]) as string;
function derivedSuffix(hour: number, minute: number): string {
  const word = lastWord(minute === 0 ? hour : minute);
  const lastVowel = [...word].reverse().find((letter) => 'aeıioöuü'.includes(letter)) as string;
  const vowel = 'eiöü'.includes(lastVowel) ? 'e' : 'a';
  const consonant = 'fstkçşhp'.includes(word.at(-1) as string) ? 't' : 'd';
  return `'${consonant}${vowel}`;
}
const pad = (n: number) => String(n).padStart(2, '0');

describe('timeSuffix (D14 saat eki)', () => {
  it("gives the spec's examples", () => {
    expect(['09:58', '09:40', '09:03', '09:30', '00:00', '13:00'].map(timeSuffix)).toEqual([
      "'de",
      "'ta",
      "'te",
      "'da",
      "'da",
      "'te",
    ]);
  });

  it('agrees with the reading rule at all 1,440 minutes', () => {
    const seen = new Set<string>();
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 1) {
        const suffix = timeSuffix(`${pad(hour)}:${pad(minute)}`);
        expect(suffix, `${pad(hour)}:${pad(minute)}`).toBe(derivedSuffix(hour, minute));
        seen.add(suffix);
      }
    }
    // Ground control: all four suffixes occur.
    expect([...seen].sort()).toEqual(["'da", "'de", "'ta", "'te"]);
  });

  it('refuses text that is not an HH:MM time', () => {
    for (const time of ['24:00', '9:58', '09:60', '09:58:00', '', 'ab:cd']) {
      expect(() => timeSuffix(time), time).toThrow(RangeError);
    }
  });

  // The suffix checks its time with core's isTime, the clock helpers read lesson times with
  // the contracts' schema; the two HH:MM rules accept the same text.
  it('takes exactly the times the lesson time schema takes', () => {
    const candidates = fc.oneof(
      fc.stringMatching(/^[0-9]{2}:[0-9]{2}$/),
      fc.string({ maxLength: 7 }),
      fc.constantFrom(
        '00:00',
        '23:59',
        '24:00',
        '9:30',
        '09:30 ',
        ' 09:30',
        '09:30\n',
        '０９:３０',
      ),
    );
    let accepted = 0;
    fc.assert(
      fc.property(candidates, (candidate) => {
        const schemaAccepts = localTimeSchema.safeParse(candidate).success;
        expect(isTime(candidate), JSON.stringify(candidate)).toBe(schemaAccepts);
        if (schemaAccepts) {
          accepted += 1;
          expect(() => timeSuffix(candidate)).not.toThrow();
        } else {
          expect(() => timeSuffix(candidate)).toThrow(RangeError);
        }
      }),
      { numRuns: 1000, seed: 1 },
    );
    // Ground control: valid times were among the candidates too.
    expect(accepted).toBeGreaterThan(100);
  });
});

// Independent derivation of the phrase for 2026 and 2027: day names counted from
// 2026-01-01, a Thursday; Istanbul at +03:00 all year (since 2016-09-07).
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];
const DAYS_EN = ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
const DAYS_TR = ['Perşembe', 'Cuma', 'Cumartesi', 'Pazar', 'Pazartesi', 'Salı', 'Çarşamba'];
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DAYS = [2026, 2027].flatMap((year) =>
  MONTH_LENGTHS.flatMap((length, month) =>
    Array.from({ length }, (_, index) => ({ year, month, day: index + 1 })),
  ),
);
const SAMPLE = Date.parse('2026-10-06T06:58:00.000Z');

describe('formatIstanbulTime (D14 Saat bicimi)', () => {
  it('writes the ground example in both languages', () => {
    expect(formatIstanbulTime(SAMPLE, 'en')).toBe('Tuesday, 6 October 2026 at 09:58');
    expect(formatIstanbulTime(SAMPLE, 'tr')).toBe("6 Ekim 2026 Salı, 09:58'de");
  });

  it('agrees with the independent derivation on every day of 2026 and 2027', () => {
    expect(DAYS.length).toBe(730);
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: DAYS.length - 1 }),
        fc.integer({ min: 0, max: 1439 }),
        (index, minuteOfDay) => {
          const { year, month, day } = DAYS[index] as (typeof DAYS)[number];
          const hour = Math.floor(minuteOfDay / 60);
          const minute = minuteOfDay % 60;
          const instantMs = Date.UTC(year, month, day, hour - 3, minute, 59, 999);
          const time = `${pad(hour)}:${pad(minute)}`;
          expect(formatIstanbulTime(instantMs, 'en')).toBe(
            `${DAYS_EN[index % 7]}, ${day} ${MONTHS_EN[month]} ${year} at ${time}`,
          );
          expect(formatIstanbulTime(instantMs, 'tr')).toBe(
            `${day} ${MONTHS_TR[month]} ${year} ${DAYS_TR[index % 7]}, ${time}${derivedSuffix(hour, minute)}`,
          );
        },
      ),
      { numRuns: 5_000 },
    );
    // Every day once, at midnight Istanbul (21:00 UTC the day before).
    DAYS.forEach(({ year, month, day }, index) => {
      expect(formatIstanbulTime(Date.UTC(year, month, day, -3), 'en')).toBe(
        `${DAYS_EN[index % 7]}, ${day} ${MONTHS_EN[month]} ${year} at 00:00`,
      );
    });
  });

  it('gives the same text with Intl and the locale methods out of reach', () => {
    const intl = globalThis.Intl;
    const before = [formatIstanbulTime(SAMPLE, 'en'), formatIstanbulTime(SAMPLE, 'tr')];
    // Date's locale methods still answer with Intl deleted, so they must fail on their own.
    const localeMethods = ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'] as const;
    const spies = localeMethods.map((name) =>
      vi.spyOn(Date.prototype, name).mockImplementation(() => {
        throw new Error(`Date.prototype.${name} read the locale`);
      }),
    );
    try {
      Reflect.deleteProperty(globalThis, 'Intl');
      expect(typeof globalThis.Intl).toBe('undefined');
      expect(() => new Date(SAMPLE).toLocaleDateString('tr-TR')).toThrow('read the locale');
      expect([formatIstanbulTime(SAMPLE, 'en'), formatIstanbulTime(SAMPLE, 'tr')]).toEqual(before);
    } finally {
      globalThis.Intl = intl;
      for (const spy of spies) spy.mockRestore();
    }
  });

  describe('under each process time zone', () => {
    const startTz = process.env.TZ;
    afterAll(() => {
      process.env.TZ = startTz;
    });
    for (const tz of ['UTC', 'Europe/Istanbul']) {
      it(`gives the same text under TZ=${tz}`, async () => {
        process.env.TZ = tz;
        vi.resetModules();
        const fresh = await import('./format.ts');
        // Control: the zone really applies to local-time Date methods.
        expect(new Date(Date.UTC(2026, 9, 5)).getHours()).toBe(tz === 'UTC' ? 0 : 3);
        expect(fresh.formatIstanbulTime(SAMPLE, 'en')).toBe('Tuesday, 6 October 2026 at 09:58');
        expect(fresh.formatIstanbulTime(Date.UTC(2026, 9, 5, 21), 'tr')).toBe(
          "6 Ekim 2026 Salı, 00:00'da",
        );
      });
    }
  });

  it('refuses an instant that is not whole milliseconds', () => {
    expect(() => formatIstanbulTime(SAMPLE + 0.5, 'en')).toThrow(RangeError);
    expect(() => formatIstanbulTime(Number.NaN, 'tr')).toThrow(RangeError);
  });
});
