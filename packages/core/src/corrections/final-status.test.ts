import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { permutations } from '../testing/orders.ts';
import {
  CORRECTION_REASONS,
  type FinalStatus,
  finalStatusDefinition,
  type HourClass,
  type ReasonCode,
  reasonCodeDefinition,
} from './catalog.ts';
import { CorrectionChainError } from './chain.ts';
import {
  type FinalStatusCorrection,
  FinalStatusInputError,
  type FinalStatusRecord,
  type FinalStatusSession,
  type HourTypeFinalStatus,
  resolveFinalStatus,
  type SessionFinalStatus,
} from './final-status.ts';

type CorrectionRow = Extract<FinalStatusCorrection, { kind: 'CORRECTION' }>;

const record = (overrides: Partial<FinalStatusRecord> = {}): FinalStatusRecord => ({
  counted: true,
  decision: 'PRESENT',
  selfDeclared: false,
  approved: true,
  excludedFromCount: false,
  ...overrides,
});

// An unapproved self declaration: the record that makes hours provisional.
const selfDeclared = (overrides: Partial<FinalStatusRecord> = {}) =>
  record({ selfDeclared: true, approved: false, ...overrides });

const session = (overrides: Partial<FinalStatusSession> = {}): FinalStatusSession => ({
  theoryHours: 3,
  practiceHours: 0,
  held: true,
  locked: false,
  ...overrides,
});

const correction = (
  reasonCode: ReasonCode,
  theoryHours: number,
  practiceHours = 0,
  overrides: Partial<CorrectionRow> = {},
): FinalStatusCorrection => ({
  id: 'c1',
  kind: 'CORRECTION',
  reasonCode,
  theoryHours,
  practiceHours,
  previousCorrectionId: null,
  ...overrides,
});

const reversal = (id: string, previousCorrectionId: string): FinalStatusCorrection => ({
  id,
  kind: 'REVERSAL',
  reasonCode: null,
  theoryHours: null,
  practiceHours: null,
  previousCorrectionId,
});

// A stored row that breaks the shape rules, as corrupt data would arrive.
const corrupt = (row: FinalStatusCorrection, fields: Record<string, unknown>) =>
  ({ ...row, ...fields }) as unknown as FinalStatusCorrection;

const hourType = (overrides: Partial<HourTypeFinalStatus> = {}): HourTypeFinalStatus => ({
  finalStatus: null,
  letter: null,
  provisional: false,
  present: 0,
  absent: 0,
  excused: 0,
  open: 0,
  ...overrides,
});

const result = (overrides: Partial<SessionFinalStatus> = {}): SessionFinalStatus => ({
  finalStatus: null,
  letter: null,
  provisional: false,
  source: 'RECORD',
  activeCorrectionId: null,
  awaitingHeldAnswer: false,
  theory: hourType(),
  practice: hourType(),
  ...overrides,
});

const theoryCounts = (outcome: SessionFinalStatus) => {
  const { present, absent, excused, open } = outcome.theory;
  return { present, absent, excused, open };
};

// What fn threw; fails the test when fn returns.
function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
}

function expectInputError(fn: () => unknown, fragment: string) {
  const error = thrown(fn);
  expect(error).toBeInstanceOf(FinalStatusInputError);
  expect(error).toMatchObject({ name: 'FinalStatusInputError' });
  expect((error as Error).message).toContain(fragment);
}

function expectChainError(fn: () => unknown, fragment: string) {
  const error = thrown(fn);
  expect(error).toBeInstanceOf(CorrectionChainError);
  expect((error as Error).message).toContain(fragment);
}

describe('Final status precedence is single and complete: fixed cases', () => {
  it('leaves the hours open for a lone record in review', () => {
    const outcome = resolveFinalStatus([record({ decision: 'IN_REVIEW' })], [], session());
    expect(outcome.finalStatus).toBeNull();
    expect(outcome.letter).toBeNull();
    expect(theoryCounts(outcome)).toEqual({ present: 0, absent: 0, excused: 0, open: 3 });
  });

  it('gives Y for a lone rejected record', () => {
    expect(resolveFinalStatus([record({ decision: 'REJECTED' })], [], session()).letter).toBe('Y');
  });

  it('gives V for a counted present record next to a record in review', () => {
    const records = [record(), record({ counted: false, decision: 'IN_REVIEW' })];
    expect(resolveFinalStatus(records, [], session()).letter).toBe('V');
  });

  it('splits 3 present hours with 2 manually added hours into 2 present, 1 absent, letter E', () => {
    const outcome = resolveFinalStatus(
      [record()],
      [correction('BASED_ON_STATEMENT', 2)],
      session(),
    );
    expect(theoryCounts(outcome)).toEqual({ present: 2, absent: 1, excused: 0, open: 0 });
    expect(outcome.letter).toBe('E');
  });

  it('splits 3 present hours with 2 partial attendance hours into 2 present, 1 absent, letter V', () => {
    const outcome = resolveFinalStatus(
      [record()],
      [correction('PARTIAL_ATTENDANCE', 2)],
      session(),
    );
    expect(theoryCounts(outcome)).toEqual({ present: 2, absent: 1, excused: 0, open: 0 });
    expect(outcome.letter).toBe('V');
  });

  it('splits 3 present hours with 1 not-in-class hour into 2 present, 1 absent', () => {
    const outcome = resolveFinalStatus(
      [record()],
      [correction('NOT_IN_CLASS_AT_CHECK', 1)],
      session(),
    );
    expect(theoryCounts(outcome)).toEqual({ present: 2, absent: 1, excused: 0, open: 0 });
  });

  it('splits an absent record with 2 documented hours into 2 excused, 1 absent', () => {
    const outcome = resolveFinalStatus(
      [record({ decision: 'REJECTED' })],
      [correction('BOARD_DECISION', 2)],
      session(),
    );
    expect(theoryCounts(outcome)).toEqual({ present: 0, absent: 1, excused: 2, open: 0 });
    expect(outcome.letter).toBe('B');
  });

  it('gives Y when the counted present record is excluded from the count', () => {
    expect(resolveFinalStatus([record({ excludedFromCount: true })], [], session()).letter).toBe(
      'Y',
    );
  });

  it('freezes open and provisional decisions in a locked term', () => {
    const inReview = resolveFinalStatus(
      [record({ decision: 'IN_REVIEW' })],
      [],
      session({ locked: true }),
    );
    expect(inReview.letter).toBe('Y');
    expect(inReview.provisional).toBe(false);
    const declared = resolveFinalStatus([selfDeclared()], [], session({ locked: true }));
    expect(declared.letter).toBe('V');
    expect(declared.provisional).toBe(false);
  });

  it('keeps the same inputs open and provisional when the term is not locked (control)', () => {
    expect(
      resolveFinalStatus([record({ decision: 'IN_REVIEW' })], [], session()).letter,
    ).toBeNull();
    const declared = resolveFinalStatus([selfDeclared()], [], session());
    expect(declared.letter).toBe('V');
    expect(declared.provisional).toBe(true);
  });

  it('gives no final status for a session that did not take place', () => {
    const outcome = resolveFinalStatus([record()], [], session({ held: false }));
    expect(outcome).toMatchObject({ finalStatus: null, source: 'NOT_HELD' });
    expect(theoryCounts(outcome)).toEqual({ present: 0, absent: 0, excused: 0, open: 0 });
  });

  it('flags a session whose held answer is missing and still computes it', () => {
    const outcome = resolveFinalStatus([record()], [], session({ held: null }));
    expect(outcome).toMatchObject({ letter: 'V', awaitingHeldAnswer: true });
    // Ground control: a held session is not waiting for the answer.
    expect(resolveFinalStatus([record()], [], session()).awaitingHeldAnswer).toBe(false);
  });

  it('ignores a correction that was reversed', () => {
    const reversed = [correction('BASED_ON_STATEMENT', 3), reversal('c2', 'c1')];
    const outcome = resolveFinalStatus([record({ decision: 'REJECTED' })], reversed, session());
    expect(outcome).toMatchObject({ letter: 'Y', source: 'RECORD', activeCorrectionId: null });
    // Control: the same correction left in place decides the session.
    expect(
      resolveFinalStatus(
        [record({ decision: 'REJECTED' })],
        [correction('BASED_ON_STATEMENT', 3)],
        session(),
      ),
    ).toEqual(
      result({
        finalStatus: 'MANUALLY_ADDED',
        letter: 'E',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'MANUALLY_ADDED', letter: 'E', present: 3 }),
      }),
    );
  });

  it('reads the counted record, not a present one beside it', () => {
    const rejectedCounted = [record({ decision: 'REJECTED' }), record({ counted: false })];
    expect(resolveFinalStatus(rejectedCounted, [], session()).letter).toBe('Y');
    expect(resolveFinalStatus([...rejectedCounted].reverse(), [], session()).letter).toBe('Y');
    // Ground control: with the roles swapped the present record decides.
    const presentCounted = [record(), record({ counted: false, decision: 'REJECTED' })];
    expect(resolveFinalStatus(presentCounted, [], session()).letter).toBe('V');
  });
});

