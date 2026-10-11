import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  nextWatermark,
  type SequenceState,
  WATERMARK_CHUNK_SIZE,
  watermarkUpdate,
} from './watermark.ts';

// The server's loop at the end of a submission: ledger sequences above the watermark,
// ascending, in chunks of WATERMARK_CHUNK_SIZE, until a chunk says stop.
const settle = (ledger: ReadonlySet<number>, current: number) => {
  const sorted = [...ledger].sort((a, b) => a - b);
  // Each read after the first follows a full chunk the watermark ran through, so the loop
  // needs at most this many reads; more means it would never stop.
  const maxReads = Math.floor(sorted.length / WATERMARK_CHUNK_SIZE) + 1;
  let watermark = current;
  let reads = 0;
  for (;;) {
    reads += 1;
    expect(reads).toBeLessThanOrEqual(maxReads);
    const chunk = sorted.filter((sequence) => sequence > watermark).slice(0, WATERMARK_CHUNK_SIZE);
    const step = nextWatermark(watermark, chunk);
    expect(step.watermark).toBeGreaterThanOrEqual(watermark);
    watermark = step.watermark;
    if (!step.readMore) return { watermark, reads };
  }
};

// The largest n with 1..n all present, the slow way.
const contiguous = (ledger: ReadonlySet<number>) => {
  let n = 0;
  while (ledger.has(n + 1)) n += 1;
  return n;
};

// A seeded shuffle (mulberry32), so fast-check can shrink the seed.
const shuffled = <T>(items: readonly T[], seed: number): T[] => {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [list[index], list[other]] = [list[other] as T, list[index] as T];
  }
  return list;
};

const arrivals = fc
  .record({
    top: fc.integer({ min: 0, max: 2600 }),
    holes: fc.uniqueArray(fc.integer({ min: 1, max: 2600 }), { maxLength: 4 }),
    seed: fc.integer(),
    batches: fc.integer({ min: 1, max: 6 }),
  })
  .map(({ top, holes, seed, batches }) => {
    const sequences = [];
    for (let sequence = 1; sequence <= top; sequence += 1) {
      if (!holes.includes(sequence)) sequences.push(sequence);
    }
    const order = shuffled(sequences, seed);
    const size = Math.ceil(order.length / batches);
    const split: number[][] = [];
    for (let start = 0; start < order.length; start += size || 1) {
      split.push(order.slice(start, start + (size || 1)));
    }
    return split;
  });

describe('watermark', () => {
  it('is the largest n with 1..n all present for any arrival order, and never goes down', () => {
    let pastOneChunk = 0;
    let stoppedByGap = 0;
    fc.assert(
      fc.property(arrivals, (batches) => {
        const ledger = new Set<number>();
        let watermark = 0;
        for (const batch of batches) {
          for (const sequence of batch) ledger.add(sequence);
          const result = settle(ledger, watermark);
          expect(result.watermark).toBe(contiguous(ledger));
          expect(result.watermark).toBeGreaterThanOrEqual(watermark);
          if (result.reads > 1) pastOneChunk += 1;
          if (ledger.size > result.watermark) stoppedByGap += 1;
          watermark = result.watermark;
          // The same submission arriving again changes nothing.
          for (const sequence of batch) ledger.add(sequence);
          expect(settle(ledger, watermark).watermark).toBe(watermark);
        }
      }),
      { numRuns: 300 },
    );
    // Ground control: some runs need more than one chunk, and some stop at a gap.
    expect(pastOneChunk).toBeGreaterThan(30);
    expect(stoppedByGap).toBeGreaterThan(30);
  });

  it.each([
    ['stops at the first gap', 0, [1, 2, 3, 5], 3],
    ['does not move without the next sequence', 0, [2, 3], 0],
    ['ignores repeats and values at or below the watermark', 3, [3, 4, 4, 2, 5], 5],
    ['accepts any order', 0, [3, 1, 2], 3],
    ['stays put on an empty chunk', 7, [], 7],
  ])('%s', (_name, current, chunk, expected) => {
    expect(nextWatermark(current, chunk)).toEqual({ watermark: expected, readMore: false });
  });

  it('asks for the next chunk only after a full chunk with no gap', () => {
    const full = Array.from({ length: WATERMARK_CHUNK_SIZE }, (_, index) => index + 1);
    expect(nextWatermark(0, full)).toEqual({ watermark: WATERMARK_CHUNK_SIZE, readMore: true });
    const gapAtEnd = [...full.slice(0, -1), WATERMARK_CHUNK_SIZE + 1];
    expect(nextWatermark(0, gapAtEnd)).toEqual({
      watermark: WATERMARK_CHUNK_SIZE - 1,
      readMore: false,
    });
    expect(nextWatermark(0, full.slice(0, -1))).toEqual({
      watermark: WATERMARK_CHUNK_SIZE - 1,
      readMore: false,
    });
    // A value at or below the watermark in a full chunk does not hide that the rest ran on.
    const withOld = [5, ...Array.from({ length: WATERMARK_CHUNK_SIZE - 1 }, (_, i) => i + 6)];
    expect(nextWatermark(5, withOld)).toEqual({
      watermark: 5 + WATERMARK_CHUNK_SIZE - 1,
      readMore: true,
    });
    // The chunk size is the specification's number (D06 rule "Su seviyesi").
    expect(WATERMARK_CHUNK_SIZE).toBe(1000);
    // A full chunk of repeats moves nothing and asks for nothing.
    expect(nextWatermark(5, Array(WATERMARK_CHUNK_SIZE).fill(3))).toEqual({
      watermark: 5,
      readMore: false,
    });
  });

  it.each([
    ['a negative watermark', -1, [1]],
    ['a fractional watermark', 1.5, [2]],
    ['a watermark that is not a number', Number.NaN, [1]],
    ['sequence 0', 0, [0]],
    ['a negative sequence', 0, [-1]],
    ['a fractional sequence', 0, [1.5]],
    ['a sequence above 2^53 - 1', 0, [2 ** 53]],
  ])('throws RangeError for %s', (_name, current, chunk) => {
    expect(() => nextWatermark(current, chunk)).toThrow(RangeError);
  });
});

