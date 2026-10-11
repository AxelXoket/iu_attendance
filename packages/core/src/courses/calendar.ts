// Calendar rules of the courses module (D02): the last week, the lock day, the term break,
// holidays and exam weeks. Pure and import-free; days are Istanbul calendar days written
// YYYY-MM-DD, times are Istanbul HH:MM, and both compare as text because they are fixed
// width. Day arithmetic uses UTC dates only, so it is the same in every time zone and under
// Hermes (no Intl, no local-time Date methods).

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 86400000;

/** True for a real calendar day YYYY-MM-DD from 0001-01-01 to 9999-12-31. */
export function isDate(text: unknown): text is string {
  if (typeof text !== 'string') return false;
  const match = DATE.exec(text);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Year 0 is a valid JavaScript year. A month or a day out of range rolls the date into
  // another month (a two-digit day moves it at most three months), so the month check
  // alone catches both.
  if (year < 1) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCMonth() === month - 1;
}

/** True for a time of day HH:MM from 00:00 to 23:59. */
export function isTime(text: unknown): text is string {
  return typeof text === 'string' && TIME.test(text);
}

function checkDate(text: string, name: string): void {
  if (!isDate(text)) throw new RangeError(`${name} must be a calendar day YYYY-MM-DD`);
}

const pad = (value: number, width: number) => String(value).padStart(width, '0');

/** The day `days` after (or, negative, before) a day; month and year ends roll over. */
export function addDays(date: string, days: number): string {
  checkDate(date, 'date');
  if (!Number.isSafeInteger(days)) throw new RangeError('days must be a whole number');
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const moved = new Date(0);
  moved.setUTCFullYear(year, month - 1, day);
  moved.setTime(moved.getTime() + days * DAY_MS);
  const result = `${pad(moved.getUTCFullYear(), 4)}-${pad(moved.getUTCMonth() + 1, 2)}-${pad(moved.getUTCDate(), 2)}`;
  if (!isDate(result)) throw new RangeError('addDays leaves the years 0001 to 9999');
  return result;
}

/** The first day of the last week: the last day and the 6 days before it (D02 resolved gap 23). */
export function lastWeekStart(lastDay: string): string {
  return addDays(lastDay, -6);
}

/** True when a day falls in the last week ending on lastDay. */
export function isInLastWeek(date: string, lastDay: string): boolean {
  checkDate(date, 'date');
  return lastWeekStart(lastDay) <= date && date <= lastDay;
}

/**
 * The lock day: the day after the last day. The term locks at 00:00 Istanbul time on it
 * (D02 resolved gap 14); the server turns that into an instant with its clock helpers.
 */
export function lockDay(lastDay: string): string {
  return addDays(lastDay, 1);
}

/** A unit's term as the term-break rule reads it. */
export type UnitTermState = {
  /** ders_baslangic: the first day of classes. */
  readonly classesStart: string;
  /** kilit_ani as milliseconds. */
  readonly lockAtMs: number;
  /** The unit has at least one active course that is not the trial course. */
  readonly hasActiveCourse: boolean;
  /** The review term of the review accounts; it never counts. */
  readonly reviewTerm: boolean;
  /** A passive unit still counts: its running courses are in term (D02 resolved gap 26). */
  readonly unitPassive: boolean;
};

/**
 * The term break: true when no unit term has classes that started on or before `today`, is
 * not locked yet at nowMs, and has an active course that is not the trial course. The review
 * term never counts; a passive unit counts like any other.
 */
export function isTermBreak(
  terms: readonly UnitTermState[],
  today: string,
  nowMs: number,
): boolean {
  checkDate(today, 'today');
  return !terms.some(
    (term) =>
      !term.reviewTerm &&
      term.hasActiveCourse &&
      term.classesStart <= today &&
      nowMs < term.lockAtMs,
  );
}

/** A holiday: first and last day (both included) and an optional half-day start time. */
export type Holiday = {
  readonly start: string;
  readonly end: string;
  /** yarim_gun_baslangic: on the first day the holiday starts at this time; null for the whole day. */
  readonly halfDayStart: string | null;
};

/** An exam week: first and last day (both included); classes go on only when classesHeld. */
export type ExamWeek = {
  readonly start: string;
  readonly end: string;
  readonly classesHeld: boolean;
};

/**
 * True when a session on `date` starting at `startTime` may be planned: no holiday covers it
 * (a session that starts before a half-day holiday's start time on its first day stays) and no
 * exam week without classes covers the day (D02 resolved gaps 5 and 46, invariant 5).
 */
export function sessionAllowed(
  date: string,
  startTime: string,
  holidays: readonly Holiday[],
  examWeeks: readonly ExamWeek[],
): boolean {
  checkDate(date, 'date');
  if (!isTime(startTime)) throw new RangeError('startTime must be HH:MM');
  // The bounds are checked too: a database time such as '13:00:00' would compare wrong as text.
  for (const h of holidays) {
    checkDate(h.start, 'a holiday start');
    checkDate(h.end, 'a holiday end');
    if (h.halfDayStart !== null && !isTime(h.halfDayStart)) {
      throw new RangeError('a half-day start must be HH:MM');
    }
  }
  for (const e of examWeeks) {
    checkDate(e.start, 'an exam week start');
    checkDate(e.end, 'an exam week end');
  }
  const holiday = holidays.some(
    (h) =>
      h.start <= date &&
      date <= h.end &&
      !(date === h.start && h.halfDayStart !== null && startTime < h.halfDayStart),
  );
  const exam = examWeeks.some((e) => !e.classesHeld && e.start <= date && date <= e.end);
  return !holiday && !exam;
}
