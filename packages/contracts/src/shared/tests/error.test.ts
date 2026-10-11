import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AppError,
  type BilingualText,
  defineErrorCodes,
  ERROR_HTTP_STATUSES,
  type ErrorDefinition,
  errorEnvelopeSchema,
  isAppError,
} from '../error.ts';
import { LANGUAGES } from '../language.ts';
import { expectedVersionSchema } from '../page.ts';

const [TURKISH, ENGLISH] = LANGUAGES;

// A text in every language of LANGUAGES.
const filled = (label: string) =>
  Object.fromEntries(
    LANGUAGES.map((language) => [language, `${label} (${language}).`]),
  ) as BilingualText;

// The spec's trial catalog: http 409, both texts filled in every language.
const conflict = {
  http: 409,
  lecturer: filled('Lecturer text'),
  student: filled('Student text'),
} as const satisfies ErrorDefinition;

const define =
  (definition: ErrorDefinition, code = 'COURSES_CONFLICT') =>
  () =>
    defineErrorCodes('courses', { [code]: definition });

describe('Error catalog definition rejects a missing language text at load time', () => {
  it('returns the 409 catalog with every text filled unchanged', () => {
    const catalog = { COURSES_CONFLICT: conflict };
    expect(defineErrorCodes('courses', catalog)).toBe(catalog);
  });

  it('throws when only lecturer.en is empty', () => {
    expect(define({ ...conflict, lecturer: { ...conflict.lecturer, [ENGLISH]: '' } })).toThrow(
      `COURSES_CONFLICT: lecturer text in ${ENGLISH} is missing`,
    );
  });

  it('throws when only student.tr is empty', () => {
    expect(define({ ...conflict, student: { ...conflict.student, [TURKISH]: '' } })).toThrow(
      `COURSES_CONFLICT: student text in ${TURKISH} is missing`,
    );
  });

  it('throws when a text is only whitespace', () => {
    expect(define({ ...conflict, student: { ...conflict.student, [ENGLISH]: ' \t ' } })).toThrow(
      `COURSES_CONFLICT: student text in ${ENGLISH} is missing`,
    );
  });

  it('throws when a language is left out of a text', () => {
    const withoutTurkish = Object.fromEntries(
      Object.entries(conflict.lecturer).filter(([language]) => language !== TURKISH),
    ) as BilingualText;
    expect(define({ ...conflict, lecturer: withoutTurkish })).toThrow(
      `COURSES_CONFLICT: lecturer text in ${TURKISH} is missing`,
    );
  });

  it('throws when an audience text of an http code is null', () => {
    expect(define({ ...conflict, lecturer: null })).toThrow('lecturer text is missing');
  });
});

describe('Error catalog rules are checked when the catalog loads', () => {
  it('accepts every allowed http status and rejects any other', () => {
    for (const http of ERROR_HTTP_STATUSES) {
      const retry = http === 429 || http === 503 ? { fixed: 5 } : undefined;
      expect(
        define({ ...conflict, http, ...(retry === undefined ? {} : { retry }) }),
      ).not.toThrow();
    }
    const teapot = { ...conflict, http: 418 } as unknown as ErrorDefinition;
    expect(define(teapot)).toThrow('COURSES_CONFLICT: http 418 is not an allowed status');
  });

  it('allows null texts only on operational codes', () => {
    expect(define({ http: null, lecturer: null, student: null })).not.toThrow();
  });

  it('requires the module prefix and UPPER_SNAKE codes', () => {
    expect(define(conflict, 'IDENTITY_NOT_FOUND')).toThrow('code must start with COURSES_');
    expect(define(conflict, 'COURSES_notFound')).toThrow('UPPER_SNAKE');
  });

  it.each([
    ['a doubled underscore', 'COURSES__X'],
    ['a trailing underscore', 'COURSES_X_'],
  ])('rejects a code with %s', (_name, code) => {
    expect(define(conflict, code)).toThrow(`${code}: code must be UPPER_SNAKE ASCII`);
  });

  it('accepts digits inside the words of a code (ground control)', () => {
    expect(define(conflict, 'COURSES_X1_2FA')).not.toThrow();
  });

  it('requires a retry rule on 429 and 503 and forbids it elsewhere', () => {
    expect(define({ ...conflict, http: 429 })).toThrow('429 and 503 need a retry rule');
    expect(define({ ...conflict, retry: { fixed: 5 } })).toThrow(
      'only 429 and 503 may have a retry rule',
    );
    expect(define({ ...conflict, http: 429, retry: 'caller' })).not.toThrow();
  });

  it('takes a fixed retry only as a positive whole number of seconds', () => {
    expect(define({ ...conflict, http: 503, retry: { fixed: 60 } })).not.toThrow();
    for (const fixed of [0, -5, 2.5, Number.NaN]) {
      expect(define({ ...conflict, http: 503, retry: { fixed } })).toThrow(
        'fixed retry must be a positive integer',
      );
    }
  });

  it('takes a retry range only as two positive whole numbers in order', () => {
    expect(define({ ...conflict, http: 503, retry: { range: [15, 45] } })).not.toThrow();
    expect(define({ ...conflict, http: 503, retry: { range: [1, 1] } })).not.toThrow();
    for (const range of [
      [45, 15],
      [0, 15],
      [1.5, 3],
      [1, 2.5],
    ] as const) {
      expect(define({ ...conflict, http: 503, retry: { range } })).toThrow(
        'COURSES_CONFLICT: retry range must be two positive integers in order',
      );
    }
  });

  it('takes details only as an object schema, in the type and at load time', () => {
    // @ts-expect-error a number schema is not an object schema
    const numberDetails: ErrorDefinition = { ...conflict, details: expectedVersionSchema };
    expect(define(numberDetails)).toThrow('COURSES_CONFLICT: details must be a z.object schema');
    // The same holds for an operational code, whose details reach the log.
    const operational = { http: null, lecturer: null, student: null } as const;
    expect(
      define({ ...operational, details: expectedVersionSchema } as unknown as ErrorDefinition),
    ).toThrow('COURSES_CONFLICT: details must be a z.object schema');
    const versionDetails = z.object({ currentVersion: expectedVersionSchema });
    expect(define({ ...conflict, details: versionDetails })).not.toThrow();
    expect(define({ ...operational, details: versionDetails })).not.toThrow();
  });

  it('produces details the error envelope accepts', () => {
    const catalog = defineErrorCodes('courses', {
      COURSES_VERSION_CHANGED: {
        ...conflict,
        details: z.object({ currentVersion: expectedVersionSchema }),
      },
    });
    const details = catalog.COURSES_VERSION_CHANGED.details.parse({ currentVersion: 7 });
    const envelope = {
      error: {
        code: 'COURSES_VERSION_CHANGED',
        message: conflict.lecturer[TURKISH],
        requestId: 'r1',
        fields: [],
        retryAfterSeconds: null,
        details,
      },
    };
    expect(errorEnvelopeSchema.safeParse(envelope).success).toBe(true);
    expect(
      errorEnvelopeSchema.safeParse({ error: { ...envelope.error, details: 7 } }).success,
    ).toBe(false);
  });
});

