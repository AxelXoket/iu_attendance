import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ok } from '../../tests/helpers.ts';
import { EXTENSIBLE_ENUM_MAX_LENGTH, extensibleEnum } from '../enum.ts';
import {
  API_ERROR_CODES,
  ERROR_FIELD_LOCATIONS,
  ERROR_FIELDS_MAX,
  errorEnvelopeSchema,
  errorEnvelopeSchemaFor,
  TRANSIENT_SQLSTATES,
  transientKind,
} from '../error.ts';
import { clientIdSchema, idSchema, studentNumberSchema } from '../identity.ts';
import { itemResultsSchema } from '../item-result.ts';
import {
  CURSOR_MAX_LENGTH,
  expectedVersionSchema,
  FULL_LIST_DEFAULT_MAX,
  FULL_LIST_MAX_META,
  fullListSchema,
  PAGE_LIMIT_MAX,
  pageQuerySchema,
  pageSchema,
} from '../page.ts';
import { RATE_CLASSES } from '../rate.ts';
import {
  bigIntegerSchema,
  dateSchema,
  durationMsSchema,
  instantSchema,
  localTimeSchema,
  perMilleSchema,
} from '../time.ts';

type JsonNode = { readonly [key: string]: unknown };

// The JSON Schema node at a path of property names, or undefined.
const child = (node: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((current, key) => (current as JsonNode | undefined)?.[key], node);

// Every key name anywhere in a JSON value.
const keysDeep = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(keysDeep);
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...keysDeep(inner)]);
  }
  return [];
};

const inputJson = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'input' }) as JsonNode;

const UUID_V7 = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e';
const UUID_V4 = '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e';

describe('Item result schema accepts only the add-on fields', () => {
  const withCounted = itemResultsSchema(['ACCEPT', 'REJECT'], { counted: z.boolean() });
  const item = { id: 'a', result: 'ACCEPT', code: null };

  it('accepts an item whose counted is true', () => {
    expect(ok(withCounted, { results: [{ ...item, counted: true }] })).toBe(true);
  });

  it("rejects an item whose counted is 'yes'", () => {
    expect(ok(withCounted, { results: [{ ...item, counted: 'yes' }] })).toBe(false);
  });

  it('keeps an unknown extra field out of the output without rejecting it', () => {
    const parsed = withCounted.parse({ results: [{ ...item, counted: false, notes: 'x' }] });
    expect(parsed.results[0]).toEqual({ ...item, counted: false });
  });

  it('keeps the { id, result, code } shape without extras', () => {
    const plain = itemResultsSchema(['ACCEPT']);
    expect(plain.parse({ results: [item] })).toEqual({ results: [item] });
    expect(ok(plain, { results: [{ id: 'a', result: 'ACCEPT' }] })).toBe(false);
    expect(ok(plain, { results: [{ result: 'ACCEPT', code: null }] })).toBe(false);
  });

  it('accepts a result value the client does not know yet', () => {
    expect(ok(withCounted, { results: [{ ...item, result: 'LATER_VALUE', counted: true }] })).toBe(
      true,
    );
  });

  it('documents result as an extensible enum of the given values, never as enum', () => {
    const json = z.toJSONSchema(itemResultsSchema(['ACCEPT', 'REJECT']), { io: 'output' });
    const result = child(json, 'properties', 'results', 'items', 'properties', 'result');
    expect(child(result, 'x-extensible-enum')).toEqual(['ACCEPT', 'REJECT']);
    expect(keysDeep(json)).not.toContain('enum');
  });

  it('rejects any other add-on name at compile time and when the schema is built', () => {
    // counted is allowed, so only the restriction on other names can reject this.
    const extras = { counted: z.boolean(), notes: z.string() };
    // @ts-expect-error notes is not one of correction, newDecision, counted
    expect(() => itemResultsSchema(['ACCEPT'], extras)).toThrow('got notes');
    // Ground control: the allowed names compile and build, and each checks its value.
    const all = itemResultsSchema(['ACCEPT'], {
      counted: z.boolean(),
      correction: z.string(),
      newDecision: z.string(),
    });
    const row = { ...item, counted: true, correction: 'c', newDecision: 'd' };
    expect(all.parse({ results: [row] })).toEqual({ results: [row] });
    expect(ok(all, { results: [{ ...row, correction: 5 }] })).toBe(false);
    expect(ok(all, { results: [{ ...row, newDecision: 5 }] })).toBe(false);
  });
});

