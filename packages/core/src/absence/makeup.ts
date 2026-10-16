// The make-up debt (D08-B15), its one definition, per hour type: the hours of regular
// sessions the lecturer cancelled or answered as not held, minus the hours of held make-up
// sessions, never below 0. A moved session leaves no debt, and the make-up that covers it
// pays no other debt; a moved session no make-up covers is debt (D02 opens the make-up in
// the moving transaction, so this is a guard). Holiday, exam week, calendar, schedule and
// archive cancellations are no debt, and a trial session counts neither way. Only sessions
// that have ended by the given instant count; a make-up still ahead already covers the
// moved session it points at. The D08 rule counts only regular sessions as debt, so a
// covering make-up later answered not held or cancelled still covers its moved session:
// whether those moved hours should be owed is open with the owner (D02-A02).

import {
  areSessionHours,
  CANCEL_REASONS,
  type CancelReason,
  HELD_STATUSES,
  type HeldStatus,
  SESSION_KINDS,
  SESSION_STATUSES,
  type SessionKind,
  type SessionStatus,
} from '../courses/sessions.ts';
import { idKey } from '../shared/uuid.ts';
import { sessionHours } from './scope.ts';
import type { HourType } from './types.ts';

export type MakeupDebtSession = {
  readonly sessionId: string;
  readonly kind: SessionKind;
  readonly status: SessionStatus;
  /** Set exactly when the session is cancelled. */
  readonly cancelReason: CancelReason | null;
  /** The answer to "was the class held?"; held or not held only on a planned session. */
  readonly heldStatus: HeldStatus;
  /** A make-up session's moved or missed session (D02 makeupForSessionId); null on any other kind. */
  readonly makeupForSessionId: string | null;
  readonly endAtMs: number;
  readonly theoryHours: number;
  readonly practiceHours: number;
};

/** RangeError for sessions D02 cannot store: a repeated id, a value off its list, hours out of form, a cancel reason without the cancelled status or the other way round, a held answer on a cancelled session, a make-up link on another kind or to itself. */
export function makeupDebt(
  sessions: readonly MakeupDebtSession[],
  nowMs: number,
): Record<HourType, number> {
  checkSessions(sessions, nowMs);
  const moved = new Set(
    sessions
      .filter((session) => session.cancelReason === 'moved')
      .map((session) => idKey(session.sessionId)),
  );
  const covered = new Set(
    sessions.flatMap((session) =>
      session.makeupForSessionId === null ? [] : [idKey(session.makeupForSessionId)],
    ),
  );
  const debt = { THEORY: 0, PRACTICE: 0 };
  for (const session of sessions) {
    if (session.endAtMs > nowMs) continue;
    const sign = signOf(session, moved, covered);
    const hours = sessionHours(session);
    debt.THEORY += sign * hours.THEORY;
    debt.PRACTICE += sign * hours.PRACTICE;
  }
  return { THEORY: Math.max(0, debt.THEORY), PRACTICE: Math.max(0, debt.PRACTICE) };
}

// +1: the session's hours are debt; -1: they pay debt; 0: neither.
function signOf(
  session: MakeupDebtSession,
  moved: ReadonlySet<string>,
  covered: ReadonlySet<string>,
): -1 | 0 | 1 {
  if (session.kind === 'regular') {
    const owed =
      session.cancelReason === 'lecturer' ||
      session.heldStatus === 'not_held' ||
      (session.cancelReason === 'moved' && !covered.has(idKey(session.sessionId)));
    return owed ? 1 : 0;
  }
  const pays =
    session.kind === 'makeup' &&
    session.heldStatus === 'held' &&
    !(session.makeupForSessionId !== null && moved.has(idKey(session.makeupForSessionId)));
  return pays ? -1 : 0;
}

function checkSessions(sessions: readonly MakeupDebtSession[], nowMs: number): void {
  if (!Number.isSafeInteger(nowMs)) throw new RangeError('the instant is not whole milliseconds');
  const ids = new Set<string>();
  for (const session of sessions) {
    const id = idKey(session.sessionId);
    const cancelled = session.status === 'cancelled';
    if (
      ids.has(id) ||
      !SESSION_KINDS.includes(session.kind) ||
      !SESSION_STATUSES.includes(session.status) ||
      !HELD_STATUSES.includes(session.heldStatus) ||
      (session.cancelReason !== null && !CANCEL_REASONS.includes(session.cancelReason)) ||
      !Number.isSafeInteger(session.endAtMs) ||
      !areSessionHours(session.theoryHours, session.practiceHours) ||
      cancelled !== (session.cancelReason !== null) ||
      (cancelled && (session.heldStatus === 'held' || session.heldStatus === 'not_held')) ||
      (session.makeupForSessionId !== null &&
        (session.kind !== 'makeup' || idKey(session.makeupForSessionId) === id))
    ) {
      throw new RangeError(`session ${session.sessionId} is not one D02 stores`);
    }
    ids.add(id);
  }
}
