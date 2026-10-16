import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LATE_CHOICES } from '../rosters/late-choice.ts';
import {
  coveringRow,
  firstRow,
  isInCalculationScope,
  isInScope,
  type ScopeRow,
  type ScopeSession,
  sessionHours,
} from './scope.ts';

type Choice = ScopeRow['lateEnrollmentChoice'];

const row = (
  sectionId: string,
  addedAtMs: number,
  inactiveAtMs: number | null,
  lateEnrollmentChoice: Choice = 'PREVIOUS_NOT_COUNTED',
): ScopeRow => ({ sectionId, addedAtMs, inactiveAtMs, lateEnrollmentChoice });

const sessionAt = (startAtMs: number, ...sectionIds: string[]): ScopeSession => ({
  sectionIds,
  startAtMs,
});

describe('Public scope predicate and session hours', () => {
  it('gives the theory and practice hours of a session', () => {
    expect(sessionHours({ theoryHours: 2, practiceHours: 1 })).toEqual({ THEORY: 2, PRACTICE: 1 });
    expect(sessionHours({ theoryHours: 0, practiceHours: 3 })).toEqual({ THEORY: 0, PRACTICE: 3 });
  });

  describe('Membership', () => {
    it('ends the scope at the inactive time, exclusive, and follows a section change', () => {
      const rows = [row('s1', 0, 40), row('s2', 40, null)];
      expect(coveringRow(rows, sessionAt(0, 's1'), false)).toBe(rows[0]);
      expect(coveringRow(rows, sessionAt(39, 's1'), false)).toBe(rows[0]);
      expect(isInScope(rows, sessionAt(40, 's1'))).toBe(false);
      expect(coveringRow(rows, sessionAt(40, 's2'), false)).toBe(rows[1]);
      expect(isInScope(rows, sessionAt(39, 's2'))).toBe(false);
    });

    it('counts a joint session for the section the student is in, never for the others', () => {
      const rows = [row('s2', 0, null)];
      expect(coveringRow(rows, sessionAt(5, 's1', 's2'), false)).toBe(rows[0]);
      expect(isInScope(rows, sessionAt(5, 's1', 's3'))).toBe(false);
      // A section id in the other case is the same section.
      expect(coveringRow(rows, sessionAt(5, 'S2'), false)).toBe(rows[0]);
      // Two rows covering a joint session: the smaller section id in lower case first.
      const joint = [row('S-B', 0, null), row('s-a', 0, null)];
      expect(coveringRow(joint, sessionAt(5, 's-a', 's-b'), false)).toBe(joint[1]);
    });

    it('a row trimmed to zero length covers no session', () => {
      expect(isInScope([row('s1', 10, 10)], sessionAt(10, 's1'))).toBe(false);
      expect(isInScope([row('s1', 10, 11)], sessionAt(10, 's1'))).toBe(true);
    });
  });

  describe('Md.9/4: PREVIOUS_ABSENT on the earliest row', () => {
    it("keeps the sessions of that row's section before the first addition, only with PREVIOUS_ABSENT", () => {
      const previousAbsent = [row('s1', 50, null, 'PREVIOUS_ABSENT')];
      expect(coveringRow(previousAbsent, sessionAt(10, 's1'), false)).toBe(previousAbsent[0]);
      expect(isInScope([row('s1', 50, null)], sessionAt(10, 's1'))).toBe(false);
      expect(isInScope(previousAbsent, sessionAt(10, 's2'))).toBe(false);
    });

    it("starts at the first addition of any row, so a later row's section gets no earlier sessions", () => {
      const rows = [row('s1', 50, 60, 'PREVIOUS_ABSENT'), row('s2', 60, null, 'PREVIOUS_ABSENT')];
      expect(coveringRow(rows, sessionAt(10, 's1'), false)).toBe(rows[0]);
      expect(isInScope(rows, sessionAt(10, 's2'))).toBe(false);
      expect(isInScope(rows, sessionAt(55, 's2'))).toBe(false);
    });

    it('reads one first row: at a tie with a trimmed row, the row with a membership, in any order', () => {
      // A section change in the same millisecond as the addition: s1 holds [50, 50), s2 the rest.
      const trimmed = row('s1', 50, 50, 'PREVIOUS_ABSENT');
      const kept = row('s2', 50, null, 'PREVIOUS_ABSENT');
      for (const rows of [
        [trimmed, kept],
        [kept, trimmed],
      ]) {
        expect(coveringRow(rows, sessionAt(10, 's2'), false)).toBe(kept);
        expect(isInScope(rows, sessionAt(10, 's1'))).toBe(false);
        expect(coveringRow(rows, sessionAt(10, 's1', 's2'), false)).toBe(kept);
        expect(coveringRow(rows, sessionAt(10, 's1'), true)).toBe(trimmed);
      }
    });

    it('a first row trimmed to zero length still marks the first addition, and its instant is not before it', () => {
      const rows = [row('s1', 50, 50, 'PREVIOUS_ABSENT'), row('s2', 60, null, 'PREVIOUS_ABSENT')];
      expect(coveringRow(rows, sessionAt(49, 's1'), false)).toBe(rows[0]);
      expect(isInScope(rows, sessionAt(50, 's1'))).toBe(false);
      expect(isInScope(rows, sessionAt(10, 's2'))).toBe(false);
      expect(isInScope(rows, sessionAt(55, 's2'))).toBe(false);
    });
  });

  describe('Participation widens only the calculation, only before the addition (D08-B12)', () => {
    it('counts a participated session that began before the addition in the calculation, not in the predicate', () => {
      const rows = [row('s1', 50, null)];
      const before = sessionAt(10, 's1');
      expect(isInScope(rows, before)).toBe(false);
      expect(isInCalculationScope(rows, before, false)).toBe(false);
      expect(isInCalculationScope(rows, before, true)).toBe(true);
      expect(coveringRow(rows, before, true)).toBe(rows[0]);
    });

    it('keeps a participated session of the new section that began before a section change', () => {
      const rows = [row('s1', 0, 110), row('s2', 110, null)];
      const s2Before = sessionAt(100, 's2');
      expect(isInScope(rows, s2Before)).toBe(false);
      expect(coveringRow(rows, s2Before, true)).toBe(rows[1]);
    });

    it('drops a participated session that starts after the row became inactive', () => {
      const rows = [row('s1', 0, 40)];
      expect(isInCalculationScope(rows, sessionAt(39, 's1'), true)).toBe(true);
      expect(isInCalculationScope(rows, sessionAt(50, 's1'), true)).toBe(false);
    });

    it('drops a participated session of a section the student never joined', () => {
      const rows = [row('s1', 50, null)];
      expect(isInCalculationScope(rows, sessionAt(10, 's1'), true)).toBe(true);
      expect(isInCalculationScope(rows, sessionAt(60, 's2'), true)).toBe(false);
      expect(isInCalculationScope(rows, sessionAt(10, 's2'), true)).toBe(false);
    });

    it('drops a session whose row a revival trimmed to zero length, so the slot counts once (D03)', () => {
      // In s2 at 5, moved to s1 at 10, removed at 20, back in s2 at 30: s2 revives, s1 is trimmed.
      const rows = [row('s2', 5, null), row('s1', 10, 10)];
      expect(isInCalculationScope(rows, sessionAt(15, 's1'), true)).toBe(false);
      expect(coveringRow(rows, sessionAt(15, 's2'), true)).toBe(rows[0]);
      expect(isInCalculationScope(rows, sessionAt(10, 's1'), true)).toBe(false);
    });

    it('gives the cell to the earliest addition after the start, and membership comes first', () => {
      const later = [row('s1', 120, 130), row('s2', 130, null)];
      expect(coveringRow(later, sessionAt(100, 's1', 's2'), true)).toBe(later[0]);
      expect(coveringRow(later, sessionAt(100, 's1', 's2'), false)).toBeNull();
      const changed = [row('s1', 0, 50), row('s2', 50, null)];
      expect(coveringRow(changed, sessionAt(40, 's1', 's2'), true)).toBe(changed[0]);
    });

    it('at a tie after the start, gives the cell to the row with a membership, in any order', () => {
      // In s3 until 10, then a same-millisecond change leaves s1 trimmed and s2 kept.
      const before = row('s3', 0, 10);
      const trimmed = row('s1', 10, 10);
      const kept = row('s2', 10, null);
      for (const rows of [
        [before, trimmed, kept],
        [kept, trimmed, before],
      ]) {
        expect(coveringRow(rows, sessionAt(5, 's1', 's2'), true)).toBe(kept);
        expect(coveringRow(rows, sessionAt(5, 's1'), true)).toBe(trimmed);
        expect(coveringRow(rows, sessionAt(5, 's1', 's2'), false)).toBeNull();
      }
    });
  });

  describe('Fixed order among candidate rows', () => {
    it("returns the caller's own row object", () => {
      const rows = [{ ...row('s1', 0, null), id: 'row-1' }];
      const found = coveringRow(rows, sessionAt(5, 's1'), false);
      expect(found).toBe(rows[0]);
      expect(found?.id).toBe('row-1');
    });

    it('breaks a tie on addedAt by the smaller sectionId, whatever the row order', () => {
      // The tie D03 can store at one instant: two rows trimmed to zero length.
      const s1Trimmed = row('s1', 10, 10, 'PREVIOUS_ABSENT');
      const s2Trimmed = row('s2', 10, 10, 'PREVIOUS_ABSENT');
      for (const rows of [
        [s2Trimmed, s1Trimmed],
        [s1Trimmed, s2Trimmed],
      ]) {
        expect(coveringRow(rows, sessionAt(5, 's1'), false)).toBe(s1Trimmed);
        expect(isInScope(rows, sessionAt(5, 's2'))).toBe(false);
        expect(coveringRow(rows, sessionAt(5, 's1', 's2'), true)).toBe(s1Trimmed);
      }
      // Two open rows added at one instant overlap, which D03 never stores (invariants.2);
      // they pin the key for membership and for the choice of the first row.
      const s2 = row('s2', 10, null);
      const s1 = row('s1', 10, null);
      const s2Absent = row('s2', 10, null, 'PREVIOUS_ABSENT');
      const s1Absent = row('s1', 10, null, 'PREVIOUS_ABSENT');
      for (const [a, b] of [
        [s2, s1],
        [s1, s2],
      ] as const) {
        expect(coveringRow([a, b], sessionAt(20, 's1', 's2'), false)).toBe(s1);
        expect(coveringRow([a, b], sessionAt(5, 's1', 's2'), true)).toBe(s1);
      }
      expect(coveringRow([s2Absent, s1Absent], sessionAt(5, 's1', 's2'), false)).toBe(s1Absent);
      expect(coveringRow([s1Absent, s2Absent], sessionAt(5, 's1', 's2'), false)).toBe(s1Absent);
      expect(isInScope([s2Absent, s1Absent], sessionAt(5, 's2'))).toBe(false);
      expect(isInScope([s1Absent, s2Absent], sessionAt(5, 's2'))).toBe(false);
    });

    it('names the first row: earliest addition, even trimmed, and at a tie the row the student holds', () => {
      expect(firstRow([])).toBeNull();
      const trimmed = { ...row('s1', 50, 50, 'PREVIOUS_ABSENT'), id: 'trimmed' };
      const held = { ...row('s2', 50, null, 'PREVIOUS_ABSENT'), id: 'held' };
      expect(firstRow([trimmed, held])).toBe(held);
      expect(firstRow([held, trimmed])).toBe(held);
      const earlierTrimmed = { ...row('s1', 49, 49, 'PREVIOUS_ABSENT'), id: 'earlier' };
      expect(firstRow([held, earlierTrimmed])).toBe(earlierTrimmed);
      // The same row anchors Md.9/4: its section before its addition, no other section.
      expect(coveringRow([held, earlierTrimmed], sessionAt(10, 's1'), false)).toBe(earlierTrimmed);
      expect(isInScope([held, earlierTrimmed], sessionAt(10, 's2'))).toBe(false);
    });

    it('still orders two rows of one section, which D03 never stores: earlier end, then PREVIOUS_ABSENT', () => {
      const closed = row('s1', 10, 30);
      const open = row('s1', 10, null);
      const absent = row('s1', 10, null, 'PREVIOUS_ABSENT');
      expect(coveringRow([open, closed], sessionAt(20, 's1'), false)).toBe(closed);
      expect(coveringRow([closed, open], sessionAt(20, 's1'), false)).toBe(closed);
      expect(coveringRow([open, absent], sessionAt(20, 's1'), false)).toBe(absent);
      expect(coveringRow([absent, open], sessionAt(20, 's1'), false)).toBe(absent);
    });

    it('returns the first given of rows equal in all four fields (two rows of one section)', () => {
      const first = { ...row('s1', 10, null), id: 'row-1' };
      const second = { ...row('s1', 10, null), id: 'row-2' };
      expect(coveringRow([first, second], sessionAt(20, 's1'), false)).toBe(first);
      expect(coveringRow([second, first], sessionAt(20, 's1'), false)).toBe(second);
    });

    it('reads the choice of the first row only (rows with different choices are never stored by D03)', () => {
      const s1NotCounted = row('s1', 5, null);
      const s2Absent = row('s2', 5, null, 'PREVIOUS_ABSENT');
      expect(isInScope([s2Absent, s1NotCounted], sessionAt(2, 's2'))).toBe(false);
      expect(isInScope([s2Absent, s1NotCounted], sessionAt(2, 's1', 's2'))).toBe(false);
      const s1Absent = row('s1', 5, null, 'PREVIOUS_ABSENT');
      const s2NotCounted = row('s2', 5, null);
      expect(coveringRow([s2NotCounted, s1Absent], sessionAt(2, 's1', 's2'), false)).toBe(s1Absent);
      expect(isInScope([s2NotCounted, s1Absent], sessionAt(2, 's2'))).toBe(false);
    });
  });
});