describe('shared schemas', () => {
  it('takes instants only in UTC with milliseconds and Z', () => {
    expect(ok(instantSchema, '2026-03-02T07:00:00.000Z')).toBe(true);
    expect(ok(instantSchema, '2026-03-02T07:00:00Z')).toBe(false);
    expect(ok(instantSchema, '2026-03-02T10:00:00.000+03:00')).toBe(false);
  });

  it('takes calendar days as real YYYY-MM-DD dates', () => {
    expect(ok(dateSchema, '2026-03-02')).toBe(true);
    expect(ok(dateSchema, '2028-02-29')).toBe(true);
    expect(ok(dateSchema, '2026-02-29')).toBe(false);
    expect(ok(dateSchema, '2026-13-01')).toBe(false);
    expect(ok(dateSchema, '2026-3-2')).toBe(false);
    expect(ok(dateSchema, '2026-03-02T00:00:00.000Z')).toBe(false);
  });

  it('takes lesson times as HH:MM', () => {
    expect(ok(localTimeSchema, '08:30')).toBe(true);
    expect(ok(localTimeSchema, '23:59')).toBe(true);
    expect(ok(localTimeSchema, '24:00')).toBe(false);
    expect(ok(localTimeSchema, '8:30')).toBe(false);
  });

  it('takes durations as whole non-negative milliseconds', () => {
    expect(ok(durationMsSchema, 0)).toBe(true);
    expect(ok(durationMsSchema, 30_000)).toBe(true);
    expect(ok(durationMsSchema, -1)).toBe(false);
    expect(ok(durationMsSchema, 1.5)).toBe(false);
  });

  it('keeps per mille values between 0 and 1000', () => {
    expect(ok(perMilleSchema, 695)).toBe(true);
    expect(ok(perMilleSchema, 0)).toBe(true);
    expect(ok(perMilleSchema, 1000)).toBe(true);
    expect(ok(perMilleSchema, -1)).toBe(false);
    expect(ok(perMilleSchema, 1001)).toBe(false);
    expect(ok(perMilleSchema, 69.5)).toBe(false);
  });

  it('takes canonical 64-bit decimal text up to 2^63 - 1', () => {
    expect(ok(bigIntegerSchema, '0')).toBe(true);
    expect(ok(bigIntegerSchema, '9223372036854775807')).toBe(true);
    expect(ok(bigIntegerSchema, '9223372036854775808')).toBe(false);
    expect(ok(bigIntegerSchema, '10000000000000000000')).toBe(false);
    expect(ok(bigIntegerSchema, '007')).toBe(false);
    expect(ok(bigIntegerSchema, '-1')).toBe(false);
  });

  it('takes student numbers as 9 or 10 ASCII digits', () => {
    expect(ok(studentNumberSchema, '123456789')).toBe(true);
    expect(ok(studentNumberSchema, '1234567890')).toBe(true);
    expect(ok(studentNumberSchema, '12345678')).toBe(false);
    expect(ok(studentNumberSchema, '12345678901')).toBe(false);
    expect(ok(studentNumberSchema, '12345678a')).toBe(false);
    // Arabic-Indic digits are digits, but not ASCII ones.
    expect(ok(studentNumberSchema, '١٢٣٤٥٦٧٨٩')).toBe(false);
  });

  it('takes the client replay key only as a UUIDv7', () => {
    expect(ok(clientIdSchema, UUID_V7)).toBe(true);
    expect(ok(clientIdSchema, UUID_V4)).toBe(false);
    expect(ok(idSchema('Course'), UUID_V4)).toBe(true);
  });

  it('caps extensible enums at 64 characters but accepts unknown values', () => {
    const state = extensibleEnum(['OPEN', 'CLOSED']);
    expect(ok(state, 'ARCHIVED')).toBe(true);
    expect(ok(state, 'X'.repeat(EXTENSIBLE_ENUM_MAX_LENGTH))).toBe(true);
    expect(ok(state, 'X'.repeat(EXTENSIBLE_ENUM_MAX_LENGTH + 1))).toBe(false);
  });

  it('documents an extensible enum as x-extensible-enum, never as enum', () => {
    const json = z.toJSONSchema(extensibleEnum(['OPEN', 'CLOSED']));
    expect(child(json, 'x-extensible-enum')).toEqual(['OPEN', 'CLOSED']);
    expect(keysDeep(json)).not.toContain('enum');
    // Ground control: a closed z.enum does produce the enum key this test looks for.
    expect(keysDeep(z.toJSONSchema(z.enum(['OPEN', 'CLOSED'])))).toContain('enum');
  });

  it('defaults the page limit to 100 and bounds it to 1..500', () => {
    expect(pageQuerySchema.parse({})).toEqual({ limit: 100 });
    expect(pageQuerySchema.parse({ limit: '500', cursor: 'abc_-1' })).toEqual({
      limit: 500,
      cursor: 'abc_-1',
    });
    expect(ok(pageQuerySchema, { limit: '501' })).toBe(false);
    expect(ok(pageQuerySchema, { limit: '0' })).toBe(false);
    expect(ok(pageQuerySchema, { cursor: 'not base64url!' })).toBe(false);
  });

  it('takes every base64url character in a cursor', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    expect(pageQuerySchema.parse({ cursor: alphabet }).cursor).toBe(alphabet);
  });

  it.each(['+', '/', '='])('refuses %j in a cursor, which is base64url, not base64', (char) => {
    expect(ok(pageQuerySchema, { cursor: `ab${char}cd` })).toBe(false);
  });

  it('bounds the page cursor to 200 characters', () => {
    expect(ok(pageQuerySchema, { cursor: 'a'.repeat(CURSOR_MAX_LENGTH) })).toBe(true);
    expect(ok(pageQuerySchema, { cursor: 'a'.repeat(CURSOR_MAX_LENGTH + 1) })).toBe(false);
  });

  it('answers a page with items and a nextCursor that is always present', () => {
    const page = pageSchema(z.string());
    expect(ok(page, { items: ['a'], nextCursor: 'b' })).toBe(true);
    expect(ok(page, { items: [], nextCursor: null })).toBe(true);
    expect(ok(page, { items: [] })).toBe(false);
  });

  it('bounds expectedVersion to 0..2147483647 whole numbers', () => {
    expect(ok(expectedVersionSchema, 0)).toBe(true);
    expect(ok(expectedVersionSchema, 2_147_483_647)).toBe(true);
    expect(ok(expectedVersionSchema, 2_147_483_648)).toBe(false);
    expect(ok(expectedVersionSchema, -1)).toBe(false);
    expect(ok(expectedVersionSchema, 1.5)).toBe(false);
  });

  it('marks full lists with their row limit', () => {
    const list = fullListSchema(z.string(), 3);
    expect(list.meta()?.[FULL_LIST_MAX_META]).toBe(3);
    expect(ok(list, ['a', 'b', 'c'])).toBe(true);
    expect(ok(list, ['a', 'b', 'c', 'd'])).toBe(false);
  });

  it('defaults full lists to the 2000-row hard cap', () => {
    const list = fullListSchema(z.string());
    expect(list.meta()?.[FULL_LIST_MAX_META]).toBe(FULL_LIST_DEFAULT_MAX);
    expect(
      ok(
        list,
        Array.from({ length: FULL_LIST_DEFAULT_MAX }, () => 'a'),
      ),
    ).toBe(true);
    expect(
      ok(
        list,
        Array.from({ length: FULL_LIST_DEFAULT_MAX + 1 }, () => 'a'),
      ),
    ).toBe(false);
    expect(fullListSchema(z.string(), 1).meta()?.[FULL_LIST_MAX_META]).toBe(1);
  });

  it.each([
    [FULL_LIST_DEFAULT_MAX + 1],
    [0],
    [-1],
    [1.5],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
  ])('refuses a full list row limit of %s', (max) => {
    expect(() => fullListSchema(z.string(), max)).toThrow(
      `fullListSchema max must be a whole number from 1 to ${FULL_LIST_DEFAULT_MAX}`,
    );
  });

  it('keeps every rate table larger than its key universe', () => {
    expect(RATE_CLASSES.length).toBeGreaterThan(0);
    for (const rateClass of RATE_CLASSES) {
      expect(rateClass.tableSize).toBeGreaterThan(rateClass.keyUniverse);
    }
  });
});