describe('Final status: every output field', () => {
  it('gives the whole result for a lone present record, and null for a type with no hours', () => {
    expect(resolveFinalStatus([record()], [], session())).toEqual(
      result({
        finalStatus: 'PRESENT',
        letter: 'V',
        theory: hourType({ finalStatus: 'PRESENT', letter: 'V', present: 3 }),
      }),
    );
    // Control: once the type has hours it has a final status too.
    expect(resolveFinalStatus([record()], [], session({ practiceHours: 1 })).practice).toEqual(
      hourType({ finalStatus: 'PRESENT', letter: 'V', present: 1 }),
    );
  });

  it('reports no record, and an excluded record, as NO_RECORD and not provisional', () => {
    const noRecord = result({
      finalStatus: 'ABSENT',
      letter: 'Y',
      source: 'NO_RECORD',
      theory: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 3 }),
    });
    expect(resolveFinalStatus([], [], session())).toEqual(noRecord);
    expect(resolveFinalStatus([selfDeclared({ excludedFromCount: true })], [], session())).toEqual(
      noRecord,
    );
    // Control: the same record counted is a provisional RECORD.
    expect(resolveFinalStatus([selfDeclared()], [], session())).toEqual(
      result({
        finalStatus: 'PRESENT',
        letter: 'V',
        provisional: true,
        theory: hourType({ finalStatus: 'PRESENT', letter: 'V', provisional: true, present: 3 }),
      }),
    );
  });

  it('leaves a pending record open, and freezes it as Y in a locked term', () => {
    const pending = [selfDeclared({ decision: 'PENDING' })];
    expect(resolveFinalStatus(pending, [], session())).toEqual(
      result({ theory: hourType({ open: 3 }) }),
    );
    expect(resolveFinalStatus(pending, [], session({ locked: true }))).toEqual(
      result({
        finalStatus: 'ABSENT',
        letter: 'Y',
        theory: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 3 }),
      }),
    );
  });

  it('never makes a rejected record provisional', () => {
    expect(resolveFinalStatus([selfDeclared({ decision: 'REJECTED' })], [], session())).toEqual(
      result({
        finalStatus: 'ABSENT',
        letter: 'Y',
        theory: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 3 }),
      }),
    );
    // Positive control: the same self declaration, present, is provisional.
    expect(resolveFinalStatus([selfDeclared()], [], session()).provisional).toBe(true);
  });

  it('makes only an unapproved self declaration provisional', () => {
    const provisional = (entry: FinalStatusRecord) => {
      const outcome = resolveFinalStatus([entry], [], session());
      return [outcome.provisional, outcome.theory.provisional];
    };
    expect(provisional(selfDeclared())).toEqual([true, true]);
    expect(provisional(selfDeclared({ approved: true }))).toEqual([false, false]);
    expect(provisional(record({ approved: false }))).toEqual([false, false]);
  });

  it('gives on-duty 2 of 3 hours on a rejected record G with 2 excused and 1 absent', () => {
    expect(
      resolveFinalStatus(
        [record({ decision: 'REJECTED' })],
        [correction('OFFICIAL_DUTY', 2)],
        session(),
      ),
    ).toEqual(
      result({
        finalStatus: 'ON_DUTY',
        letter: 'G',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', absent: 1, excused: 2 }),
      }),
    );
    // Control: without the correction every hour is absent.
    expect(resolveFinalStatus([record({ decision: 'REJECTED' })], [], session()).theory).toEqual(
      hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 3 }),
    );
  });

  it('keeps the uncovered hours of an excused code provisional, and full cover is not', () => {
    const partial = resolveFinalStatus(
      [selfDeclared()],
      [correction('OFFICIAL_DUTY', 2)],
      session(),
    );
    expect(partial.theory).toEqual(
      hourType({ finalStatus: 'ON_DUTY', letter: 'G', provisional: true, present: 1, excused: 2 }),
    );
    expect(partial.provisional).toBe(true);
    const full = resolveFinalStatus([selfDeclared()], [correction('OFFICIAL_DUTY', 3)], session());
    expect(full.theory).toEqual(hourType({ finalStatus: 'ON_DUTY', letter: 'G', excused: 3 }));
    expect(full.provisional).toBe(false);
  });

  it('makes the hours a manually added code leaves uncovered absent, not provisional', () => {
    const outcome = resolveFinalStatus(
      [selfDeclared()],
      [correction('BASED_ON_STATEMENT', 2)],
      session(),
    );
    expect(outcome.theory).toEqual(
      hourType({ finalStatus: 'MANUALLY_ADDED', letter: 'E', present: 2, absent: 1 }),
    );
    expect(outcome.provisional).toBe(false);
    // Control: without the correction the record is provisional.
    expect(resolveFinalStatus([selfDeclared()], [], session()).provisional).toBe(true);
  });

  it('reads the practice hours of a correction for the practice type', () => {
    const twoAndTwo = session({ theoryHours: 2, practiceHours: 2 });
    expect(resolveFinalStatus([record()], [correction('BOARD_DECISION', 0, 2)], twoAndTwo)).toEqual(
      result({
        finalStatus: 'DOCUMENTED',
        letter: 'B',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'PRESENT', letter: 'V', present: 2 }),
        practice: hourType({ finalStatus: 'DOCUMENTED', letter: 'B', excused: 2 }),
      }),
    );
    // Control: the same hours on the theory side.
    const theorySide = resolveFinalStatus(
      [record()],
      [correction('BOARD_DECISION', 2, 0)],
      twoAndTwo,
    );
    expect(theorySide.theory).toEqual(
      hourType({ finalStatus: 'DOCUMENTED', letter: 'B', excused: 2 }),
    );
    expect(theorySide.practice).toEqual(
      hourType({ finalStatus: 'PRESENT', letter: 'V', present: 2 }),
    );
  });

  it('makes the session provisional when only the practice hours are', () => {
    const twoAndTwo = session({ theoryHours: 2, practiceHours: 2 });
    const practiceOnly = resolveFinalStatus(
      [selfDeclared()],
      [correction('OFFICIAL_DUTY', 2, 0)],
      twoAndTwo,
    );
    expect([practiceOnly.theory.provisional, practiceOnly.practice.provisional]).toEqual([
      false,
      true,
    ]);
    expect(practiceOnly.provisional).toBe(true);
    // Control: the mirror case, theory only.
    const theoryOnly = resolveFinalStatus(
      [selfDeclared()],
      [correction('OFFICIAL_DUTY', 0, 2)],
      twoAndTwo,
    );
    expect([theoryOnly.theory.provisional, theoryOnly.practice.provisional]).toEqual([true, false]);
    expect(theoryOnly.provisional).toBe(true);
  });

  it('makes every hour of a type a present-class code does not cover absent', () => {
    const outcome = resolveFinalStatus(
      [record()],
      [correction('PARTIAL_ATTENDANCE', 2, 0)],
      session({ theoryHours: 3, practiceHours: 2 }),
    );
    expect(outcome.theory).toEqual(
      hourType({ finalStatus: 'PRESENT', letter: 'V', present: 2, absent: 1 }),
    );
    expect(outcome.practice).toEqual(hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 2 }));
    // Control: an excused code leaves the uncovered type to the record.
    const excused = resolveFinalStatus(
      [record()],
      [correction('BOARD_DECISION', 2, 0)],
      session({ theoryHours: 3, practiceHours: 2 }),
    );
    expect(excused.practice).toEqual(hourType({ finalStatus: 'PRESENT', letter: 'V', present: 2 }));
  });

  it('keeps the active correction of a session that did not take place and nothing else', () => {
    expect(
      resolveFinalStatus(
        [selfDeclared()],
        [correction('OFFICIAL_DUTY', 2)],
        session({ held: false }),
      ),
    ).toEqual(result({ source: 'NOT_HELD', activeCorrectionId: 'c1' }));
    // Control: without a correction there is no id.
    expect(resolveFinalStatus([selfDeclared()], [], session({ held: false }))).toEqual(
      result({ source: 'NOT_HELD' }),
    );
  });
});

