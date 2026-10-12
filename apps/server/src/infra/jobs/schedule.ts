import type { JobDefinition, MissedRun } from '@iu-attendance/contracts/jobs';
import { CronExpressionParser } from 'cron-parser';
import {
  DAY_MS,
  ISTANBUL_TIME_ZONE,
  istanbulDate,
  istanbulInstant,
  MINUTE_MS,
} from '../clock/index.ts';

// Job schedules (D14): a five-field cron read in Europe/Istanbul. The rules of the whole
// list are checked on the instants every schedule fires in a sample of one leap year, so
// monthly and yearly patterns (the 1st, the 31st, L, #, February) fire too:
// - a job that runs at most once a day (daily or rare) never starts from 03:00 to 05:00,
//   the machine's backup window, and starts at least five minutes from any other one;
// - every job of an after list is a daily or rare job that fires at least ten minutes
//   earlier on the same Istanbul day (a repeating schedule cannot tell "A then B" from
//   "B then A" without a day to hold them);
// - a daily or rare job runs once when the worker comes back after missing it, a more
//   frequent one skips; an explicit missed value must agree.
// That a scheduled queue is exclusive or stately is checked with its definition.

const SAMPLE_START = '2028-01-01';
const SAMPLE_DAYS = 366;
const QUIET_START = '03:00';
const QUIET_END = '05:00';
const DAILY_GAP_MS = 5 * MINUTE_MS;
const AFTER_GAP_MS = 10 * MINUTE_MS;

function timesOf(cron: string) {
  const start = istanbulInstant(SAMPLE_START, '00:00');
  return CronExpressionParser.parse(cron, {
    tz: ISTANBUL_TIME_ZONE,
    currentDate: new Date(start - 1),
    endDate: new Date(start + SAMPLE_DAYS * DAY_MS),
  });
}

/**
 * The rules a cron text breaks: five fields that cron-parser reads, no hashed field (H
 * draws a new random time on every read), and at least one firing in a year.
 */
export function cronProblems(cron: string): string[] {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return [`cron '${cron}' needs five fields`];
  const hashed = (part: string) => part === 'H' || part.startsWith('H(') || part.startsWith('H/');
  if (fields.some((field) => field.split(',').some(hashed))) {
    return [`cron '${cron}' has a hashed field`];
  }
  try {
    return timesOf(cron).hasNext() ? [] : [`cron '${cron}' never fires`];
  } catch {
    return [`cron '${cron}' cannot be read`];
  }
}

type Sample = {
  readonly missed: MissedRun;
  readonly firings: readonly number[];
  /** The Istanbul day of each firing. */
  readonly days: readonly string[];
  /** The first firing in the backup window, if any. */
  readonly quietAt: number | undefined;
};

const inQuietHours = (at: number, day: string) =>
  at >= istanbulInstant(day, QUIET_START) && at < istanbulInstant(day, QUIET_END);

// The instants a cron fires in the sample, and whether it runs at most daily (missed
// once) or more often (missed skip). A job that fires twice within a day stops the walk:
// its firings are never needed, since it may not stand in an after list. A sample depends
// on the cron text alone, so each text is walked once.
const samples = new Map<string, Sample>();
function sampleOf(cron: string): Sample {
  const known = samples.get(cron);
  if (known !== undefined) return known;
  const times = timesOf(cron);
  const firings: number[] = [];
  let sample: Sample | null = null;
  while (sample === null && times.hasNext()) {
    const at = times.next().getTime();
    const previous = firings.at(-1);
    if (previous !== undefined && at - previous < DAY_MS) {
      sample = { missed: 'skip', firings: [], days: [], quietAt: undefined };
    } else {
      firings.push(at);
    }
  }
  if (sample === null) {
    const days = firings.map(istanbulDate);
    const quietAt = firings.find((at, index) => inQuietHours(at, days[index] ?? ''));
    sample = { missed: 'once', firings, days, quietAt };
  }
  samples.set(cron, sample);
  return sample;
}

/** once for a job that fires at most once a day, skip for a more frequent one. */
export function missedRunOf(cron: string): MissedRun {
  return sampleOf(cron).missed;
}

const clock = (at: number) => new Date(at).toISOString();

/** The rules a list of job definitions breaks across its schedules. */
export function scheduleRuleProblems(definitions: readonly JobDefinition[]): string[] {
  const problems: string[] = [];
  const scheduled = definitions.flatMap((definition) =>
    definition.schedule === null
      ? []
      : [
          {
            name: definition.queue.name,
            schedule: definition.schedule,
            sample: sampleOf(definition.schedule.cron),
          },
        ],
  );
  const byName = new Map(scheduled.map((entry) => [entry.name, entry]));
  const daily = scheduled.filter((entry) => entry.sample.missed === 'once');

  for (const { name, schedule, sample } of scheduled) {
    if (schedule.missed !== sample.missed) {
      problems.push(`${name}: missed must be ${sample.missed} for its frequency`);
    }
    for (const before of schedule.after) {
      const other = byName.get(before);
      if (other === undefined || other.sample.missed !== 'once') {
        problems.push(`${name}: ${before} in its after list is not a daily or rare job`);
        continue;
      }
      // Both lists are in order: one pass finds the last earlier firing of each.
      let index = -1;
      for (const [position, at] of sample.firings.entries()) {
        while ((other.sample.firings[index + 1] ?? Number.POSITIVE_INFINITY) <= at - AFTER_GAP_MS) {
          index += 1;
        }
        if (index < 0 || other.sample.days[index] !== sample.days[position]) {
          problems.push(`${name}: ${before} does not run ten minutes before it on ${clock(at)}`);
          break;
        }
      }
    }
  }

  for (const { name, sample } of daily) {
    if (sample.quietAt !== undefined) {
      problems.push(`${name}: starts in the 03:00 to 05:00 window at ${clock(sample.quietAt)}`);
    }
  }
  // Every daily firing in one ordered list: two jobs too close are neighbours there.
  const all = daily
    .flatMap(({ name, sample }) => sample.firings.map((at) => ({ name, at })))
    .sort((a, b) => a.at - b.at);
  const reported = new Set<string>();
  for (const [index, first] of all.entries()) {
    for (let next = index + 1; next < all.length; next += 1) {
      const second = all[next];
      if (second === undefined || second.at - first.at >= DAILY_GAP_MS) break;
      const pair = [first.name, second.name].sort().join(' and ');
      if (second.name !== first.name && !reported.has(pair)) {
        reported.add(pair);
        problems.push(`${pair}: less than five minutes apart at ${clock(first.at)}`);
      }
    }
  }
  return problems;
}
