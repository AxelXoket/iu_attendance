import { describe, expect, it } from 'vitest';
import {
  DECISION_EVENTS,
  DECISION_REASON_CODES,
  type DecisionReason,
  RECORD_DECISIONS,
  type RecordDecision,
  reasonDefinition,
} from './codes.ts';
import { isAllowedTransition, type TransitionInput } from './transitions.ts';

// A record without a reason is a plain present one the rule set (D07: gerekcesiz Var).
const definitionOf = (code: DecisionReason | null) =>
  code === null ? { decision: 'PRESENT', source: 'AUTOMATIC' } : reasonDefinition(code);

// The record decision state machine (D07 kayit_karari), row by row as the spec writes it;
// only names the condition a row adds to its decisions.
type Row = {
  readonly by: TransitionInput['by'];
  readonly from: readonly RecordDecision[];
  readonly to: readonly RecordDecision[];
  readonly only?: (input: TransitionInput) => boolean;
};
const automatic = (input: TransitionInput) =>
  definitionOf(input.currentReason).source === 'AUTOMATIC';
// Onay bekleyen Kendi beyani: the label, present, and no approval instant.
const awaitsApproval = (input: TransitionInput) => input.selfDeclared && !input.approved;
const lecturerRuling = (input: TransitionInput) =>
  definitionOf(input.currentReason).source === 'LECTURER' &&
  input.currentReason !== 'NOT_IN_CLASS_AT_CHECK';
const ROWS: readonly Row[] = [
  {
    by: 'AUTOMATIC',
    from: ['PENDING', 'IN_REVIEW', 'REJECTED'],
    to: RECORD_DECISIONS,
    only: automatic,
  },
  { by: 'AUTOMATIC', from: ['PRESENT'], to: ['PRESENT', 'PENDING', 'REJECTED'], only: automatic },
  {
    by: 'REVIEW_APPROVE',
    from: ['IN_REVIEW'],
    to: ['PRESENT'],
    only: (input) => input.currentReason !== 'AFTER_LAST_DAY',
  },
  { by: 'REVIEW_REJECT', from: ['IN_REVIEW'], to: ['REJECTED'] },
  {
    by: 'SELF_DECLARED_APPROVE',
    from: ['PRESENT'],
    to: ['PRESENT'],
    only: awaitsApproval,
  },
  {
    by: 'SELF_DECLARED_REJECT',
    from: ['PRESENT'],
    to: ['REJECTED'],
    only: awaitsApproval,
  },
  {
    by: 'FLAGGED_SESSION_REJECT',
    from: ['PRESENT'],
    to: ['REJECTED'],
    only: (input) => input.sessionFlagged,
  },
  // The lecturer's own approval or rejection, turned; never an automatic one, never not-in-class.
  {
    by: 'CHANGE_DECISION',
    from: ['PRESENT'],
    to: ['REJECTED'],
    only: (input) => lecturerRuling(input),
  },
  {
    by: 'CHANGE_DECISION',
    from: ['REJECTED'],
    to: ['PRESENT'],
    only: (input) => lecturerRuling(input),
  },
  { by: 'NOT_IN_CLASS', from: ['PRESENT', 'PENDING', 'IN_REVIEW'], to: ['REJECTED'] },
  {
    by: 'NOT_IN_CLASS_UNDONE',
    from: ['REJECTED'],
    to: RECORD_DECISIONS,
    only: (input) => input.currentReason === 'NOT_IN_CLASS_AT_CHECK',
  },
];
const rowsAllowing = (input: TransitionInput) =>
  ROWS.filter(
    (row) =>
      row.by === input.by &&
      row.from.includes(definitionOf(input.currentReason).decision as RecordDecision) &&
      row.to.includes(input.next) &&
      (row.only?.(input) ?? true),
  );