describe('Final status: a correction on top of every record and session state', () => {
  const noRecordAbsent = result({
    finalStatus: 'ABSENT',
    letter: 'Y',
    source: 'NO_RECORD',
    theory: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 3 }),
  });

  // [name, records, the correction, session, whole result with it, whole result without
  // it]. The second result is the ground control: the correction is what changes it.
  const cases: Array<
    [
      string,
      FinalStatusRecord[],
      FinalStatusCorrection,
      FinalStatusSession,
      SessionFinalStatus,
      SessionFinalStatus,
    ]
  > = [
    [
      'a manual add of all 3 hours for a student with no record',
      [],
      correction('PHONE_MISSING_OR_BROKEN', 3),
      session(),
      result({
        finalStatus: 'MANUALLY_ADDED',
        letter: 'E',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'MANUALLY_ADDED', letter: 'E', present: 3 }),
      }),
      noRecordAbsent,
    ],
    [
      'a manual add of 2 of 3 hours for a student with no record (D09 tests.3)',
      [],
      correction('PHONE_MISSING_OR_BROKEN', 2),
      session(),
      result({
        finalStatus: 'MANUALLY_ADDED',
        letter: 'E',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'MANUALLY_ADDED', letter: 'E', present: 2, absent: 1 }),
      }),
      noRecordAbsent,
    ],
    [
      'a manual add of 2 theory and 1 practice hour for a student with no record',
      [],
      correction('QR_SCAN_FAILED', 2, 1),
      session({ theoryHours: 2, practiceHours: 2 }),
      result({
        finalStatus: 'MANUALLY_ADDED',
        letter: 'E',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'MANUALLY_ADDED', letter: 'E', present: 2 }),
        practice: hourType({ finalStatus: 'MANUALLY_ADDED', letter: 'E', present: 1, absent: 1 }),
      }),
      result({
        finalStatus: 'ABSENT',
        letter: 'Y',
        source: 'NO_RECORD',
        theory: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 2 }),
        practice: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 2 }),
      }),
    ],
    [
      'an on-duty correction of 2 of 3 hours for a student with no record',
      [],
      correction('OFFICIAL_DUTY', 2),
      session(),
      result({
        finalStatus: 'ON_DUTY',
        letter: 'G',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', absent: 1, excused: 2 }),
      }),
      noRecordAbsent,
    ],
    [
      'a statement-based add on a present record excluded from the count (D09 tests.29)',
      [record({ excludedFromCount: true })],
      correction('BASED_ON_STATEMENT', 3),
      session(),
      result({
        finalStatus: 'MANUALLY_ADDED',
        letter: 'E',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'MANUALLY_ADDED', letter: 'E', present: 3 }),
      }),
      noRecordAbsent,
    ],
    [
      'an on-duty correction of 2 of 3 hours on an excluded self declaration',
      [selfDeclared({ excludedFromCount: true })],
      correction('OFFICIAL_DUTY', 2),
      session(),
      result({
        finalStatus: 'ON_DUTY',
        letter: 'G',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', absent: 1, excused: 2 }),
      }),
      noRecordAbsent,
    ],
    [
      'an on-duty correction of 2 of 3 hours on a pending record',
      [record({ decision: 'PENDING' })],
      correction('OFFICIAL_DUTY', 2),
      session(),
      result({
        finalStatus: 'ON_DUTY',
        letter: 'G',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', excused: 2, open: 1 }),
      }),
      result({ theory: hourType({ open: 3 }) }),
    ],
    [
      'a statement-based add of 2 of 3 hours on a record in review: the third hour is absent',
      [record({ decision: 'IN_REVIEW' })],
      correction('BASED_ON_STATEMENT', 2),
      session(),
      result({
        finalStatus: 'MANUALLY_ADDED',
        letter: 'E',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'MANUALLY_ADDED', letter: 'E', present: 2, absent: 1 }),
      }),
      result({ theory: hourType({ open: 3 }) }),
    ],
    [
      'an on-duty correction of all 3 hours on a record in review in a locked term',
      [record({ decision: 'IN_REVIEW' })],
      correction('OFFICIAL_DUTY', 3),
      session({ locked: true }),
      result({
        finalStatus: 'ON_DUTY',
        letter: 'G',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', excused: 3 }),
      }),
      result({
        finalStatus: 'ABSENT',
        letter: 'Y',
        theory: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 3 }),
      }),
    ],
    [
      'an on-duty correction of 2 of 3 hours on a record in review in a locked term',
      [record({ decision: 'IN_REVIEW' })],
      correction('OFFICIAL_DUTY', 2),
      session({ locked: true }),
      result({
        finalStatus: 'ON_DUTY',
        letter: 'G',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', absent: 1, excused: 2 }),
      }),
      result({
        finalStatus: 'ABSENT',
        letter: 'Y',
        theory: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 3 }),
      }),
    ],
    [
      'an on-duty correction of 2 of 3 hours on a self declaration in a locked term',
      [selfDeclared()],
      correction('OFFICIAL_DUTY', 2),
      session({ locked: true }),
      result({
        finalStatus: 'ON_DUTY',
        letter: 'G',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', present: 1, excused: 2 }),
      }),
      result({
        finalStatus: 'PRESENT',
        letter: 'V',
        theory: hourType({ finalStatus: 'PRESENT', letter: 'V', present: 3 }),
      }),
    ],
    [
      'an on-duty correction on a rejected record while the held answer is missing',
      [record({ decision: 'REJECTED' })],
      correction('OFFICIAL_DUTY', 3),
      session({ held: null }),
      result({
        finalStatus: 'ON_DUTY',
        letter: 'G',
        source: 'CORRECTION',
        activeCorrectionId: 'c1',
        awaitingHeldAnswer: true,
        theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', excused: 3 }),
      }),
      result({
        finalStatus: 'ABSENT',
        letter: 'Y',
        awaitingHeldAnswer: true,
        theory: hourType({ finalStatus: 'ABSENT', letter: 'Y', absent: 3 }),
      }),
    ],
    [
      'a manual add for a student with no record in a session that did not take place',
      [],
      correction('PHONE_MISSING_OR_BROKEN', 3),
      session({ held: false }),
      result({ source: 'NOT_HELD', activeCorrectionId: 'c1' }),
      result({ source: 'NOT_HELD' }),
    ],
    [
      'an on-duty correction on a record in review in a session that did not take place',
      [record({ decision: 'IN_REVIEW' })],
      correction('OFFICIAL_DUTY', 2),
      session({ held: false, locked: true }),
      result({ source: 'NOT_HELD', activeCorrectionId: 'c1' }),
      result({ source: 'NOT_HELD' }),
    ],
  ];

  it.each(cases)('gives the whole result for %s', (_name, records, row, at, withIt, withoutIt) => {
    expect(resolveFinalStatus(records, [row], at)).toEqual(withIt);
    expect(resolveFinalStatus(records, [], at)).toEqual(withoutIt);
  });
});

