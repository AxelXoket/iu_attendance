import { createHash } from 'node:crypto';
import { is } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  getTableConfig,
  PgDateString,
  PgDialect,
  PgTime,
  PgTimestamp,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  CONSTRAINT_KINDS,
  type ConstraintKind,
  constraintName,
  DIGEST_HEX_LENGTH,
  MAX_IDENTIFIER_BYTES,
} from './constraint-name.ts';
import * as facade from './index.ts';
import { registeredStatusChecks, tableHelpers } from './table-helpers.ts';

// constraintName is checked against the spec's examples, golden shortened names computed
// with a plain SHA-256 outside the code, and fast-check properties. The table helpers are
// checked through the column and constraint objects drizzle-kit reads to write DDL.

type NameInput = {
  table: string;
  columns: string[];
  kind: ConstraintKind;
  suffix: string | undefined;
};

const nameOf = (input: NameInput): string =>
  constraintName(input.table, input.columns, input.kind, input.suffix);

// The untruncated name exactly as the spec writes it: <table>_<columns>_<suffix>_<kind>.
const fullNameOf = (input: NameInput): string =>
  [
    input.table,
    ...input.columns,
    ...(input.suffix === undefined ? [] : [input.suffix]),
    input.kind,
  ].join('_');

const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex');

const identifier = fc.stringMatching(/^[a-z][a-z0-9_]{0,30}$/);
const kind = fc.constantFrom(...CONSTRAINT_KINDS);
const anyInput = fc.record({
  table: identifier,
  columns: fc.array(identifier, { maxLength: 6 }),
  kind,
  suffix: fc.option(identifier, { nil: undefined }),
});
// At least 41 + 2 * 12 + 3 = 68 bytes, so always over the limit.
const longInput = fc.record({
  table: fc.stringMatching(/^[a-z][a-z0-9_]{40,59}$/),
  columns: fc.array(fc.stringMatching(/^[a-z][a-z0-9_]{10,20}$/), { minLength: 2, maxLength: 5 }),
  kind,
  suffix: fc.option(identifier, { nil: undefined }),
});