// Random rows on a short timeline, so that tied addedAtMs, zero-length (trimmed) rows, open
// rows, section changes and several rows of one section all come up often. A row may bring
// a twin added at the same instant in another section, mostly trimmed to zero length: the
// tie a same-millisecond section change or a revival leaves behind (D03).
const SECTIONS = ['s1', 's2', 's3'];
const MAX_ADDED = 12;
const MAX_LENGTH = 10;
const MAX_START = 20;
// The oracle walks every instant below HORIZON; every generated instant is below it.
const HORIZON = MAX_START + MAX_LENGTH;

const lengthArb = fc.oneof(
  fc.constant(0),
  fc.integer({ min: 1, max: MAX_LENGTH }),
  fc.constant(null),
);
const rowArb: fc.Arbitrary<ScopeRow> = fc
  .record({
    sectionId: fc.constantFrom(...SECTIONS),
    addedAtMs: fc.integer({ min: 0, max: MAX_ADDED }),
    length: lengthArb,
    lateEnrollmentChoice: fc.constantFrom(...LATE_CHOICES),
  })
  .map(({ length, ...fields }) => ({
    ...fields,
    inactiveAtMs: length === null ? null : fields.addedAtMs + length,
  }));
// A twin goes to another section (shift) and is mostly trimmed; three groups in four get one.
const twinArb = fc.record({
  shift: fc.integer({ min: 1, max: SECTIONS.length - 1 }),
  length: fc.oneof({ arbitrary: fc.constant(0), weight: 2 }, { arbitrary: lengthArb, weight: 1 }),
});
const rowsArb: fc.Arbitrary<ScopeRow[]> = fc
  .array(fc.tuple(rowArb, fc.option(twinArb, { nil: null, freq: 4 })), { maxLength: 3 })
  .map((groups) =>
    groups.flatMap(([base, twin]) =>
      twin === null
        ? [base]
        : [
            base,
            {
              ...base,
              sectionId:
                SECTIONS[(SECTIONS.indexOf(base.sectionId) + twin.shift) % SECTIONS.length] ??
                base.sectionId,
              inactiveAtMs: twin.length === null ? null : base.addedAtMs + twin.length,
            },
          ],
    ),
  );