describe('Final status: several roster rows of one student', () => {
  // The old roster row's on-duty correction was reversed when the student moved
  // section; the new roster row has its own (D09-A08, D09 tests.52).
  const oldRow = [correction('OFFICIAL_DUTY', 3), reversal('r1', 'c1')];
  const newRow = correction('OFFICIAL_DUTY', 3, 0, { id: 'c2' });

  it('uses the one active correction across the chains, in any order', () => {
    const expected = result({
      finalStatus: 'ON_DUTY',
      letter: 'G',
      source: 'CORRECTION',
      activeCorrectionId: 'c2',
      theory: hourType({ finalStatus: 'ON_DUTY', letter: 'G', excused: 3 }),
    });
    expect(resolveFinalStatus([record()], [...oldRow, newRow], session())).toEqual(expected);
    expect(resolveFinalStatus([record()], [newRow, ...oldRow].reverse(), session())).toEqual(
      expected,
    );
    expect(resolveFinalStatus([record()], [newRow, ...oldRow], session())).toEqual(expected);
  });

  it('falls back to the record when every chain ends in a reversal (control)', () => {
    const newRowReversed = [newRow, reversal('r2', 'c2')];
    for (const rows of [oldRow, [...oldRow, ...newRowReversed], [...newRowReversed, ...oldRow]]) {
      expect(resolveFinalStatus([record()], rows, session())).toEqual(
        result({
          finalStatus: 'PRESENT',
          letter: 'V',
          theory: hourType({ finalStatus: 'PRESENT', letter: 'V', present: 3 }),
        }),
      );
    }
  });

  it('rejects two chains that both end in a correction, naming them in sorted order', () => {
    const both = [correction('OFFICIAL_DUTY', 3), newRow];
    for (const rows of [both, [...both].reverse()]) {
      expectInputError(
        () => resolveFinalStatus([record()], rows, session()),
        'more than one correction is active: c1, c2',
      );
    }
    const continued = correction('QR_SCAN_FAILED', 3, 0, { id: 'c3', previousCorrectionId: 'r1' });
    expectInputError(
      () => resolveFinalStatus([record()], [newRow, ...oldRow, continued], session()),
      'more than one correction is active: c2, c3',
    );
    const third = correction('OFFICIAL_DUTY', 3, 0, { id: 'a0' });
    expectInputError(
      () => resolveFinalStatus([record()], [newRow, third, ...oldRow, continued], session()),
      'more than one correction is active: a0, c2, c3',
    );
    // Control: the old chain continued after its reversal is fine on its own.
    expect(
      resolveFinalStatus([record()], [...oldRow, continued], session()).activeCorrectionId,
    ).toBe('c3');
  });

  it('throws the chain error for a broken chain beside two active ones, in every row order', () => {
    const rows = [
      correction('OFFICIAL_DUTY', 1, 0, { id: 'a1' }),
      correction('OFFICIAL_DUTY', 1, 0, { id: 'b1' }),
      correction('OFFICIAL_DUTY', 1, 0, { id: 'f1' }),
      correction('OFFICIAL_DUTY', 1, 0, { id: 'f2', previousCorrectionId: 'f1' }),
      correction('OFFICIAL_DUTY', 1, 0, { id: 'f3', previousCorrectionId: 'f1' }),
    ];
    const orders = permutations(rows);
    expect(orders).toHaveLength(120);
    for (const order of orders) {
      expectChainError(
        () => resolveFinalStatus([record()], order, session()),
        'f1 has two successors',
      );
    }
    // Ground control: without the fork the two actives are an input error in every order.
    for (const order of permutations(rows.slice(0, 3))) {
      expectInputError(
        () => resolveFinalStatus([record()], order, session()),
        'more than one correction is active: a1, b1, f1',
      );
    }
  });

  it('still rejects broken links', () => {
    const head = correction('OFFICIAL_DUTY', 1);
    expectChainError(
      () =>
        resolveFinalStatus(
          [record()],
          [head, correction('OFFICIAL_DUTY', 1, 0, { id: 'c2', previousCorrectionId: 'x' })],
          session(),
        ),
      'unknown row x',
    );
    expectChainError(
      () =>
        resolveFinalStatus(
          [record()],
          [
            head,
            correction('OFFICIAL_DUTY', 1, 0, { id: 'c2', previousCorrectionId: 'c3' }),
            correction('OFFICIAL_DUTY', 1, 0, { id: 'c3', previousCorrectionId: 'c2' }),
          ],
          session(),
        ),
      'cycle',
    );
    expectChainError(
      () =>
        resolveFinalStatus(
          [record()],
          [
            head,
            correction('OFFICIAL_DUTY', 1, 0, { id: 'c2', previousCorrectionId: 'c1' }),
            correction('OFFICIAL_DUTY', 1, 0, { id: 'c3', previousCorrectionId: 'c1' }),
          ],
          session(),
        ),
      'two successors',
    );
    // Control: the head alone resolves.
    expect(resolveFinalStatus([record()], [head], session()).activeCorrectionId).toBe('c1');
  });
});

