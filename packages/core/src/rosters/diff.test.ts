import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type DiffInput,
  type FileEntry,
  isEmptyDiff,
  type RosterDiff,
  type RosterRow,
  rosterDiff,
  UPLOAD_SOURCE,
} from './diff.ts';
import { isMemberAt } from './interval.ts';

const NOW = 2000;

const row = (
  patch: Partial<RosterRow> & Pick<RosterRow, 'sectionId' | 'studentNumber'>,
): RosterRow => ({
  rowId: `${patch.sectionId}-${patch.studentNumber}`,
  fullName: 'Ada Yılmaz',
  order: 1,
  source: UPLOAD_SOURCE,
  addedAtMs: 100,
  inactiveAtMs: null,
  ...patch,
});

const entry = (studentNumber: string, fullName = 'Ada Yılmaz', fileRowNumber = 2): FileEntry => ({
  fileRowNumber,
  studentNumber,
  fullName,
});

const diffOf = (
  courseRows: RosterRow[],
  entries: FileEntry[],
  firstHeldAtMs: number | null = null,
) => rosterDiff({ sectionId: 'S', courseRows, entries, nowMs: NOW, firstHeldAtMs });

// The writes the server makes for a diff, on plain rows: the model the properties check.
function applyDiff(input: DiffInput, diff: RosterDiff): RosterRow[] {
  const rows = new Map(input.courseRows.map((r) => [r.rowId, r]));
  const update = (rowId: string, patch: Partial<RosterRow>) => {
    const current = rows.get(rowId);
    if (current === undefined) throw new Error(`no row ${rowId}`);
    rows.set(rowId, { ...current, ...patch });
  };
  const open = (placement: { studentNumber: string; fullName: string; order: number }) => {
    const rowId = `new-${placement.studentNumber}`;
    rows.set(rowId, {
      rowId,
      sectionId: input.sectionId,
      studentNumber: placement.studentNumber,
      fullName: placement.fullName,
      order: placement.order,
      source: UPLOAD_SOURCE,
      addedAtMs: input.nowMs,
      inactiveAtMs: null,
    });
  };
  const comeBack = { inactiveAtMs: null, source: UPLOAD_SOURCE };
  for (const { rowId } of diff.toDeactivate) update(rowId, { inactiveAtMs: input.nowMs });
  for (const change of diff.sectionChanges) {
    update(change.oldRowId, { inactiveAtMs: input.nowMs });
    if (change.targetRowId === null) open(change);
    else
      update(change.targetRowId, { ...comeBack, fullName: change.fullName, order: change.order });
  }
  for (const back of diff.toReactivate)
    update(back.rowId, { ...comeBack, fullName: back.fullName, order: back.order });
  for (const added of diff.toAdd) open(added);
  for (const trim of diff.toTrim) {
    // The diff names the end the cut starts from.
    expect(rows.get(trim.rowId)?.inactiveAtMs).toBe(trim.inactiveAtMs);
    update(trim.rowId, { inactiveAtMs: trim.newInactiveAtMs });
  }
  for (const change of diff.nameChanges) update(change.rowId, { fullName: change.newName });
  for (const fix of diff.spellingFixes) update(fix.rowId, { fullName: fix.newName });
  for (const change of diff.orderChanges) update(change.rowId, { order: change.order });
  for (const { rowId } of diff.sourceChanges) update(rowId, { source: UPLOAD_SOURCE });
  return [...rows.values()];
}

describe('rosterDiff: new numbers', () => {
  it('adds a number new to the course, late only when added after the first held session', () => {
    expect(diffOf([], [entry('100000001')], 100).toAdd).toEqual([
      {
        fileRowNumber: 2,
        studentNumber: '100000001',
        fullName: 'Ada Yılmaz',
        order: 1,
        lateAdded: true,
      },
    ]);
    expect(diffOf([], [entry('100000001')], null).toAdd[0]?.lateAdded).toBe(false);
    expect(diffOf([], [entry('100000001')], NOW).toAdd[0]?.lateAdded).toBe(false);
    expect(diffOf([], [entry('100000001')], NOW - 1).toAdd[0]?.lateAdded).toBe(true);
  });

  it('adds without the late mark when the number has an inactive row in another section', () => {
    const elsewhere = row({ sectionId: 'T', studentNumber: '100000001', inactiveAtMs: 500 });
    const diff = diffOf([elsewhere], [entry('100000001')], 100);
    expect(diff.toAdd).toHaveLength(1);
    expect(diff.toAdd[0]?.lateAdded).toBe(false);
    expect(diff.toTrim).toEqual([]);
  });
});