describe('Unknown definition keys are compile errors as well as load-time errors', () => {
  const versionDetails = z.object({ currentVersion: expectedVersionSchema });

  it('rejects a misspelled optional key that would silently drop the details schema', () => {
    const typo = { COURSES_VERSION_CHANGED: { ...conflict, detials: versionDetails } };
    // @ts-expect-error detials is not a definition key (details is)
    expect(() => defineErrorCodes('courses', typo)).toThrow(
      'COURSES_VERSION_CHANGED: unknown key detials',
    );
    // Ground control: the right spelling compiles, loads and keeps its schema.
    const catalog = defineErrorCodes('courses', {
      COURSES_VERSION_CHANGED: { ...conflict, details: versionDetails },
    });
    expect(catalog.COURSES_VERSION_CHANGED.details).toBe(versionDetails);
  });

  it('rejects an unknown key at load time when the catalog has no literal type', () => {
    const built = { ...conflict, http: 503, retyr: { fixed: 5 } } as unknown as ErrorDefinition;
    expect(define(built)).toThrow('COURSES_CONFLICT: unknown key retyr');
    // Ground control: the right spelling loads.
    expect(define({ ...conflict, http: 503, retry: { fixed: 5 } })).not.toThrow();
  });
});

describe('AppError', () => {
  it('keeps the code, details, wait and cause it is given', () => {
    const cause = new Error('connection reset');
    const error = new AppError('API_SERVER_BUSY', {
      details: { queued: 3 },
      retryAfterSeconds: 37,
      cause,
    });
    expect(error.code).toBe('API_SERVER_BUSY');
    expect(error.message).toBe('API_SERVER_BUSY');
    expect(error.name).toBe('AppError');
    expect(error.details).toEqual({ queued: 3 });
    expect(error.retryAfterSeconds).toBe(37);
    expect(error.cause).toBe(cause);
  });

  it('gives null details and wait and no cause when none is given', () => {
    const error = new AppError('COURSES_NOT_FOUND');
    expect(error.code).toBe('COURSES_NOT_FOUND');
    expect(error.details).toBeNull();
    expect(error.retryAfterSeconds).toBeNull();
    expect(Object.hasOwn(error, 'cause')).toBe(false);
  });

  it('is recognised by its brand, also when it crossed a copy of the package', () => {
    const error = new AppError('COURSES_NOT_FOUND', { details: { courseId: 'x' } });
    expect(isAppError(error)).toBe(true);
    expect(error.details).toEqual({ courseId: 'x' });
    expect(error.retryAfterSeconds).toBeNull();
    const lookalike = Object.assign(new Error('COURSES_NOT_FOUND'), { code: 'COURSES_NOT_FOUND' });
    expect(isAppError(lookalike)).toBe(false);
    const copy = { [Symbol.for('iu-attendance.AppError')]: true };
    expect(isAppError(copy)).toBe(true);
  });
});