describe('gap fields', () => {
  const before: SequenceState = { contiguousLast: 5, firstMissing: 7, openGapCount: 2 };

  it.each([
    ['unchanged below the first missing sequence', 6, 7, 2, true],
    ['cleared on reaching it', 7, null, 0, true],
    ['cleared on passing it', 9, null, 0, true],
    ['unchanged when the watermark stays', 5, 7, 2, false],
  ])('are %s', (_name, watermark, firstMissing, openGapCount, advanced) => {
    expect(watermarkUpdate(before, watermark)).toEqual({
      contiguousLast: watermark,
      firstMissing,
      openGapCount,
      advanced,
    });
  });

  it('stay empty without a reported gap', () => {
    expect(watermarkUpdate({ contiguousLast: 0, firstMissing: null, openGapCount: 0 }, 4)).toEqual({
      contiguousLast: 4,
      firstMissing: null,
      openGapCount: 0,
      advanced: true,
    });
  });

  it.each([4, 5.5, Number.NaN])(
    'refuse a watermark of %s below or beside the whole numbers',
    (n) => {
      expect(() => watermarkUpdate(before, n)).toThrow(RangeError);
    },
  );

  it('reset exactly when the watermark reaches the reported first missing sequence', () => {
    let resets = 0;
    let kept = 0;
    fc.assert(
      fc.property(arrivals, fc.integer({ min: 0, max: 5 }), (batches, reportAfter) => {
        const ledger = new Set<number>();
        let state: SequenceState = { contiguousLast: 0, firstMissing: null, openGapCount: 0 };
        batches.forEach((batch, index) => {
          for (const sequence of batch) ledger.add(sequence);
          const { watermark } = settle(ledger, state.contiguousLast);
          const next = watermarkUpdate(state, watermark);
          // Read from the ledger, not from the watermark: 1..firstMissing all arrived.
          const firstMissing = state.firstMissing;
          const reached =
            firstMissing !== null &&
            Array.from({ length: firstMissing }, (_, s) => s + 1).every((s) => ledger.has(s));
          expect(next.firstMissing).toBe(reached ? null : state.firstMissing);
          expect(next.openGapCount).toBe(reached ? 0 : state.openGapCount);
          expect(next.advanced).toBe(watermark > state.contiguousLast);
          if (reached) resets += 1;
          else if (state.firstMissing !== null) kept += 1;
          state = next;
          // The daily gap report: first missing sequence above the watermark and the count.
          if (index === reportAfter) {
            const largest = Math.max(0, ...ledger);
            const missing: number[] = [];
            for (let s = state.contiguousLast + 1; s <= largest; s += 1) {
              if (!ledger.has(s)) missing.push(s);
            }
            state = {
              contiguousLast: state.contiguousLast,
              firstMissing: missing[0] ?? null,
              openGapCount: missing.length,
            };
          }
        });
      }),
      { numRuns: 300 },
    );
    // Ground control: both branches happen.
    expect(resets).toBeGreaterThan(20);
    expect(kept).toBeGreaterThan(5);
  });
});
