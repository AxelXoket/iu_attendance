import { describe, expect, it } from 'vitest';
import type { ScopeRow } from './scope.ts';
import {
  EXEMPT_LETTER,
  type LayerInput,
  type LayerRecord,
  type LayerSession,
  sessionLayer,
} from './session-layer.ts';

const row = (patch: Partial<ScopeRow> = {}): ScopeRow => ({
  sectionId: 'A',
  addedAtMs: 100,
  inactiveAtMs: null,
  lateEnrollmentChoice: 'PREVIOUS_NOT_COUNTED',
  ...patch,
});

const present = (patch: Partial<LayerRecord> = {}): LayerRecord => ({
  recordId: 'r1',
  accountId: 'a1',
  counted: true,
  decision: 'PRESENT',
  selfDeclared: false,
  approved: false,
  arrivedAtMs: 0,
  afterLastDay: false,
  ...patch,
});

const session = (
  sessionId: string,
  startAtMs: number,
  patch: Partial<LayerSession> = {},
): LayerSession => ({
  sessionId,
  sectionIds: ['A'],
  startAtMs,
  theoryHours: 2,
  practiceHours: 0,
  held: true,
  records: [],
  corrections: [],
  ...patch,
});

const layer = (patch: Partial<LayerInput>) =>
  sessionLayer({
    rows: [row()],
    sessions: [],
    confirmedAccountId: null,
    exempt: false,
    lockAtMs: null,
    nowMs: 10_000,
    ...patch,
  });

const ids = (rows: ReturnType<typeof sessionLayer>) => rows.map((entry) => entry.sessionId);

