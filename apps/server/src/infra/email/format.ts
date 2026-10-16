// The time phrase of an e-mail (D14, Saat bicimi): an instant written as Istanbul time,
// in Turkish with its locative suffix ("6 Ekim 2026 Salı, 09:58'de") or in English
// ("Tuesday, 6 October 2026 at 09:58"). The wall clock comes from the clock helpers (the
// one Istanbul conversion); the day and month names come from the tables here, never
// from Intl or the locale. Display only: no rule reads it.

import { isTime } from '@iu-attendance/core/courses/calendar';
import type { Language } from '@iu-attendance/core/shared/language';
import { istanbulDate, istanbulTime } from '../clock/index.ts';

const MONTHS: Record<Language, readonly string[]> = {
  tr: [
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
  ],
  en: [
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
  ],
};
// Sunday first, as getUTCDay counts.
const WEEKDAYS: Record<Language, readonly string[]> = {
  tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

// A time read aloud ends in the minute's last word, or the hour's on the hour: 09:58
// "dokuz elli sekiz", 13:00 "on üç". The suffix follows that word's last vowel (e or a)
// and its last sound (t after a hard consonant, otherwise d).
// sıfır, bir, iki, üç, dört, beş, altı, yedi, sekiz, dokuz
const UNIT_SUFFIXES = ["'da", "'de", "'de", "'te", "'te", "'te", "'da", "'de", "'de", "'da"];
// on, yirmi, otuz, kırk, elli (index = tens)
const TEN_SUFFIXES = ['', "'da", "'de", "'da", "'ta", "'de"];

/** The locative suffix of an HH:MM time: 09:58'de, 09:40'ta. Throws RangeError for any other text. */
export function timeSuffix(time: string): string {
  if (!isTime(time)) throw new RangeError(`Expected an HH:MM time, got ${JSON.stringify(time)}`);
  const minute = Number(time.slice(3));
  const spoken = minute === 0 ? Number(time.slice(0, 2)) : minute;
  return spoken % 10 !== 0 || spoken === 0
    ? (UNIT_SUFFIXES[spoken % 10] as string)
    : (TEN_SUFFIXES[spoken / 10] as string);
}

/**
 * An instant as Istanbul time in the e-mail's language. Throws RangeError for an instant
 * that is not whole milliseconds or falls outside the years 0000 to 9999 (istanbulDate).
 */
export function formatIstanbulTime(instantMs: number, language: Language): string {
  const date = istanbulDate(instantMs);
  const time = istanbulTime(instantMs);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  // setUTCFullYear keeps years 0 to 99 as written.
  const weekday = new Date(new Date(0).setUTCFullYear(year, month - 1, day)).getUTCDay();
  const monthName = MONTHS[language][month - 1];
  const weekdayName = WEEKDAYS[language][weekday];
  return language === 'tr'
    ? `${day} ${monthName} ${year} ${weekdayName}, ${time}${timeSuffix(time)}`
    : `${weekdayName}, ${day} ${monthName} ${year} at ${time}`;
}
