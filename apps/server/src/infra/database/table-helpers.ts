import { sql } from 'drizzle-orm';
import {
  type CheckBuilder,
  check,
  date as dateColumn,
  snakeCase,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { constraintName } from './constraint-name.ts';

// Shared column rules for every module's tables.ts (D12-B01, D12-B11). Table flags (client
// id, append only, partitionable, single row) are not here: they live in TABLE_FLAGS in the
// database contract file.

/** One CHECK with a text IN list, as the schema test compares it with the contract list. */
export interface StatusCheckRecord {
  readonly name: string;
  readonly table: string;
  readonly column: string;
  readonly values: readonly string[];
}

const statusChecks = new Map<string, StatusCheckRecord>();

/**
 * Every status check built so far, ordered by name. Drizzle builds a table's constraints only
 * when its config is read (getTableConfig, drizzle-kit), so the schema test reads this after
 * loading the tables.ts files of drizzle.config.ts and reading each table's config.
 */
export function registeredStatusChecks(): readonly StatusCheckRecord[] {
  return [...statusChecks.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function register(record: StatusCheckRecord): void {
  const known = statusChecks.get(record.name);
  if (known === undefined) {
    statusChecks.set(record.name, record);
    return;
  }
  // Reading a table's config again rebuilds the same check; anything else is a clash.
  if (
    known.table !== record.table ||
    known.column !== record.column ||
    !sameList(known.values, record.values)
  ) {
    throw new Error(`statusCheck: ${record.name} is already registered with another definition`);
  }
}

/**
 * CHECK (column IN (values)) named by constraintName(table, [column], 'ck', suffix). The values
 * come from the contract list; the check is recorded for the schema test. A NULL passes, so a
 * nullable status column keeps its NOT NULL decision separate.
 */
function statusCheck(
  table: string,
  column: string,
  values: readonly string[],
  suffix?: string,
): CheckBuilder {
  const name = constraintName(table, [column], 'ck', suffix);
  if (values.length === 0) throw new TypeError(`statusCheck: ${name} has no values`);
  if (new Set(values).size !== values.length) {
    throw new TypeError(`statusCheck: ${name} repeats a value`);
  }
  register(Object.freeze({ name, table, column, values: Object.freeze([...values]) }));
  const list = sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
  return check(name, sql`${sql.identifier(column)} IN (${list})`);
}

/**
 * Server-generated primary key column `id`: uuid, NOT NULL, DEFAULT uuidv7(). Declare the
 * primary key in the table's extra config as primaryKey({ name: constraintName(table, ['id'],
 * 'pk'), columns: [t.id] }); a column-level primaryKey() would get PostgreSQL's <table>_pkey.
 */
function id() {
  return uuid('id').notNull().default(sql`uuidv7()`);
}

/** Instant column: timestamptz(3), read and written as Date, no default. */
function instant(name: string) {
  return timestamp(name, { withTimezone: true, precision: 3, mode: 'date' });
}

/** Calendar date column: date, read and written as 'YYYY-MM-DD' text. */
function date(name: string) {
  return dateColumn(name, { mode: 'string' });
}

/** Local time of day column: time without time zone, read and written as text. */
function localTime(name: string) {
  return time(name);
}

/**
 * The application schema; the setup step creates it, so existing() keeps drizzle-kit generate
 * from writing CREATE SCHEMA. Table keys become snake_case columns. drizzle-kit's
 * programmatic API (generateDrizzleJson) leaves an existing schema's tables out entirely.
 */
const app = snakeCase.schema('app').existing();

export const tableHelpers = Object.freeze({ app, id, instant, date, localTime, statusCheck });