describe('Final status: input shape', () => {
  const heldAnswers = [true, false, null] as const;
  const valid = correction('OFFICIAL_DUTY', 2, 0);

  it.each([
    [
      'a correction without a reason code',
      corrupt(valid, { reasonCode: null }),
      'unknown reason code',
    ],
    ['an unknown reason code', corrupt(valid, { reasonCode: 'NOPE' }), 'unknown reason code'],
    ['null theory hours', corrupt(valid, { theoryHours: null }), 'covers null THEORY hours of 3'],
    [
      'null practice hours',
      corrupt(valid, { practiceHours: null }),
      'covers null PRACTICE hours of 0',
    ],
    ['negative hours', correction('OFFICIAL_DUTY', -1, 1), 'covers -1 THEORY hours of 3'],
    [
      'more theory hours than the session',
      correction('OFFICIAL_DUTY', 4),
      'covers 4 THEORY hours of 3',
    ],
    [
      'more practice hours than the session',
      correction('OFFICIAL_DUTY', 1, 1),
      'covers 1 PRACTICE hours of 0',
    ],
    ['a fraction of an hour', correction('OFFICIAL_DUTY', 1.5), 'covers 1.5 THEORY hours of 3'],
    ['no hour at all', correction('OFFICIAL_DUTY', 0, 0), 'covers no hour'],
    [
      'a reversal with a reason code',
      corrupt(reversal('r1', 'c1'), { reasonCode: 'OFFICIAL_DUTY' }),
      'carries a reason code or hours',
    ],
    [
      'a reversal with theory hours',
      corrupt(reversal('r1', 'c1'), { theoryHours: 0 }),
      'carries a reason code or hours',
    ],
    [
      'a reversal with practice hours',
      corrupt(reversal('r1', 'c1'), { practiceHours: 0 }),
      'carries a reason code or hours',
    ],
    [
      'an unknown kind',
      corrupt(valid, { kind: 'UNDO' }),
      'c1 is neither a correction nor a reversal',
    ],
  ])('rejects %s on every held answer', (_name, bad, fragment) => {
    const rows = bad.kind === 'REVERSAL' ? [valid, bad] : [bad];
    const wholeRows = bad.kind === 'REVERSAL' ? [valid, reversal('r1', 'c1')] : [valid];
    for (const held of heldAnswers) {
      expectInputError(() => resolveFinalStatus([record()], rows, session({ held })), fragment);
      // Ground control: the whole row in the same place resolves.
      expect(() => resolveFinalStatus([record()], wholeRows, session({ held }))).not.toThrow();
    }
  });

  it('accepts the boundary shapes the rules allow (control)', () => {
    for (const held of heldAnswers) {
      for (const rows of [
        [valid],
        [valid, reversal('r1', 'c1')],
        [correction('OFFICIAL_DUTY', 3)],
      ]) {
        expect(() => resolveFinalStatus([record()], rows, session({ held }))).not.toThrow();
      }
    }
    const twoAndTwo = session({ theoryHours: 2, practiceHours: 2 });
    expect(() =>
      resolveFinalStatus([record()], [correction('OFFICIAL_DUTY', 0, 2)], twoAndTwo),
    ).not.toThrow();
    expect(() =>
      resolveFinalStatus([record()], [correction('STUDENT_AFFAIRS_LETTER', 2, 0)], twoAndTwo),
    ).not.toThrow();
  });

  it('rejects hours of a type the reason code forbids', () => {
    const twoAndTwo = session({ theoryHours: 2, practiceHours: 2 });
    expectInputError(
      () => resolveFinalStatus([record()], [correction('STUDENT_AFFAIRS_LETTER', 1, 1)], twoAndTwo),
      'covers PRACTICE hours its code forbids',
    );
    // Control: a code that allows practice hours.
    expect(
      resolveFinalStatus([record()], [correction('BOARD_DECISION', 1, 1)], twoAndTwo).practice
        .excused,
    ).toBe(1);
  });

  it('checks every row, not only the active one', () => {
    const superseded = corrupt(correction('OFFICIAL_DUTY', 2), { theoryHours: null });
    const active = correction('OFFICIAL_DUTY', 2, 0, { id: 'c2', previousCorrectionId: 'c1' });
    expectInputError(
      () => resolveFinalStatus([record()], [superseded, active], session()),
      'covers null THEORY hours',
    );
    // Control: the same chain with a whole row resolves to the later one.
    expect(
      resolveFinalStatus([record()], [correction('OFFICIAL_DUTY', 2), active], session())
        .activeCorrectionId,
    ).toBe('c2');
  });

  it.each([
    ['negative theory hours', { theoryHours: -1 }, { theoryHours: 1 }, 'found -1'],
    ['a fraction of a practice hour', { practiceHours: 1.5 }, { practiceHours: 1 }, 'found 1.5'],
    ['theory hours that are not a number', { theoryHours: Number.NaN }, {}, 'found NaN'],
  ])('rejects a session with %s', (_name, bad, whole, fragment) => {
    expectInputError(
      () => resolveFinalStatus([record()], [], session(bad)),
      `session hours must be whole numbers, ${fragment}`,
    );
    // Ground control: a whole number in the same field resolves.
    expect(() => resolveFinalStatus([record()], [], session(whole))).not.toThrow();
  });

  it('accepts a session with no hours of either type (control)', () => {
    expect(resolveFinalStatus([record()], [], session({ theoryHours: 0 }))).toEqual(
      result({ finalStatus: 'PRESENT', letter: 'V' }),
    );
  });

  it('names the error', () => {
    expect(new FinalStatusInputError('x').name).toBe('FinalStatusInputError');
    expect(new FinalStatusInputError('x')).toBeInstanceOf(Error);
  });
});

