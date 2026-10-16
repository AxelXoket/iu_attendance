// Corrections of one session and one roster row form a single linear chain: a change
// is a new CORRECTION row pointing at the last row, an undo is a REVERSAL row. The
// active correction is the last row, none when the last row is a REVERSAL. A student
// with several roster rows in the session (D09-A08) has one chain per roster row.

import { idKey } from '../shared/uuid.ts';

export type ChainRow = {
  id: string;
  kind: 'CORRECTION' | 'REVERSAL';
  previousCorrectionId: string | null;
};

export class CorrectionChainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorrectionChainError';
  }
}

export type ResolvedChain<R extends ChainRow> = {
  ordered: readonly R[];
  // Never a reversal.
  active: (R & { kind: 'CORRECTION' }) | null;
};

function indexRows<R extends ChainRow>(rows: readonly R[]): Map<string, R> {
  const byId = new Map<string, R>();
  for (const row of rows) {
    if (byId.has(idKey(row.id))) throw new CorrectionChainError(`row ${row.id} appears twice`);
    byId.set(idKey(row.id), row);
  }
  return byId;
}

// Orders the rows by their links, whatever their array order. Throws
// CorrectionChainError for anything that is not one linear chain: a repeated id, more
// than one head, a row with two successors, a link to an unknown row, a cycle.
export function resolveChain<R extends ChainRow>(rows: readonly R[]): ResolvedChain<R> {
  if (rows.length === 0) return { ordered: [], active: null };
  const byId = indexRows(rows);
  const successor = new Map<string, R>();
  const heads: R[] = [];
  for (const row of rows) {
    if (row.previousCorrectionId === null) {
      heads.push(row);
      continue;
    }
    if (idKey(row.previousCorrectionId) === idKey(row.id)) {
      throw new CorrectionChainError(`row ${row.id} points at itself`);
    }
    const previous = byId.get(idKey(row.previousCorrectionId));
    if (previous === undefined) {
      throw new CorrectionChainError(
        `row ${row.id} points at unknown row ${row.previousCorrectionId}`,
      );
    }
    if (successor.has(idKey(previous.id))) {
      throw new CorrectionChainError(`row ${previous.id} has two successors`);
    }
    // Only a correction can be reversed; a new correction may follow a reversal.
    if (row.kind === 'REVERSAL' && previous.kind !== 'CORRECTION') {
      throw new CorrectionChainError(`reversal ${row.id} does not follow a correction`);
    }
    successor.set(idKey(previous.id), row);
  }
  if (heads.length !== 1) throw new CorrectionChainError(`chain has ${heads.length} heads`);
  const head = heads[0] as R;
  if (head.kind === 'REVERSAL')
    throw new CorrectionChainError('a chain cannot start with a reversal');
  const ordered: R[] = [];
  for (let row: R | undefined = head; row !== undefined; row = successor.get(idKey(row.id))) {
    ordered.push(row);
  }
  // Rows that are not reachable from the head sit on a cycle.
  if (ordered.length !== rows.length) throw new CorrectionChainError('chain has a cycle');
  const last = ordered[ordered.length - 1] as R;
  return {
    ordered,
    active: last.kind === 'REVERSAL' ? null : (last as R & { kind: 'CORRECTION' }),
  };
}

// Splits the rows of one student in one session into chains, one per head: a row
// joins the chain of the head its links lead to, so each roster row of the student
// gets its own chain. Throws CorrectionChainError for a repeated id, a link to an
// unknown row and rows on a cycle; resolveChain checks each chain further. Chains come
// in the order of their heads in rows, each in link order from its head.
export function splitChains<R extends ChainRow>(rows: readonly R[]): R[][] {
  const byId = indexRows(rows);
  const followers = new Map<string, R[]>();
  const chains: R[][] = [];
  for (const row of rows) {
    if (row.previousCorrectionId === null) {
      chains.push([row]);
      continue;
    }
    if (!byId.has(idKey(row.previousCorrectionId))) {
      throw new CorrectionChainError(
        `row ${row.id} points at unknown row ${row.previousCorrectionId}`,
      );
    }
    const siblings = followers.get(row.previousCorrectionId);
    if (siblings === undefined) followers.set(row.previousCorrectionId, [row]);
    else siblings.push(row);
  }
  // Every row reachable from a head joins its chain; a row left over sits on a cycle.
  let reached = 0;
  for (const chain of chains) {
    for (let index = 0; index < chain.length; index += 1) {
      chain.push(...(followers.get((chain[index] as R).id) ?? []));
    }
    reached += chain.length;
  }
  if (reached !== rows.length) throw new CorrectionChainError('chain has a cycle');
  return chains;
}
