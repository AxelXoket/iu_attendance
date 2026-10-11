import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type ChainRow, CorrectionChainError, resolveChain, splitChains } from './chain.ts';

// Builds a chain the way the panel does: write appends a correction after the last
// row, reverse appends a reversal after a correction.
const opsChain = (ops: readonly ('write' | 'reverse')[], prefix = '') => {
  const rows: ChainRow[] = [];
  for (const [index, op] of ops.entries()) {
    const last = rows[rows.length - 1];
    if (op === 'reverse' && last?.kind === 'CORRECTION') {
      rows.push({ id: `${prefix}r${index}`, kind: 'REVERSAL', previousCorrectionId: last.id });
    } else if (op === 'write') {
      rows.push({
        id: `${prefix}c${index}`,
        kind: 'CORRECTION',
        previousCorrectionId: last?.id ?? null,
      });
    }
  }
  return rows;
};

const opsArb = fc.array(fc.constantFrom('write' as const, 'reverse' as const), { maxLength: 12 });
const chainArb = opsArb.map((ops) => opsChain(ops));

// What fn threw; fails the test when fn returns.
function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
}

const shuffledChainArb = chainArb.chain((rows) =>
  fc.tuple(fc.constant(rows), fc.shuffledSubarray(rows, { minLength: rows.length })),
);

describe('Correction chain stays linear', () => {
  it('orders any permutation of a valid chain back into its build order', () => {
    fc.assert(
      fc.property(shuffledChainArb, ([rows, shuffled]) => {
        const { ordered, active } = resolveChain(shuffled);
        expect(ordered).toEqual(rows);
        const heads = ordered.filter((row) => row.previousCorrectionId === null);
        expect(heads).toHaveLength(rows.length === 0 ? 0 : 1);
        const predecessors = ordered
          .map((row) => row.previousCorrectionId)
          .filter((id) => id !== null);
        expect(new Set(predecessors).size).toBe(predecessors.length);
        const last = rows[rows.length - 1];
        expect(active).toBe(last === undefined || last.kind === 'REVERSAL' ? null : last);
      }),
      { numRuns: 1000 },
    );
  });

  it.each([
    [
      'two heads',
      [
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'b', kind: 'CORRECTION', previousCorrectionId: null },
      ],
      '2 heads',
    ],
    [
      'two successors',
      [
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'b', kind: 'CORRECTION', previousCorrectionId: 'a' },
        { id: 'c', kind: 'CORRECTION', previousCorrectionId: 'a' },
      ],
      'two successors',
    ],
    [
      'a link to an unknown row',
      [{ id: 'a', kind: 'CORRECTION', previousCorrectionId: 'x' }],
      'unknown row',
    ],
    [
      'a cycle beside a head',
      [
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'b', kind: 'CORRECTION', previousCorrectionId: 'c' },
        { id: 'c', kind: 'CORRECTION', previousCorrectionId: 'b' },
      ],
      'cycle',
    ],
    [
      'a row pointing at itself',
      [{ id: 'a', kind: 'CORRECTION', previousCorrectionId: 'a' }],
      'itself',
    ],
    [
      'a repeated id',
      [
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
      ],
      'twice',
    ],
    [
      'a reversal at the head',
      [{ id: 'a', kind: 'REVERSAL', previousCorrectionId: null }],
      'start with a reversal',
    ],
    [
      'a reversal of a reversal',
      [
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'b', kind: 'REVERSAL', previousCorrectionId: 'a' },
        { id: 'c', kind: 'REVERSAL', previousCorrectionId: 'b' },
      ],
      'does not follow a correction',
    ],
  ] as Array<[string, ChainRow[], string]>)('rejects %s', (_name, rows, message) => {
    expect(() => resolveChain(rows)).toThrow(CorrectionChainError);
    expect(() => resolveChain(rows)).toThrow(message);
  });

  it('continues after a reversal with a new correction (control)', () => {
    const rows: ChainRow[] = [
      { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
      { id: 'b', kind: 'REVERSAL', previousCorrectionId: 'a' },
      { id: 'c', kind: 'CORRECTION', previousCorrectionId: 'b' },
    ];
    expect(resolveChain(rows).active?.id).toBe('c');
  });

  it('names its error', () => {
    const error = thrown(() =>
      resolveChain([{ id: 'a', kind: 'REVERSAL', previousCorrectionId: null }]),
    );
    expect(error).toBeInstanceOf(CorrectionChainError);
    expect(error).toMatchObject({ name: 'CorrectionChainError' });
  });
});

