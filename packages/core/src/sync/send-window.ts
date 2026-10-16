// The sending time of a session (D06, Gonderme suresi): it ends, exclusive, seven days
// after the session ends or at the unit term's lock, whichever comes first. A record that
// reaches the server later still counts when it is valid; it is marked late. UTC
// milliseconds only, no Intl and no calendar days, so the end is the same in every time
// zone.

import { DAY_MS } from '../clock/constants.ts';

const SEND_WINDOW_MS = 7 * DAY_MS;

/**
 * The exclusive end of a session's sending time: the earlier of the session end plus seven
 * days and the unit term's lock (D02 kilitAni; null when the course has no unit term, as a
 * trial course). An arrival before this instant is inside.
 */
export function sendWindowEndAtMs(sessionEndAtMs: number, lockAtMs: number | null): number {
  const sevenDays = sessionEndAtMs + SEND_WINDOW_MS;
  return lockAtMs === null ? sevenDays : Math.min(sevenDays, lockAtMs);
}
