import { z } from 'zod';

// Every text helper carries its longest valid length as maxLength, so the OpenAPI
// document bounds every request text (D13-B24).

// An instant: UTC ISO 8601 with milliseconds and Z (2026-03-02T07:00:00.000Z).
export const INSTANT_LENGTH = 24;
export const instantSchema = z.iso.datetime({ precision: 3 }).max(INSTANT_LENGTH);

// A calendar day YYYY-MM-DD (an Istanbul day); report ranges use this form.
export const DATE_LENGTH = 10;
export const dateSchema = z.iso.date().max(DATE_LENGTH);

// A lesson time HH:MM in Istanbul local time.
export const localTimeSchema = z
  .string()
  .max(5)
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

// A duration in whole milliseconds; field names end with Ms. .int() bounds it to the
// safe integers, so the document carries minimum 0 and maximum 2^53 - 1.
export const durationMsSchema = z.number().int().nonnegative();

// A share per mille (695 = 69.5 percent); field names end with PerMille.
export const perMilleSchema = z.number().int().min(0).max(1000);

const INT64_MAX = '9223372036854775807';

// An integer that may exceed 2^53, as canonical decimal text (for example a
// database generation number): no sign, no leading zeros, at most 2^63 - 1.
// Compared as text (length, then code units) so no BigInt is needed.
export const bigIntegerSchema = z
  .string()
  .max(INT64_MAX.length)
  .regex(/^(?:0|[1-9]\d{0,18})$/)
  .refine((value) => value.length < INT64_MAX.length || value <= INT64_MAX, {
    message: 'Must not exceed 9223372036854775807',
  });