describe('constraintName', () => {
  it('builds <table>_<columns>_<suffix>_<kind> as in the spec examples', () => {
    expect(constraintName('sessions', [], 'tg', 'immutable')).toBe('sessions_immutable_tg');
    expect(constraintName('sessions', [], 'idx', 'unconfirmed')).toBe('sessions_unconfirmed_idx');
    expect(constraintName('sessions', ['course_id', 'date'], 'uq', 'trial')).toBe(
      'sessions_course_id_date_trial_uq',
    );
    expect(constraintName('sessions', ['id'], 'pk')).toBe('sessions_id_pk');
    expect(constraintName('sessions', ['course_id'], 'fk')).toBe('sessions_course_id_fk');
  });

  it('keeps a 63-byte name and shortens a 64-byte one (PostgreSQL identifier limit)', () => {
    const kept = constraintName('a'.repeat(60), [], 'pk');
    expect(kept).toBe(`${'a'.repeat(60)}_pk`);
    expect(kept).toHaveLength(63);

    const shortened = constraintName('a'.repeat(61), [], 'pk');
    expect(shortened).not.toBe(`${'a'.repeat(61)}_pk`);
    expect(shortened.length).toBeLessThanOrEqual(63);
    expect(shortened).toMatch(/^a+_[0-9a-f]{8}_pk$/);
  });

  it('shortens a long name to <body>_<first 8 hex of the full name SHA-256>_<kind>', () => {
    // Digests computed once with a plain SHA-256 of the full names, not with this code.
    expect(
      constraintName(
        'roster_bucket_entries',
        ['section_id', 'registration_code'],
        'idx',
        'pending_review',
      ),
    ).toBe('roster_bucket_entries_section_id_registration_code_1ddbea04_idx');
    // The cut lands right after a separator, which is dropped.
    expect(
      constraintName(
        'attendance_records',
        ['session_id', 'student_id', 'device_id', 'client_id'],
        'uq',
        'counted',
      ),
    ).toBe('attendance_records_session_id_student_id_device_id_eae6f201_uq');
  });

  it('refuses a part that is not lower-case ASCII snake_case and a kind outside the list', () => {
    const bad: Array<[string, () => string]> = [
      ['upper-case table', () => constraintName('Sessions', ['id'], 'pk')],
      ['non-ASCII column', () => constraintName('sessions', ['dönem_id'], 'fk')],
      ['empty table', () => constraintName('', ['id'], 'pk')],
      ['leading digit', () => constraintName('1sessions', ['id'], 'pk')],
      ['space in column', () => constraintName('sessions', ['course id'], 'uq')],
      ['empty column', () => constraintName('sessions', [''], 'uq')],
      ['empty suffix', () => constraintName('sessions', ['id'], 'uq', '')],
      ['quoted suffix', () => constraintName('sessions', ['id'], 'uq', 'a"b')],
      ['unknown kind', () => constraintName('sessions', ['id'], 'pkey' as ConstraintKind)],
    ];
    for (const [label, call] of bad) expect(call, label).toThrow(TypeError);
    // Positive control: the same parts written correctly pass.
    expect(constraintName('sessions', ['term_id'], 'fk', 'current')).toBe(
      'sessions_term_id_current_fk',
    );
  });

  it('fast-check: at most 63 bytes, ASCII, ends with the kind, same input same name', () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const name = nameOf(input);
        expect(Buffer.byteLength(name, 'utf8')).toBeLessThanOrEqual(MAX_IDENTIFIER_BYTES);
        expect(name).toMatch(/^[a-z0-9_]+$/);
        expect(name.endsWith(`_${input.kind}`)).toBe(true);
        expect(nameOf({ ...input, columns: [...input.columns] })).toBe(name);
        const fullName = fullNameOf(input);
        if (fullName.length <= MAX_IDENTIFIER_BYTES) expect(name).toBe(fullName);
      }),
      { numRuns: 2000 },
    );
  });

  it('fast-check: a long name keeps a prefix of the full name and its digest', () => {
    fc.assert(
      fc.property(longInput, (input) => {
        const name = nameOf(input);
        const fullName = fullNameOf(input);
        const tail = `_${input.kind}`;
        const digest = name.slice(-(tail.length + DIGEST_HEX_LENGTH), -tail.length);
        const body = name.slice(0, -(tail.length + DIGEST_HEX_LENGTH + 1));
        expect(digest).toBe(sha256Hex(fullName).slice(0, DIGEST_HEX_LENGTH));
        expect(fullName.startsWith(body)).toBe(true);
        expect(body.endsWith('_')).toBe(false);
      }),
      { numRuns: 1000 },
    );
  });

  it('fast-check: two long names that differ only past the cut still get different names', () => {
    fc.assert(
      fc.property(longInput, identifier, identifier, (input, lastA, lastB) => {
        fc.pre(lastA !== lastB);
        const a = nameOf({ ...input, columns: [...input.columns, lastA] });
        const b = nameOf({ ...input, columns: [...input.columns, lastB] });
        expect(a).not.toBe(b);
        // Ground control: the bodies are equal, so only the digest tells them apart.
        const bodyLength = (name: string) =>
          name.length - (input.kind.length + DIGEST_HEX_LENGTH + 2);
        expect(a.slice(0, bodyLength(a))).toBe(b.slice(0, bodyLength(b)));
      }),
      { numRuns: 1000 },
    );
  });

  it('fast-check: a different suffix on the same table and columns gives a different name', () => {
    fc.assert(
      fc.property(fc.oneof(anyInput, longInput), identifier, (input, other) => {
        fc.pre(input.suffix !== other);
        expect(nameOf({ ...input, suffix: other })).not.toBe(nameOf(input));
        expect(nameOf({ ...input, suffix: other })).not.toBe(
          nameOf({ ...input, suffix: undefined }),
        );
      }),
      { numRuns: 2000 },
    );
  });
});

