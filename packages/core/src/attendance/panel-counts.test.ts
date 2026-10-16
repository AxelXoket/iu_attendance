import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FINAL_STATUSES, type FinalStatus } from '../corrections/catalog.ts';
import { ROW_STATUSES } from '../rosters/row-status.ts';
import { RECORD_DECISIONS, type RecordDecision } from '../verification/codes.ts';
import { type PanelRow, panelCounts } from './panel-counts.ts';

const row = (
  countedDecision: RecordDecision | null,
  finalStatus: FinalStatus | null,
  patch: Partial<PanelRow> = {},
): PanelRow => ({ rowStatus: 'ACTIVE', exempt: false, countedDecision, finalStatus, ...patch });

// The 17 students of the design's session page (tasarim.html, head-sw-l), in its order.
const DESIGN_ROWS: PanelRow[] = [
  row('PRESENT', 'PRESENT'),
  row('IN_REVIEW', null),
  row(null, 'ON_DUTY'),
  row('PRESENT', 'PRESENT'),
  row('IN_REVIEW', null),
  row(null, 'ABSENT'),
  row('PENDING', null),
  row('REJECTED', 'ABSENT'),
  row(null, 'MANUALLY_ADDED'),
  row(null, 'DOCUMENTED'),
  row(null, null, { exempt: true }),
  row('PRESENT', 'PRESENT'),
  row('PRESENT', 'PRESENT'),
  row('PRESENT', 'PRESENT'),
  row('PRESENT', 'PRESENT'),
  row(null, 'ABSENT'),
  row('PRESENT', 'PRESENT'),
];

const DESIGN_COUNTS = {
  students: 17,
  present: 7,
  absent: 3,
  rejectedRecords: 1,
  inReviewAndPending: { total: 3, inReview: 2, pending: 1 },
  correctionsAndExempt: 4,
};

// The bucket (a set, or a part of one) an active row belongs to, read off the spec's rule
// one condition at a time.
const expectedSet = (entry: PanelRow) => {
  if (entry.exempt) return 'correctionsAndExempt';
  if (entry.finalStatus === 'ON_DUTY') return 'correctionsAndExempt';
  if (entry.finalStatus === 'DOCUMENTED') return 'correctionsAndExempt';
  if (entry.finalStatus === 'MANUALLY_ADDED') return 'correctionsAndExempt';
  if (entry.countedDecision === 'PRESENT') return 'present';
  if (entry.countedDecision === 'PENDING') return 'pending';
  if (entry.countedDecision === 'IN_REVIEW') return 'inReview';
  return entry.countedDecision === 'REJECTED' ? 'absentRejected' : 'absentNoRecord';
};

describe('panel counts', () => {
  it('counts the design example', () => {
    expect(panelCounts(DESIGN_ROWS)).toEqual(DESIGN_COUNTS);
  });

  it('puts an exempt student with a present record in corrections and exempt', () => {
    const counts = panelCounts([...DESIGN_ROWS, row('PRESENT', 'PRESENT', { exempt: true })]);
    expect(counts).toEqual({ ...DESIGN_COUNTS, students: 18, correctionsAndExempt: 5 });
    // A correction on a rejected record takes the row out of the absent set.
    const corrected = panelCounts([row('REJECTED', 'ON_DUTY')]);
    expect([corrected.correctionsAndExempt, corrected.absent, corrected.rejectedRecords]).toEqual([
      1, 0, 0,
    ]);
  });

  it('leaves inactive rows out', () => {
    const inactive = DESIGN_ROWS.map((entry) => ({ ...entry, rowStatus: 'INACTIVE' as const }));
    expect(panelCounts([...DESIGN_ROWS, ...inactive])).toEqual(DESIGN_COUNTS);
    expect(panelCounts(inactive).students).toBe(0);
  });

  it('puts each active row in exactly one set and no inactive row in any', () => {
    const anyRow = fc.record({
      rowStatus: fc.constantFrom(...ROW_STATUSES),
      exempt: fc.boolean(),
      countedDecision: fc.constantFrom(null, ...RECORD_DECISIONS),
      finalStatus: fc.constantFrom(null, ...FINAL_STATUSES.map((status) => status.code)),
    });
    const sets = new Set<string>();
    fc.assert(
      fc.property(fc.array(anyRow, { maxLength: 40 }), (rows) => {
        const counts = panelCounts(rows);
        const active = rows.filter((entry) => entry.rowStatus === 'ACTIVE');
        expect(counts.students).toBe(active.length);
        expect(
          counts.present +
            counts.absent +
            counts.inReviewAndPending.total +
            counts.correctionsAndExempt,
        ).toBe(active.length);
        expect(counts.inReviewAndPending.total).toBe(
          counts.inReviewAndPending.inReview + counts.inReviewAndPending.pending,
        );
        // Every field is the tally of the active rows' buckets.
        const tally = {
          present: 0,
          absentNoRecord: 0,
          absentRejected: 0,
          inReview: 0,
          pending: 0,
          correctionsAndExempt: 0,
        };
        for (const entry of active) tally[expectedSet(entry)] += 1;
        expect(counts).toEqual({
          students: active.length,
          present: tally.present,
          absent: tally.absentNoRecord + tally.absentRejected,
          rejectedRecords: tally.absentRejected,
          inReviewAndPending: {
            total: tally.inReview + tally.pending,
            inReview: tally.inReview,
            pending: tally.pending,
          },
          correctionsAndExempt: tally.correctionsAndExempt,
        });
        // Row by row: one set for an active row, none for an inactive one.
        for (const entry of rows) {
          const one = panelCounts([entry]);
          const single = {
            present: one.present,
            absentNoRecord: one.absent - one.rejectedRecords,
            absentRejected: one.rejectedRecords,
            inReview: one.inReviewAndPending.inReview,
            pending: one.inReviewAndPending.pending,
            correctionsAndExempt: one.correctionsAndExempt,
          };
          const hit = Object.entries(single).filter(([, count]) => count === 1);
          if (entry.rowStatus === 'ACTIVE') {
            expect(hit.map(([set]) => set)).toEqual([expectedSet(entry)]);
            sets.add(expectedSet(entry));
          } else {
            expect(hit).toEqual([]);
          }
        }
      }),
      { numRuns: 1000 },
    );
    // Ground control: every bucket occurred.
    expect([...sets].sort()).toEqual(
      [
        'absentNoRecord',
        'absentRejected',
        'correctionsAndExempt',
        'inReview',
        'pending',
        'present',
      ].sort(),
    );
  });
});
