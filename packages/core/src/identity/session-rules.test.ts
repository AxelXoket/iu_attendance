import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type ActiveSession, sessionsToClose } from './session-rules.ts';

const STAFF = { staffMaxSessions: 3, reviewAccount: false };
const REVIEW = { staffMaxSessions: 3, reviewAccount: true };

const ID = {
  a: '0190a000-0000-7000-8000-00000000000a',
  b: '0190a000-0000-7000-8000-00000000000b',
  c: '0190a000-0000-7000-8000-00000000000c',
  d: '0190a000-0000-7000-8000-00000000000d',
  e: '0190a000-0000-7000-8000-00000000000e',
};
const phone = (id: string, createdAtMs: number): ActiveSession => ({
  id,
  client: 'phone',
  createdAtMs,
});
const panel = (id: string, createdAtMs: number): ActiveSession => ({
  id,
  client: 'panel',
  createdAtMs,
});

const sessionsArb = fc.uniqueArray(
  fc.record({
    id: fc.uuid(),
    client: fc.constantFrom('phone', 'panel'),
    // A narrow range, so equal instants (the id tie break) come up often.
    createdAtMs: fc.integer({ min: 0, max: 20 }),
  }),
  { maxLength: 9, selector: (session) => session.id.toLowerCase() },
);

// The spec's rule step by step: take the oldest panel session, or the oldest phone one when
// no panel is left, until the new sign-in fits in the limit. Ties go to the smaller id.
function specChoice(sessions: readonly ActiveSession[], staffMaxSessions: number): string[] {
  const open = [...sessions];
  const closed: string[] = [];
  const older = (a: ActiveSession, b: ActiveSession) =>
    a.createdAtMs < b.createdAtMs ||
    (a.createdAtMs === b.createdAtMs && a.id.toLowerCase() < b.id.toLowerCase());
  while (open.length + 1 > staffMaxSessions) {
    const pool = open.some((session) => session.client === 'panel')
      ? open.filter((session) => session.client === 'panel')
      : open;
    const oldest = pool.reduce((best, session) => (older(session, best) ? session : best));
    closed.push(oldest.id);
    open.splice(open.indexOf(oldest), 1);
  }
  return closed;
}

describe('Kapatılacak oturumun seçimi (the session a new sign-in closes)', () => {
  it('closes the oldest panel, else the oldest phone, until the new sign-in fits', () => {
    fc.assert(
      fc.property(sessionsArb, fc.integer({ min: 1, max: 5 }), (sessions, staffMaxSessions) => {
        const closed = sessionsToClose(sessions, { staffMaxSessions, reviewAccount: false });
        expect(closed).toEqual(specChoice(sessions, staffMaxSessions));
        expect(sessions.length - closed.length + 1).toBeLessThanOrEqual(staffMaxSessions);
      }),
      { numRuns: 2000 },
    );
  });

  it('closes none for a review account, whatever the count', () => {
    fc.assert(
      fc.property(sessionsArb, fc.integer({ min: 1, max: 5 }), (sessions, staffMaxSessions) => {
        expect(sessionsToClose(sessions, { staffMaxSessions, reviewAccount: true })).toEqual([]);
      }),
    );
  });

  it('closes the oldest panel at the 4th sign-in with a phone and two panels', () => {
    const sessions = [phone(ID.a, 100), panel(ID.c, 300), panel(ID.b, 200)];
    expect(sessionsToClose(sessions, STAFF)).toEqual([ID.b]);
    // With no panel the oldest phone goes, though a younger one came first in the list.
    expect(sessionsToClose([phone(ID.d, 400), phone(ID.a, 100), phone(ID.e, 500)], STAFF)).toEqual([
      ID.a,
    ]);
    // Positive control: the 3rd sign-in, and any for the review account, closes none.
    expect(sessionsToClose(sessions.slice(1), STAFF)).toEqual([]);
    expect(sessionsToClose(sessions, REVIEW)).toEqual([]);
    expect(sessionsToClose([], STAFF)).toEqual([]);
  });

  it('chooses an older phone after every panel when the limit came down', () => {
    const sessions = [
      phone(ID.a, 100),
      panel(ID.b, 400),
      phone(ID.c, 200),
      panel(ID.d, 300),
      phone(ID.e, 500),
    ];
    // Five open under a limit of 3: the sign-in closes three, both panels then the oldest phone.
    expect(sessionsToClose(sessions, STAFF)).toEqual([ID.d, ID.b, ID.a]);
    expect(sessionsToClose(sessions, { staffMaxSessions: 1, reviewAccount: false })).toEqual([
      ID.d,
      ID.b,
      ID.a,
      ID.c,
      ID.e,
    ]);
  });

  it('breaks a tie on the instant by the smaller id in either spelling, and keeps the given one', () => {
    const upper = ID.a.toUpperCase();
    const sessions = [panel(ID.b, 100), panel(upper, 100), phone(ID.c, 50)];
    expect(sessionsToClose(sessions, STAFF)).toEqual([upper]);
    expect(sessionsToClose([panel(ID.c, 100), panel(ID.b, 100), phone(ID.a, 1)], STAFF)).toEqual([
      ID.b,
    ]);
    // Upper case sorts before lower case as text, so only the lowercase key picks a here.
    const bigUpper = ID.b.toUpperCase();
    expect(
      sessionsToClose([panel(bigUpper, 100), panel(ID.a, 100), phone(ID.c, 1)], STAFF),
    ).toEqual([ID.a]);
  });

  it('leaves the caller list in its order', () => {
    const sessions = [panel(ID.c, 300), panel(ID.b, 200), phone(ID.a, 100)];
    const before = [...sessions];
    sessionsToClose(sessions, STAFF);
    expect(sessions).toEqual(before);
  });

  it('rejects a limit, an instant or a list the rule does not take', () => {
    const sessions = [panel(ID.a, 1), panel(ID.b, 2), phone(ID.c, 3)];
    for (const staffMaxSessions of [0, -1, 1.5, Number.NaN]) {
      expect(() => sessionsToClose(sessions, { staffMaxSessions, reviewAccount: false })).toThrow(
        RangeError,
      );
    }
    expect(() => sessionsToClose([panel(ID.a, 1.5)], STAFF)).toThrow(RangeError);
    expect(() => sessionsToClose([panel(ID.a, Number.NaN)], STAFF)).toThrow(RangeError);
    // One id in two spellings is one session listed twice.
    expect(() => sessionsToClose([panel(ID.a, 1), phone(ID.a.toUpperCase(), 2)], STAFF)).toThrow(
      RangeError,
    );
    // A review account's list is checked too.
    expect(() => sessionsToClose([panel(ID.a, 1), phone(ID.a, 2)], REVIEW)).toThrow(RangeError);
    expect(() => sessionsToClose(sessions, { staffMaxSessions: 0, reviewAccount: true })).toThrow(
      RangeError,
    );
    // A client outside the list is refused, in any account.
    for (const client of ['tablet', 'Panel', '']) {
      const odd = { id: ID.d, client, createdAtMs: 4 } as unknown as ActiveSession;
      expect(() => sessionsToClose([...sessions, odd], STAFF), client).toThrow(RangeError);
      expect(() => sessionsToClose([odd], REVIEW), client).toThrow(RangeError);
    }
    // Ground control: the same list with valid limits is taken.
    expect(sessionsToClose(sessions, STAFF)).toEqual([ID.a]);
  });
});