describe('rosterDiff: students who come back or move', () => {
  it('reactivates the same row and cuts the other spans its kept start overlaps', () => {
    const here = row({
      sectionId: 'S',
      studentNumber: '100000001',
      addedAtMs: 100,
      inactiveAtMs: 500,
    });
    const later = row({
      sectionId: 'T',
      studentNumber: '100000001',
      addedAtMs: 600,
      inactiveAtMs: 900,
    });
    const before = row({
      sectionId: 'U',
      studentNumber: '100000001',
      addedAtMs: 50,
      inactiveAtMs: 80,
    });
    const diff = diffOf([here, later, before], [entry('100000001', 'Ada Kaya')]);
    expect(diff.toReactivate).toEqual([
      {
        fileRowNumber: 2,
        studentNumber: '100000001',
        fullName: 'Ada Kaya',
        order: 1,
        rowId: 'S-100000001',
      },
    ]);
    expect(diff.toTrim).toEqual([
      { rowId: 'T-100000001', sectionId: 'T', inactiveAtMs: 900, newInactiveAtMs: 600 },
    ]);
    expect(diff.toAdd).toEqual([]);
    // Coming back under another name is also a name change of its own.
    expect(diff.nameChanges).toEqual([
      { rowId: 'S-100000001', fileRowNumber: 2, oldName: 'Ada Yılmaz', newName: 'Ada Kaya' },
    ]);
    const spelled = diffOf([here], [entry('100000001', 'ADA YILMAZ')]);
    expect(spelled.spellingFixes).toEqual([{ rowId: 'S-100000001', newName: 'ADA YILMAZ' }]);
    expect(spelled.nameChanges).toEqual([]);
  });

  it('moves a student active elsewhere into this section, reusing its inactive row here', () => {
    const old = row({ sectionId: 'T', studentNumber: '100000001', addedAtMs: 300 });
    const target = row({
      sectionId: 'S',
      studentNumber: '100000001',
      addedAtMs: 100,
      inactiveAtMs: 200,
    });
    const diff = diffOf([old, target], [entry('100000001')]);
    expect(diff.sectionChanges).toEqual([
      {
        fileRowNumber: 2,
        studentNumber: '100000001',
        fullName: 'Ada Yılmaz',
        order: 1,
        oldRowId: 'T-100000001',
        oldSectionId: 'T',
        targetRowId: 'S-100000001',
      },
    ]);
    // The old row leaves now; the target's kept start overlaps it, so it shrinks to zero.
    expect(diff.toTrim).toEqual([
      { rowId: 'T-100000001', sectionId: 'T', inactiveAtMs: NOW, newInactiveAtMs: 300 },
    ]);
    expect(diff.toReactivate).toEqual([]);
    expect(diff.nameChanges).toEqual([]);
    // The reused row is compared with the file name like any kept row.
    const renamed = diffOf([old, { ...target, fullName: 'Ada Kaya' }], [entry('100000001')]);
    expect(renamed.nameChanges).toEqual([
      { rowId: 'S-100000001', fileRowNumber: 2, oldName: 'Ada Kaya', newName: 'Ada Yılmaz' },
    ]);
  });

  it('moves a student into a new row when this section has none, cutting nothing', () => {
    const old = row({ sectionId: 'T', studentNumber: '100000001', addedAtMs: 300 });
    const diff = diffOf([old], [entry('100000001')]);
    expect(diff.sectionChanges[0]?.targetRowId).toBeNull();
    expect(diff.toTrim).toEqual([]);
  });

  it('cuts the moved row back to the target start when the target started later', () => {
    const old = row({ sectionId: 'T', studentNumber: '100000001', addedAtMs: 100 });
    const target = row({
      sectionId: 'S',
      studentNumber: '100000001',
      addedAtMs: 400,
      inactiveAtMs: 450,
    });
    expect(diffOf([old, target], [entry('100000001')]).toTrim).toEqual([
      { rowId: 'T-100000001', sectionId: 'T', inactiveAtMs: NOW, newInactiveAtMs: 400 },
    ]);
  });
});

