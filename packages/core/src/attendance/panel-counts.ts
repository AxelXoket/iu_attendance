// Panel counts (D05): the session view's four sets over the roster's active rows. Each
// active row goes into the first set it fits: (1) exempt, or a final status of on duty,
// documented or manually added: corrections and exempt; (2) a counted record decided
// PRESENT: present; (3) PENDING or IN_REVIEW: in review and pending; (4) otherwise
// absent, where rejectedRecords counts the rows whose counted record was REJECTED. The
// server's decision counts, not a label. An inactive row is in no set.

import type { FinalStatus } from '../corrections/catalog.ts';
import type { RowStatus } from '../rosters/row-status.ts';
import type { RecordDecision } from '../verification/codes.ts';

export type PanelRow = {
  readonly rowStatus: RowStatus;
  readonly exempt: boolean;
  /** The decision of the row's counted record; null without a record. */
  readonly countedDecision: RecordDecision | null;
  readonly finalStatus: FinalStatus | null;
};

export type PanelCounts = {
  readonly students: number;
  readonly present: number;
  readonly absent: number;
  readonly rejectedRecords: number;
  readonly inReviewAndPending: {
    readonly total: number;
    readonly inReview: number;
    readonly pending: number;
  };
  readonly correctionsAndExempt: number;
};

const CORRECTED: ReadonlySet<FinalStatus | null> = new Set([
  'ON_DUTY',
  'DOCUMENTED',
  'MANUALLY_ADDED',
]);

/** The four sets of the session view over the rows of its roster. */
export function panelCounts(rows: readonly PanelRow[]): PanelCounts {
  let students = 0;
  let present = 0;
  let absent = 0;
  let rejectedRecords = 0;
  let inReview = 0;
  let pending = 0;
  let correctionsAndExempt = 0;
  for (const row of rows) {
    if (row.rowStatus !== 'ACTIVE') continue;
    students += 1;
    if (row.exempt || CORRECTED.has(row.finalStatus)) correctionsAndExempt += 1;
    else if (row.countedDecision === 'PRESENT') present += 1;
    else if (row.countedDecision === 'IN_REVIEW') inReview += 1;
    else if (row.countedDecision === 'PENDING') pending += 1;
    else {
      absent += 1;
      if (row.countedDecision === 'REJECTED') rejectedRecords += 1;
    }
  }
  return {
    students,
    present,
    absent,
    rejectedRecords,
    inReviewAndPending: { total: inReview + pending, inReview, pending },
    correctionsAndExempt,
  };
}
