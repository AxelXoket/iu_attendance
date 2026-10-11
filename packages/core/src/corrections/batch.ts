export const CORRECTIONS_BATCH_SIZE = 20;

export const BATCH_ITEM_KINDS = ['REVIEW', 'ISSUE_REPORT', 'FLAGGED_SESSION'] as const;
export type BatchItemKind = (typeof BATCH_ITEM_KINDS)[number];

export type BatchCandidate = {
  // Unique within its kind.
  id: string;
  kind: BatchItemKind;
  critical: boolean;
  // UTC milliseconds.
  sessionStartAt: number;
  waitingSince: number;
};

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const TIME_FIELDS = ['sessionStartAt', 'waitingSince'] as const;

// A NaN time would make the order cyclic, so a time that is not a finite number throws
// RangeError.
function checkTimes(candidate: BatchCandidate): void {
  for (const field of TIME_FIELDS) {
    if (!Number.isFinite(candidate[field])) {
      throw new RangeError(
        `batch candidate ${candidate.id} has ${field} ${String(candidate[field])}, not a finite number`,
      );
    }
  }
}

// The batch order: critical items first, then older sessions, then the longer
// waiting, then item kind, then id (code units). Negative when a comes first; zero
// only for two candidates equal in all five fields. A total order for finite times (any
// other time throws RangeError), so sorting with it gives one result for every
// permutation on every engine.
export function compareBatchCandidates(a: BatchCandidate, b: BatchCandidate): number {
  checkTimes(a);
  checkTimes(b);
  if (a.critical !== b.critical) return a.critical ? -1 : 1;
  return (
    a.sessionStartAt - b.sessionStartAt ||
    a.waitingSince - b.waitingSince ||
    BATCH_ITEM_KINDS.indexOf(a.kind) - BATCH_ITEM_KINDS.indexOf(b.kind) ||
    compareText(a.id, b.id)
  );
}

// Picks the daily review batch: the first batchSize candidates in the batch order
// (none for a size below 1). Candidates keep their own type and identity. Every
// candidate's times are checked, also when the sort never compares it (a lone one).
export function selectBatch<C extends BatchCandidate>(
  candidates: readonly C[],
  batchSize: number = CORRECTIONS_BATCH_SIZE,
): C[] {
  for (const candidate of candidates) checkTimes(candidate);
  return [...candidates].sort(compareBatchCandidates).slice(0, Math.max(0, batchSize));
}