describe('tableHelpers', () => {
  const dialect = new PgDialect();
  const render = (value: Parameters<PgDialect['sqlToQuery']>[0]) =>
    dialect.sqlToQuery(value.inlineParams(), 'indexes').sql;

  const samples = tableHelpers.app.table(
    'helper_samples',
    {
      id: tableHelpers.id(),
      courseId: uuid().notNull(),
      createdAt: tableHelpers.instant('created_at').notNull(),
      deletedAt: tableHelpers.instant('deleted_at'),
      lessonDate: tableHelpers.date('lesson_date'),
      startsAt: tableHelpers.localTime('starts_at'),
    },
    (t) => [primaryKey({ name: constraintName('helper_samples', ['id'], 'pk'), columns: [t.id] })],
  );
  const config = getTableConfig(samples);
  const column = (name: string) => {
    const found = config.columns.find((it) => it.name === name);
    if (found === undefined) throw new Error(`no column ${name}`);
    return found;
  };

  it('defines tables in the existing app schema with snake_case column names', () => {
    expect(tableHelpers.app.schemaName).toBe('app');
    // The setup step creates the schema; drizzle-kit must not write CREATE SCHEMA.
    expect(tableHelpers.app.isExisting).toBe(true);
    expect(config.schema).toBe('app');
    expect(column('course_id').name).toBe('course_id');
    expect(config.primaryKeys.map((pk) => pk.getName())).toEqual(['helper_samples_id_pk']);
  });

  it('id is a NOT NULL uuid named id with DEFAULT uuidv7() and no column-level key', () => {
    const id = column('id');
    expect(id.getSQLType()).toBe('uuid');
    expect(id.notNull).toBe(true);
    expect(id.primary).toBe(false);
    expect(id.hasDefault).toBe(true);
    expect(render(id.default as Parameters<typeof render>[0])).toBe('uuidv7()');
    expectTypeOf<typeof samples.$inferSelect.id>().toEqualTypeOf<string>();
    expectTypeOf<typeof samples.$inferInsert>()
      .toHaveProperty('id')
      .toEqualTypeOf<string | undefined>();
  });

  it('instant is timestamptz(3) read as Date, without a default, nullable unless asked', () => {
    for (const name of ['created_at', 'deleted_at']) {
      const instant = column(name);
      expect(is(instant, PgTimestamp)).toBe(true);
      expect((instant as PgTimestamp).withTimezone).toBe(true);
      expect((instant as PgTimestamp).precision).toBe(3);
      expect(instant.hasDefault).toBe(false);
    }
    expect(column('created_at').notNull).toBe(true);
    expect(column('deleted_at').notNull).toBe(false);
    expectTypeOf<typeof samples.$inferSelect.createdAt>().toEqualTypeOf<Date>();
    expectTypeOf<typeof samples.$inferSelect.deletedAt>().toEqualTypeOf<Date | null>();
  });

  it('date is a date column read as text and localTime a time column read as text', () => {
    const lessonDate = column('lesson_date');
    expect(is(lessonDate, PgDateString)).toBe(true);
    expect(lessonDate.getSQLType()).toBe('date');
    const startsAt = column('starts_at');
    expect(is(startsAt, PgTime)).toBe(true);
    expect((startsAt as PgTime).withTimezone).toBe(false);
    expect(startsAt.getSQLType()).toBe('time');
    expectTypeOf<typeof samples.$inferSelect.lessonDate>().toEqualTypeOf<string | null>();
    expectTypeOf<typeof samples.$inferSelect.startsAt>().toEqualTypeOf<string | null>();
  });

  it('statusCheck builds CHECK (column IN (values)) named by constraintName', () => {
    const plain = tableHelpers.statusCheck('status_samples', 'state', ['planned', 'cancelled']);
    expect(plain.name).toBe(constraintName('status_samples', ['state'], 'ck'));
    expect(render(plain.value)).toBe(`"state" IN ('planned', 'cancelled')`);

    const withSuffix = tableHelpers.statusCheck('status_samples', 'state', ['held'], 'past');
    expect(withSuffix.name).toBe(constraintName('status_samples', ['state'], 'ck', 'past'));
    expect(withSuffix.name).not.toBe(plain.name);

    // Values travel as parameters, so a quote cannot end the literal early.
    const quoted = tableHelpers.statusCheck('status_samples', 'note', ["it's", 'b']);
    expect(render(quoted.value)).toBe(`"note" IN ('it''s', 'b')`);
  });

  it('statusCheck records the list once drizzle builds the table, and only once', () => {
    const values = ['open', 'closed'];
    const reports = tableHelpers.app.table('report_samples', { state: text() }, () => [
      tableHelpers.statusCheck('report_samples', 'state', values),
    ]);
    const name = constraintName('report_samples', ['state'], 'ck');
    const recorded = () => registeredStatusChecks().filter((it) => it.name === name);
    // Ground control: drizzle builds constraints when the config is read, not before.
    expect(recorded()).toEqual([]);

    getTableConfig(reports);
    getTableConfig(reports);
    expect(recorded()).toEqual([
      { name, table: 'report_samples', column: 'state', values: ['open', 'closed'] },
    ]);
    // The record is a copy: changing the caller's array afterwards does not reach it.
    values.push('archived');
    expect(recorded()[0]?.values).toEqual(['open', 'closed']);
  });

  it('statusCheck lists the records ordered by name', () => {
    tableHelpers.statusCheck('order_samples_z', 'state', ['a']);
    tableHelpers.statusCheck('order_samples_a', 'state', ['a']);
    const names = registeredStatusChecks().map((it) => it.name);
    expect(names).toEqual([...names].sort());
    expect(names).toContain('order_samples_a_state_ck');
    expect(names).toContain('order_samples_z_state_ck');
  });

  it('statusCheck refuses another list under a registered name, an empty list and a repeat', () => {
    tableHelpers.statusCheck('clash_samples', 'state', ['a', 'b']);
    // Positive control: the same definition again is accepted.
    expect(() => tableHelpers.statusCheck('clash_samples', 'state', ['a', 'b'])).not.toThrow();
    expect(() => tableHelpers.statusCheck('clash_samples', 'state', ['a', 'c'])).toThrow(
      /already registered/,
    );
    expect(() => tableHelpers.statusCheck('clash_samples', 'state', ['b', 'a'])).toThrow(
      /already registered/,
    );
    // Same name from another table and column split ('clash_samples_state' + 'x').
    expect(() => tableHelpers.statusCheck('clash_samples_state', 'x', ['a', 'b'])).not.toThrow();
    expect(() => tableHelpers.statusCheck('clash_samples', 'state_x', ['a', 'b'])).toThrow(
      /already registered/,
    );
    expect(() => tableHelpers.statusCheck('empty_samples', 'state', [])).toThrow(/no values/);
    expect(() => tableHelpers.statusCheck('repeat_samples', 'state', ['a', 'a'])).toThrow(
      /repeats a value/,
    );
  });
});

describe('index.ts', () => {
  it('is the single entry: it re-exports constraintName and tableHelpers', () => {
    expect(facade.constraintName).toBe(constraintName);
    expect(facade.tableHelpers).toBe(tableHelpers);
    expect(Object.isFrozen(facade.tableHelpers)).toBe(true);
  });

  it('Transaction is the tx a schemaless Drizzle instance hands to transaction()', () => {
    // Checked by tsc (typecheck), which fails when the two types differ.
    const probe = (db: NodePgDatabase) =>
      db.transaction(async (tx) => {
        expectTypeOf(tx).toEqualTypeOf<facade.Transaction>();
      });
    expectTypeOf(probe).returns.resolves.toBeVoid();
  });
});
