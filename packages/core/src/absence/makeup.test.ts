import { describe, expect, it } from 'vitest';
import { CANCEL_REASONS } from '../courses/sessions.ts';
import { type MakeupDebtSession, makeupDebt } from './makeup.ts';

// Istanbul midnight of 16 October 2026 and 02:59 that night, as UTC instants: the debt
// depends on instants only, so both TZ runs give the same answers.
const ISTANBUL_MIDNIGHT = Date.parse('2026-10-15T21:00:00Z');
const ISTANBUL_0259 = Date.parse('2026-10-15T23:59:00Z');
const NOW = ISTANBUL_MIDNIGHT;
const PAST = NOW - 3_600_000;

const session = (sessionId: string, patch: Partial<MakeupDebtSession> = {}): MakeupDebtSession => ({
  sessionId,
  kind: 'regular',
  status: 'planned',
  cancelReason: null,
  heldStatus: 'held',
  makeupForSessionId: null,
  endAtMs: PAST,
  theoryHours: 2,
  practiceHours: 0,
  ...patch,
});
const cancelled = (sessionId: string, cancelReason: MakeupDebtSession['cancelReason'], hours = 2) =>
  session(sessionId, {
    status: 'cancelled',
    cancelReason,
    heldStatus: 'unanswered',
    theoryHours: hours,
  });
const makeup = (sessionId: string, makeupForSessionId: string | null, hours = 2) =>
  session(sessionId, { kind: 'makeup', makeupForSessionId, theoryHours: hours });
const theory = (sessions: MakeupDebtSession[], nowMs = NOW) => makeupDebt(sessions, nowMs).THEORY;

