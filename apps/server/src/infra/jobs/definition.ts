import type {
  BatchContext,
  BatchJob,
  JobContext,
  JobDefinition,
  MissedRun,
  QueueDefinition,
} from '@iu-attendance/contracts/jobs';
import { AppError } from '@iu-attendance/contracts/shared';
import { ISTANBUL_TIME_ZONE } from '../clock/index.ts';
import { checkDataSchema, checkOutputSchema } from './data-schema.ts';
import { cronProblems, missedRunOf, scheduleRuleProblems } from './schedule.ts';

// Job definitions (D14): defineJob checks one definition and fills its defaults; a module
// puts the result in its jobs list. checkJobRegistry checks the whole list the worker,
// setup and the contract test collect: unique names, the batch connections and the
// schedule rules. Both are pure and throw the JOBS_ code of the first broken rule kind,
// the broken rules in the cause.

export const JOB_LIMITS = {
  timeoutSeconds: { min: 10, max: 3600 },
  heartbeatMinSeconds: 10,
  retryLimit: { min: 0, max: 5, default: 3 },
  retryDelaySeconds: { min: 1, max: 3600, default: 30 },
} as const;
// A batch queue takes jobs in batches of a size, with handlers running side by side, and
// polls every half second.
export const BATCH_LIMITS = {
  size: { min: 2, max: 100 },
  concurrency: { min: 1, max: 4 },
  pollSeconds: 0.5,
} as const;
// The worker's connections: pg-boss, Drizzle and the retention login, and how long a
// request waits for one. The batch handlers together leave a Drizzle connection to the
// single-job queues.
export const WORKER_POOL = { pgBoss: 2, drizzle: 3, retention: 1, waitMs: 30_000 } as const;

const QUEUE_NAME = /^[a-z][a-z0-9_]{2,62}$/;
// Every queue has a dead letter queue named after it with this suffix.
export const DEAD_LETTER_SUFFIX = '_dead';

type BatchHandler<V> = (
  jobs: ReadonlyArray<BatchJob<V>>,
  context: BatchContext,
) => Promise<{ readonly failed: ReadonlyArray<{ jobId: string; error: unknown }> }>;

export type JobInput<V, C> = {
  readonly queue: QueueDefinition<V, C>;
  readonly timeoutSeconds: number;
  readonly heartbeatSeconds?: number;
  readonly retry?: {
    readonly limit?: number;
    readonly delaySeconds?: number;
    readonly backoff?: boolean;
  };
  readonly schedule?: {
    readonly cron: string;
    readonly after?: readonly string[];
    // Only the infrastructure adapter passes these two; missed follows the frequency.
    readonly missed?: MissedRun;
    readonly timeZone?: string;
  };
  readonly runOnceAtStartup?: true;
} & (
  | { readonly handler: (data: V, context: JobContext) => Promise<C | undefined> }
  | {
      readonly batchHandler: BatchHandler<V>;
      readonly batch: { readonly size: number; readonly concurrency: number };
    }
);

const within = (value: unknown, range: { readonly min: number; readonly max: number }) =>
  Number.isInteger(value) && (value as number) >= range.min && (value as number) <= range.max;

function fail(
  code: 'JOBS_DEFINITION_INVALID' | 'JOBS_DUPLICATE_NAME' | 'JOBS_SCHEDULE_RULE',
  problems: readonly string[],
): never {
  throw new AppError(code, { cause: new Error(problems.join('\n')) });
}

