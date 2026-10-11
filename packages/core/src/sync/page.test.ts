import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  compareDecimal,
  cutPage,
  decrementDecimal,
  incrementDecimal,
  inPage,
  isCanonicalDecimal,
  isVersion,
  MAX_VERSION,
} from './page.ts';

// BigInt is the oracle here only; the code under test never uses it.
const MAX = 2n ** 63n - 1n;
const decimal = fc.bigInt({ min: 0n, max: 2n ** 70n }).map(String);
const sign = (value: number) => Math.sign(value);

describe('decimal text', () => {
  it.each([
    ['1000', '999'],
    ['1', '0'],
    ['10', '9'],
    ['101', '100'],
    ['200', '199'],
    ['9007199254740993', '9007199254740992'],
    ['10000000000000000000', '9999999999999999999'],
  ])('one less than %s is %s', (text, expected) => {
    expect(decrementDecimal(text)).toBe(expected);
  });

  it.each([
    ['999', '1000'],
    ['0', '1'],
    ['19', '20'],
    ['9007199254740992', '9007199254740993'],
  ])('one more than %s is %s', (text, expected) => {
    expect(incrementDecimal(text)).toBe(expected);
  });

  it('orders by length first, then by code unit', () => {
    expect(compareDecimal('99', '100')).toBeLessThan(0);
    expect(compareDecimal('100', '99')).toBeGreaterThan(0);
    expect(compareDecimal('100', '101')).toBeLessThan(0);
    expect(compareDecimal('9007199254740993', '9007199254740992')).toBeGreaterThan(0);
    expect(compareDecimal('42', '42')).toBe(0);
  });

  it('agrees with BigInt for any texts up to 2^70', () => {
    fc.assert(
      fc.property(decimal, decimal, (a, b) => {
        const expected = BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
        expect(sign(compareDecimal(a, b))).toBe(expected);
        expect(incrementDecimal(a)).toBe(String(BigInt(a) + 1n));
        if (a !== '0') expect(decrementDecimal(a)).toBe(String(BigInt(a) - 1n));
      }),
      { numRuns: 2000 },
    );
  });

  it.each([
    ['', false],
    ['0', true],
    ['7', true],
    ['01', false],
    ['00', false],
    ['-1', false],
    ['+1', false],
    ['1.0', false],
    ['1e3', false],
    [' 1', false],
    ['1 ', false],
    ['١', false],
  ])('isCanonicalDecimal(%j) is %s', (text, expected) => {
    expect(isCanonicalDecimal(text)).toBe(expected);
  });

  it('rejects a value that is not a string', () => {
    expect(isCanonicalDecimal(1)).toBe(false);
    expect(isCanonicalDecimal(null)).toBe(false);
    expect(isVersion(1)).toBe(false);
  });

  it('accepts versions up to 2^63 - 1 only', () => {
    expect(MAX_VERSION).toBe(String(MAX));
    expect(isVersion(MAX_VERSION)).toBe(true);
    expect(isVersion(String(MAX + 1n))).toBe(false);
    expect(isVersion('0')).toBe(true);
    expect(isVersion('01')).toBe(false);
  });

  it.each(['0', '', '01', '-1', 'x'])('decrementDecimal(%j) throws RangeError', (text) => {
    expect(() => decrementDecimal(text)).toThrow(RangeError);
  });

  it.each(['', '01', '-1', 'x'])('incrementDecimal(%j) throws RangeError', (text) => {
    expect(() => incrementDecimal(text)).toThrow(RangeError);
  });
});

type Row = { readonly id: number; readonly version: bigint };

// A correct general source: rows in (from, to] in version order, at most `limit`.
const query = (rows: readonly Row[], from: bigint | null, to: bigint, limit: number) =>
  rows
    .filter((row) => (from === null || row.version > from) && row.version <= to)
    .sort((a, b) => (a.version < b.version ? -1 : a.version > b.version ? 1 : a.id - b.id))
    .slice(0, limit);

// The bound of one source, computed the slow way with BigInt.
const oracleBound = (returned: readonly Row[], limit: number): bigint | null => {
  if (returned.length < limit) return null;
  const versions = returned.map((row) => row.version);
  const high = versions.reduce((a, b) => (a > b ? a : b));
  const low = versions.reduce((a, b) => (a < b ? a : b));
  return low === high ? high : high - 1n;
};

