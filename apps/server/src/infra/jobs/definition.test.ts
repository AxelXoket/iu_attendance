import type { JobDefinition, QueueDefinition } from '@iu-attendance/contracts/jobs';
import { instantSchema, isAppError } from '@iu-attendance/contracts/shared';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  checkDataSchema,
  checkOutputSchema,
  isValidSingletonKey,
  JOB_SIZE_LIMITS,
  REQUEST_ID_FIELD,
  SINGLETON_KEY_MAX_LENGTH,
} from './data-schema.ts';
import {
  BATCH_LIMITS,
  checkJobRegistry,
  defineJob,
  JOB_LIMITS,
  type JobInput,
  WORKER_POOL,
} from './definition.ts';

const uuid = '01890a5d-ac96-7000-8000-000000000001';
const queue = <V>(name: string, data: z.ZodType<V>, extra: Partial<QueueDefinition<V>> = {}) =>
  ({ name, data, policy: 'exclusive', ...extra }) as QueueDefinition<V>;
const sessionQueue = queue('session_close', z.strictObject({ sessionId: z.uuid() }));
const handler = async () => undefined;
const single = (input: Partial<JobInput<unknown, unknown>> = {}) =>
  ({ queue: sessionQueue, timeoutSeconds: 60, handler, ...input }) as JobInput<unknown, unknown>;

// The JOBS_ code a call throws, with its broken rules; null when it does not throw.
function failureOf(run: () => unknown): { code: string; rules: string } | null {
  try {
    run();
    return null;
  } catch (error) {
    if (!isAppError(error)) throw error;
    return { code: error.code, rules: String((error.cause as Error | undefined)?.message) };
  }
}
const refusal = (input: JobInput<unknown, unknown>) =>
  failureOf(() => defineJob(input))?.code ?? null;

