import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { startFakePostgres } from '../../../test/support/fake-postgres.ts';
import { closedPort, silentServer } from '../../../test/support/ports.ts';
import { constraintViolation, transientErrorCode } from './error.ts';

const poolFor = (port: number, options: pg.PoolConfig = {}) => {
  const pool = new pg.Pool({
    host: '127.0.0.1',
    port,
    user: 'test',
    database: 'test',
    connectionTimeoutMillis: 2000,
    ...options,
  });
  // A checked-out client has no error listener of the pool's; a lost connection would
  // otherwise end the test process.
  pool.on('connect', (client) => client.on('error', () => {}));
  return pool;
};

async function failureOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected a failure');
}

// A pg error as drizzle wraps it: the query error, its cause the driver's error.
const wrapped = (fields: Record<string, unknown>) => ({
  message: 'Failed query',
  cause: { message: 'driver error', ...fields },
});

describe('transientErrorCode', () => {
  it('turns each transient SQLSTATE into the module code, through the cause chain', () => {
    for (const [sqlstate, code] of [
      ['40P01', 'DATABASE_CONTENTION'],
      ['40001', 'DATABASE_CONTENTION'],
      ['55P03', 'DATABASE_CONTENTION'],
      ['53300', 'DATABASE_POOL_FULL'],
      ['57P01', 'DATABASE_UNAVAILABLE'],
      ['08006', 'DATABASE_UNAVAILABLE'],
      ['57014', 'DATABASE_TIMEOUT'],
      ['25P04', 'DATABASE_TIMEOUT'],
    ] as const) {
      expect(transientErrorCode(wrapped({ code: sqlstate })), sqlstate).toBe(code);
      expect(transientErrorCode({ code: sqlstate }), sqlstate).toBe(code);
    }
  });

  it('leaves any other error to the server error answer', () => {
    for (const error of [
      wrapped({ code: '23505' }),
      wrapped({ code: 'ENOENT' }),
      new Error('Connection terminated somewhere else'),
      new Error('plain'),
      null,
      'text',
    ]) {
      expect(transientErrorCode(error)).toBeNull();
    }
  });

  it("reads a database error's SQLSTATE from its code or from its cause", () => {
    const databaseError = {
      code: '57014',
      cause: { reason: 'timeout', sqlstate: '57014', constraint: null, table: null },
    };
    expect(transientErrorCode(databaseError)).toBe('DATABASE_TIMEOUT');
    // An app error whose code is a module code, the SQLSTATE in its cause.
    const appError = { code: 'DATABASE_TIMEOUT', cause: { reason: 'timeout', sqlstate: '25P04' } };
    expect(transientErrorCode(appError)).toBe('DATABASE_TIMEOUT');
  });
});