describe('rosterDiff: rows that stay or leave', () => {
  it('deactivates active rows missing from the file and keeps their source for the preview note', () => {
    const manual = row({ sectionId: 'S', studentNumber: '100000001', source: 'MANUAL' });
    const gone = row({ sectionId: 'S', studentNumber: '100000002', inactiveAtMs: 300 });
    const other = row({ sectionId: 'T', studentNumber: '100000003' });
    const diff = diffOf([manual, gone, other], []);
    expect(diff.toDeactivate).toEqual([{ rowId: 'S-100000001', source: 'MANUAL' }]);
  });

  it('tells a real name change from a spelling fix', () => {
    const staying = row({ sectionId: 'S', studentNumber: '100000001', fullName: 'Ada Yılmaz' });
    const spelled = diffOf([staying], [entry('100000001', 'ADA  YILMAZ')]);
    expect(spelled.spellingFixes).toEqual([{ rowId: 'S-100000001', newName: 'ADA  YILMAZ' }]);
    expect(spelled.nameChanges).toEqual([]);
    const renamed = diffOf([staying], [entry('100000001', 'Ada Kaya', 7)]);
    expect(renamed.nameChanges).toEqual([
      { rowId: 'S-100000001', fileRowNumber: 7, oldName: 'Ada Yılmaz', newName: 'Ada Kaya' },
    ]);
    expect(renamed.spellingFixes).toEqual([]);
    // A row whose name changes, even in spelling only, is not an unchanged row.
    expect([spelled.unchanged, renamed.unchanged]).toEqual([0, 0]);
    const same = diffOf([staying], [entry('100000001')]);
    expect(same.unchanged).toBe(1);
    expect(isEmptyDiff(same)).toBe(true);
  });

  it('renumbers by file order, makes staying rows file rows, and counts the untouched ones', () => {
    const first = row({ sectionId: 'S', studentNumber: '100000001', order: 2 });
    const second = row({ sectionId: 'S', studentNumber: '100000002', order: 2, source: 'MANUAL' });
    const third = row({ sectionId: 'S', studentNumber: '100000003', order: 3 });
    const diff = diffOf(
      [first, second, third],
      [entry('100000001'), entry('100000002'), entry('100000003')],
    );
    expect(diff.orderChanges).toEqual([{ rowId: 'S-100000001', order: 1 }]);
    expect(diff.sourceChanges).toEqual([{ rowId: 'S-100000002' }]);
    // The preview has no source count: a row whose only change is its source shows as
    // unchanged, and the upload still writes the source.
    expect(diff.unchanged).toBe(2);
    const manual = row({ sectionId: 'S', studentNumber: '100000002', source: 'MANUAL' });
    const sourceOnly = diffOf([manual], [entry('100000002')]);
    expect([sourceOnly.unchanged, sourceOnly.sourceChanges.length]).toEqual([1, 1]);
    expect(isEmptyDiff(sourceOnly)).toBe(false);
  });
});

describe('rosterDiff: input checks', () => {
  it('rejects a number twice in the entries, two rows of a number in a section, two active rows', () => {
    expect(() => diffOf([], [entry('100000001'), entry('100000001')])).toThrow(RangeError);
    const sameSection = [
      row({ sectionId: 'S', studentNumber: '100000001', rowId: 'a', inactiveAtMs: 10 }),
      row({ sectionId: 'S', studentNumber: '100000001', rowId: 'b', inactiveAtMs: 20 }),
    ];
    expect(() => diffOf(sameSection, [])).toThrow(RangeError);
    const twoActive = [
      row({ sectionId: 'S', studentNumber: '100000001' }),
      row({ sectionId: 'T', studentNumber: '100000001' }),
    ];
    expect(() => diffOf(twoActive, [])).toThrow(RangeError);
    // Ground control: one active and one inactive row of a number is a valid course.
    const valid = [
      twoActive[0] as RosterRow,
      row({ sectionId: 'T', studentNumber: '100000001', inactiveAtMs: 50 }),
    ];
    expect(() => diffOf(valid, [])).not.toThrow();
  });
});

describe('isEmptyDiff', () => {
  it('is false as soon as any list holds a change', () => {
    const empty = diffOf([], []);
    expect(isEmptyDiff(empty)).toBe(true);
    const lists = [
      'toAdd',
      'toReactivate',
      'sectionChanges',
      'toDeactivate',
      'toTrim',
      'nameChanges',
      'spellingFixes',
      'orderChanges',
      'sourceChanges',
    ] as const;
    for (const list of lists) expect(isEmptyDiff({ ...empty, [list]: [{}] }), list).toBe(false);
  });
});

// Generated courses: each number has up to three rows in distinct sections with ordered,
// disjoint spans (a real course), the last one possibly active.
const NUMBERS = ['100000001', '100000002', '100000003', '100000004', '100000005', '100000006'];
const NAMES = ['Ada Yılmaz', 'ADA YILMAZ', 'Ada  Yılmaz', 'Can Demir', 'can demir', 'Deniz Kaya'];
const SOURCES = ['FILE', 'MANUAL', 'SYSTEM'];