// Bases put the versions near 0, just above 2^53 and just below 2^63 - 1.
const scenario = fc
  .record({
    base: fc.constantFrom(0n, 9007199254740900n, MAX - 200n),
    sources: fc.array(fc.array(fc.integer({ min: 1, max: 60 }), { maxLength: 40 }), {
      minLength: 1,
      maxLength: 4,
    }),
    toOffset: fc.integer({ min: 0, max: 70 }),
    limit: fc.integer({ min: 1, max: 8 }),
  })
  .map(({ base, sources, toOffset, limit }) => {
    let id = 0;
    const tables = sources.map((offsets) =>
      offsets.map((offset): Row => {
        id += 1;
        return { id, version: base + BigInt(offset) };
      }),
    );
    return { tables, to: base + BigInt(toOffset), limit };
  });

describe('page cutting', () => {
  it('delivers every row up to S exactly once, never splits a version, and advances each page', () => {
    let multiPage = 0;
    let refetched = 0;
    fc.assert(
      fc.property(scenario, ({ tables, to, limit }) => {
        const pageOf = new Map<string, number>();
        const delivered = new Map<number, number>();
        let from: bigint | null = null;
        let page = 0;
        for (;;) {
          page += 1;
          expect(page).toBeLessThan(500);
          const returned = tables.map((rows) => query(rows, from, to, limit));
          const fromText = from === null ? null : String(from);
          const plan = cutPage({
            from: fromText,
            to: String(to),
            limit,
            sources: returned.map((rows) => rows.map((row) => String(row.version))),
          });
          // U is the smallest bound of the cut sources, or S.
          const bounds = returned.map((rows) => oracleBound(rows, limit));
          const cutBounds = bounds.filter((bound): bound is bigint => bound !== null);
          const upper = cutBounds.reduce((a, b) => (a < b ? a : b), to);
          expect(plan.upper).toBe(String(upper));
          expect(plan.sources.map((source) => source.bound)).toEqual(
            bounds.map((bound) => (bound === null ? null : String(bound))),
          );
          expect(plan.sources.every((source) => source.dropped === 0)).toBe(true);
          // Each page advances while there is anything left below S.
          if (from === null || from < to) expect(upper > (from ?? -1n)).toBe(true);
          plan.sources.forEach((source, index) => {
            let rows = returned[index] ?? [];
            if (source.refetchVersion !== null) {
              refetched += 1;
              const version = BigInt(source.refetchVersion);
              rows = (tables[index] ?? []).filter((row) => row.version === version);
            }
            for (const row of rows) {
              if (!inPage(String(row.version), fromText, plan.upper)) continue;
              delivered.set(row.id, (delivered.get(row.id) ?? 0) + 1);
              const key = `${index}:${row.version}`;
              const seen = pageOf.get(key);
              // No version of a source is split across two pages.
              expect(seen === undefined || seen === page).toBe(true);
              pageOf.set(key, page);
            }
          });
          if (plan.upper === String(to)) break;
          from = upper;
        }
        if (page > 1) multiPage += 1;
        const expected = tables.flat().filter((row) => row.version <= to);
        expect([...delivered.keys()].sort((a, b) => a - b)).toEqual(
          expected.map((row) => row.id).sort((a, b) => a - b),
        );
        expect([...delivered.values()].every((count) => count === 1)).toBe(true);
      }),
      { numRuns: 1500 },
    );
    // Ground control: many scenarios need several pages and the single-version refetch.
    expect(multiPage).toBeGreaterThan(300);
    expect(refetched).toBeGreaterThan(100);
  });

  it('cuts a page above 2^53 exactly', () => {
    const plan = cutPage({
      from: '9007199254740991',
      to: '9007199254741000',
      limit: 3,
      sources: [['9007199254740992', '9007199254740993', '9007199254740993'], ['9007199254740995']],
    });
    // Several versions in a cut source: the bound is the last one less one.
    expect(plan.upper).toBe('9007199254740992');
    expect(plan.sources[0]).toEqual({
      cut: true,
      bound: '9007199254740992',
      dropped: 0,
      refetchVersion: null,
    });
    expect(plan.sources[1]).toEqual({ cut: false, bound: null, dropped: 0, refetchVersion: null });
  });

  it('refetches a single version only when the page reaches it', () => {
    const plan = cutPage({
      from: '99',
      to: '200',
      limit: 2,
      sources: [
        ['150', '150'],
        ['120', '120'],
        ['101', '130'],
      ],
    });
    expect(plan.upper).toBe('120');
    expect(plan.sources.map((source) => source.refetchVersion)).toEqual([null, '120', null]);
    expect(plan.sources.map((source) => source.bound)).toEqual(['150', '120', '129']);
  });

  it('uses S when no source is cut, and an empty source is never cut', () => {
    const plan = cutPage({ from: null, to: '1000', limit: 5, sources: [[], ['3', '999']] });
    expect(plan.upper).toBe('1000');
    expect(plan.sources.every((source) => !source.cut)).toBe(true);
  });

  it('drops rows outside (from, to] and still advances every page', () => {
    // Broken sources: rows at or below from, or above S, count toward the limit.
    const broken = fc.record({
      from: fc.integer({ min: 0, max: 50 }),
      span: fc.integer({ min: 1, max: 30 }),
      limit: fc.integer({ min: 1, max: 6 }),
      sources: fc.array(fc.array(fc.integer({ min: -60, max: 100 }), { maxLength: 12 }), {
        minLength: 1,
        maxLength: 3,
      }),
    });
    let droppedSeen = 0;
    let emptyCut = 0;
    let emptyAbove = 0;
    fc.assert(
      fc.property(broken, ({ from, span, limit, sources }) => {
        const to = from + span;
        const versions = sources.map((offsets) =>
          offsets.map((offset) => String(Math.max(0, from + offset))).slice(0, limit + 2),
        );
        const plan = cutPage({ from: String(from), to: String(to), limit, sources: versions });
        expect(BigInt(plan.upper) > BigInt(from)).toBe(true);
        expect(BigInt(plan.upper) <= BigInt(to)).toBe(true);
        plan.sources.forEach((source, index) => {
          const list = versions[index] ?? [];
          const outside = list.filter((v) => BigInt(v) <= BigInt(from) || BigInt(v) > BigInt(to));
          expect(source.dropped).toBe(outside.length);
          droppedSeen += source.dropped;
          if (list.length >= limit && outside.length === list.length) {
            if (list.some((v) => BigInt(v) > BigInt(to))) {
              // A row above S: nothing left in range, so the source does not hold the page back.
              emptyAbove += 1;
              expect(source).toMatchObject({ cut: false, bound: null });
            } else {
              // Rows only at or below from: the smallest step.
              emptyCut += 1;
              expect(source).toMatchObject({ cut: true, bound: String(from + 1) });
            }
          }
        });
      }),
      { numRuns: 1500 },
    );
    expect(droppedSeen).toBeGreaterThan(500);
    expect(emptyCut).toBeGreaterThan(20);
    expect(emptyAbove).toBeGreaterThan(20);
  });

  it('does not crawl when a source returns only rows written after S was read', () => {
    // A source missing its upper filter, during a burst of writes: every row is above S.
    const plan = cutPage({ from: null, to: '5000', limit: 2, sources: [['5001', '5002'], ['7']] });
    expect(plan.upper).toBe('5000');
    expect(plan.sources[0]).toEqual({ cut: false, bound: null, dropped: 2, refetchVersion: null });
    // Ground control: rows at or below from may hide rows in range, so the page waits for them.
    const lower = cutPage({ from: '100', to: '5000', limit: 2, sources: [['50', '60']] });
    expect(lower.upper).toBe('101');
  });

  it('keeps the upper version within S when a cut source has nothing in range', () => {
    expect(cutPage({ from: null, to: '5', limit: 1, sources: [['9']] }).upper).toBe('5');
    expect(cutPage({ from: null, to: '0', limit: 1, sources: [['9']] }).upper).toBe('0');
    expect(cutPage({ from: '4', to: '5', limit: 1, sources: [['2']] }).upper).toBe('5');
    expect(cutPage({ from: '5', to: '5', limit: 1, sources: [['5']] })).toEqual({
      upper: '5',
      sources: [{ cut: true, bound: '5', dropped: 1, refetchVersion: null }],
    });
  });

  it.each([
    ['to that is not a version', { from: null, to: '01', limit: 1, sources: [] }],
    ['to above 2^63 - 1', { from: null, to: '9223372036854775808', limit: 1, sources: [] }],
    ['from above to', { from: '6', to: '5', limit: 1, sources: [] }],
    ['from that is not a version', { from: '-1', to: '5', limit: 1, sources: [] }],
    ['a limit of 0', { from: null, to: '5', limit: 0, sources: [] }],
    ['a fractional limit', { from: null, to: '5', limit: 1.5, sources: [] }],
    ['a row version that is not canonical', { from: null, to: '5', limit: 9, sources: [['05']] }],
  ])('throws RangeError for %s', (_name, input) => {
    expect(() => cutPage(input)).toThrow(RangeError);
  });

  it('keeps a row in the page only for from < version <= upper', () => {
    expect(inPage('5', '4', '5')).toBe(true);
    expect(inPage('4', '4', '5')).toBe(false);
    expect(inPage('6', '4', '5')).toBe(false);
    expect(inPage('0', null, '5')).toBe(true);
    expect(inPage('100', '99', '100')).toBe(true);
    // '05' sorts below '10' as text: only the version check keeps it out.
    expect(inPage('05', null, '10')).toBe(false);
  });
});