// A stored record or session that breaks the shape rules, as corrupt data would arrive.
const corruptRecord = (entry: FinalStatusRecord, fields: Record<string, unknown>) =>
  ({ ...entry, ...fields }) as unknown as FinalStatusRecord;
const corruptSession = (fields: Record<string, unknown>, base: FinalStatusSession = session()) =>
  ({ ...base, ...fields }) as unknown as FinalStatusSession;

describe('Final status: record and session shape', () => {
  const heldAnswers = [true, false, null] as const;

  it.each([
    ['an unknown decision', { decision: 'VAR' }, 'has an unknown decision VAR'],
    ['a decision in lower case', { decision: 'present' }, 'has an unknown decision present'],
    ['no decision', { decision: undefined }, 'has an unknown decision undefined'],
    ['counted as text', { counted: 'true' }, 'has counted true, not a boolean'],
    ['selfDeclared as a number', { selfDeclared: 1 }, 'has selfDeclared 1, not a boolean'],
    ['approved as null', { approved: null }, 'has approved null, not a boolean'],
    [
      'no excludedFromCount',
      { excludedFromCount: undefined },
      'has excludedFromCount undefined, not a boolean',
    ],
  ])('rejects a record with %s on every held answer, counted or not', (_name, fields, fragment) => {
    const correctionRows = [correction('OFFICIAL_DUTY', 2)];
    for (const held of heldAnswers) {
      for (const rows of [[], correctionRows]) {
        const at = session({ held });
        expectInputError(
          () => resolveFinalStatus([corruptRecord(record(), fields)], rows, at),
          `record 0 ${fragment}`,
        );
        // Beside the counted record, and as an excluded counted record.
        const other = corruptRecord(record({ counted: false }), fields);
        expectInputError(
          () => resolveFinalStatus([record(), other], rows, at),
          `record 1 ${fragment}`,
        );
        const excluded = corruptRecord(record({ excludedFromCount: true }), fields);
        expectInputError(() => resolveFinalStatus([excluded], rows, at), `record 0 ${fragment}`);
        // Ground control: the whole records in the same places resolve.
        expect(() =>
          resolveFinalStatus([record(), record({ counted: false })], rows, at),
        ).not.toThrow();
        expect(() =>
          resolveFinalStatus([record({ excludedFromCount: true })], rows, at),
        ).not.toThrow();
      }
    }
  });

  it('accepts every decision and both values of every flag (control)', () => {
    for (const decision of ['PRESENT', 'PENDING', 'IN_REVIEW', 'REJECTED'] as const) {
      for (const flag of [true, false]) {
        const entry = record({ decision, selfDeclared: flag, approved: flag });
        const beside = record({ counted: false, decision, excludedFromCount: flag });
        for (const held of heldAnswers) {
          expect(() =>
            resolveFinalStatus([entry, beside], [], session({ held, locked: flag })),
          ).not.toThrow();
        }
      }
    }
  });

  it.each([
    [
      'held missing',
      { held: undefined },
      'session held must be true, false or null, found undefined',
    ],
    ['held as text', { held: 'false' }, 'session held must be true, false or null, found false'],
    ['held as a number', { held: 0 }, 'session held must be true, false or null, found 0'],
    ['locked missing', { locked: undefined }, 'session locked must be a boolean, found undefined'],
    ['locked as text', { locked: 'false' }, 'session locked must be a boolean, found false'],
    ['locked as null', { locked: null }, 'session locked must be a boolean, found null'],
  ])('rejects a session with %s', (_name, fields, message) => {
    const rows = [correction('OFFICIAL_DUTY', 2)];
    for (const held of heldAnswers) {
      const at = corruptSession(fields, session({ held }));
      expectInputError(() => resolveFinalStatus([record()], rows, at), message);
      expectInputError(() => resolveFinalStatus([], [], at), message);
      // Ground control: the same session with whole flags resolves.
      expect(() => resolveFinalStatus([record()], rows, session({ held }))).not.toThrow();
    }
  });
});

// Generators build only valid inputs: one counted record in a non-empty set, and one
// linear chain per roster row whose corrections fit the session hours. Every chain
// but the last ends in a reversal, so at most one correction is active.
const sessionArb = fc.record({
  theoryHours: fc.integer({ min: 0, max: 6 }),
  practiceHours: fc.integer({ min: 0, max: 6 }),
  held: fc.constantFrom(true, false, null),
  locked: fc.boolean(),
});

const recordFieldsArb = fc.record({
  decision: fc.constantFrom('PRESENT', 'PENDING', 'IN_REVIEW', 'REJECTED' as const),
  selfDeclared: fc.boolean(),
  approved: fc.boolean(),
  excludedFromCount: fc.boolean(),
});

const recordsArb = fc
  .array(recordFieldsArb, { maxLength: 4 })
  .chain((records) =>
    fc
      .nat({ max: Math.max(records.length - 1, 0) })
      .map((countedIndex) =>
        records.map((entry, index) => ({ ...entry, counted: index === countedIndex })),
      ),
  );

