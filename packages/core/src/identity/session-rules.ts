// The sessions a staff sign-in closes (D01, the three session rule): a new sign-in that
// would pass the limit closes the oldest panel session by its creation instant, or the
// oldest phone session when there is no panel one. A review account (the app store
// reviewers') closes none. The limit and the clients carry the identity contract's names
// (IDENTITY_CONSTANTS.staffMaxSessions, SESSION_CLIENTS), so the server passes them as
// they are; core never imports the contract.

import { isWholeFromOne } from '../shared/number.ts';
import { compareText } from '../shared/text.ts';
import { idKey } from '../shared/uuid.ts';

// The clients a session runs on, as the identity contract's SESSION_CLIENTS spells them.
const SESSION_CLIENTS = ['phone', 'panel'] as const;
export type SessionClient = (typeof SESSION_CLIENTS)[number];

export type ActiveSession = {
  readonly id: string;
  readonly client: SessionClient;
  /** giris_oturumlari.olusturma_ani. */
  readonly createdAtMs: number;
};

const isPanel = (session: ActiveSession) => Number(session.client === 'panel');

// Panels before phones, then older first; ties on the instant go to the smaller id.
const closeOrder = (a: ActiveSession, b: ActiveSession) =>
  isPanel(b) - isPanel(a) || a.createdAtMs - b.createdAtMs || compareText(idKey(a.id), idKey(b.id));

/**
 * The ids of the sessions a new sign-in closes so that, with it, at most staffMaxSessions
 * stay active, in close order: none below the limit, one at the limit, and more only when
 * the limit has come down since the sessions opened. The sign-in answer and its e-mail name
 * one closed session, the first of the list. A review account closes none. Throws
 * RangeError for a limit that is not a whole number from 1, a client outside the list, an
 * instant that is not integer milliseconds, or a session listed twice.
 */
export function sessionsToClose(
  sessions: readonly ActiveSession[],
  rules: { readonly staffMaxSessions: number; readonly reviewAccount: boolean },
): string[] {
  if (!isWholeFromOne(rules.staffMaxSessions)) {
    throw new RangeError('sessionsToClose expects a session limit from 1');
  }
  if (!sessions.every((session) => SESSION_CLIENTS.includes(session.client))) {
    throw new RangeError('sessionsToClose expects a phone or a panel session');
  }
  if (!sessions.every((session) => Number.isSafeInteger(session.createdAtMs))) {
    throw new RangeError('sessionsToClose expects integer milliseconds');
  }
  if (new Set(sessions.map((session) => idKey(session.id))).size !== sessions.length) {
    throw new RangeError('sessionsToClose expects each session once');
  }
  if (rules.reviewAccount) return [];
  const excess = sessions.length + 1 - rules.staffMaxSessions;
  return [...sessions]
    .sort(closeOrder)
    .slice(0, Math.max(0, excess))
    .map((session) => session.id);
}