// Sessions of one section or joint ones; half the draws ask for at least two sections.
const sessionArb: fc.Arbitrary<ScopeSession> = fc.record({
  sectionIds: fc.oneof(
    fc.subarray(SECTIONS, { minLength: 1 }),
    fc.subarray(SECTIONS, { minLength: 2 }),
  ),
  startAtMs: fc.integer({ min: 0, max: MAX_START }),
});

type Rule = 'MEMBERSHIP' | 'PREVIOUS_ABSENT' | 'PARTICIPATION';
type Verdict = { row: ScopeRow; rule: Rule; rivals: readonly ScopeRow[] };

// Replays the roster on the integer timeline: who holds the student at each instant, who is
// added at each instant, and which rows hold the student at no instant (trimmed).
function replay(rows: readonly ScopeRow[]) {
  const holders: ScopeRow[][] = Array.from({ length: HORIZON }, () => []);
  const additions: ScopeRow[][] = Array.from({ length: HORIZON }, () => []);
  const holdsSomewhere = new Set<ScopeRow>();
  for (const r of rows) {
    if (r.addedAtMs >= HORIZON || (r.inactiveAtMs ?? 0) >= HORIZON) {
      throw new Error('row outside the oracle timeline');
    }
    additions[r.addedAtMs]?.push(r);
    for (let t = r.addedAtMs; t < (r.inactiveAtMs ?? HORIZON); t += 1) {
      holders[t]?.push(r);
      holdsSomewhere.add(r);
    }
  }
  // The documented order as a sort: addedAt, a row that holds somewhere before a trimmed
  // one, sectionId, end (open last), PREVIOUS_ABSENT first. The sort is stable.
  const order = (a: ScopeRow, b: ScopeRow): number => {
    if (a.addedAtMs !== b.addedAtMs) return a.addedAtMs - b.addedAtMs;
    if (holdsSomewhere.has(a) !== holdsSomewhere.has(b)) return holdsSomewhere.has(a) ? -1 : 1;
    if (a.sectionId !== b.sectionId) return a.sectionId < b.sectionId ? -1 : 1;
    const end = (r: ScopeRow) => r.inactiveAtMs ?? HORIZON;
    if (end(a) !== end(b)) return end(a) - end(b);
    if (a.lateEnrollmentChoice === b.lateEnrollmentChoice) return 0;
    return a.lateEnrollmentChoice === 'PREVIOUS_ABSENT' ? -1 : 1;
  };
  const pick = (candidates: readonly ScopeRow[]) => [...candidates].sort(order)[0];
  // The first instant with an addition, the rows added then, and the first of them.
  let firstInstant = 0;
  while (firstInstant < HORIZON && (additions[firstInstant] ?? []).length === 0) {
    firstInstant += 1;
  }
  const firstRows = additions[firstInstant] ?? [];
  return {
    holders,
    additions,
    holdsSomewhere,
    pick,
    firstInstant,
    firstRows,
    firstRow: pick(firstRows),
  };
}