function chainArb(theory: number, practice: number, prefix: string) {
  if (theory + practice === 0) return fc.constant<FinalStatusCorrection[]>([]);
  const step = fc.record({
    op: fc.constantFrom('write', 'reverse'),
    code: fc.constantFrom(...CORRECTION_REASONS.map((entry) => entry.code)),
    theoryHours: fc.integer({ min: 0, max: theory }),
    practiceHours: fc.integer({ min: 0, max: practice }),
  });
  return fc.array(step, { maxLength: 6 }).map((steps) => {
    const rows: FinalStatusCorrection[] = [];
    for (const [index, s] of steps.entries()) {
      const last = rows[rows.length - 1];
      const id = `${prefix}c${index}`;
      if (s.op === 'reverse' && last?.kind === 'CORRECTION') {
        rows.push(reversal(id, last.id));
        continue;
      }
      const practiceHours = s.code === 'STUDENT_AFFAIRS_LETTER' ? 0 : s.practiceHours;
      const theoryHours = s.theoryHours + practiceHours === 0 ? Math.min(1, theory) : s.theoryHours;
      if (theoryHours + practiceHours === 0) continue;
      rows.push(
        correction(s.code, theoryHours, practiceHours, {
          id,
          previousCorrectionId: last?.id ?? null,
        }),
      );
    }
    return rows;
  });
}

function chainsArb(theory: number, practice: number) {
  return fc.integer({ min: 0, max: 3 }).chain((count) =>
    fc.tuple(
      ...Array.from({ length: count }, (_, chainIndex) =>
        chainArb(theory, practice, `r${chainIndex}`).map((rows) => {
          const last = rows[rows.length - 1];
          return chainIndex < count - 1 && last?.kind === 'CORRECTION'
            ? [...rows, reversal(`r${chainIndex}x`, last.id)]
            : rows;
        }),
      ),
    ),
  );
}

const inputArb = sessionArb.chain((s) =>
  fc.tuple(fc.constant(s), recordsArb, chainsArb(s.theoryHours, s.practiceHours)),
);

// The rule as a model, written from the spec text (D09 exports.4 purpose,
// resolved_gaps.5, invariants.6) and apart from final-status.ts: it reads only the
// catalog tables, finds the active correction by the chain ends and gives every hour
// its own status before counting.
function modelFinalStatus(
  records: readonly FinalStatusRecord[],
  rows: readonly FinalStatusCorrection[],
  at: FinalStatusSession,
): SessionFinalStatus {
  // The counted record decides: PRESENT is present (provisional for an unapproved self
  // declaration), PENDING and IN_REVIEW leave the hours open, REJECTED is absent; no
  // counted record, or one excluded from the count, is absent as if there were none. A
  // locked term freezes the open hours as absent, and nothing in it is provisional.
  const counted = records.find((entry) => entry.counted);
  const hasRecord = counted !== undefined && !counted.excludedFromCount;
  const decision = hasRecord ? counted.decision : null;
  const open = decision === 'PENDING' || decision === 'IN_REVIEW';
  const recordState: FinalStatus | null =
    decision === 'PRESENT' ? 'PRESENT' : open && !at.locked ? null : 'ABSENT';
  const recordProvisional =
    decision === 'PRESENT' && !at.locked && counted?.selfDeclared === true && !counted.approved;
  // The active correction ends a chain (no row points at it) and is not a reversal.
  const pointedAt = new Set(rows.map((row) => row.previousCorrectionId));
  const active = rows.find(
    (row): row is CorrectionRow => row.kind === 'CORRECTION' && !pointedAt.has(row.id),
  );
  const activeCorrectionId = active?.id ?? null;
  const letterOf = (state: FinalStatus | null) =>
    state === null ? null : finalStatusDefinition(state).letter;
  // A session that did not take place has no final status and no hours.
  if (at.held === false) {
    return result({ source: 'NOT_HELD', activeCorrectionId });
  }
  // Covered hours take the code's status. The hours a present-class code leaves
  // uncovered are absent; under any other code they keep the record status.
  const codeState =
    active === undefined ? null : reasonCodeDefinition(active.reasonCode).finalStatus;
  const presentClass =
    codeState !== null && finalStatusDefinition(codeState).hourClass === 'PRESENT';
  const uncoveredState = presentClass ? 'ABSENT' : recordState;
  const typeOf = (hours: number, covered: number): HourTypeFinalStatus => {
    const states = Array.from({ length: hours }, (_, hour) =>
      hour < covered ? codeState : uncoveredState,
    );
    const inClass = (hourClass: HourClass) =>
      states.filter(
        (state) => state !== null && finalStatusDefinition(state).hourClass === hourClass,
      ).length;
    // A type's status is the code's when the code covers some of its hours, else the
    // status of its uncovered hours; a type with no hours has none.
    const finalStatus = covered > 0 ? codeState : hours > 0 ? uncoveredState : null;
    return {
      finalStatus,
      letter: letterOf(finalStatus),
      // Provisional while some hour of the type keeps the provisional record status.
      provisional: recordProvisional && uncoveredState === recordState && hours > covered,
      present: inClass('PRESENT'),
      absent: inClass('ABSENT'),
      excused: inClass('EXCUSED'),
      open: states.filter((state) => state === null).length,
    };
  };
  const theory = typeOf(at.theoryHours, active?.theoryHours ?? 0);
  const practice = typeOf(at.practiceHours, active?.practiceHours ?? 0);
  // The session summary: the active correction's status, else the record status.
  const finalStatus = codeState ?? recordState;
  return {
    finalStatus,
    letter: letterOf(finalStatus),
    provisional: theory.provisional || practice.provisional,
    source: active !== undefined ? 'CORRECTION' : hasRecord ? 'RECORD' : 'NO_RECORD',
    activeCorrectionId,
    awaitingHeldAnswer: at.held === null,
    theory,
    practice,
  };
}