describe('Shared request helpers carry the bounds of D13-B24', () => {
  // The longest valid value of each text helper: the bound must accept it and be
  // exactly its length.
  it.each([
    ['instantSchema', instantSchema, '2026-03-02T07:00:00.000Z'],
    ['dateSchema', dateSchema, '2026-03-02'],
    ['localTimeSchema', localTimeSchema, '23:59'],
    ['bigIntegerSchema', bigIntegerSchema, '9223372036854775807'],
    ['idSchema', idSchema('Course'), UUID_V4],
    ['clientIdSchema', clientIdSchema, UUID_V7],
    ['studentNumberSchema', studentNumberSchema, '1234567890'],
    ['pageQuerySchema.cursor', pageQuerySchema.shape.cursor, 'a'.repeat(CURSOR_MAX_LENGTH)],
    ['extensibleEnum', extensibleEnum(['OPEN']), 'X'.repeat(EXTENSIBLE_ENUM_MAX_LENGTH)],
  ] as Array<[string, z.ZodType, string]>)(
    '%s has a maxLength equal to its longest valid value',
    (_name, schema, longest) => {
      expect(ok(schema, longest)).toBe(true);
      expect(inputJson(schema).maxLength).toBe(longest.length);
    },
  );

  // The document carries each bound, and the schema takes the bound and refuses the
  // next integer past it.
  it.each([
    ['durationMsSchema', durationMsSchema, 0, Number.MAX_SAFE_INTEGER],
    ['perMilleSchema', perMilleSchema, 0, 1000],
    ['expectedVersionSchema', expectedVersionSchema, 0, 2_147_483_647],
    ['pageQuerySchema.limit', pageQuerySchema.shape.limit, 1, PAGE_LIMIT_MAX],
  ] as Array<[string, z.ZodType, number, number]>)(
    '%s is an integer from %d to %d',
    (_name, schema, minimum, maximum) => {
      const json = inputJson(schema);
      expect(json.type).toBe('integer');
      expect(json.minimum).toBe(minimum);
      expect(json.maximum).toBe(maximum);
      expect(ok(schema, minimum)).toBe(true);
      expect(ok(schema, maximum)).toBe(true);
      expect(ok(schema, minimum - 1)).toBe(false);
      expect(ok(schema, maximum + 1)).toBe(false);
    },
  );

  it('can tell a bounded text from an unbounded one (ground control)', () => {
    expect(inputJson(z.string()).maxLength).toBeUndefined();
    expect(inputJson(z.string().max(3)).maxLength).toBe(3);
  });
});

