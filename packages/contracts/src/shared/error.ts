import { z } from 'zod';
import { extensibleEnum } from './enum.ts';
import { LANGUAGES, type Language } from './language.ts';
import { errorCodePrefix, type ModuleName } from './modules.ts';

export type BilingualText = Readonly<Record<Language, string>>;

export const ERROR_HTTP_STATUSES = [400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 503] as const;
export type ErrorHttpStatus = (typeof ERROR_HTTP_STATUSES)[number];

// How long a client waits before retrying: a fixed number of seconds, a range the
// server picks from at random, or a value the thrower supplies.
export type Retry = { fixed: number } | { range: readonly [number, number] } | 'caller';

// One code of a catalog. http null marks a code that never answers an HTTP request, and no
// route lists it: either an item code, whose texts reach the client inside an item result,
// or an operational code (startup, worker, CI), with no texts at all (OPERATIONAL_CODE);
// thrown during a request, either becomes 500 API_SERVER_ERROR at the root handler. With
// http set, the lecturer and student texts exist in every language and carry no personal
// data or placeholders. The lecturer text is the staff text: lecturers and admins,
// projection browsers and anonymous routes without a student audience read it; the
// student text goes to student sessions and student devices (D13-B03). details is the
// code's small object schema; the envelope's details is that object or null. 429 and
// 503 require a retry rule; other statuses forbid it.
export type ErrorDefinition = {
  http: ErrorHttpStatus | null;
  lecturer: BilingualText | null;
  student: BilingualText | null;
  details?: z.ZodObject;
  retry?: Retry;
};

// T with every key that Shape lacks typed never, so an unknown key does not compile.
type OnlyKnownKeys<T, Shape> = T & Record<Exclude<keyof T, keyof Shape>, never>;

// A catalog literal with no key outside ErrorDefinition in any code: a misspelled
// optional key (detials for details) would otherwise compile and silently drop it.
type KnownDefinitionKeys<K> = { [C in keyof K]: OnlyKnownKeys<K[C], ErrorDefinition> };

// The same key list at runtime, for catalogs built without a literal type.
const DEFINITION_KEYS: Record<keyof ErrorDefinition, true> = {
  http: true,
  lecturer: true,
  student: true,
  details: true,
  retry: true,
};

const ERROR_CODE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

function textProblem(audience: string, text: BilingualText | null): string | null {
  if (text === null) return `${audience} text is missing`;
  for (const language of LANGUAGES) {
    const value = text[language];
    if (typeof value !== 'string' || value.trim() === '') {
      return `${audience} text in ${language} is missing`;
    }
  }
  return null;
}

function retryProblem(retry: Retry): string | null {
  if (retry === 'caller') return null;
  if ('fixed' in retry) {
    return Number.isInteger(retry.fixed) && retry.fixed > 0
      ? null
      : 'fixed retry must be a positive integer';
  }
  const [low, high] = retry.range;
  return Number.isInteger(low) && Number.isInteger(high) && low > 0 && low <= high
    ? null
    : 'retry range must be two positive integers in order';
}

function definitionProblems(code: string, definition: ErrorDefinition, prefix: string): string[] {
  const problems = Object.keys(definition)
    .filter((key) => !Object.hasOwn(DEFINITION_KEYS, key))
    .map((key) => `unknown key ${key}`);
  if (!ERROR_CODE.test(code)) problems.push('code must be UPPER_SNAKE ASCII');
  if (!code.startsWith(prefix)) problems.push(`code must start with ${prefix}`);
  if (definition.http !== null) {
    if (!(ERROR_HTTP_STATUSES as readonly number[]).includes(definition.http)) {
      problems.push(`http ${String(definition.http)} is not an allowed status`);
    }
    for (const [audience, text] of [
      ['lecturer', definition.lecturer],
      ['student', definition.student],
    ] as const) {
      const problem = textProblem(audience, text);
      if (problem !== null) problems.push(problem);
    }
  }
  if (definition.details !== undefined && !(definition.details instanceof z.ZodObject)) {
    problems.push('details must be a z.object schema (the envelope details is an object)');
  }
  const needsRetry = definition.http === 429 || definition.http === 503;
  if (needsRetry && definition.retry === undefined) problems.push('429 and 503 need a retry rule');
  if (!needsRetry && definition.retry !== undefined)
    problems.push('only 429 and 503 may have a retry rule');
  if (definition.retry !== undefined) {
    const problem = retryProblem(definition.retry);
    if (problem !== null) problems.push(problem);
  }
  return problems;
}

// Defines a module's error catalog and checks it at load time; any broken rule
// throws, naming the module and the code, so the server does not start. An unknown
// definition key is a compile error in a literal and a load-time error always.
export function defineErrorCodes<const K extends Record<string, ErrorDefinition>>(
  module: ModuleName,
  codes: K & KnownDefinitionKeys<K>,
): K {
  const prefix = errorCodePrefix(module);
  const problems = Object.entries(codes).flatMap(([code, definition]) =>
    definitionProblems(code, definition, prefix).map((problem) => `${code}: ${problem}`),
  );
  if (problems.length > 0) {
    throw new Error(`Error catalog of module ${module} is invalid:\n  ${problems.join('\n  ')}`);
  }
  return codes;
}

/** One text for staff and students alike, in both languages. */
export function sameText(tr: string, en: string) {
  const text = { tr, en };
  return { lecturer: text, student: text };
}

/**
 * One English text and the Turkish in each reader's form of address: "siz" to staff, "sen"
 * to a student (tasarim, open point 11), for a code both can meet.
 */
