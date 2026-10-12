// Jobs contract (D14): the queue definition every module writes for its queues, the job
// definition the server validates, the contexts a handler gets, the health reading, the
// two objects the composition roots pass on, and the JOBS_ error catalog. Types only,
// besides the catalog and its text: the queue runtime lives in the server.
import type { z } from 'zod';
import { type BilingualText, defineErrorCodes, OPERATIONAL_CODE } from './shared/index.ts';

// Error catalog. The codes a request can also raise (sending a job, the e-mail limit and
// sending, health, starting the jobs) answer 500 with one general text, which the root
// handler never shows: a 5xx answers API_SERVER_ERROR. The codes only the worker, setup
// or startup raise are operational: no status, no text, on no route.

// The staff and student text of every jobs code a request can raise.
export const JOBS_GENERIC_ERROR_TEXT: BilingualText = Object.freeze({
  tr: 'Beklenmeyen bir sorun oldu. Biraz sonra yeniden dene.',
  en: 'Something unexpected went wrong. Try again in a moment.',
});

const inRequest = {
  http: 500,
  lecturer: JOBS_GENERIC_ERROR_TEXT,
  student: JOBS_GENERIC_ERROR_TEXT,
} as const;

export const JOBS_ERROR_CODES = defineErrorCodes('jobs', {
  JOBS_NOT_SET_UP: inRequest,
  JOBS_WRONG_PROCESS: inRequest,
  JOBS_DEFINITION_INVALID: inRequest,
  JOBS_DUPLICATE_NAME: OPERATIONAL_CODE,
  JOBS_SCHEDULE_RULE: OPERATIONAL_CODE,
  JOBS_DATA_INVALID: inRequest,
  JOBS_DATA_TOO_LARGE: inRequest,
  JOBS_OUTPUT_INVALID: OPERATIONAL_CODE,
  JOBS_SINGLETON_KEY_INVALID: inRequest,
  JOBS_START_AT_INVALID: inRequest,
  JOBS_SCHEMA_VERSION: OPERATIONAL_CODE,
  JOBS_SCHEMA_DRIFT: OPERATIONAL_CODE,
  JOBS_QUEUE_MISSING: OPERATIONAL_CODE,
  JOBS_TIME_ZONE: OPERATIONAL_CODE,
  JOBS_EMAIL_ADDRESS_INVALID: inRequest,
  JOBS_EMAIL_LIMIT_SKIPPED: inRequest,
  JOBS_EMAIL_ISOLATION: inRequest,
  JOBS_EMAIL_TEMPLATE_DATA_INVALID: inRequest,
  JOBS_EMAIL_LINK: inRequest,
  JOBS_EMAIL_SETTINGS_MISSING: OPERATIONAL_CODE,
});

export type JobsErrorCode = keyof typeof JOBS_ERROR_CODES;

// Queues. The module that owns a queue writes this object in its own folder; sending a
// job and defining its handler take the same object. standard queues take every job;
// stately and exclusive ones keep one job per singleton key waiting (exclusive: or
// running). A scheduled queue is exclusive or stately.
export const JOB_POLICIES = ['standard', 'stately', 'exclusive'] as const;
export type JobPolicy = (typeof JOB_POLICIES)[number];

export type QueueDefinition<V, C = void> = {
  /** ^[a-z][a-z0-9_]{2,62}$, never ending in _dead (the dead letter queue's suffix). */
  readonly name: string;
  /** A strict object of ids, dates, instants, bounded integers, booleans and fixed lists. */
  readonly data: z.ZodType<V>;
  readonly policy: JobPolicy;
  /** What a single-job handler returns: a small bounded value, kept as the job's output. */
  readonly output?: z.ZodType<C>;
};

// The log methods a handler uses; the worker passes a child of its logger.
export type JobLogger = {
  debug(fields: object, message?: string): void;
  info(fields: object, message?: string): void;
  warn(fields: object, message?: string): void;
  error(fields: object, message?: string): void;
};

export type JobContext = {
  readonly jobId: string;
  readonly queue: string;
  readonly attempt: number;
  /** When the job was created; the Istanbul date comes from the clock helper. */
  readonly triggeredAt: Date;
  readonly requestId: string | null;
  readonly log: JobLogger;
  /** Aborted on the job's timeout or at shutdown. */
  readonly signal: AbortSignal;
};

export type BatchJob<V> = {
  readonly jobId: string;
  readonly data: V;
  readonly attempt: number;
  readonly triggeredAt: Date;
  readonly requestId: string | null;
};

export type BatchContext = {
  readonly queue: string;
  readonly log: JobLogger;
  readonly signal: AbortSignal;
};

export type MissedRun = 'once' | 'skip';

export type JobSchedule = {
  /** Five fields, read in Europe/Istanbul. */
  readonly cron: string;
  /** Scheduled jobs that run at least ten minutes before this one on the same day. */
  readonly after: readonly string[];
  /** A daily or rare job runs once after the worker missed it, a more frequent one skips. */
  readonly missed: MissedRun;
};

// A validated job definition. Handlers are methods, so definitions of different data
// types share one list.
export type JobDefinition<V = unknown, C = unknown> = {
  readonly queue: QueueDefinition<V, C>;
  /** The whole batch's time on a batch queue. */
  readonly timeoutSeconds: number;
  readonly heartbeatSeconds: number | null;
  readonly retry: {
    readonly limit: number;
    readonly delaySeconds: number;
    readonly backoff: boolean;
  };
  readonly schedule: JobSchedule | null;
  /** Exclusive queues only: setup sends one job when it deploys. */
  readonly runOnceAtStartup: boolean;
  readonly run:
    | { readonly kind: 'single'; handler(data: V, context: JobContext): Promise<C | undefined> }
    | {
        readonly kind: 'batch';
        handler(
          jobs: ReadonlyArray<BatchJob<V>>,
          context: BatchContext,
        ): Promise<{ readonly failed: ReadonlyArray<{ jobId: string; error: unknown }> }>;
        readonly size: number;
        readonly concurrency: number;
      };
};

// The health reading of the queues and the e-mails, from one query each.
export type JobHealth = {
  readonly measuredAt: Date;
  readonly schemaVersion: { readonly expected: number; readonly found: number | null };
  readonly liveWorkerInstances: number;
  readonly queues: ReadonlyArray<{
    readonly name: string;
    readonly defined: boolean;
    readonly waiting: number;
    readonly running: number;
    readonly deadLetters: number;
    readonly oldestWaitingSeconds: number | null;
    readonly schedule: null | {
      readonly cron: string;
      readonly lastSuccessAt: Date | null;
      readonly expectedIntervalSeconds: number;
      readonly lastDurationMs: number | null;
      readonly lastOutput: unknown;
    };
  }>;
  readonly email: {
    readonly sentLast24Hours: number;
    readonly failedLast24Hours: number;
    readonly atLimitRecipientsLast24Hours: number;
    readonly distinctRecipientsLast24Hours: number;
    readonly consecutiveFailures: number;
    readonly unfinished: number;
    readonly lastSuccessAt: Date | null;
    readonly dailyLimit: number | null;
  };
};

// What the jobs setup returns: the worker starts the handlers, both processes stop.
export type JobQueue = {
  readonly role: 'api' | 'worker';
  startJobs(): Promise<void>;
  stop(): Promise<void>;
};

// What the e-mail setup returns; sending goes through the e-mail send function.
export type Email = {
  close(timeoutMs: number): Promise<void>;
};
