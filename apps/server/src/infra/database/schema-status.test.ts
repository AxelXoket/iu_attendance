import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { type FakeAnswer, startFakePostgres } from '../../../test/support/fake-postgres.ts';
import { closedPort } from '../../../test/support/ports.ts';
import { newestMigrationHash, readSchemaStatus, schemaStatusOf } from './schema-status.ts';

const MIGRATIONS = fileURLToPath(new URL('../../../migrations', import.meta.url));
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const NEWEST = 'a'.repeat(64);
const OLDER = 'b'.repeat(64);
const NEWER = 'c'.repeat(64);

describe('newestMigrationHash', () => {
  const folder = mkdtempSync(join(tmpdir(), 'migrations-'));
  afterAll(() => rmSync(folder, { recursive: true, force: true }));
  const add = (name: string, text: string | null) => {
    mkdirSync(join(folder, name));
    if (text !== null) writeFileSync(join(folder, name, 'migration.sql'), text);
  };

  it('is the hash of the newest folder holding a migration, as the migrator writes it', () => {
    add('20261012000000_rosters_second', 'SELECT 2;');
    add('20261010000000_database_first', 'SELECT 1;');
    // A folder without migration.sql is no migration, however new its name.
    add('20261013000000_rosters_draft', null);
    expect(newestMigrationHash(folder)).toBe(sha256('SELECT 2;'));
  });

  it("reads the server's own folder, and refuses a folder with no migration", () => {
    const only = readFileSync(
      join(MIGRATIONS, '20261010080000_database_functions', 'migration.sql'),
    );
    expect(newestMigrationHash(MIGRATIONS)).toBe(sha256(only.toString()));
    const empty = mkdtempSync(join(tmpdir(), 'migrations-'));
    try {
      expect(() => newestMigrationHash(empty)).toThrow(/No migration/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('schemaStatusOf', () => {
  const read = (applied: readonly string[], generation: string | null) =>
    ({ kind: 'read', applied, generation }) as const;

  it('is ready when the ledger holds the newest migration, later ones too', () => {
    for (const applied of [
      [OLDER, NEWEST],
      [OLDER, NEWEST, NEWER],
    ]) {
      expect(schemaStatusOf(NEWEST, read(applied, '7.2'))).toEqual({
        ready: true,
        reason: 'ready',
        expectedMigration: NEWEST,
        generation: '7.2',
      });
    }
  });

  it('reports unreachable, then behind, then an uncertain generation', () => {
    expect(schemaStatusOf(NEWEST, { kind: 'unreachable' })).toMatchObject({
      ready: false,
      reason: 'unreachable',
      generation: null,
    });
    for (const applied of [[], [OLDER], [OLDER, NEWER]]) {
      expect(schemaStatusOf(NEWEST, read(applied, '7.2'))).toMatchObject({
        ready: false,
        reason: 'behind',
      });
    }
    expect(schemaStatusOf(NEWEST, read([NEWEST], null))).toMatchObject({
      ready: false,
      reason: 'generation_uncertain',
    });
  });
});

describe('readSchemaStatus against the real driver', () => {
  // A database whose ledger and generation functions answer as given.
  const database = (ledger: readonly string[] | null, walTimeline = 2) =>
    startFakePostgres((query): FakeAnswer | undefined => {
      if (query.includes('to_regclass')) return { rows: [{ present: ledger !== null }] };
      if (query.includes('FROM drizzle.__drizzle_migrations')) {
        return { rows: (ledger ?? []).map((hash) => ({ hash })) };
      }
      if (query.includes('database_generation_control_file')) {
        return { rows: [{ system_identifier: '7310000000000000001', timeline_id: 2 }] };
      }
      if (query.includes('database_generation_wal_file')) {
        return {
          rows: [
            {
              wal_file: `${walTimeline.toString(16).toUpperCase().padStart(8, '0')}0000000000000003`,
            },
          ],
        };
      }
      return undefined;
    });
  const statusOn = async (port: number) => {
    const pool = new pg.Pool({ host: '127.0.0.1', port, user: 'test', database: 'test' });
    pool.on('connect', (client) => client.on('error', () => {}));
    try {
      return await readSchemaStatus(drizzle({ client: pool }), NEWEST);
    } finally {
      await pool.end();
    }
  };

  it('is ready on a current or newer database, in a read-only transaction', async () => {
    for (const ledger of [
      [OLDER, NEWEST],
      [NEWEST, NEWER],
    ]) {
      const fake = await database(ledger);
      expect(await statusOn(fake.port)).toEqual({
        ready: true,
        reason: 'ready',
        expectedMigration: NEWEST,
        generation: '7310000000000000001.2',
      });
      expect(fake.queries[0]).toMatch(/^begin read only$/i);
      await fake.close();
    }
  });

  it('is behind before the first migration and without the newest, reading no generation', async () => {
    for (const ledger of [null, [], [OLDER]]) {
      const fake = await database(ledger);
      expect(await statusOn(fake.port), JSON.stringify(ledger)).toMatchObject({
        ready: false,
        reason: 'behind',
        generation: null,
      });
      expect(fake.queries.some((query) => query.includes('database_generation'))).toBe(false);
      await fake.close();
    }
  });

  it('is uncertain while the two timelines disagree', async () => {
    const fake = await database([NEWEST], 3);
    expect(await statusOn(fake.port)).toMatchObject({ reason: 'generation_uncertain' });
    await fake.close();
  });

  it('is unreachable without a connection or when the connection is lost', async () => {
    expect(await statusOn(await closedPort())).toMatchObject({ reason: 'unreachable' });
    const fake = await startFakePostgres((query) =>
      query.includes('to_regclass') ? { error: '57P01', fatal: true } : undefined,
    );
    expect(await statusOn(fake.port)).toMatchObject({ reason: 'unreachable' });
    await fake.close();
  });
});