describe('transientErrorCode against the real driver', () => {
  it('reads a refused connection as unavailable, on an address and on localhost', async () => {
    const port = await closedPort();
    for (const host of ['127.0.0.1', 'localhost']) {
      const pool = poolFor(port, { host });
      const error = await failureOf(() => pool.query('select 1'));
      await pool.end();
      expect(transientErrorCode(error), host).toBe('DATABASE_UNAVAILABLE');
    }
  });

  it("reads a connect timeout as unavailable and a full pool's wait as pool full", async () => {
    const silent = await silentServer();
    const slow = poolFor(silent.port, { connectionTimeoutMillis: 100 });
    const timedOut = await failureOf(() => slow.query('select 1'));
    await slow.end();
    await silent.close();
    expect(transientErrorCode(timedOut)).toBe('DATABASE_UNAVAILABLE');

    const fake = await startFakePostgres(() => undefined);
    const full = poolFor(fake.port, { max: 1, connectionTimeoutMillis: 100 });
    const held = await full.connect();
    const waited = await failureOf(() => full.connect());
    held.release();
    await full.end();
    await fake.close();
    expect(transientErrorCode(waited)).toBe('DATABASE_POOL_FULL');
  });

  it('reads a query cut off by closing its connection as unavailable', async () => {
    const fake = await startFakePostgres((query) =>
      query === 'select forever' ? { silent: true } : undefined,
    );
    const client = new pg.Client({ host: '127.0.0.1', port: fake.port, user: 'test' });
    await client.connect();
    const running = failureOf(() => client.query('select forever'));
    await client.end();
    const error = await running;
    await fake.close();
    expect(error).toMatchObject({ message: 'Connection terminated' });
    expect(transientErrorCode(error)).toBe('DATABASE_UNAVAILABLE');
  });

  it('keeps the SQLSTATE of an error in a transaction; a FATAL one reads as unavailable', async () => {
    const fake = await startFakePostgres((query) => {
      if (query === 'select slow') return { error: '57014' };
      if (query === 'insert twice') {
        return { error: '23505', constraint: 'records_term_id_uq', table: 'records' };
      }
      // A transaction timeout is FATAL: the server closes the connection.
      if (query === 'select too long') return { error: '25P04', fatal: true };
      return undefined;
    });
    const pool = poolFor(fake.port);
    const db = drizzle({ client: pool });
    const inTransaction = (text: string) =>
      failureOf(() => db.transaction((tx) => tx.execute(sql.raw(text))));
    const slow = await inTransaction('select slow');
    const twice = await inTransaction('insert twice');
    const fatal = await inTransaction('select too long');
    await pool.end();
    await fake.close();
    expect(transientErrorCode(slow)).toBe('DATABASE_TIMEOUT');
    expect(transientErrorCode(twice)).toBeNull();
    expect(constraintViolation(twice)).toEqual({
      sqlstate: '23505',
      constraint: 'records_term_id_uq',
      table: 'records',
    });
    // drizzle's rollback on the closed connection fails and replaces the FATAL error, so
    // 25P04 is gone and the lost connection decides.
    expect(fatal).toMatchObject({ message: expect.stringMatching(/^Failed query: rollback/) });
    expect(transientErrorCode(fatal)).toBe('DATABASE_UNAVAILABLE');
  });
});

describe('constraintViolation', () => {
  it('names the SQLSTATE, constraint and table of a class 23 error', () => {
    expect(
      constraintViolation(
        wrapped({ code: '23505', constraint: 'records_term_id_uq', table: 'records' }),
      ),
    ).toEqual({ sqlstate: '23505', constraint: 'records_term_id_uq', table: 'records' });
    expect(constraintViolation(wrapped({ code: '23502', table: 'records' }))).toEqual({
      sqlstate: '23502',
      constraint: null,
      table: 'records',
    });
  });

  it('returns null for every other error, and stops on a looping cause chain', () => {
    expect(constraintViolation(wrapped({ code: '40P01', constraint: 'x' }))).toBeNull();
    // Other classes that start with 2: data exception, invalid transaction state.
    for (const sqlstate of ['22001', '25006', '2F005']) {
      expect(constraintViolation(wrapped({ code: sqlstate })), sqlstate).toBeNull();
    }
    // An empty name is no name.
    expect(constraintViolation(wrapped({ code: '23505', constraint: '', table: '' }))).toEqual({
      sqlstate: '23505',
      constraint: null,
      table: null,
    });
    expect(constraintViolation(new Error('plain'))).toBeNull();
    const looping: { cause?: unknown } = {};
    looping.cause = looping;
    expect(constraintViolation(looping)).toBeNull();
    // The SQLSTATE deep in a chain of wrappers is still found.
    expect(constraintViolation({ cause: { cause: { code: '23514', constraint: 'c' } } })).toEqual({
      sqlstate: '23514',
      constraint: 'c',
      table: null,
    });
  });

  it('reads a database error: the SQLSTATE as its code, the names in its cause', () => {
    const databaseError = {
      code: '23505',
      cause: { reason: 'unique', sqlstate: '23505', constraint: 'records_pk', table: 'records' },
    };
    expect(constraintViolation(databaseError)).toEqual({
      sqlstate: '23505',
      constraint: 'records_pk',
      table: 'records',
    });
  });
});
