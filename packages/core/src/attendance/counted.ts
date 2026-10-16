// Counted record (D05): of a student's records in one session exactly one counts, the
// first in this order: decision (PRESENT, PENDING, IN_REVIEW, REJECTED), then the
// earlier arrival, then the smaller id. Ids are UUIDs compared in lower case, whose text
// order is the database's uuid order, so the order is total and the choice does not
// depend on the order the records arrived in. The session view uses the same order to
// pick one record among the counted records of the accounts of one student number.

import { compareText } from '../shared/text.ts';
import { idKey } from '../shared/uuid.ts';
import type { RecordDecision } from '../verification/codes.ts';

export type CountedCandidate = {
  readonly id: string;
  readonly decision: RecordDecision;
  readonly arrivedAtMs: number;
};

// The decision order, written out here rather than taken from the order of the decision
// list, so reordering that list for display cannot change which record counts.
export const COUNTED_DECISION_ORDER = [
  'PRESENT',
  'PENDING',
  'IN_REVIEW',
  'REJECTED',
] as const satisfies readonly RecordDecision[];
// -1 for a decision outside the order.
const rank = (decision: RecordDecision) =>
  (COUNTED_DECISION_ORDER as readonly RecordDecision[]).indexOf(decision);

// Negative when a comes before b in the counted order; chooseCounted checks the input.
function compareCounted(a: CountedCandidate, b: CountedCandidate): number {
  return (
    rank(a.decision) - rank(b.decision) ||
    a.arrivedAtMs - b.arrivedAtMs ||
    compareText(idKey(a.id), idKey(b.id))
  );
}

/**
 * The record that counts, or null when there is none. Throws RangeError for an unknown
 * decision, an arrival that is not integer milliseconds or a repeated id: any of them
 * would make the choice depend on the order of the list.
 */
export function chooseCounted<Candidate extends CountedCandidate>(
  records: readonly Candidate[],
): Candidate | null {
  const ids = new Set<string>();
  let counted: Candidate | null = null;
  for (const record of records) {
    if (rank(record.decision) < 0 || !Number.isSafeInteger(record.arrivedAtMs)) {
      throw new RangeError(`record ${record.id} has no known decision or integer arrival`);
    }
    const id = idKey(record.id);
    if (ids.has(id)) throw new RangeError(`record ${record.id} is listed twice`);
    ids.add(id);
    if (counted === null || compareCounted(record, counted) < 0) counted = record;
  }
  return counted;
}
