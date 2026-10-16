// The shared limit (D07): a record the clock could not verify, or one sent with the backup
// code, is accepted automatically in at most SHARED_LIMIT_SESSIONS sessions of a (term,
// student, course), theory and practice together; past that it waits in review. A session
// spends the right once, every later record of that session is accepted with it, and a
// spent right never comes back, even when the record is rejected later. The rule is pure:
// the verification module locks the counter row, asks here, and writes the returned
// counter only in the transaction that really inserts the record, so a record that is not
// inserted spends nothing.

import { idKey } from '../shared/uuid.ts';
import type { DecisionReason, Labels } from './codes.ts';
import { SHARED_LIMIT_SESSIONS } from './constants.ts';

/** A (term, student, course) counter row: used is the number of sessions listed (D07 CHECK). */
export type SharedLimitCounter = {
  readonly used: number;
  readonly usedSessionIds: readonly string[];
};

export type SharedLimitInput = {
  /** A record with either label uses one right at most. */
  readonly labels: Pick<Labels, 'CLOCK_UNVERIFIED' | 'BACKUP_CODE'>;
  /** Another rule fits the record, so it will not be present and the limit does not apply. */
  readonly otherRuleFits: boolean;
  readonly sessionId: string;
  readonly counter: SharedLimitCounter;
};

export type SharedLimitResult = {
  /** null: the limit does not apply to the record. */
  readonly reason: Extract<
    DecisionReason,
    'ACCEPTED_BY_SHARED_LIMIT' | 'SHARED_LIMIT_EXCEEDED'
  > | null;
  /** The record takes a new right: the counter below has one more session. */
  readonly spendsRight: boolean;
  /** The counter to write once the record is inserted, the new session in lower case; the input counter when nothing is spent. */
  readonly counter: SharedLimitCounter;
};

/**
 * The labels that send a record to the shared limit when no other rule fits: the
 * verification module also locks the counter row for every record that carries one.
 */
export function usesSharedLimit(labels: SharedLimitInput['labels']): boolean {
  return labels.CLOCK_UNVERIFIED || labels.BACKUP_CODE;
}

/** RangeError for a counter the table cannot hold: used not the count of its sessions, or a session twice. */
export function sharedLimitDecision(input: SharedLimitInput): SharedLimitResult {
  const { counter } = input;
  const usedSessions = new Set(counter.usedSessionIds.map(idKey));
  if (counter.used !== counter.usedSessionIds.length || usedSessions.size !== counter.used) {
    throw new RangeError('the shared limit counter does not match its sessions');
  }
  const unchanged = { spendsRight: false, counter } as const;
  if (!usesSharedLimit(input.labels) || input.otherRuleFits) {
    return { reason: null, ...unchanged };
  }
  // A session that holds a right accepts every record of it, also past the limit.
  if (usedSessions.has(idKey(input.sessionId))) {
    return { reason: 'ACCEPTED_BY_SHARED_LIMIT', ...unchanged };
  }
  if (counter.used >= SHARED_LIMIT_SESSIONS)
    return { reason: 'SHARED_LIMIT_EXCEEDED', ...unchanged };
  return {
    reason: 'ACCEPTED_BY_SHARED_LIMIT',
    spendsRight: true,
    counter: {
      used: counter.used + 1,
      usedSessionIds: [...counter.usedSessionIds, idKey(input.sessionId)],
    },
  };
}