const EVENTS = ['AUTOMATIC', ...DECISION_EVENTS] as const;
const REASONS = [null, ...DECISION_REASON_CODES] as const;
const FLAGS = [false, true] as const;
const allInputs = (): TransitionInput[] =>
  REASONS.flatMap((currentReason) =>
    RECORD_DECISIONS.flatMap((next) =>
      EVENTS.flatMap((by) =>
        FLAGS.flatMap((selfDeclared) =>
          FLAGS.flatMap((approved) =>
            FLAGS.map((sessionFlagged) => ({
              currentReason,
              next,
              by,
              selfDeclared,
              approved,
              sessionFlagged,
            })),
          ),
        ),
      ),
    ),
  );

const input = (patch: Partial<TransitionInput>): TransitionInput => ({
  currentReason: null,
  next: 'PRESENT',
  by: 'AUTOMATIC',
  selfDeclared: false,
  approved: false,
  sessionFlagged: false,
  ...patch,
});
const allowed = (patch: Partial<TransitionInput>) => isAllowedTransition(input(patch));

describe('isAllowedTransition (D07 transition table)', () => {
  it('allows exactly the state machine rows, over every reason, decision, event and flag', () => {
    const inputs = allInputs();
    expect(inputs).toHaveLength(REASONS.length * RECORD_DECISIONS.length * EVENTS.length * 8);
    const used = new Set<Row>();
    let allowedCount = 0;
    for (const each of inputs) {
      const rows = rowsAllowing(each);
      for (const row of rows) used.add(row);
      expect(isAllowedTransition(each), JSON.stringify(each)).toBe(rows.length > 0);
      if (rows.length > 0) allowedCount += 1;
    }
    // Every row allows something, and the table refuses something too.
    expect([...used]).toHaveLength(ROWS.length);
    expect(allowedCount).toBeGreaterThan(0);
    expect(allowedCount).toBeLessThan(inputs.length);
    // The table has a row for every event; a new event needs one.
    expect(new Set(ROWS.map((row) => row.by))).toEqual(new Set(EVENTS));
  });

  it('lets an automatic decision move anywhere but from present to in review', () => {
    // The four rows the spec names.
    expect(allowed({ currentReason: 'NOT_ON_ROSTER', next: 'PENDING' })).toBe(true);
    expect(allowed({ currentReason: 'NOT_ON_ROSTER', next: 'IN_REVIEW' })).toBe(true);
    expect(allowed({ currentReason: 'CLOSED_DEVICE_TIME_UNCERTAIN', next: 'PENDING' })).toBe(true);
    expect(allowed({ currentReason: 'ACCEPTED_BY_SHARED_LIMIT', next: 'PRESENT' })).toBe(true);
    // Present stays present, with or without a reason; the same record while pending
    // moves to review (control).
    expect(allowed({ next: 'IN_REVIEW' })).toBe(false);
    expect(allowed({ currentReason: 'ACCEPTED_BY_SHARED_LIMIT', next: 'IN_REVIEW' })).toBe(false);
    expect(allowed({ next: 'PENDING' })).toBe(true);
    expect(allowed({ currentReason: 'CONFIRMATION_PENDING', next: 'IN_REVIEW' })).toBe(true);
    // A lecturer's decision is never moved by the rule.
    expect(allowed({ currentReason: 'LECTURER_APPROVED', next: 'REJECTED' })).toBe(false);
    expect(allowed({ currentReason: 'NOT_IN_CLASS_AT_CHECK', next: 'PRESENT' })).toBe(false);
  });

  it('approves or rejects a self-declaration only while it awaits approval', () => {
    const approve = { by: 'SELF_DECLARED_APPROVE', selfDeclared: true } as const;
    const reject = { by: 'SELF_DECLARED_REJECT', next: 'REJECTED', selfDeclared: true } as const;
    expect(allowed(approve)).toBe(true);
    expect(allowed(reject)).toBe(true);
    // Whatever the reason: one accepted by the shared limit awaits approval too.
    expect(allowed({ ...approve, currentReason: 'ACCEPTED_BY_SHARED_LIMIT' })).toBe(true);
    // Not labelled, already approved, or not present: no.
    expect(allowed({ ...reject, selfDeclared: false })).toBe(false);
    expect(allowed({ ...approve, approved: true, currentReason: 'SELF_DECLARED_APPROVED' })).toBe(
      false,
    );
    expect(allowed({ ...reject, approved: true, currentReason: 'SELF_DECLARED_APPROVED' })).toBe(
      false,
    );
    expect(allowed({ ...approve, currentReason: 'CONFIRMATION_PENDING' })).toBe(false);
    // Approving keeps the decision; rejecting is the only other way.
    expect(allowed({ ...approve, next: 'REJECTED' })).toBe(false);
  });

  it('lets a lecturer move a decision only along the table', () => {
    // A record that arrived after the last day is rejected, never approved.
    expect(allowed({ by: 'REVIEW_APPROVE', currentReason: 'AFTER_LAST_DAY' })).toBe(false);
    expect(
      allowed({ by: 'REVIEW_REJECT', currentReason: 'AFTER_LAST_DAY', next: 'REJECTED' }),
    ).toBe(true);
    expect(allowed({ by: 'REVIEW_APPROVE', currentReason: 'ANCHORS_DISAGREE' })).toBe(true);
    // A flagged session: only once its flag was raised, over an automatic or a lecturer present.
    const flagged = { by: 'FLAGGED_SESSION_REJECT', next: 'REJECTED' } as const;
    expect(allowed(flagged)).toBe(false);
    expect(allowed({ ...flagged, sessionFlagged: true })).toBe(true);
    expect(allowed({ ...flagged, sessionFlagged: true, currentReason: 'LECTURER_APPROVED' })).toBe(
      true,
    );
    // Not in class: from any decision but rejected; undone only from that rejection.
    expect(allowed({ by: 'NOT_IN_CLASS', next: 'REJECTED' })).toBe(true);
    expect(allowed({ by: 'NOT_IN_CLASS', currentReason: 'OUTSIDE_WINDOW', next: 'REJECTED' })).toBe(
      false,
    );
    expect(allowed({ by: 'NOT_IN_CLASS_UNDONE', currentReason: 'NOT_IN_CLASS_AT_CHECK' })).toBe(
      true,
    );
    expect(allowed({ by: 'NOT_IN_CLASS_UNDONE', currentReason: 'LECTURER_REJECTED' })).toBe(false);
  });

  it("turns the lecturer's own ruling, present to rejected or back, and nothing else", () => {
    const change = { by: 'CHANGE_DECISION' } as const;
    expect(allowed({ ...change, currentReason: 'LECTURER_APPROVED', next: 'REJECTED' })).toBe(true);
    expect(allowed({ ...change, currentReason: 'SELF_DECLARED_REJECTED', next: 'PRESENT' })).toBe(
      true,
    );
    // The same decision again is no change.
    expect(allowed({ ...change, currentReason: 'LECTURER_APPROVED', next: 'PRESENT' })).toBe(false);
    expect(allowed({ ...change, currentReason: 'LECTURER_REJECTED', next: 'REJECTED' })).toBe(
      false,
    );
    // Not an automatic decision, a plain present record or the not-in-class rejection.
    expect(allowed({ ...change, next: 'REJECTED' })).toBe(false);
    expect(
      allowed({ ...change, currentReason: 'ACCEPTED_BY_SHARED_LIMIT', next: 'REJECTED' }),
    ).toBe(false);
    expect(allowed({ ...change, currentReason: 'NOT_IN_CLASS_AT_CHECK', next: 'PRESENT' })).toBe(
      false,
    );
  });

  it('refuses a reason, a decision or an event the catalog does not have', () => {
    expect(() => allowed({ currentReason: 'LATER_REASON' as DecisionReason })).toThrow(RangeError);
    expect(() => allowed({ next: 'LATER' as RecordDecision })).toThrow('unknown decision LATER');
    expect(() =>
      allowed({
        by: 'NOT_IN_CLASS_UNDONE',
        currentReason: 'NOT_IN_CLASS_AT_CHECK',
        next: 'x' as RecordDecision,
      }),
    ).toThrow(RangeError);
    expect(() => allowed({ by: 'LATER_EVENT' as TransitionInput['by'] })).toThrow(
      'unknown decision event LATER_EVENT',
    );
  });
});
