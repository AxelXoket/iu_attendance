import { describe, expect, it } from 'vitest';
import { LECTERN_STATUSES } from './constants.ts';
import { type LecternConnection, lecternStatus } from './lectern-status.ts';

const OPEN_AT = Date.parse('2026-10-16T09:00:00.000Z');
const WINDOW = { openAtMs: OPEN_AT, closeAtMs: OPEN_AT + 600_000 };
// Where now falls against the window.
const PLACES = ['BEFORE', 'INSIDE', 'AFTER'] as const;
type Place = (typeof PLACES)[number];
const NOW: Record<Place, number> = {
  BEFORE: WINDOW.openAtMs - 1,
  INSIDE: WINDOW.openAtMs,
  AFTER: WINDOW.closeAtMs,
};
const CONNECTIONS: readonly LecternConnection[] = [
  'OPEN',
  'AWAITING_PAIRING',
  'CODE_EXPIRED',
  'CLOSED',
];
type Combination = {
  connection: LecternConnection;
  classOver: boolean;
  syncHealthy: boolean;
  place: Place;
};
const statusOf = (c: Combination) =>
  lecternStatus({
    connection: c.connection,
    classOver: c.classOver,
    syncHealthy: c.syncHealthy,
    nowMs: NOW[c.place],
    window: WINDOW,
  });
const COMBINATIONS: readonly Combination[] = CONNECTIONS.flatMap((connection) =>
  [false, true].flatMap((classOver) =>
    [false, true].flatMap((syncHealthy) =>
      PLACES.map((place) => ({ connection, classOver, syncHealthy, place })),
    ),
  ),
);

// The page's state machine as the spec writes it (D11, Kursu sayfasinin gordugu durum).
const SPEC_TRANSITIONS = [
  'AWAITING_PAIRING > CODE_EXPIRED',
  'AWAITING_PAIRING > ATTENDANCE_NOT_OPEN',
  'AWAITING_PAIRING > CONNECTED',
  'AWAITING_PAIRING > ATTENDANCE_CLOSED',
  'AWAITING_PAIRING > SERVER_CLOCK_BROKEN',
  'CODE_EXPIRED > AWAITING_PAIRING',
  'ATTENDANCE_NOT_OPEN > CONNECTED',
  'ATTENDANCE_NOT_OPEN > SERVER_CLOCK_BROKEN',
  'ATTENDANCE_NOT_OPEN > CLOSED',
  'CONNECTED > ATTENDANCE_CLOSED',
  'CONNECTED > SERVER_CLOCK_BROKEN',
  'CONNECTED > CLOSED',
  'ATTENDANCE_CLOSED > CONNECTED',
  'ATTENDANCE_CLOSED > SERVER_CLOCK_BROKEN',
  'ATTENDANCE_CLOSED > CLOSED',
  'SERVER_CLOCK_BROKEN > ATTENDANCE_NOT_OPEN',
  'SERVER_CLOCK_BROKEN > CONNECTED',
  'SERVER_CLOCK_BROKEN > ATTENDANCE_CLOSED',
  'SERVER_CLOCK_BROKEN > CLOSED',
  'CLOSED > AWAITING_PAIRING',
  // A window closed before it opened (D04: close = open) goes from not open to closed at
  // its opening; the spec's machine lacks this edge (K5 B list).
  'ATTENDANCE_NOT_OPEN > ATTENDANCE_CLOSED',
];

// The single events that move a combination: the lecturer approves the pairing code (only
// while the class runs), the code expires, the page gets a new code, the connection is
// closed, the class ends, the sync breaks or heals, and the window opens, closes, opens
// already closed (closed early before its opening) or is reopened (D04-A02; time never
// moves the window back to before its opening).
function nextCombinations(c: Combination): Combination[] {
  const next: Combination[] = [];
  if (c.connection === 'AWAITING_PAIRING') {
    next.push({ ...c, connection: 'CODE_EXPIRED' });
    if (!c.classOver) next.push({ ...c, connection: 'OPEN' });
  }
  if (c.connection === 'CODE_EXPIRED' || c.connection === 'CLOSED') {
    next.push({ ...c, connection: 'AWAITING_PAIRING' });
  }
  if (c.connection === 'OPEN') next.push({ ...c, connection: 'CLOSED' });
  if (!c.classOver) next.push({ ...c, classOver: true });
  next.push({ ...c, syncHealthy: !c.syncHealthy });
  if (c.place === 'BEFORE') next.push({ ...c, place: 'INSIDE' }, { ...c, place: 'AFTER' });
  if (c.place === 'INSIDE') next.push({ ...c, place: 'AFTER' });
  if (c.place === 'AFTER') next.push({ ...c, place: 'INSIDE' });
  return next;
}

describe('lecternStatus (D11 kursuDurumu)', () => {
  it('reads the checks in priority order', () => {
    const base: Combination = {
      connection: 'OPEN',
      classOver: false,
      syncHealthy: true,
      place: 'INSIDE',
    };
    expect(statusOf(base)).toBe('CONNECTED');
    expect(statusOf({ ...base, place: 'BEFORE' })).toBe('ATTENDANCE_NOT_OPEN');
    expect(statusOf({ ...base, place: 'AFTER' })).toBe('ATTENDANCE_CLOSED');
    expect(statusOf({ ...base, place: 'BEFORE', syncHealthy: false })).toBe('SERVER_CLOCK_BROKEN');
    expect(statusOf({ ...base, syncHealthy: false, classOver: true })).toBe('CLOSED');
    for (const connection of ['AWAITING_PAIRING', 'CODE_EXPIRED', 'CLOSED'] as const) {
      expect(statusOf({ ...base, connection, classOver: true, syncHealthy: false })).toBe(
        connection,
      );
    }
  });

  it('gives one status for every combination, reaching all seven', () => {
    const reached = new Set(COMBINATIONS.map(statusOf));
    expect([...reached].sort()).toEqual([...LECTERN_STATUSES].sort());
    expect(COMBINATIONS.length).toBe(4 * 2 * 2 * 3);
  });

  it('refuses a now that is not integer milliseconds', () => {
    const input = {
      connection: 'OPEN',
      classOver: false,
      syncHealthy: true,
      window: WINDOW,
    } as const;
    expect(() => lecternStatus({ ...input, nowMs: Number.NaN })).toThrow(RangeError);
    expect(() => lecternStatus({ ...input, nowMs: OPEN_AT + 0.5 })).toThrow(RangeError);
    // Even when the connection decides first.
    expect(() => lecternStatus({ ...input, connection: 'CLOSED', nowMs: Number.NaN })).toThrow(
      RangeError,
    );
    expect(lecternStatus({ ...input, nowMs: OPEN_AT })).toBe('CONNECTED');
  });

  it("makes exactly the spec's state machine from single events", () => {
    const made = new Set<string>();
    for (const c of COMBINATIONS) {
      for (const next of nextCombinations(c)) {
        const from = statusOf(c);
        const to = statusOf(next);
        if (from !== to) made.add(`${from} > ${to}`);
      }
    }
    expect([...made].sort()).toEqual([...SPEC_TRANSITIONS].sort());
  });
});
