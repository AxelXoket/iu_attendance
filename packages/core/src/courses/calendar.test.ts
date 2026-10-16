import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addDays,
  type ExamWeek,
  type Holiday,
  isDate,
  isInLastWeek,
  isTermBreak,
  isTime,
  lastWeekStart,
  lockDay,
  sessionAllowed,
  type UnitTermState,
} from './calendar.ts';

// Temporal (Node 26) is the oracle for day arithmetic; the code under test uses UTC dates.
type PlainDate = { add(d: { days: number }): PlainDate; toString(): string };
const { Temporal } = globalThis as unknown as {
  Temporal: { PlainDate: { from(text: string, options?: { overflow: 'reject' }): PlainDate } };
};
const oracleAdd = (date: string, days: number) =>
  Temporal.PlainDate.from(date).add({ days }).toString();
const oracleIsDate = (text: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || text < '0001-01-01') return false;
  try {
    return Temporal.PlainDate.from(text, { overflow: 'reject' }).toString() === text;
  } catch {
    return false;
  }
};

const pad = (value: number, width: number) => String(value).padStart(width, '0');
const dateArb = fc
  .date({
    min: new Date('1950-01-01T00:00:00Z'),
    max: new Date('2150-12-31T00:00:00Z'),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10));
const timeArb = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${pad(h, 2)}:${pad(m, 2)}`);

describe('days', () => {
  it('adds days like Temporal across month, year and leap-year ends', () => {
    fc.assert(
      fc.property(dateArb, fc.integer({ min: -800, max: 800 }), (date, days) => {
        expect(addDays(date, days)).toBe(oracleAdd(date, days));
      }),
      { numRuns: 1000 },
    );
  });

  it('reads only real calendar days from 0001 to 9999', () => {
    const textArb = fc
      .tuple(
        fc.integer({ min: 0, max: 10001 }),
        fc.integer({ min: 0, max: 13 }),
        fc.integer({ min: 0, max: 32 }),
      )
      .map(([y, m, d]) => `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`);
    let real = 0;
    fc.assert(
      fc.property(fc.oneof(textArb, dateArb), (text) => {
        const expected = oracleIsDate(text);
        if (expected) real += 1;
        expect(isDate(text)).toBe(expected);
      }),
      { numRuns: 2000 },
    );
    expect(real).toBeGreaterThan(500);
  });

  it.each([
    ['2024-02-29', true],
    ['2025-02-29', false],
    ['1900-02-29', false],
    ['2000-02-29', true],
    ['2026-04-31', false],
    ['0001-01-01', true],
    ['9999-12-31', true],
    ['0000-12-31', false],
    ['2026-1-01', false],
    ['2026-01-01T00:00', false],
    [' 2026-01-01', false],
    ['２０２６-01-01', false],
  ])('isDate(%j) is %s', (text, expected) => {
    expect(isDate(text)).toBe(expected);
  });

  it('refuses a value that is not text, a day it cannot move and a fractional count', () => {
    expect(isDate(20260101)).toBe(false);
    expect(() => addDays('9999-12-31', 1)).toThrow(RangeError);
    expect(() => addDays('0001-01-01', -1)).toThrow(RangeError);
    expect(() => addDays('2026-01-01', 1.5)).toThrow(RangeError);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
  });

  it.each([
    ['00:00', true],
    ['23:59', true],
    ['24:00', false],
    ['9:00', false],
    ['09:60', false],
    ['09:00:00', false],
    ['09:30\n', false],
    [' 09:30', false],
  ])('isTime(%j) is %s', (text, expected) => {
    expect(isTime(text)).toBe(expected);
  });
});

describe('last week and lock day', () => {
  it('counts the last week as the last day and the 6 days before it, and locks the day after', () => {
    fc.assert(
      fc.property(dateArb, dateArb, (lastDay, date) => {
        const start = lastWeekStart(lastDay);
        expect(start).toBe(oracleAdd(lastDay, -6));
        expect(lockDay(lastDay)).toBe(oracleAdd(lastDay, 1));
        // Exactly 7 days, the last day included.
        const week = Array.from({ length: 7 }, (_, i) => oracleAdd(start, i));
        expect(week.at(-1)).toBe(lastDay);
        expect(isInLastWeek(date, lastDay)).toBe(week.includes(date));
        for (const day of week) expect(isInLastWeek(day, lastDay)).toBe(true);
        expect(isInLastWeek(oracleAdd(start, -1), lastDay)).toBe(false);
        expect(isInLastWeek(lockDay(lastDay), lastDay)).toBe(false);
      }),
      { numRuns: 500 },
    );
  });

  it.each([
    ['2026-03-03', '2026-02-25', '2026-03-04'],
    ['2026-12-31', '2026-12-25', '2027-01-01'],
    ['2027-01-02', '2026-12-27', '2027-01-03'],
    ['2028-03-05', '2028-02-28', '2028-03-06'],
    ['2028-02-28', '2028-02-22', '2028-02-29'],
  ])('last day %s: week from %s, lock day %s', (lastDay, start, lock) => {
    expect(lastWeekStart(lastDay)).toBe(start);
    expect(lockDay(lastDay)).toBe(lock);
  });
});

describe('term break', () => {
  const today = '2026-10-11';
  const now = Date.UTC(2026, 9, 11, 9, 0);
  const termArb: fc.Arbitrary<UnitTermState> = fc.record({
    classesStart: fc.constantFrom('2026-09-21', '2026-10-11', '2026-10-12', '2027-02-15'),
    lockAtMs: fc.constantFrom(now - 1, now, now + 1, now + 86400000),
    hasActiveCourse: fc.boolean(),
    reviewTerm: fc.boolean(),
    unitPassive: fc.boolean(),
  });
  // A term in progress: classes began, not locked, an active course, not the review term.
  const running = (t: UnitTermState) =>
    !t.reviewTerm && t.hasActiveCourse && t.classesStart <= today && now < t.lockAtMs;

  it('is a break exactly when no unit term is in progress, whatever units are passive', () => {
    let breaks = 0;
    fc.assert(
      fc.property(
        fc.array(termArb, { maxLength: 6 }),
        fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }),
        (terms, flips) => {
          const expected = !terms.some(running);
          if (expected) breaks += 1;
          expect(isTermBreak(terms, today, now)).toBe(expected);
          // Making a unit passive (or active) changes nothing.
          const flipped = terms.map((t, i) =>
            flips[i] ? { ...t, unitPassive: !t.unitPassive } : t,
          );
          expect(isTermBreak(flipped, today, now)).toBe(expected);
        },
      ),
      { numRuns: 500 },
    );
    expect(breaks).toBeGreaterThan(100);
    expect(breaks).toBeLessThan(450);
  });

  it('counts a passive unit with a running course as in term', () => {
    const passive: UnitTermState = {
      classesStart: '2026-09-21',
      lockAtMs: now + 1,
      hasActiveCourse: true,
      reviewTerm: false,
      unitPassive: true,
    };
    expect(isTermBreak([passive], today, now)).toBe(false);
    // Ground control: locked at this instant, it no longer holds the term open.
    expect(isTermBreak([{ ...passive, lockAtMs: now }], today, now)).toBe(true);
    expect(isTermBreak([], today, now)).toBe(true);
    expect(() => isTermBreak([], '2026-13-01', now)).toThrow(RangeError);
  });
});

describe('holidays and exam weeks', () => {
  const holidayArb: fc.Arbitrary<Holiday> = fc
    .record({
      start: fc.integer({ min: 0, max: 20 }),
      length: fc.integer({ min: 0, max: 4 }),
      halfDayStart: fc.option(fc.constantFrom('12:00', '13:00', '13:30'), { nil: null }),
    })
    .map(({ start, length, halfDayStart }) => ({
      start: oracleAdd('2026-10-01', start),
      end: oracleAdd('2026-10-01', start + length),
      halfDayStart,
    }));
  const examArb: fc.Arbitrary<ExamWeek> = fc
    .record({
      start: fc.integer({ min: 0, max: 20 }),
      length: fc.integer({ min: 0, max: 6 }),
      classesHeld: fc.boolean(),
    })
    .map(({ start, length, classesHeld }) => ({
      start: oracleAdd('2026-10-01', start),
      end: oracleAdd('2026-10-01', start + length),
      classesHeld,
    }));

  it('plans a session only off holidays and off exam weeks without classes', () => {
    let blocked = 0;
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        // The half-day edges, and any time of day.
        fc.oneof(fc.constantFrom('12:00', '12:59', '13:00', '13:29', '13:30'), timeArb),
        fc.array(holidayArb, { maxLength: 3 }),
        fc.array(examArb, { maxLength: 2 }),
        (offset, time, holidays, exams) => {
          const date = oracleAdd('2026-10-01', offset);
          // The definition, day by day.
          const inHoliday = holidays.some((h) => {
            const days = [];
            for (let d = h.start; d <= h.end; d = oracleAdd(d, 1)) days.push(d);
            if (!days.includes(date)) return false;
            return !(date === h.start && h.halfDayStart !== null && time < h.halfDayStart);
          });
          const inExam = exams.some((e) => !e.classesHeld && e.start <= date && date <= e.end);
          const expected = !inHoliday && !inExam;
          if (!expected) blocked += 1;
          expect(sessionAllowed(date, time, holidays, exams)).toBe(expected);
        },
      ),
      { numRuns: 1000 },
    );
    expect(blocked).toBeGreaterThan(100);
  });

  it('keeps a session that starts before a half-day holiday, on its first day only', () => {
    const halfDay: Holiday = { start: '2026-10-28', end: '2026-10-29', halfDayStart: '13:00' };
    expect(sessionAllowed('2026-10-28', '12:59', [halfDay], [])).toBe(true);
    expect(sessionAllowed('2026-10-28', '13:00', [halfDay], [])).toBe(false);
    expect(sessionAllowed('2026-10-29', '08:00', [halfDay], [])).toBe(false);
    expect(sessionAllowed('2026-10-30', '08:00', [halfDay], [])).toBe(true);
    expect(sessionAllowed('2026-10-27', '15:00', [halfDay], [])).toBe(true);
  });

  it('plans no session in an exam week unless the unit holds classes in it', () => {
    const exam: ExamWeek = { start: '2026-11-16', end: '2026-11-20', classesHeld: false };
    expect(sessionAllowed('2026-11-16', '09:00', [], [exam])).toBe(false);
    expect(sessionAllowed('2026-11-20', '09:00', [], [exam])).toBe(false);
    expect(sessionAllowed('2026-11-21', '09:00', [], [exam])).toBe(true);
    expect(sessionAllowed('2026-11-18', '09:00', [], [{ ...exam, classesHeld: true }])).toBe(true);
  });

  it('refuses a day or a time it cannot read', () => {
    expect(() => sessionAllowed('2026-02-30', '09:00', [], [])).toThrow(RangeError);
    expect(() => sessionAllowed('2026-02-03', '9:00', [], [])).toThrow(RangeError);
  });

  it('refuses holiday and exam week bounds it cannot read, such as a database time with seconds', () => {
    // '13:00' < '13:00:00' as text would let a 13:00 session through a 13:00 half-day holiday.
    const seconds: Holiday = { start: '2026-10-28', end: '2026-10-28', halfDayStart: '13:00:00' };
    expect(() => sessionAllowed('2026-10-28', '13:00', [seconds], [])).toThrow(RangeError);
    const badDay: Holiday = { start: '2026-10-28', end: '28.10.2026', halfDayStart: null };
    expect(() => sessionAllowed('2026-10-01', '09:00', [badDay], [])).toThrow(RangeError);
    const badExam: ExamWeek = { start: '2026-11-16', end: '2026-11-31', classesHeld: false };
    expect(() => sessionAllowed('2026-10-01', '09:00', [], [badExam])).toThrow(RangeError);
    // Ground control: the same holiday written HH:MM cancels the 13:00 session.
    expect(sessionAllowed('2026-10-28', '13:00', [{ ...seconds, halfDayStart: '13:00' }], [])).toBe(
      false,
    );
  });
});
