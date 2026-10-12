import type { DatabaseTransientCode } from '@iu-attendance/contracts/database';
import {
  SQLSTATE_PATTERN,
  type TransientKind,
  transientKind,
} from '@iu-attendance/contracts/shared';

// Database errors (D12, I068). Drizzle wraps the pg error in its own query error, so the
// SQLSTATE sits somewhere on the cause chain; these helpers read it from there. The
// database error a transaction throws carries the SQLSTATE as its code and the pg fields
// in its cause, { reason, sqlstate, constraint, table }; the same walk reads both.

// The module code a transaction answers for each transient kind (503, retried later).
const TRANSIENT_ERROR_CODES = {
  contention: 'DATABASE_CONTENTION',
  pool: 'DATABASE_POOL_FULL',
  unavailable: 'DATABASE_UNAVAILABLE',
  timeout: 'DATABASE_TIMEOUT',
} as const satisfies Record<TransientKind, DatabaseTransientCode>;

// Failures with no SQLSTATE: no connection was made or it was lost. Node's socket codes,
// and the messages of pg 8 (pg-pool's connect timeout carries the lost connection as its
// cause). A FATAL error inside a transaction arrives this way too: drizzle's rollback on
// the closed connection fails and replaces the error, so 57P01, 25P03 and 25P04 there read
// as a lost connection, still unavailable.
const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
]);
// The second is a query still running when the pool closes the connection at shutdown.
const CONNECTION_LOST = new Set(['Connection terminated unexpectedly', 'Connection terminated']);
// pg-pool's answer when no client of a full pool came free within the wait.
const POOL_WAIT_EXPIRED = 'timeout exceeded when trying to connect';

type ErrorNode = {
  code?: unknown;
  sqlstate?: unknown;
  constraint?: unknown;
  table?: unknown;
  message?: unknown;
  cause?: unknown;
};

// How deep the cause chain is followed: a wrapper or two in practice, never a loop.
const MAX_CAUSES = 8;

function* causeChain(error: unknown): Generator<ErrorNode> {
  let current = error;
  for (
    let depth = 0;
    depth < MAX_CAUSES && typeof current === 'object' && current !== null;
    depth += 1
  ) {
    yield current as ErrorNode;
    current = (current as ErrorNode).cause;
  }
}

const sqlstateOf = (node: ErrorNode) =>
  [node.code, node.sqlstate].find(
    (value): value is string => typeof value === 'string' && SQLSTATE_PATTERN.test(value),
  ) ?? null;
const nameOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

/**
 * The module code of a transient database error, or null for any other error. The first
 * error on the chain that says what happened decides: its SQLSTATE, or a lost connection.
 */
export function transientErrorCode(error: unknown): DatabaseTransientCode | null {
  for (const node of causeChain(error)) {
    const sqlstate = sqlstateOf(node);
    if (sqlstate !== null) {
      const kind = transientKind(sqlstate);
      return kind === null ? null : TRANSIENT_ERROR_CODES[kind];
    }
    if (typeof node.code === 'string' && NETWORK_CODES.has(node.code)) {
      return 'DATABASE_UNAVAILABLE';
    }
    if (node.message === POOL_WAIT_EXPIRED) return 'DATABASE_POOL_FULL';
    if (typeof node.message === 'string' && CONNECTION_LOST.has(node.message)) {
      return 'DATABASE_UNAVAILABLE';
    }
  }
  return null;
}

/**
 * The SQLSTATE, constraint and table of an integrity constraint violation (class 23), for
 * the caller that branches on which constraint a write hit; null for any other error.
 */
export function constraintViolation(
  error: unknown,
): { sqlstate: string; constraint: string | null; table: string | null } | null {
  let sqlstate: string | null = null;
  let constraint: string | null = null;
  let table: string | null = null;
  for (const node of causeChain(error)) {
    sqlstate ??= sqlstateOf(node);
    constraint ??= nameOf(node.constraint);
    table ??= nameOf(node.table);
  }
  if (sqlstate === null || !sqlstate.startsWith('23')) return null;
  return { sqlstate, constraint, table };
}