describe('Error envelope', () => {
  const envelope = {
    error: {
      code: 'API_INVALID_JSON',
      message: 'Bozuk istek.',
      requestId: 'r1',
      fields: [],
      retryAfterSeconds: null,
      details: null,
    },
  };
  const field = { location: 'body', path: 'name', code: 'too_small' };
  const withError = (error: Record<string, unknown>) => ({
    error: { ...envelope.error, ...error },
  });

  it('accepts the envelope with every field present', () => {
    expect(errorEnvelopeSchema.parse(envelope)).toEqual(envelope);
  });

  it.each(Object.keys(envelope.error))('rejects an envelope without %s', (missing) => {
    const error = Object.fromEntries(
      Object.entries(envelope.error).filter(([key]) => key !== missing),
    );
    expect(ok(errorEnvelopeSchema, { error })).toBe(false);
  });

  it('keeps an envelope with fields added by a newer server an envelope and drops them', () => {
    const newer = {
      error: { ...envelope.error, helpUrl: 'x', fields: [{ ...field, hint: 'y' }] },
      traceId: 't',
    };
    expect(errorEnvelopeSchema.parse(newer)).toEqual(withError({ fields: [field] }));
  });

  it('accepts a field location the client does not know yet', () => {
    expect(ok(errorEnvelopeSchema, withError({ fields: [{ ...field, location: 'cookie' }] }))).toBe(
      true,
    );
  });

  it('caps fields at 20', () => {
    const fields = (count: number) => Array.from({ length: count }, () => field);
    expect(ok(errorEnvelopeSchema, withError({ fields: fields(ERROR_FIELDS_MAX) }))).toBe(true);
    expect(ok(errorEnvelopeSchema, withError({ fields: fields(ERROR_FIELDS_MAX + 1) }))).toBe(
      false,
    );
  });

  it('takes retryAfterSeconds as a positive whole number or null', () => {
    expect(ok(errorEnvelopeSchema, withError({ retryAfterSeconds: 30 }))).toBe(true);
    for (const retryAfterSeconds of [0, -1, 1.5]) {
      expect(ok(errorEnvelopeSchema, withError({ retryAfterSeconds }))).toBe(false);
    }
  });

  it('takes details as an object or null', () => {
    expect(ok(errorEnvelopeSchema, withError({ details: { currentVersion: 7 } }))).toBe(true);
    expect(ok(errorEnvelopeSchema, withError({ details: 7 }))).toBe(false);
  });

  it('has no enum key in its document, and code and location are extensible', () => {
    const json = z.toJSONSchema(errorEnvelopeSchema, { io: 'output' });
    expect(keysDeep(json)).not.toContain('enum');
    const error = child(json, 'properties', 'error', 'properties');
    const codes = child(error, 'code', 'x-extensible-enum');
    expect(codes).toEqual([...API_ERROR_CODES]);
    expect(codes).toContain('API_INVALID_REQUEST');
    expect(child(error, 'fields', 'items', 'properties', 'location', 'x-extensible-enum')).toEqual([
      ...ERROR_FIELD_LOCATIONS,
    ]);
  });

  it('is built for any known code list and still accepts an unknown code', () => {
    const schema = errorEnvelopeSchemaFor(['COURSES_NOT_FOUND', 'COURSES_VERSION_CHANGED']);
    const json = z.toJSONSchema(schema, { io: 'output' });
    expect(child(json, 'properties', 'error', 'properties', 'code', 'x-extensible-enum')).toEqual([
      'COURSES_NOT_FOUND',
      'COURSES_VERSION_CHANGED',
    ]);
    expect(ok(schema, withError({ code: 'LATER_CODE' }))).toBe(true);
  });

  it('takes the codes of a merged catalog as Object.keys returns them', () => {
    const merged = { COURSES_NOT_FOUND: {}, IDENTITY_SESSION_ENDED: {} };
    const schema = errorEnvelopeSchemaFor(Object.keys(merged));
    const json = z.toJSONSchema(schema, { io: 'output' });
    expect(child(json, 'properties', 'error', 'properties', 'code', 'x-extensible-enum')).toEqual([
      'COURSES_NOT_FOUND',
      'IDENTITY_SESSION_ENDED',
    ]);
    expect(ok(schema, withError({ code: 'IDENTITY_SESSION_ENDED' }))).toBe(true);
  });

  it('refuses an empty code list', () => {
    expect(() => errorEnvelopeSchemaFor([])).toThrow(
      'errorEnvelopeSchemaFor needs at least one known code',
    );
  });
});