/** Checks a job definition and fills its defaults; throws JOBS_DEFINITION_INVALID. */
export function defineJob<V, C = void>(input: JobInput<V, C>): JobDefinition<V, C> {
  const { queue, timeoutSeconds, heartbeatSeconds, retry = {}, schedule } = input;
  const name = queue.name;
  const problems: string[] = [];
  const check = (holds: boolean, rule: string) => {
    if (!holds) problems.push(`${name}: ${rule}`);
  };
  const isBatch = 'batch' in input;

  check(QUEUE_NAME.test(name) && !name.endsWith(DEAD_LETTER_SUFFIX), 'the name breaks its pattern');
  check(within(timeoutSeconds, JOB_LIMITS.timeoutSeconds), 'the timeout is out of bounds');
  if (heartbeatSeconds !== undefined) {
    check(
      Number.isInteger(heartbeatSeconds) &&
        heartbeatSeconds >= JOB_LIMITS.heartbeatMinSeconds &&
        heartbeatSeconds < timeoutSeconds / 2,
      'the heartbeat is under 10 seconds or not under half the timeout',
    );
  }
  const limit = retry.limit ?? JOB_LIMITS.retryLimit.default;
  const delaySeconds = retry.delaySeconds ?? JOB_LIMITS.retryDelaySeconds.default;
  check(within(limit, JOB_LIMITS.retryLimit), 'the retry limit is out of bounds');
  check(within(delaySeconds, JOB_LIMITS.retryDelaySeconds), 'the retry delay is out of bounds');
  if (schedule !== undefined) {
    problems.push(...cronProblems(schedule.cron).map((problem) => `${name}: ${problem}`));
    check(queue.policy !== 'standard', 'a standard queue has no schedule');
    check(!isBatch, 'a batch queue has no schedule');
    check(
      schedule.timeZone === undefined || schedule.timeZone === ISTANBUL_TIME_ZONE,
      `the time zone is not ${ISTANBUL_TIME_ZONE}`,
    );
  }
  check(
    input.runOnceAtStartup !== true || queue.policy === 'exclusive',
    'only an exclusive queue runs once at startup',
  );
  if (isBatch) {
    check(within(input.batch.size, BATCH_LIMITS.size), 'the batch size is out of bounds');
    check(
      within(input.batch.concurrency, BATCH_LIMITS.concurrency),
      'the batch concurrency is out of bounds',
    );
    check(queue.output === undefined, 'a batch queue has no output');
  }
  problems.push(
    ...checkDataSchema(queue.data).problems.map((problem) => `${name} data ${problem}`),
  );
  if (queue.output !== undefined) {
    problems.push(
      ...checkOutputSchema(queue.output).problems.map((problem) => `${name} output ${problem}`),
    );
  }
  if (problems.length > 0) fail('JOBS_DEFINITION_INVALID', problems);

  return {
    queue,
    timeoutSeconds,
    heartbeatSeconds: heartbeatSeconds ?? null,
    retry: { limit, delaySeconds, backoff: retry.backoff ?? true },
    schedule:
      schedule === undefined
        ? null
        : {
            cron: schedule.cron,
            after: schedule.after ?? [],
            missed: schedule.missed ?? missedRunOf(schedule.cron),
          },
    runOnceAtStartup: input.runOnceAtStartup === true,
    run: isBatch
      ? {
          kind: 'batch',
          handler: input.batchHandler,
          size: input.batch.size,
          concurrency: input.batch.concurrency,
        }
      : { kind: 'single', handler: input.handler },
  };
}

/**
 * Checks the whole list of definitions: names are unique (JOBS_DUPLICATE_NAME), the batch
 * handlers leave a connection free (JOBS_DEFINITION_INVALID), the schedules keep their
 * rules (JOBS_SCHEDULE_RULE).
 */
export function checkJobRegistry(definitions: readonly JobDefinition[]): void {
  const names = definitions.map((definition) => definition.queue.name);
  const twice = names.filter((name, index) => names.indexOf(name) !== index);
  if (twice.length > 0)
    fail(
      'JOBS_DUPLICATE_NAME',
      twice.map((name) => `${name}: defined twice`),
    );
  const connections = definitions.reduce(
    (sum, { run }) => sum + (run.kind === 'batch' ? run.concurrency : 0),
    0,
  );
  if (connections > WORKER_POOL.drizzle - 1) {
    fail('JOBS_DEFINITION_INVALID', [
      `the batch handlers take ${connections} connections, the pool has ${WORKER_POOL.drizzle}`,
    ]);
  }
  const problems = scheduleRuleProblems(definitions);
  if (problems.length > 0) fail('JOBS_SCHEDULE_RULE', problems);
}