export function addressedText(lecturerTr: string, studentTr: string, en: string) {
  return { lecturer: { tr: lecturerTr, en }, student: { tr: studentTr, en } };
}

/** A code that never reaches a client: no status and no text. */
export const OPERATIONAL_CODE = { http: null, lecturer: null, student: null } as const;

// errors.ts (which merges every catalog) extends this registry, so the details type
// of a code is known here without importing errors.ts.
// biome-ignore lint/suspicious/noEmptyInterface: augmented by declaration merging
export interface ErrorCatalogRegistry {}

export type ErrorCode = keyof ErrorCatalogRegistry & string;

// The details a code accepts; never for a code without a details schema.
export type ErrorDetails<K extends ErrorCode> = ErrorCatalogRegistry[K] extends {
  details: infer S extends z.ZodType;
}
  ? z.input<S>
  : never;

const APP_ERROR_BRAND = Symbol.for('iu-attendance.AppError');

// The thrown error. Recognised by a brand, not instanceof, because the source and
// the built copy of this package can both be loaded.
export class AppError extends Error {
  readonly [APP_ERROR_BRAND] = true;
  readonly code: string;
  readonly details: unknown;
  readonly retryAfterSeconds: number | null;

  constructor(
    code: string,
    options: { details?: unknown; retryAfterSeconds?: number | null; cause?: unknown } = {},
  ) {
    super(code, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.details = options.details ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[APP_ERROR_BRAND] === true
  );
}

export const ERROR_FIELD_LOCATIONS = ['body', 'query', 'params', 'headers'] as const;
export const ERROR_FIELDS_MAX = 20;

const isNonEmpty = (values: readonly string[]): values is readonly [string, ...string[]] =>
  values.length > 0;

// The api module's own codes (D13 API_ERRORS), the known codes of the default envelope.
export const API_ERROR_CODES = [
  'API_INVALID_REQUEST',
  'API_INVALID_JSON',
  'API_AUTH_REQUIRED',
  'API_ROLE_FORBIDDEN',
  'API_INVALID_ORIGIN',
  'API_ENDPOINT_NOT_FOUND',
  'API_BODY_TOO_LARGE',
  'API_UNSUPPORTED_CONTENT_TYPE',
  'API_RESULT_TOO_LARGE',
  'API_RATE_LIMIT',
  'API_SERVER_ERROR',
  'API_SERVER_BUSY',
  'API_QUERY_TIMEOUT',
  'API_VERSION_INFO_MISSING',
] as const;

// The one body of every 4xx and 5xx answer; every field is always present. message
// is in the request language, code has none. fields is filled only for validation
// errors (Zod path and issue code, never the value). Objects strip unknown keys
// rather than reject them, so a field a newer server adds keeps the envelope an
// envelope for every client already in use (D13-B24); code and location are
// extensible enums (D13-B20). codes are the known codes the document lists, at least
// one: errors.ts passes Object.keys of the merged catalog, this module the api codes.
export function errorEnvelopeSchemaFor<const C extends readonly string[]>(codes: C) {
  if (!isNonEmpty(codes)) throw new Error('errorEnvelopeSchemaFor needs at least one known code');
  return z.object({
    error: z.object({
      code: extensibleEnum(codes),
      message: z.string(),
      requestId: z.string(),
      fields: z
        .array(
          z.object({
            location: extensibleEnum(ERROR_FIELD_LOCATIONS),
            path: z.string(),
            code: z.string(),
          }),
        )
        .max(ERROR_FIELDS_MAX),
      retryAfterSeconds: z.number().int().positive().nullable(),
      details: z.record(z.string(), z.unknown()).nullable(),
    }),
  });
}

export const errorEnvelopeSchema = errorEnvelopeSchemaFor(API_ERROR_CODES);

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

// contention covers deadlock (40P01), serialization failure (40001) and lock not
// available (55P03).
export type TransientKind = 'contention' | 'pool' | 'unavailable' | 'timeout';

// The single source for mapping database errors that are worth retrying: a SQLSTATE
// is looked up in full first, then by its two-digit class ('08', connection
// exception). database turns each kind into its own code; the root handler uses the
// same table as a second guard for raw errors that escape database. Look codes up
// with transientKind: plain indexing also finds Object.prototype members.
export const TRANSIENT_SQLSTATES: Readonly<Record<string, TransientKind>> = Object.freeze({
  '40P01': 'contention',
  '40001': 'contention',
  '55P03': 'contention',
  '53300': 'pool',
  '57P01': 'unavailable',
  '57P02': 'unavailable',
  '57P03': 'unavailable',
  '25P03': 'unavailable',
  '08': 'unavailable',
  '57014': 'timeout',
  '25P04': 'timeout',
});

/** A well-formed SQLSTATE: five digits or upper-case ASCII letters. */
export const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

// The kind of a database error code, or null. Takes unknown because the root handler
// passes the code of any raw error. Only own keys of the table count, and only a
// well-formed SQLSTATE is also looked up by its class, so other text that happens to
// start with 08 is not a connection error.
export function transientKind(sqlstate: unknown): TransientKind | null {
  // Only a five-character SQLSTATE is looked up: the class key '08' alone is not a code.
  // No such code names an Object.prototype member, so Object.hasOwn is a guard only.
  if (typeof sqlstate !== 'string' || !SQLSTATE_PATTERN.test(sqlstate)) return null;
  for (const key of [sqlstate, sqlstate.slice(0, 2)]) {
    if (Object.hasOwn(TRANSIENT_SQLSTATES, key)) return TRANSIENT_SQLSTATES[key] ?? null;
  }
  return null;
}