describe('Transient database errors map through one table', () => {
  it.each([
    ['40P01', 'contention'],
    ['40001', 'contention'],
    ['55P03', 'contention'],
    ['53300', 'pool'],
    ['57P01', 'unavailable'],
    ['57P02', 'unavailable'],
    ['57P03', 'unavailable'],
    ['25P03', 'unavailable'],
    ['08000', 'unavailable'],
    ['08003', 'unavailable'],
    ['08006', 'unavailable'],
    ['08P01', 'unavailable'],
    ['57014', 'timeout'],
    ['25P04', 'timeout'],
  ])('%s is %s', (code, kind) => {
    expect(transientKind(code)).toBe(kind);
  });

  it.each([
    ['23505'],
    ['22P02'],
    ['40'],
    [''],
    ['toString'],
    ['constructor'],
    ['__proto__'],
    ['hasOwnProperty'],
  ])('%j is not transient', (code) => {
    expect(transientKind(code)).toBeNull();
  });

  it('carries class 08 in the table itself, found after the full code', () => {
    expect(TRANSIENT_SQLSTATES['08']).toBe('unavailable');
    expect(Object.hasOwn(TRANSIENT_SQLSTATES, '08006')).toBe(false);
    expect(transientKind('08006')).toBe(TRANSIENT_SQLSTATES['08']);
    expect(transientKind('08001')).toBe(TRANSIENT_SQLSTATES['08']);
  });

  // Ground control: '08006' and '08001' above are connection errors found by class.
  it.each([
    ['08-not-a-sqlstate'],
    ['08-08000'],
    ['080000'],
    ['0800'],
    ['08-00'],
    ['08abc'],
    [' 08000'],
  ])('looks up no class for %j, which is not a five-character SQLSTATE', (code) => {
    expect(transientKind(code)).toBeNull();
  });

  it('answers every five-character key with its own kind and the class key only through a code', () => {
    const codes = Object.keys(TRANSIENT_SQLSTATES).filter((key) => key.length === 5);
    expect(codes.length).toBeGreaterThan(0);
    for (const key of codes) expect(transientKind(key)).toBe(TRANSIENT_SQLSTATES[key]);
    // '08' is a class, not a SQLSTATE: only a full code such as 08003 reaches it.
    expect(transientKind('08')).toBeNull();
    expect(transientKind('08003')).toBe(TRANSIENT_SQLSTATES['08']);
  });

  it('returns null for a code that is not text', () => {
    // 40001 and ['40P01'] read as transient SQLSTATEs once turned into text.
    for (const code of [undefined, null, 8006, 40001, {}, ['08006'], ['40P01']]) {
      expect(transientKind(code)).toBeNull();
    }
  });

  it('is frozen', () => {
    expect(() => {
      (TRANSIENT_SQLSTATES as Record<string, string>)['23505'] = 'pool';
    }).toThrow(TypeError);
    expect(transientKind('23505')).toBeNull();
  });
});

// The package tsconfig gives the browser types the client helper needs (fetch,
// AbortController, URL) and no Node types, so this file only compiles with both.
describe('Package type environment', () => {
  it('has fetch, AbortController and URL types and no Node globals', () => {
    const controller: AbortController = new AbortController();
    const url: URL = new URL('/v1/version', 'https://example.test');
    const request: Parameters<typeof fetch>[1] = { signal: controller.signal };
    expect(request.signal?.aborted).toBe(false);
    expect(url.pathname).toBe('/v1/version');
    // @ts-expect-error process is a Node global; shared code has no Node types
    expect(typeof process).toBe('object');
  });
});
