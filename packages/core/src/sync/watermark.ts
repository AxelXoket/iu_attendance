// The installation watermark (D06 rule "Su seviyesi", invariant 2): contiguousLast is the
// largest n such that every sequence 1..n has a ledger row, and it never passes the
// largest sequence. At the end of a submission the server reads the ledger sequences
// above the watermark in ascending chunks of at most WATERMARK_CHUNK_SIZE, folds each
// chunk in with nextWatermark, and writes the result with watermarkUpdate in one UPDATE.
// Sequences are JSON integers, so they stay safe integers here.

export const WATERMARK_CHUNK_SIZE = 1000;

export type WatermarkStep = {
  /** The largest n such that current + 1 .. n are all in the chunk. */
  readonly watermark: number;
  /** The chunk was full and used up without a gap: read the next chunk above the watermark. */
  readonly readMore: boolean;
};

const isSequence = (value: number) => Number.isSafeInteger(value) && value >= 1;

/**
 * Folds one chunk of ledger sequences into the watermark. The chunk may come in any
 * order; repeats and values at or below the current watermark are ignored, and the
 * first missing sequence stops it. Throws RangeError when current is not a whole number
 * from 0 or a sequence is not a whole number from 1.
 */
export function nextWatermark(current: number, chunk: readonly number[]): WatermarkStep {
  if (!Number.isSafeInteger(current) || current < 0) {
    throw new RangeError('nextWatermark expects the current watermark as a whole number from 0');
  }
  const above = new Set<number>();
  for (const sequence of chunk) {
    if (!isSequence(sequence)) {
      throw new RangeError('nextWatermark expects every sequence as a whole number from 1');
    }
    if (sequence > current) above.add(sequence);
  }
  let watermark = current;
  while (above.has(watermark + 1)) watermark += 1;
  return {
    watermark,
    readMore:
      chunk.length >= WATERMARK_CHUNK_SIZE && above.size > 0 && watermark - current === above.size,
  };
}

export type SequenceState = {
  /** kesintisiz_son_sira */
  readonly contiguousLast: number;
  /** ilk_eksik_sira: the first missing sequence the gap report found, or null. */
  readonly firstMissing: number | null;
  /** acik_bosluk_sayisi: the missing sequences the gap report counted. */
  readonly openGapCount: number;
};

export type SequenceUpdate = SequenceState & {
  /** The watermark moved up: the same UPDATE writes sira_ilerleme_ani from the clock. */
  readonly advanced: boolean;
};

/**
 * The installation row after a submission moved the watermark. Reaching firstMissing (or
 * passing it) clears both gap fields in the same UPDATE; otherwise they stay as the gap
 * report wrote them. The watermark never moves down here: only a database rewind takes
 * it back. Throws RangeError when the new watermark is below the old one.
 */
export function watermarkUpdate(before: SequenceState, watermark: number): SequenceUpdate {
  if (!Number.isSafeInteger(watermark) || watermark < before.contiguousLast) {
    throw new RangeError('watermarkUpdate expects a whole watermark not below the current one');
  }
  const gapClosed = before.firstMissing !== null && watermark >= before.firstMissing;
  return {
    contiguousLast: watermark,
    firstMissing: gapClosed ? null : before.firstMissing,
    openGapCount: gapClosed ? 0 : before.openGapCount,
    advanced: watermark > before.contiguousLast,
  };
}