const historyArb = (studentNumber: string) =>
  fc
    .record({
      sections: fc.shuffledSubarray(['S', 'T', 'U']),
      times: fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 6, maxLength: 6 }),
      lastActive: fc.boolean(),
      names: fc.array(fc.constantFrom(...NAMES), { minLength: 3, maxLength: 3 }),
      orders: fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 3, maxLength: 3 }),
      sources: fc.array(fc.constantFrom(...SOURCES), { minLength: 3, maxLength: 3 }),
    })
    .map(({ sections, times, lastActive, names, orders, sources }) => {
      const sorted = [...times].sort((a, b) => a - b);
      return sections.map(
        (sectionId, index): RosterRow => ({
          rowId: `${sectionId}-${studentNumber}`,
          sectionId,
          studentNumber,
          fullName: names[index] as string,
          order: orders[index] as number,
          source: sources[index] as string,
          addedAtMs: sorted[2 * index] as number,
          inactiveAtMs:
            lastActive && index === sections.length - 1 ? null : (sorted[2 * index + 1] as number),
        }),
      );
    });

const inputArb = fc
  .record({
    histories: fc.tuple(...NUMBERS.map(historyArb)),
    numbers: fc.shuffledSubarray(NUMBERS),
    names: fc.array(fc.constantFrom(...NAMES), {
      minLength: NUMBERS.length,
      maxLength: NUMBERS.length,
    }),
    firstHeldAtMs: fc.option(fc.integer({ min: 0, max: 3000 }), { nil: null }),
  })
  .map(
    ({ histories, numbers, names, firstHeldAtMs }): DiffInput => ({
      sectionId: 'S',
      courseRows: histories.flat(),
      entries: numbers.map((studentNumber, index) => ({
        fileRowNumber: 2 * index + 3,
        studentNumber,
        fullName: names[index] as string,
      })),
      nowMs: NOW,
      firstHeldAtMs,
    }),
  );

const activeIn = (rows: readonly RosterRow[], sectionId: string) =>
  rows.filter((r) => r.sectionId === sectionId && r.inactiveAtMs === null);

describe('rosterDiff properties', () => {
  it('makes the active set equal the file, and the same file again changes nothing', () => {
    let moved = 0;
    fc.assert(
      fc.property(inputArb, (input) => {
        const diff = rosterDiff(input);
        moved += diff.sectionChanges.length + diff.toReactivate.length;
        const after = applyDiff(input, diff);
        const active = activeIn(after, 'S').map((r) => r.studentNumber);
        expect(new Set(active)).toEqual(new Set(input.entries.map((e) => e.studentNumber)));
        const again = rosterDiff({ ...input, courseRows: after });
        expect(isEmptyDiff(again)).toBe(true);
        expect(again.unchanged).toBe(input.entries.length);
      }),
      { numRuns: 500 },
    );
    // Ground control: the generated courses moved and brought back students.
    expect(moved).toBeGreaterThan(100);
  });

  it('deletes no row, keeps the order 1..n, and leaves each student in one span at a time', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const diff = rosterDiff(input);
        const after = applyDiff(input, diff);
        // The diff has no delete list, so the model cannot drop a row; these two checks
        // state the spec's guarantee rather than test a branch.
        expect(after.length).toBeGreaterThanOrEqual(input.courseRows.length);
        const ids = new Set(after.map((r) => r.rowId));
        for (const r of input.courseRows) expect(ids.has(r.rowId)).toBe(true);
        const wasActive = activeIn(input.courseRows, 'S');
        const stillActive = activeIn(after, 'S').filter((r) =>
          wasActive.some((w) => w.rowId === r.rowId),
        );
        expect(diff.toDeactivate.length + stillActive.length).toBe(wasActive.length);
        const orders = activeIn(after, 'S')
          .map((r) => r.order)
          .sort((a, b) => a - b);
        expect(orders).toEqual(orders.map((_, index) => index + 1));
        for (const studentNumber of NUMBERS) {
          const spans = after.filter((r) => r.studentNumber === studentNumber);
          expect(spans.filter((r) => r.inactiveAtMs === null).length).toBeLessThanOrEqual(1);
          // Two spans share an instant when the later start is before the earlier end;
          // a span is a member at its own start unless it is empty.
          for (const p of spans) {
            for (const q of spans) {
              if (p === q) continue;
              const start = Math.max(p.addedAtMs, q.addedAtMs);
              expect(isMemberAt(p, start) && isMemberAt(q, start)).toBe(false);
            }
          }
        }
      }),
      { numRuns: 500 },
    );
  });
});