describe('Final status precedence is single and complete: properties', () => {
  it('splits every hour of each type into present, absent, excused and open', () => {
    fc.assert(
      fc.property(inputArb, ([s, records, chains]) => {
        const outcome = resolveFinalStatus(records, chains.flat(), s);
        for (const [type, hours] of [
          ['theory', s.theoryHours],
          ['practice', s.practiceHours],
        ] as const) {
          const part = outcome[type];
          expect(part.present + part.absent + part.excused + part.open).toBe(
            s.held === false ? 0 : hours,
          );
        }
      }),
      { numRuns: 2000 },
    );
  });

  it('gives one result whatever the order of records and corrections', () => {
    let severalChains = 0;
    fc.assert(
      fc.property(
        inputArb.chain(([s, records, chains]) =>
          fc.tuple(
            fc.constant(s),
            fc.shuffledSubarray(records, { minLength: records.length }),
            fc.shuffledSubarray(chains.flat(), { minLength: chains.flat().length }),
            fc.constant(records),
            fc.constant(chains),
          ),
        ),
        ([s, shuffledRecords, shuffledCorrections, records, chains]) => {
          if (chains.filter((rows) => rows.length > 0).length > 1) severalChains += 1;
          expect(resolveFinalStatus(shuffledRecords, shuffledCorrections, s)).toEqual(
            resolveFinalStatus(records, chains.flat(), s),
          );
        },
      ),
      { numRuns: 2000 },
    );
    // Ground control: the runs include students with several roster-row chains.
    expect(severalChains).toBeGreaterThan(100);
  });

  it('ignores every record that is not counted', () => {
    let withOthers = 0;
    fc.assert(
      fc.property(inputArb, ([s, records, chains]) => {
        if (records.length > 1) withOthers += 1;
        expect(
          resolveFinalStatus(
            records.filter((entry) => entry.counted),
            chains.flat(),
            s,
          ),
        ).toEqual(resolveFinalStatus(records, chains.flat(), s));
      }),
      { numRuns: 2000 },
    );
    // Ground control: the runs include records beside the counted one.
    expect(withOthers).toBeGreaterThan(500);
  });

  it('ignores the chains of other roster rows that end in a reversal', () => {
    let withOtherRows = 0;
    fc.assert(
      fc.property(inputArb, ([s, records, chains]) => {
        if (chains.slice(0, -1).some((rows) => rows.length > 0)) withOtherRows += 1;
        expect(resolveFinalStatus(records, chains.flat(), s)).toEqual(
          resolveFinalStatus(records, chains[chains.length - 1] ?? [], s),
        );
      }),
      { numRuns: 1000 },
    );
    // Ground control: the runs include rows of other roster rows.
    expect(withOtherRows).toBeGreaterThan(100);
  });

  it('rejects a non-empty record set with no counted record or with two', () => {
    fc.assert(
      fc.property(inputArb, fc.constantFrom('none', 'two'), ([s, records, chains], broken) => {
        fc.pre(records.length >= (broken === 'two' ? 2 : 1));
        const bad = records.map((entry, index) => ({
          ...entry,
          counted: broken === 'two' ? index < 2 : false,
        }));
        expectInputError(
          () => resolveFinalStatus(bad, chains.flat(), s),
          'exactly one record must be counted',
        );
      }),
      { numRuns: 2000 },
    );
  });

  it('rejects a corrupt row whatever the rest of the input', () => {
    const corruptions = {
      CORRECTION: [
        { reasonCode: null },
        { theoryHours: null },
        { practiceHours: null },
        { theoryHours: -1 },
        { theoryHours: 0.5 },
        { theoryHours: 0, practiceHours: 0 },
        { kind: 'UNDO' },
      ],
      REVERSAL: [{ reasonCode: 'OFFICIAL_DUTY' }, { theoryHours: 1 }, { practiceHours: 0 }],
    };
    let checked = 0;
    fc.assert(
      fc.property(inputArb, fc.nat(), fc.nat(), ([s, records, chains], rowPick, howPick) => {
        const rows = chains.flat();
        fc.pre(rows.length > 0);
        checked += 1;
        // Ground control: the uncorrupted input resolves.
        expect(() => resolveFinalStatus(records, rows, s)).not.toThrow();
        const index = rowPick % rows.length;
        const target = rows[index] as FinalStatusCorrection;
        const options = corruptions[target.kind];
        const bad = corrupt(target, options[howPick % options.length] as Record<string, unknown>);
        const broken = rows.map((row, at) => (at === index ? bad : row));
        expect(() => resolveFinalStatus(records, broken, s)).toThrow(FinalStatusInputError);
      }),
      { numRuns: 1000 },
    );
    expect(checked).toBeGreaterThan(500);
  });

  it('rejects a corrupt record or session flag whatever the rest of the input', () => {
    const recordCorruptions = [
      { decision: 'VAR' },
      { decision: null },
      { counted: 1 },
      { selfDeclared: 'true' },
      { approved: undefined },
      { excludedFromCount: null },
    ];
    const sessionCorruptions = [{ held: undefined }, { held: 'true' }, { locked: 1 }];
    let checked = 0;
    fc.assert(
      fc.property(inputArb, fc.nat(), fc.nat(), ([s, records, chains], entryPick, howPick) => {
        const rows = chains.flat();
        // Ground control: the uncorrupted input resolves.
        expect(() => resolveFinalStatus(records, rows, s)).not.toThrow();
        const brokenSession = corruptSession(
          sessionCorruptions[howPick % sessionCorruptions.length] as Record<string, unknown>,
          s,
        );
        expect(() => resolveFinalStatus(records, rows, brokenSession)).toThrow(
          FinalStatusInputError,
        );
        fc.pre(records.length > 0);
        checked += 1;
        const index = entryPick % records.length;
        const fields = recordCorruptions[howPick % recordCorruptions.length] as Record<
          string,
          unknown
        >;
        const broken = records.map((entry, at) =>
          at === index ? corruptRecord(entry, fields) : entry,
        );
        expect(() => resolveFinalStatus(broken, rows, s)).toThrow(FinalStatusInputError);
      }),
      { numRuns: 1000 },
    );
    expect(checked).toBeGreaterThan(500);
  });

  it('matches a model written from the rule text, field by field', () => {
    // Runs with an active correction on each record and session state.
    const seen = { noRecord: 0, excluded: 0, open: 0, locked: 0, awaitingAnswer: 0, notHeld: 0 };
    fc.assert(
      fc.property(inputArb, ([s, records, chains]) => {
        const rows = chains.flat();
        const expected = modelFinalStatus(records, rows, s);
        expect(resolveFinalStatus(records, rows, s)).toEqual(expected);
        if (expected.activeCorrectionId === null) return;
        if (s.held === false) {
          seen.notHeld += 1;
          return;
        }
        if (s.held === null) seen.awaitingAnswer += 1;
        if (s.locked) seen.locked += 1;
        const counted = records.find((entry) => entry.counted);
        if (counted === undefined) seen.noRecord += 1;
        else if (counted.excludedFromCount) seen.excluded += 1;
        else if (
          !s.locked &&
          (counted.decision === 'PENDING' || counted.decision === 'IN_REVIEW')
        ) {
          seen.open += 1;
        }
      }),
      { numRuns: 3000 },
    );
    // Ground control: every state carries an active correction in many runs (the rarest,
    // an open record in an unlocked term, measured 65 to 97 of 3000 over 12 runs).
    for (const count of Object.values(seen)) expect(count).toBeGreaterThan(30);
  });
});
