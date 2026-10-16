// What the lectern page sees (D11, kursuDurumu), the rule's checks in priority order: with
// no open connection, the browser's last event; then the class ended or the session was
// cancelled (CLOSED, even before the closing job writes it); then a broken server clock
// sync; then the window, not yet open or already closed (the connection stays open until
// the class ends). Otherwise the lectern is CONNECTED and gets its codes (codeSlices). The
// page's state machine is generated from this function.

import type { WindowBounds } from '../clock/window.ts';
import type { LecternStatus } from './constants.ts';

/** The open connection, or, when none is open, the browser's last event. */
export type LecternConnection =
  | 'OPEN'
  | Extract<LecternStatus, 'AWAITING_PAIRING' | 'CODE_EXPIRED' | 'CLOSED'>;

/** The lectern page's status at now. Throws RangeError for a now that is not integer milliseconds. */
export function lecternStatus(input: {
  readonly connection: LecternConnection;
  /** The class has ended or the session was cancelled. */
  readonly classOver: boolean;
  /** The server's clock sync is healthy (D04 esitlemeSaglikliMi). */
  readonly syncHealthy: boolean;
  readonly nowMs: number;
  readonly window: Pick<WindowBounds, 'openAtMs' | 'closeAtMs'>;
}): LecternStatus {
  const { connection, classOver, syncHealthy, nowMs, window } = input;
  if (!Number.isSafeInteger(nowMs)) {
    throw new RangeError('lecternStatus expects integer milliseconds');
  }
  if (connection !== 'OPEN') return connection;
  if (classOver) return 'CLOSED';
  if (!syncHealthy) return 'SERVER_CLOCK_BROKEN';
  if (nowMs < window.openAtMs) return 'ATTENDANCE_NOT_OPEN';
  if (nowMs >= window.closeAtMs) return 'ATTENDANCE_CLOSED';
  return 'CONNECTED';
}