// The chains of one student's roster rows in one session, each built like the panel
// builds one, with ids that do not collide across chains.
const chainsArb = fc
  .array(opsArb, { maxLength: 4 })
  .map((all) => all.map((ops, index) => opsChain(ops, `s${index}`)).filter((rows) => rows.length));

describe('Correction chains of several roster rows', () => {
  it('splits any permutation of several chains back into the chains, heads in input order', () => {
    let severalChains = 0;
    fc.assert(
      fc.property(
        chainsArb.chain((chains) =>
          fc.tuple(
            fc.constant(chains),
            fc.shuffledSubarray(chains.flat(), { minLength: chains.flat().length }),
          ),
        ),
        ([chains, shuffled]) => {
          if (chains.length > 1) severalChains += 1;
          const headAt = (rows: readonly ChainRow[]) => shuffled.indexOf(rows[0] as ChainRow);
          const expected = [...chains].sort((a, b) => headAt(a) - headAt(b));
          expect(splitChains(shuffled)).toEqual(expected);
        },
      ),
      { numRuns: 1000 },
    );
    // Ground control: the runs include several chains at once.
    expect(severalChains).toBeGreaterThan(100);
  });

  it('gives no chain for no rows and one chain for one chain (control)', () => {
    expect(splitChains([])).toEqual([]);
    const rows = opsChain(['write', 'reverse', 'write']);
    expect(splitChains([...rows].reverse())).toEqual([rows]);
  });

  it('keeps a fork in one chain so that resolveChain rejects it', () => {
    const fork: ChainRow[] = [
      { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
      { id: 'b', kind: 'CORRECTION', previousCorrectionId: 'a' },
      { id: 'c', kind: 'CORRECTION', previousCorrectionId: 'a' },
    ];
    expect(splitChains(fork)).toEqual([fork]);
    expect(() => resolveChain(fork)).toThrow('two successors');
  });

  it.each([
    [
      'a repeated id across chains',
      [
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'b', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'a', kind: 'REVERSAL', previousCorrectionId: 'b' },
      ],
      'row a appears twice',
    ],
    [
      'a link to an unknown row',
      [
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'b', kind: 'CORRECTION', previousCorrectionId: 'x' },
      ],
      'row b points at unknown row x',
    ],
    [
      'a cycle beside a head',
      [
        { id: 'a', kind: 'CORRECTION', previousCorrectionId: null },
        { id: 'b', kind: 'CORRECTION', previousCorrectionId: 'c' },
        { id: 'c', kind: 'CORRECTION', previousCorrectionId: 'b' },
      ],
      'chain has a cycle',
    ],
    [
      'a row pointing at itself',
      [{ id: 'a', kind: 'CORRECTION', previousCorrectionId: 'a' }],
      'chain has a cycle',
    ],
  ] as Array<[string, ChainRow[], string]>)('rejects %s', (_name, rows, message) => {
    const error = thrown(() => splitChains(rows));
    expect(error).toBeInstanceOf(CorrectionChainError);
    expect((error as Error).message).toBe(message);
    // Ground control: the first row alone splits cleanly.
    expect(() =>
      splitChains(rows.slice(0, 1).map((row) => ({ ...row, previousCorrectionId: null }))),
    ).not.toThrow();
  });
});
