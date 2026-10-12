import { z } from 'zod';

// The same name and type as in courses: field expectedVersion, an integer from 0 to
// 2147483647. A mismatch in online editing answers 409 <MODULE>_VERSION_CHANGED.
export const expectedVersionSchema = z.number().int().min(0).max(2_147_483_647);

export const CURSOR_MAX_LENGTH = 200;
export const PAGE_LIMIT_MAX = 500;
export const PAGE_LIMIT_DEFAULT = 100;

// A growing list answer: { items, nextCursor } with a key-set cursor or null.
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}

// A page query: cursor is opaque base64url of at most 200 characters; limit is 1 to
// 500, 100 by default. Query values arrive as text, so limit is coerced.
export const pageQuerySchema = z.object({
  cursor: z
    .string()
    .max(CURSOR_MAX_LENGTH)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_LIMIT_MAX).default(PAGE_LIMIT_DEFAULT),
});

// The default row limit of a full list and the server's hard cap (D13-B13).
export const FULL_LIST_DEFAULT_MAX = 2000;
export const FULL_LIST_MAX_META = 'x-full-list-max';

// The one helper for class-sized full lists: at most 2000 rows by default, a smaller
// whole number if given, never more. Route registration counts the rows of every list
// carrying this schema in an answer, together, before serialising it and answers 422
// API_RESULT_TOO_LARGE above the limit. An answer grouped by session marks the row
// lists inside the groups, not the groups.
export function fullListSchema<T extends z.ZodType>(item: T, max: number = FULL_LIST_DEFAULT_MAX) {
  if (!Number.isInteger(max) || max < 1 || max > FULL_LIST_DEFAULT_MAX) {
    throw new Error(
      `fullListSchema max must be a whole number from 1 to ${FULL_LIST_DEFAULT_MAX}, got ${String(max)}`,
    );
  }
  return z
    .array(item)
    .max(max)
    .meta({ [FULL_LIST_MAX_META]: max });
}
