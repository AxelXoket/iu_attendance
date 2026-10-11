import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  BATCH_ITEM_KINDS,
  type BatchCandidate,
  CORRECTIONS_BATCH_SIZE,
  compareBatchCandidates,
  selectBatch,
} from './batch.ts';

const candidateArb = fc.record({
  id: fc.uuid(),
  kind: fc.constantFrom(...BATCH_ITEM_KINDS),
  critical: fc.boolean(),
  sessionStartAt: fc.integer({ min: 0, max: 50 }),
  waitingSince: fc.integer({ min: 0, max: 50 }),
});

const candidatesArb = fc.uniqueArray(candidateArb, { selector: (c) => c.id, maxLength: 60 });

describe('Batch selection is deterministic', () => {
  it('picks the same batch for every permutation, at most the batch size', () => {
    fc.assert(
      fc.property(
        candidatesArb.chain((list) =>
          fc.tuple(fc.constant(list), fc.shuffledSubarray(list, { minLength: list.length })),
        ),
        ([list, shuffled]) => {
          const batch = selectBatch(list);
          expect(selectBatch(shuffled)).toEqual(batch);
          expect(selectBatch(list)).toEqual(batch);
          expect(batch.length).toBe(Math.min(list.length, CORRECTIONS_BATCH_SIZE));
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('puts every critical item before every other and older sessions first within the same criticality', () => {
    fc.assert(
      fc.property(candidatesArb, (list) => {
        const batch = selectBatch(list, list.length);
        const firstNonCritical = batch.findIndex((c) => !c.critical);
        if (firstNonCritical >= 0)
          expect(batch.slice(firstNonCritical).every((c) => !c.critical)).toBe(true);
        for (let index = 1; index < batch.length; index += 1) {
          const previous = batch[index - 1] as BatchCandidate;
          const current = batch[index] as BatchCandidate;
          if (previous.critical === current.critical) {
            expect(previous.sessionStartAt).toBeLessThanOrEqual(current.sessionStartAt);
          }
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('keeps the batch to the critical items when they outnumber the size', () => {
    const items: BatchCandidate[] = Array.from({ length: 3 }, (_, index) => ({
      id: `n${index}`,
      kind: 'REVIEW',
      critical: index === 2,
      sessionStartAt: index,
      waitingSince: 0,
    }));
    expect(selectBatch(items, 1).map((c) => c.id)).toEqual(['n2']);
  });

  it('breaks full ties by kind and then id', () => {
    const base = { critical: false, sessionStartAt: 1, waitingSince: 1 };
    const items: BatchCandidate[] = [
      { ...base, id: 'b', kind: 'FLAGGED_SESSION' },
      { ...base, id: 'z', kind: 'REVIEW' },
      { ...base, id: 'a', kind: 'REVIEW' },
      { ...base, id: 'c', kind: 'ISSUE_REPORT' },
    ];
    expect(selectBatch(items).map((c) => c.id)).toEqual(['a', 'z', 'c', 'b']);
  });

  it('puts the longer waiting item first within the same session start', () => {
    const base = { critical: false, sessionStartAt: 1 };
    const later: BatchCandidate = { ...base, id: 'a', kind: 'REVIEW', waitingSince: 5 };
    const earlier: BatchCandidate = { ...base, id: 'z', kind: 'FLAGGED_SESSION', waitingSince: 2 };
    expect(selectBatch([later, earlier]).map((c) => c.id)).toEqual(['z', 'a']);
    expect(selectBatch([earlier, later]).map((c) => c.id)).toEqual(['z', 'a']);
    // Control: with the same waiting start, kind and id decide.
    expect(selectBatch([{ ...earlier, waitingSince: 5 }, later]).map((c) => c.id)).toEqual([
      'a',
      'z',
    ]);
  });

  it('orders by waiting start within the same criticality and session start', () => {
    const tiedArb = fc.uniqueArray(
      fc.record({
        id: fc.uuid(),
        kind: fc.constantFrom(...BATCH_ITEM_KINDS),
        critical: fc.boolean(),
        sessionStartAt: fc.integer({ min: 0, max: 2 }),
        waitingSince: fc.integer({ min: 0, max: 50 }),
      }),
      { selector: (c) => c.id, maxLength: 60 },
    );
    let comparedPairs = 0;
    fc.assert(
      fc.property(tiedArb, (list) => {
        const batch = selectBatch(list, list.length);
        for (let index = 1; index < batch.length; index += 1) {
          const previous = batch[index - 1] as BatchCandidate;
          const current = batch[index] as BatchCandidate;
          if (
            previous.critical === current.critical &&
            previous.sessionStartAt === current.sessionStartAt
          ) {
            comparedPairs += 1;
            expect(previous.waitingSince).toBeLessThanOrEqual(current.waitingSince);
          }
        }
      }),
      { numRuns: 1000 },
    );
    // Ground control: the runs put many neighbours on the same session start.
    expect(comparedPairs).toBeGreaterThan(1000);
  });

  it('lists the item kinds in the order the job ranks them', () => {
    // D09 jobs.0 step 4 ranks a review first, then an issue report, then a flagged session.
    expect(BATCH_ITEM_KINDS).toEqual(['REVIEW', 'ISSUE_REPORT', 'FLAGGED_SESSION']);
  });

  // The spec's own default, written out rather than read from the constant: 20 items
  // (D09 jobs.0 step 4, resolved_gaps.20 = D09-B21); a lecturer with 25 waiting items
  // gets a batch of 20 (D09 tests.35).
  it('gives a batch of 20 out of 25 waiting items by default', () => {
    const waiting: BatchCandidate[] = Array.from({ length: 25 }, (_, index) => ({
      id: `i${index}`,
      kind: 'REVIEW',
      critical: false,
      sessionStartAt: index,
      waitingSince: 0,
    }));
    const batch = selectBatch([...waiting].reverse());
    expect(batch).toHaveLength(20);
    expect(batch).toEqual(waiting.slice(0, 20));
    expect(CORRECTIONS_BATCH_SIZE).toBe(20);
    // Control: asked for all of them, the selection keeps all 25.
    expect(selectBatch(waiting, 25)).toHaveLength(25);
  });

  it('gives an empty batch for a size below one', () => {
    const items: BatchCandidate[] = [
      { id: 'a', kind: 'REVIEW', critical: false, sessionStartAt: 0, waitingSince: 0 },
      { id: 'b', kind: 'REVIEW', critical: false, sessionStartAt: 0, waitingSince: 0 },
    ];
    expect(selectBatch(items, 0)).toEqual([]);
    expect(selectBatch(items, -1)).toEqual([]);
    // Control: a size of one gives the first item.
    expect(selectBatch(items, 1).map((c) => c.id)).toEqual(['a']);
  });

  it('returns the candidates themselves with their own fields and type', () => {
    type Listed = BatchCandidate & { lecturerId: string };
    const items: Listed[] = [
      {
        id: 'b',
        kind: 'REVIEW',
        critical: false,
        sessionStartAt: 0,
        waitingSince: 0,
        lecturerId: 'l2',
      },
      {
        id: 'a',
        kind: 'REVIEW',
        critical: false,
        sessionStartAt: 0,
        waitingSince: 0,
        lecturerId: 'l1',
      },
    ];
    // Typed as Listed[]: this line only compiles while selectBatch keeps the caller's type.
    const batch: Listed[] = selectBatch(items);
    expect(batch.map((c) => c.lecturerId)).toEqual(['l1', 'l2']);
    expect(batch[0]).toBe(items[1]);
    expect(batch[1]).toBe(items[0]);
  });
});

describe('Batch order is total', () => {
  // Small value ranges so that pairs and triples tie on some fields.
  const smallCandidateArb = fc.record({
    id: fc.constantFrom('a', 'b', 'c'),
    kind: fc.constantFrom(...BATCH_ITEM_KINDS),
    critical: fc.boolean(),
    sessionStartAt: fc.integer({ min: 0, max: 2 }),
    waitingSince: fc.integer({ min: 0, max: 2 }),
  });
  const sign = (value: number) => Math.sign(value) + 0;
  const sameFields = (a: BatchCandidate, b: BatchCandidate) =>
    a.id === b.id &&
    a.kind === b.kind &&
    a.critical === b.critical &&
    a.sessionStartAt === b.sessionStartAt &&
    a.waitingSince === b.waitingSince;

  it('is reflexive and antisymmetric, and zero only for equal candidates', () => {
    let equalPairs = 0;
    fc.assert(
      fc.property(smallCandidateArb, smallCandidateArb, (a, b) => {
        if (sameFields(a, b)) equalPairs += 1;
        expect(compareBatchCandidates(a, a)).toBe(0);
        expect(sign(compareBatchCandidates(a, b)) + sign(compareBatchCandidates(b, a))).toBe(0);
        expect(compareBatchCandidates(a, b) === 0).toBe(sameFields(a, b));
      }),
      { numRuns: 2000 },
    );
    // Ground control: some pairs are equal in every field, most are not.
    expect(equalPairs).toBeGreaterThan(0);
    expect(equalPairs).toBeLessThan(1000);
  });

  it('is transitive', () => {
    let chainedTriples = 0;
    fc.assert(
      fc.property(smallCandidateArb, smallCandidateArb, smallCandidateArb, (a, b, c) => {
        if (compareBatchCandidates(a, b) < 0 && compareBatchCandidates(b, c) < 0) {
          chainedTriples += 1;
          expect(compareBatchCandidates(a, c)).toBeLessThan(0);
        }
      }),
      { numRuns: 2000 },
    );
    // Ground control: the premise holds in many runs.
    expect(chainedTriples).toBeGreaterThan(100);
  });

  it('puts the first in batch order first (ground control)', () => {
    const base = { kind: 'REVIEW' as const, critical: false, sessionStartAt: 0, waitingSince: 0 };
    expect(compareBatchCandidates({ ...base, id: 'a' }, { ...base, id: 'b' })).toBeLessThan(0);
    expect(compareBatchCandidates({ ...base, id: 'b' }, { ...base, id: 'a' })).toBeGreaterThan(0);
  });
});

describe('Batch times must be finite numbers', () => {
  const base: BatchCandidate = {
    id: 'a',
    kind: 'REVIEW',
    critical: false,
    sessionStartAt: 5,
    waitingSince: 0,
  };

  it.each([
    ['a NaN session start', { sessionStartAt: Number.NaN }, 'sessionStartAt NaN'],
    [
      'an infinite session start',
      { sessionStartAt: Number.POSITIVE_INFINITY },
      'sessionStartAt Infinity',
    ],
    ['a NaN waiting start', { waitingSince: Number.NaN }, 'waitingSince NaN'],
    [
      'a negative infinite waiting start',
      { waitingSince: Number.NEGATIVE_INFINITY },
      'waitingSince -Infinity',
    ],
  ])('rejects %s in the comparison and in the selection', (_name, bad, fragment) => {
    const broken: BatchCandidate = { ...base, ...bad, id: 'x' };
    const message = `batch candidate x has ${fragment}, not a finite number`;
    expect(() => compareBatchCandidates(broken, base)).toThrow(message);
    expect(() => compareBatchCandidates(base, broken)).toThrow(message);
    expect(() => compareBatchCandidates(base, broken)).toThrow(RangeError);
    // A lone candidate is never compared, so the selection checks it itself.
    expect(() => selectBatch([broken])).toThrow(message);
    expect(() => selectBatch([base, broken], 1)).toThrow(message);
    // Ground control: the same candidate with finite times compares and is selected.
    const whole: BatchCandidate = { ...base, id: 'x' };
    expect(compareBatchCandidates(whole, base)).toBeGreaterThan(0);
    expect(selectBatch([whole])).toEqual([whole]);
  });

  it('gives no permutation-dependent batch for a NaN time', () => {
    // With a NaN start the old comparison cycled (x > y > z > x) and the batch of one
    // depended on the input order; now every order throws.
    const x: BatchCandidate = { ...base, id: 'b', sessionStartAt: Number.NaN };
    const y: BatchCandidate = { ...base, id: 'a', sessionStartAt: 5 };
    const z: BatchCandidate = { ...base, id: 'c', sessionStartAt: 1 };
    const orders = [
      [x, y, z],
      [x, z, y],
      [y, x, z],
      [y, z, x],
      [z, x, y],
      [z, y, x],
    ];
    for (const order of orders) expect(() => selectBatch(order, 1)).toThrow(RangeError);
    // Ground control: with a finite start every order gives the same batch.
    const finite = { ...x, sessionStartAt: 3 };
    const batches = orders.map((order) =>
      selectBatch(
        order.map((candidate) => (candidate === x ? finite : candidate)),
        1,
      ),
    );
    for (const batch of batches) expect(batch).toEqual([z]);
  });
});