describe('singleton keys', () => {
  const word = fc.stringMatching(/^[a-z_]{1,40}$/);
  const digits = fc.stringMatching(/^[0-9]{1,12}$/);
  const date = fc
    .date({
      min: new Date('2000-01-01T00:00:00Z'),
      max: new Date('2099-12-31T00:00:00Z'),
      noInvalidDate: true,
    })
    .map((at) => at.toISOString().slice(0, 10));
  const validPart = fc.oneof(fc.uuid(), date, word);
  // A part with a digit run that is neither a UUID nor a date: a number, digits before
  // or after a word, a date or an id with a digit added on either side.
  const invalidPart = fc.oneof(
    digits,
    fc.tuple(digits, word).map(([number, letters]) => `${number}${letters}`),
    fc.tuple(word, digits).map(([letters, number]) => `${letters}${number}`),
    fc.tuple(digits, fc.oneof(date, fc.uuid())).map(([number, part]) => `${number}${part}`),
    fc.tuple(fc.oneof(date, fc.uuid()), digits).map(([part, number]) => `${part}${number}`),
  );

  it('take parts of UUIDs, dates and lower-case words, and refuse any other digit run', () => {
    fc.assert(
      fc.property(
        fc.array(validPart, { minLength: 1, maxLength: 8 }),
        invalidPart,
        fc.nat(),
        (parts, bad, at) => {
          const key = parts.join(':');
          expect(isValidSingletonKey(key), key).toBe(key.length <= SINGLETON_KEY_MAX_LENGTH);
          const broken = parts.toSpliced(at % (parts.length + 1), 0, bad).join(':');
          expect(isValidSingletonKey(broken), broken).toBe(false);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('refuse an empty part, an upper-case id, a date that does not exist and a long key', () => {
    for (const key of [
      '',
      'a::b',
      uuid.toUpperCase(),
      '2026-02-31',
      '2026-13-01',
      '2026-00-10',
      'a'.repeat(SINGLETON_KEY_MAX_LENGTH + 1),
      'a-b',
      'ç',
    ]) {
      expect(isValidSingletonKey(key), key).toBe(false);
    }
    expect(isValidSingletonKey(`${uuid}:2028-02-29:roster_sync`)).toBe(true);
    expect(isValidSingletonKey('a'.repeat(SINGLETON_KEY_MAX_LENGTH))).toBe(true);
  });
});

describe('job data and output schemas', () => {
  it('count the worst case size exactly, the request id included', () => {
    const schema = z.strictObject({
      sessionId: z.uuid(),
      kinds: z.array(z.enum(['close', 'reopen_window', 'çalışma'])).max(3),
      delta: z.int().min(-100_000).max(5),
      day: z.iso.date(),
      at: instantSchema,
      done: z.boolean(),
    });
    const largest = {
      sessionId: uuid,
      kinds: ['reopen_window', 'reopen_window', 'reopen_window'],
      delta: -100_000,
      day: '2026-10-12',
      at: '2026-10-12T08:00:00.000Z',
      done: false,
      [REQUEST_ID_FIELD]: uuid,
    };
    expect(checkDataSchema(schema)).toEqual({
      problems: [],
      worstCaseBytes: JSON.stringify(largest).length,
    });
    // A non-ASCII list value counts its UTF-8 bytes.
    const turkish = z.strictObject({ kind: z.enum(['çalışma']) });
    const bytes = new TextEncoder().encode(
      JSON.stringify({ kind: 'çalışma', [REQUEST_ID_FIELD]: uuid }),
    ).length;
    expect(checkDataSchema(turkish).worstCaseBytes).toBe(bytes);
    // A data integer counts seven bytes whatever its bounds, an exclusive bound too.
    const small = z.strictObject({ n: z.int().positive().max(9), m: z.int().gt(-1).lt(10) });
    expect(checkDataSchema(small).problems).toEqual([]);
    expect(checkDataSchema(small).worstCaseBytes).toBe(
      JSON.stringify({ n: 1_000_000, m: 1_000_000, [REQUEST_ID_FIELD]: uuid }).length,
    );
  });

  it('refuse what could carry text, a number or an unbounded size', () => {
    for (const [what, data] of [
      ['free text', z.strictObject({ name: z.string() })],
      ['a float', z.strictObject({ rate: z.number() })],
      ['an integer over 100,000', z.strictObject({ code: z.int().min(0).max(999_999) })],
      ['an open integer', z.strictObject({ count: z.int() })],
      ['a loose object', z.object({ sessionId: z.uuid() })],
      ['an unbounded array', z.strictObject({ ids: z.array(z.uuid()) })],
      ['a negative maximum', z.strictObject({ ids: z.array(z.uuid()).max(-300) })],
      ['a tuple', z.strictObject({ pair: z.tuple([z.string()], z.uuid()).check(z.maxLength(3)) })],
      ['the reserved field', z.strictObject({ [REQUEST_ID_FIELD]: z.uuid() })],
      ['an underscore field', z.strictObject({ _hidden: z.boolean() })],
      ['a nullable id', z.strictObject({ sessionId: z.uuid().nullable() })],
      ['not an object', z.array(z.uuid()).max(2)],
      ['a date object', z.strictObject({ at: z.date() })],
      ['an instant of any length', z.strictObject({ at: z.iso.datetime() })],
      ['a long instant', z.strictObject({ at: z.iso.datetime().max(30) })],
      ['text dressed as an id', z.strictObject({ id: z.string().meta({ format: 'uuid' }) })],
      ['bounds in metadata', z.strictObject({ n: z.int().meta({ minimum: 0, maximum: 5 }) })],
      ['a coerced flag', z.strictObject({ on: z.coerce.boolean() })],
      ['a coerced number', z.strictObject({ n: z.coerce.number().int().min(0).max(5) })],
      ['a transform', z.strictObject({ day: z.iso.date().transform((day) => `${day}x`) })],
    ] as const) {
      expect(checkDataSchema(data).problems.length, what).toBeGreaterThan(0);
    }
  });

  it('take 150 ids and refuse 300, over the 8 KiB worst case', () => {
    const ids = (count: number) => z.strictObject({ ids: z.array(z.uuid()).max(count) });
    expect(checkDataSchema(ids(150)).problems).toEqual([]);
    const over = checkDataSchema(ids(300));
    expect(over.worstCaseBytes).toBeGreaterThan(JOB_SIZE_LIMITS.dataMaxBytes);
    expect(over.problems).toEqual([expect.stringMatching(/over 8192/)]);
  });

  it('bound an output to 1 KiB of integers, booleans, lists, dates and instants', () => {
    const counts = z.strictObject({ courses: z.int().min(0).max(100_000), ok: z.boolean() });
    expect(checkOutputSchema(counts)).toEqual({
      problems: [],
      worstCaseBytes: JSON.stringify({ courses: 100_000, ok: false }).length,
    });
    // An output field may start with an underscore; only data reserves it.
    expect(checkOutputSchema(z.strictObject({ _note: z.boolean() })).problems).toEqual([]);
    const big = z.strictObject({ days: z.array(z.iso.date()).max(100) });
    expect(checkOutputSchema(big).worstCaseBytes).toBeGreaterThan(JOB_SIZE_LIMITS.outputMaxBytes);
    expect(checkOutputSchema(big).problems).toHaveLength(1);
    for (const output of [
      z.strictObject({ id: z.uuid() }),
      z.strictObject({ n: z.int() }),
      z.string(),
      z
        .int()
        .min(0)
        .max(5)
        .transform((n) => String(n).repeat(1000)),
    ]) {
      expect(checkOutputSchema(output).problems.length).toBeGreaterThan(0);
    }
  });
});

describe('defineJob', () => {
  it('fills the defaults of a valid definition, the missed run from the frequency', () => {
    const job = defineJob(single());
    expect(job).toMatchObject({
      timeoutSeconds: 60,
      heartbeatSeconds: null,
      retry: { limit: 3, delaySeconds: 30, backoff: true },
      schedule: null,
      runOnceAtStartup: false,
      run: { kind: 'single', handler },
    });
    const scheduled = defineJob(
      single({ schedule: { cron: '5 0 * * *' }, runOnceAtStartup: true }),
    );
    expect(scheduled.schedule).toEqual({ cron: '5 0 * * *', after: [], missed: 'once' });
    expect(scheduled.runOnceAtStartup).toBe(true);
    for (const [cron, missed] of [
      ['10 7 * * MON', 'once'],
      ['0 0 1 * *', 'once'],
      ['* * * * *', 'skip'],
      ['17 * * * *', 'skip'],
      // Twice on the first of the month: more often than daily.
      ['0 1,13 1 * *', 'skip'],
    ] as const) {
      expect(defineJob(single({ schedule: { cron } })).schedule?.missed, cron).toBe(missed);
    }
  });

  it('refuses every broken rule of one definition', () => {
    const batch = {
      batchHandler: async () => ({ failed: [] }),
      batch: { size: 10, concurrency: 1 },
    };
    const noHandler = { queue: sessionQueue, timeoutSeconds: 60 };
    for (const [what, input] of [
      ['a short name', single({ queue: { ...sessionQueue, name: 'ab' } })],
      ['an upper-case name', single({ queue: { ...sessionQueue, name: 'Session_close' } })],
      ['a dead letter name', single({ queue: { ...sessionQueue, name: 'session_close_dead' } })],
      ['a short timeout', single({ timeoutSeconds: JOB_LIMITS.timeoutSeconds.min - 1 })],
      ['a long timeout', single({ timeoutSeconds: JOB_LIMITS.timeoutSeconds.max + 1 })],
      ['a fractional timeout', single({ timeoutSeconds: 60.5 })],
      ['no timeout', single({ timeoutSeconds: Number.NaN })],
      ['a short heartbeat', single({ heartbeatSeconds: 9 })],
      ['a heartbeat of half the timeout', single({ heartbeatSeconds: 30 })],
      ['six retries', single({ retry: { limit: 6 } })],
      ['no retry delay', single({ retry: { delaySeconds: 0 } })],
      ['six cron fields', single({ schedule: { cron: '0 5 0 * * *' } })],
      ['a broken cron', single({ schedule: { cron: '61 0 * * *' } })],
      ['a hashed cron', single({ schedule: { cron: 'H 2 * * *' } })],
      ['a cron that never fires', single({ schedule: { cron: '0 0 31 2,4,6,9,11 *' } })],
      ['an impossible date', single({ schedule: { cron: '0 0 30 2 *' } })],
      [
        'a scheduled standard queue',
        single({
          queue: { ...sessionQueue, policy: 'standard' },
          schedule: { cron: '5 0 * * *' },
        }),
      ],
      ['another time zone', single({ schedule: { cron: '5 0 * * *', timeZone: 'UTC' } })],
      [
        'startup run on a stately queue',
        single({ queue: { ...sessionQueue, policy: 'stately' }, runOnceAtStartup: true }),
      ],
      ['a batch of one', { ...noHandler, ...batch, batch: { size: 1, concurrency: 1 } }],
      ['five handlers', { ...noHandler, ...batch, batch: { size: 10, concurrency: 5 } }],
      ['a scheduled batch', { ...noHandler, ...batch, schedule: { cron: '5 0 * * *' } }],
      [
        'a batch with output',
        { ...noHandler, ...batch, queue: { ...sessionQueue, output: z.boolean() } },
      ],
      [
        'free text data',
        single({ queue: queue('notes_send', z.strictObject({ text: z.string() })) }),
      ],
      [
        'an output over 1 KiB',
        single({ queue: { ...sessionQueue, output: z.array(z.iso.date()).max(100) } }),
      ],
    ] as const) {
      expect(refusal(input as JobInput<unknown, unknown>), what).toBe('JOBS_DEFINITION_INVALID');
    }
    // Ground controls at the bounds, a day named in the cron.
    for (const input of [
      single({
        timeoutSeconds: JOB_LIMITS.timeoutSeconds.max,
        heartbeatSeconds: 10,
        retry: { limit: 0, delaySeconds: 3600 },
      }),
      { ...noHandler, ...batch, batch: { size: BATCH_LIMITS.size.max, concurrency: 4 } },
      single({ schedule: { cron: '10 7 * * THU' } }),
    ]) {
      expect(refusal(input as JobInput<unknown, unknown>)).toBeNull();
    }
  });
});

describe('checkJobRegistry', () => {
  const daily = (name: string, cron: string, after?: readonly string[]) =>
    defineJob(
      single({
        queue: queue(name, z.strictObject({})),
        schedule: { cron, ...(after === undefined ? {} : { after }) },
      }),
    );
  // A slice of the real night plan: term lock, then the jobs that run after it.
  const plan: JobDefinition[] = [
    daily('term_lock', '5 0 * * *'),
    daily('pending_record_close', '15 0 * * *', ['term_lock']),
    daily('aksis_day_end_snapshot', '25 0 * * *', ['term_lock']),
    daily('retention_run', '0 5 * * *'),
    daily('weekly_summary', '10 7 * * 1'),
    defineJob(
      single({ queue: queue('window_close', z.strictObject({})), schedule: { cron: '* * * * *' } }),
    ),
    defineJob(
      single({
        queue: queue('identity_cleanup', z.strictObject({})),
        schedule: { cron: '17 * * * *' },
      }),
    ),
  ];
  const ruleOf = (definitions: readonly JobDefinition[]) =>
    failureOf(() => checkJobRegistry(definitions));

  it('passes the night plan, with jobs exactly five minutes apart and one at 05:00', () => {
    expect(ruleOf(plan)).toBeNull();
    expect(ruleOf([...plan, daily('between_jobs', '20 0 * * *')])).toBeNull();
  });

  it('refuses a broken schedule rule', () => {
    for (const [what, extra] of [
      ['a daily job in the backup window', [daily('night_report', '30 3 * * *')]],
      ['a daily job at the window start', [daily('window_start', '0 3 * * *')]],
      ['a monthly job in the backup window', [daily('month_report', '30 3 1 * *')]],
      ['two daily jobs four minutes apart', [daily('lock_report', '9 0 * * *')]],
      ['a monthly job on the day of another', [daily('month_lock', '5 0 20 * *')]],
      ['a weekly job two minutes from a daily one', [daily('roster_report', '12 7 * * *')]],
      ['an after job that is not scheduled', [daily('late_review', '50 5 * * *', ['missing_job'])]],
      [
        'an after job that runs every minute',
        [daily('minute_follow', '50 5 * * *', ['window_close'])],
      ],
      ['an after job five minutes before', [daily('quick_follow', '10 0 * * *', ['term_lock'])]],
      // On Tuesday the weekly job last ran the day before.
      [
        'a daily job after a weekly one',
        [
          daily('monday_import', '5 1 * * 1'),
          daily('daily_follow', '20 1 * * *', ['monday_import']),
        ],
      ],
      ['a monthly job after a daily one later', [daily('month_start', '0 0 1 * *', ['term_lock'])]],
      // 2028 starts on a Saturday, so the first day passes; on Sunday the six-day job
      // last ran the day before.
      [
        'a daily job after a six-day one',
        [
          daily('weekday_import', '5 1 * * 1-6'),
          daily('daily_after', '20 1 * * *', ['weekday_import']),
        ],
      ],
    ] as const) {
      expect(ruleOf([...plan, ...extra]), what).toMatchObject({ code: 'JOBS_SCHEDULE_RULE' });
    }
    const missed = defineJob(
      single({
        queue: queue('backup_check', z.strictObject({})),
        schedule: { cron: '45 6 * * *', missed: 'skip' },
      }),
    );
    expect(ruleOf([...plan, missed])).toMatchObject({
      code: 'JOBS_SCHEDULE_RULE',
      rules: expect.stringMatching(/once/),
    });
    // The rule names the cause: an every-minute job cannot come before another.
    expect(ruleOf([...plan, daily('minute_follow', '50 5 * * *', ['window_close'])])).toMatchObject(
      {
        rules: expect.stringMatching(/window_close in its after list is not a daily or rare job/),
      },
    );
    const frequent = defineJob(
      single({
        queue: queue('heartbeat', z.strictObject({})),
        schedule: { cron: '5-59/10 * * * *', missed: 'skip' },
      }),
    );
    expect(ruleOf([...plan, frequent])).toBeNull();
    // Ground controls: a weekly job after a daily one, a late job after an early one.
    const weekly = daily('monday_report', '20 1 * * 1', ['term_lock']);
    const evening = daily('evening_follow', '40 23 * * *', ['retention_run']);
    expect(ruleOf([...plan, weekly, evening])).toBeNull();
  });

  it('refuses a name twice and batch handlers that take every connection', () => {
    expect(ruleOf([...plan, plan[0] as JobDefinition])).toMatchObject({
      code: 'JOBS_DUPLICATE_NAME',
    });
    const batchJob = (name: string, concurrency: number) =>
      defineJob({
        queue: queue(name, z.strictObject({})),
        timeoutSeconds: 60,
        batchHandler: async () => ({ failed: [] }),
        batch: { size: 10, concurrency },
      });
    expect(ruleOf([batchJob('decide_a', 1), batchJob('decide_b', 1)])).toBeNull();
    expect(ruleOf([batchJob('decide_a', 2), batchJob('decide_b', 1)])).toMatchObject({
      code: 'JOBS_DEFINITION_INVALID',
      rules: expect.stringMatching(new RegExp(`pool has ${WORKER_POOL.drizzle}`)),
    });
  });
});