describe('sessionLayer: scope', () => {
  it('leaves out sessions before the addition when earlier ones do not count', () => {
    const rows = layer({ sessions: [session('before', 50), session('after', 150)] });
    expect(ids(rows)).toEqual(['after']);
    expect(rows[0]?.status.finalStatus).toBe('ABSENT');
  });

  it('counts sessions before the addition as absent when the student chose so (Md.9/4)', () => {
    const rows = layer({
      rows: [row({ lateEnrollmentChoice: 'PREVIOUS_ABSENT' })],
      sessions: [session('before', 50), session('after', 150)],
    });
    expect(ids(rows)).toEqual(['before', 'after']);
    expect(rows[0]).toMatchObject({ sectionId: 'A', status: { finalStatus: 'ABSENT' } });
  });

  it('leaves out sessions that start once the row is inactive', () => {
    const rows = layer({
      rows: [row({ inactiveAtMs: 300 })],
      sessions: [session('last', 299), session('dropped', 300)],
    });
    expect(ids(rows)).toEqual(['last']);
  });

  it('counts a session before the addition where the student has a present record', () => {
    const rows = layer({ sessions: [session('before', 50, { records: [present()] })] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status.finalStatus).toBe('PRESENT');
  });

  it('joins the spans of a student who changed section', () => {
    const rows = layer({
      rows: [row({ inactiveAtMs: 300 }), row({ sectionId: 'B', addedAtMs: 300 })],
      sessions: [
        session('a-early', 200),
        session('a-late', 400),
        session('b-early', 200, { sectionIds: ['B'] }),
        session('b-late', 350, { sectionIds: ['B'] }),
      ],
    });
    expect(rows.map((entry) => [entry.sessionId, entry.sectionId])).toEqual([
      ['a-early', 'A'],
      ['b-late', 'B'],
    ]);
  });

  it("gives the cell to the student's own section of a shared session", () => {
    const rows = layer({ sessions: [session('shared', 150, { sectionIds: ['B', 'A'] })] });
    expect(rows[0]?.sectionId).toBe('A');
  });

  it('gives a row only to a held session: not held, unanswered and future ones count in the plan', () => {
    const rows = layer({
      sessions: [
        session('not-held', 150, { held: false }),
        session('waiting', 160, { held: null }),
        session('future', 50_000, { held: null }),
        session('held', 170),
      ],
    });
    expect(ids(rows)).toEqual(['held']);
  });
});

describe('sessionLayer: which account counts (D08-B12)', () => {
  const twoAccounts = [
    present({ recordId: 'r1', accountId: 'a1', decision: 'PENDING', arrivedAtMs: 10 }),
    present({ recordId: 'r2', accountId: 'a2', decision: 'PRESENT', arrivedAtMs: 20 }),
  ];
  const statusWith = (records: LayerRecord[], confirmedAccountId: string | null) =>
    layer({ confirmedAccountId, sessions: [session('s', 150, { records })] })[0]?.status;

  it('counts only the confirmed account, whose missing record is no record', () => {
    expect(statusWith(twoAccounts, 'a1')?.theory).toMatchObject({ open: 2, present: 0 });
    expect(statusWith(twoAccounts, 'a2')?.finalStatus).toBe('PRESENT');
    expect(statusWith(twoAccounts, 'a3')?.finalStatus).toBe('ABSENT');
  });

  it('without a confirmed account, counts the first record by decision, arrival and id', () => {
    // Decision first: present before pending, pending before rejected, whatever the arrival.
    expect(statusWith(twoAccounts, null)?.finalStatus).toBe('PRESENT');
    const rejected = present({ recordId: 'r0', accountId: 'a0', decision: 'REJECTED' });
    const pending = present({
      recordId: 'r1',
      accountId: 'a1',
      decision: 'PENDING',
      arrivedAtMs: 30,
    });
    expect(statusWith([rejected, pending], null)?.theory.open).toBe(2);
    // Same decision: the earlier arrival, then the smaller id. An unapproved self-declared
    // record makes the status provisional, which shows which record counted.
    const declared = (recordId: string, arrivedAtMs: number) =>
      present({ recordId, accountId: `acc-${recordId}`, selfDeclared: true, arrivedAtMs });
    const plain = (recordId: string, arrivedAtMs: number) =>
      present({ recordId, accountId: `acc-${recordId}`, arrivedAtMs });
    const provisional = (records: LayerRecord[]) => statusWith(records, null)?.provisional;
    expect(provisional([plain('r2', 20), declared('r1', 10)])).toBe(true);
    expect(provisional([plain('r2', 10), declared('r1', 20)])).toBe(false);
    expect(provisional([plain('r2', 10), declared('r1', 10)])).toBe(true);
    expect(provisional([plain('r1', 10), declared('r2', 10)])).toBe(false);
    // An account's other, not counted records stay as they are.
    const extra = present({
      recordId: 'r5',
      accountId: 'a2',
      counted: false,
      decision: 'REJECTED',
    });
    expect(statusWith([...twoAccounts, extra], null)?.finalStatus).toBe('PRESENT');
  });
});

describe('sessionLayer: the two inputs it fills', () => {
  it('counts a record that arrived once the term was locked, or past the last day, as no record', () => {
    const at = (arrivedAtMs: number, afterLastDay = false) =>
      layer({
        lockAtMs: 5_000,
        nowMs: 4_000,
        sessions: [session('s', 150, { records: [present({ arrivedAtMs, afterLastDay })] })],
      })[0]?.status.finalStatus;
    expect(at(4_999)).toBe('PRESENT');
    expect(at(5_000)).toBe('ABSENT');
    expect(at(4_999, true)).toBe('ABSENT');
    // Ground control: without a lock instant only the last day matters.
    expect(
      layer({ sessions: [session('s', 150, { records: [present({ arrivedAtMs: 9_999 })] })] })[0]
        ?.status.finalStatus,
    ).toBe('PRESENT');
  });

  it('freezes an open decision as absent once the term is locked', () => {
    const pending = [present({ decision: 'PENDING' })];
    const open = layer({
      lockAtMs: 5_000,
      nowMs: 4_999,
      sessions: [session('s', 150, { records: pending })],
    });
    expect(open[0]?.status.theory).toMatchObject({ open: 2, absent: 0 });
    const frozen = layer({
      lockAtMs: 5_000,
      nowMs: 5_000,
      sessions: [session('s', 150, { records: pending })],
    });
    expect(frozen[0]?.status.theory).toMatchObject({ open: 0, absent: 2, provisional: false });
  });
});

describe('sessionLayer: exemption', () => {
  it('shows an exempt student as EXEMPT in each hour type the session has, keeping the hours', () => {
    const rows = layer({ exempt: true, sessions: [session('s', 150, { records: [present()] })] });
    const status = rows[0]?.status;
    expect(status).toMatchObject({
      finalStatus: 'EXEMPT',
      letter: EXEMPT_LETTER,
      provisional: false,
    });
    expect(status?.theory).toMatchObject({
      finalStatus: 'EXEMPT',
      letter: EXEMPT_LETTER,
      present: 2,
    });
    expect(status?.practice.finalStatus).toBeNull();
    // Ground control: the same student without the exemption.
    expect(
      layer({ sessions: [session('s', 150, { records: [present()] })] })[0]?.status.finalStatus,
    ).toBe('PRESENT');
  });

  it('keeps the provisional flag the rule gave an unapproved self-declared record', () => {
    const selfDeclared = [present({ selfDeclared: true })];
    const rows = layer({ exempt: true, sessions: [session('s', 150, { records: selfDeclared })] });
    expect(rows[0]?.status).toMatchObject({ finalStatus: 'EXEMPT', provisional: true });
    expect(rows[0]?.status.theory).toMatchObject({ finalStatus: 'EXEMPT', provisional: true });
  });

  it('uses the reports letter M for exempt', () => {
    expect(EXEMPT_LETTER).toBe('M');
  });

  it('counts excused hours as participation before the addition', () => {
    const correction = {
      id: 'c1',
      kind: 'CORRECTION',
      reasonCode: 'OFFICIAL_DUTY',
      theoryHours: 2,
      practiceHours: 0,
      previousCorrectionId: null,
    } as const;
    const rows = layer({ sessions: [session('before', 50, { corrections: [correction] })] });
    expect(rows[0]?.status.theory).toMatchObject({ excused: 2, present: 0 });
  });

  it('keeps the scope of an exempt student unchanged', () => {
    const rows = layer({ exempt: true, sessions: [session('before', 50), session('after', 150)] });
    expect(ids(rows)).toEqual(['after']);
  });
});