// Independent oracle, a brute force over time: it decides from the replay above instead of
// comparing interval bounds, applying the three rules in their order.
function oracle(
  rows: readonly ScopeRow[],
  session: ScopeSession,
  participated: boolean,
): Verdict | null {
  if (session.startAtMs >= HORIZON) throw new Error('session outside the oracle timeline');
  const inSections = (r: ScopeRow) => session.sectionIds.includes(r.sectionId);
  const timeline = replay(rows);
  const decide = (rule: Rule, rivals: readonly ScopeRow[]): Verdict | null => {
    const chosen = timeline.pick(rivals);
    return chosen === undefined ? null : { row: chosen, rule, rivals };
  };
  // 1. Who holds the student, in one of the session's sections, at the start instant.
  const member = decide(
    'MEMBERSHIP',
    (timeline.holders[session.startAtMs] ?? []).filter(inSections),
  );
  if (member !== null) return member;
  // 2. Nobody added at any instant up to the start, and the first row decides.
  const first = timeline.firstRow;
  if (
    first !== undefined &&
    timeline.firstInstant > session.startAtMs &&
    first.lateEnrollmentChoice === 'PREVIOUS_ABSENT' &&
    inSections(first)
  ) {
    return { row: first, rule: 'PREVIOUS_ABSENT', rivals: timeline.firstRows };
  }
  if (!participated) return null;
  // 3. The first instant after the start at which a row of the session's sections is added.
  for (let t = session.startAtMs + 1; t < HORIZON; t += 1) {
    const added = decide('PARTICIPATION', (timeline.additions[t] ?? []).filter(inSections));
    if (added !== null) return added;
  }
  return null;
}