describe('makeupDebt (D08-B15)', () => {
  it("leaves 1 hour for the spec's example, where taking every make-up off would leave 0", () => {
    const example = [
      cancelled('a', 'lecturer'),
      cancelled('b', 'moved'),
      makeup('c', 'b'),
      session('d', { heldStatus: 'not_held', theoryHours: 1 }),
      makeup('e', null),
      cancelled('f', 'holiday', 3),
    ];
    expect(makeupDebt(example, NOW)).toEqual({ THEORY: 1, PRACTICE: 0 });
    // Ground control: the naive rule, every held make-up paying and the move left out
    // (no b, c linked to nothing), owes 0 on the same data; the 1 comes from c covering b.
    const naive = example
      .filter((each) => each.sessionId !== 'b')
      .map((each) => (each.sessionId === 'c' ? makeup('c', null) : each));
    expect(makeupDebt(naive, NOW)).toEqual({ THEORY: 0, PRACTICE: 0 });
  });

  it('counts a moved session no make-up covers, and a covered one never, even before its make-up is held', () => {
    expect(theory([cancelled('b', 'moved')])).toBe(2);
    expect(theory([cancelled('b', 'moved'), makeup('c', 'b')])).toBe(0);
    const ahead = { ...makeup('c', 'b'), heldStatus: 'unanswered', endAtMs: NOW + 1 } as const;
    expect(theory([cancelled('b', 'moved'), ahead])).toBe(0);
    // A make-up names its moved session in either case.
    expect(
      theory([cancelled('s-b', 'moved'), makeup('c', 'S-B'), cancelled('a', 'lecturer')]),
    ).toBe(2);
    expect(
      theory([cancelled('S-B', 'moved'), makeup('c', 's-b'), cancelled('a', 'lecturer')]),
    ).toBe(2);
  });

  it('owes nothing for the other cancellations, and for trial, held or open sessions', () => {
    for (const reason of CANCEL_REASONS) {
      const expected = reason === 'lecturer' || reason === 'moved' ? 2 : 0;
      expect(theory([cancelled('x', reason)]), reason).toBe(expected);
      // A cancelled session whose head count conflicts owes only what the reason owes.
      const conflicting = { ...cancelled('x', reason), heldStatus: 'conflicting' } as const;
      expect(theory([conflicting]), reason).toBe(expected);
    }
    for (const heldStatus of ['held', 'unanswered', 'conflicting'] as const) {
      expect(theory([session('x', { heldStatus })]), heldStatus).toBe(0);
    }
    expect(theory([session('x', { kind: 'trial', heldStatus: 'not_held' })])).toBe(0);
    // A held trial session pays nothing either.
    expect(theory([cancelled('a', 'lecturer'), session('t', { kind: 'trial' })])).toBe(2);
  });

  it('takes off only make-ups that were held', () => {
    const owed = cancelled('a', 'lecturer', 3);
    expect(theory([owed, makeup('e', null)])).toBe(1);
    for (const heldStatus of ['not_held', 'unanswered', 'conflicting'] as const) {
      expect(theory([owed, { ...makeup('e', null), heldStatus }]), heldStatus).toBe(3);
    }
    const cancelledMakeup = {
      ...makeup('e', null),
      status: 'cancelled',
      cancelReason: 'lecturer',
      heldStatus: 'unanswered',
    } as const;
    expect(theory([owed, cancelledMakeup])).toBe(3);
    // A make-up for a lecturer cancellation pays it like any other held make-up.
    expect(theory([owed, makeup('e', 'a')])).toBe(1);
  });

  it('keeps each hour type apart and never goes under 0', () => {
    const practiceMakeup = { ...makeup('e', null), theoryHours: 0, practiceHours: 2 };
    expect(makeupDebt([cancelled('a', 'lecturer'), practiceMakeup], NOW)).toEqual({
      THEORY: 2,
      PRACTICE: 0,
    });
    const mixed = { ...cancelled('a', 'lecturer'), theoryHours: 1, practiceHours: 3 };
    expect(makeupDebt([mixed], NOW)).toEqual({ THEORY: 1, PRACTICE: 3 });
    expect(theory([cancelled('a', 'lecturer', 1), makeup('e', null, 3)])).toBe(0);
  });

  it('counts a session once it has ended, at the Istanbul midnight and 02:59 boundaries', () => {
    for (const boundary of [ISTANBUL_MIDNIGHT, ISTANBUL_0259]) {
      const owed = { ...cancelled('a', 'lecturer'), endAtMs: boundary };
      expect(theory([owed], boundary)).toBe(2);
      expect(theory([owed], boundary - 1)).toBe(0);
      const paid = { ...makeup('e', null), endAtMs: boundary };
      expect(theory([cancelled('a', 'lecturer'), paid], boundary)).toBe(0);
      expect(theory([cancelled('a', 'lecturer'), paid], boundary - 1)).toBe(2);
    }
  });

  it('refuses sessions D02 cannot store', () => {
    const bad: MakeupDebtSession[][] = [
      [session('s-a'), session('S-A')],
      [session('x', { theoryHours: -1, practiceHours: 3 })],
      [session('x', { practiceHours: 1.5 })],
      // D02: 1 to 12 hours in all.
      [session('x', { theoryHours: 0, practiceHours: 0 })],
      [session('x', { theoryHours: 13 })],
      [session('x', { theoryHours: 6, practiceHours: 7 })],
      [session('x', { endAtMs: 0.5 })],
      [session('x', { status: 'cancelled' })],
      [session('x', { cancelReason: 'lecturer' })],
      // D02: no held answer on a cancelled session.
      [{ ...cancelled('x', 'lecturer'), heldStatus: 'held' }],
      [{ ...cancelled('x', 'holiday'), heldStatus: 'not_held' }],
      [session('x', { makeupForSessionId: 'y' })],
      // D02: a make-up never names itself.
      [makeup('m', 'M')],
      // Values off their lists.
      [session('x', { kind: 'normal' as 'regular' })],
      [session('x', { status: 'done' as 'planned' })],
      [session('x', { heldStatus: 'yes' as 'held' })],
      [{ ...cancelled('x', 'lecturer'), cancelReason: 'teacher' as 'lecturer' }],
    ];
    for (const sessions of bad) {
      expect(() => makeupDebt(sessions, NOW), JSON.stringify(sessions)).toThrow(RangeError);
    }
    expect(() => makeupDebt([], Number.NaN)).toThrow(RangeError);
    // Ground control: the same shapes, valid, the hours at both ends.
    expect(
      makeupDebt(
        [
          session('s-a', { theoryHours: 0, practiceHours: 1 }),
          makeup('m', 's-a'),
          { ...cancelled('x', 'lecturer'), theoryHours: 5, practiceHours: 7 },
        ],
        NOW,
      ),
    ).toEqual({ THEORY: 3, PRACTICE: 7 });
  });
});