// The participation window, by the same replay: a row of one of the session's sections
// is added at some instant after the session began.
function addedAfterStart(rows: readonly ScopeRow[], session: ScopeSession): boolean {
  for (let t = session.startAtMs + 1; t < HORIZON; t += 1) {
    if (rows.some((r) => r.addedAtMs === t && session.sectionIds.includes(r.sectionId))) {
      return true;
    }
  }
  return false;
}

// Each counted case must come up at least this often in 4000 runs (a positive control). Over
// 300 seeds the tie cases never fell below 139 (Md.9/4), 67 (participation) and 45 (first
// row of another section), and the rule, shape and window cases never below 219.
const MIN_CASES = 80;
const MIN_TIES = 25;

describe('Public scope predicate and session hours: properties', () => {
  it('the covering row, the predicate and the calculation scope match a brute force over time', () => {
    const seen = { MEMBERSHIP: 0, PREVIOUS_ABSENT: 0, PARTICIPATION: 0, OUT: 0 };
    const shapes = { tiedAddedAt: 0, zeroLengthRow: 0 };
    // Ties D03 can store: rows of two sections added at the deciding instant, one trimmed,
    // and a tied first addition where the session belongs to a tied row other than the first.
    const ties = { previousAbsent: 0, participation: 0, firstRowOtherSection: 0 };
    fc.assert(
      fc.property(rowsArb, sessionArb, fc.boolean(), (rows, session, participated) => {
        const expected = oracle(rows, session, participated);
        expect(coveringRow(rows, session, participated)).toBe(expected?.row ?? null);
        expect(isInCalculationScope(rows, session, participated)).toBe(expected !== null);
        expect(isInScope(rows, session)).toBe(oracle(rows, session, false) !== null);
        seen[expected?.rule ?? 'OUT'] += 1;
        const timeline = replay(rows);
        if (new Set(rows.map((r) => r.addedAtMs)).size < rows.length) shapes.tiedAddedAt += 1;
        if (rows.some((r) => !timeline.holdsSomewhere.has(r))) shapes.zeroLengthRow += 1;
        const trimmedTie = (rivals: readonly ScopeRow[]) =>
          new Set(rivals.map((r) => r.sectionId)).size > 1 &&
          rivals.some((r) => !timeline.holdsSomewhere.has(r));
        if (expected?.rule === 'PREVIOUS_ABSENT' && trimmedTie(expected.rivals)) {
          ties.previousAbsent += 1;
        }
        if (expected?.rule === 'PARTICIPATION' && trimmedTie(expected.rivals)) {
          ties.participation += 1;
        }
        const inSections = (r: ScopeRow) => session.sectionIds.includes(r.sectionId);
        if (
          timeline.firstRow !== undefined &&
          session.startAtMs < timeline.firstInstant &&
          !inSections(timeline.firstRow) &&
          timeline.firstRows.some(
            (r) => inSections(r) && r.lateEnrollmentChoice === 'PREVIOUS_ABSENT',
          )
        ) {
          ties.firstRowOtherSection += 1;
        }
      }),
      { numRuns: 4000 },
    );
    for (const [name, count] of Object.entries({ ...seen, ...shapes })) {
      expect(count, name).toBeGreaterThanOrEqual(MIN_CASES);
    }
    for (const [name, count] of Object.entries(ties)) {
      expect(count, name).toBeGreaterThanOrEqual(MIN_TIES);
    }
  });

  it('participation adds exactly the sessions that began before a row of their section was added', () => {
    const seen = { difference: 0, alreadyInScope: 0, outsideWindow: 0 };
    fc.assert(
      fc.property(rowsArb, sessionArb, (rows, session) => {
        const beganBeforeAddition = addedAfterStart(rows, session);
        const predicate = isInScope(rows, session);
        expect(isInCalculationScope(rows, session, true)).toBe(predicate || beganBeforeAddition);
        if (!beganBeforeAddition) {
          // Participation outside the window changes nothing, not even the covering row.
          expect(coveringRow(rows, session, true)).toBe(coveringRow(rows, session, false));
          seen.outsideWindow += 1;
        } else if (predicate) seen.alreadyInScope += 1;
        else seen.difference += 1;
      }),
      { numRuns: 4000 },
    );
    for (const [name, count] of Object.entries(seen)) {
      expect(count, name).toBeGreaterThanOrEqual(MIN_CASES);
    }
  });

  it('the answer does not depend on the order of the rows', () => {
    let reordered = 0;
    fc.assert(
      fc.property(
        rowsArb.chain((rows) =>
          fc.tuple(
            fc.constant(rows),
            fc.shuffledSubarray(rows, { minLength: rows.length, maxLength: rows.length }),
          ),
        ),
        sessionArb,
        fc.boolean(),
        ([rows, shuffled], session, participated) => {
          expect(coveringRow(shuffled, session, participated)).toEqual(
            coveringRow(rows, session, participated),
          );
          expect(isInScope(shuffled, session)).toBe(isInScope(rows, session));
          if (shuffled.some((r, index) => r !== rows[index])) reordered += 1;
        },
      ),
      { numRuns: 4000 },
    );
    expect(reordered).toBeGreaterThanOrEqual(MIN_CASES);
  });
});
