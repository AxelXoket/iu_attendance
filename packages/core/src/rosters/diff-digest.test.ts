import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeBase64Url, encodeBase64Url } from '../shared/base64url.ts';
import { sha256 } from '../shared/sha256.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import type { RosterDiff } from './diff.ts';
import { diffDigest } from './diff-digest.ts';

const id = fc.constantFrom('r1', 'r2', 'r3', 'r4');
const number = fc.constantFrom('123456789', '1234567890', '987654321');
const name = fc.constantFrom('Ada Yılmaz', 'ADA YILMAZ', 'Can Er');
const order = fc.integer({ min: 1, max: 5 });
const placement = { fileRowNumber: order, studentNumber: number, fullName: name, order };

const diffArbitrary: fc.Arbitrary<RosterDiff> = fc.record({
  toAdd: fc.array(fc.record({ ...placement, lateAdded: fc.boolean() }), { maxLength: 3 }),
  toReactivate: fc.array(fc.record({ ...placement, rowId: id }), { maxLength: 2 }),
  sectionChanges: fc.array(
    fc.record({
      ...placement,
      oldRowId: id,
      oldSectionId: fc.constantFrom('A', 'B'),
      targetRowId: fc.option(id, { nil: null }),
    }),
    { maxLength: 2 },
  ),
  toDeactivate: fc.array(fc.record({ rowId: id, source: fc.constantFrom('FILE', 'MANUAL') }), {
    maxLength: 2,
  }),
  toTrim: fc.array(
    fc.record({
      rowId: id,
      sectionId: fc.constantFrom('A', 'B'),
      inactiveAtMs: fc.integer({ min: 0, max: 99 }),
      newInactiveAtMs: fc.integer({ min: 0, max: 99 }),
    }),
    { maxLength: 2 },
  ),
  nameChanges: fc.array(
    fc.record({ rowId: id, fileRowNumber: order, oldName: name, newName: name }),
    { maxLength: 2 },
  ),
  spellingFixes: fc.array(fc.record({ rowId: id, newName: name }), { maxLength: 2 }),
  orderChanges: fc.array(fc.record({ rowId: id, order }), { maxLength: 2 }),
  sourceChanges: fc.array(fc.record({ rowId: id }), { maxLength: 2 }),
  unchanged: fc.integer({ min: 0, max: 9 }),
});

const EMPTY: RosterDiff = {
  toAdd: [],
  toReactivate: [],
  sectionChanges: [],
  toDeactivate: [],
  toTrim: [],
  nameChanges: [],
  spellingFixes: [],
  orderChanges: [],
  sourceChanges: [],
  unchanged: 0,
};

const shuffled = <T>(list: readonly T[], seed: number) =>
  list
    .map((item, index) => ({ item, key: (index * 7919 + seed) % 101 }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

describe('roster diff digest', () => {
  it('is the same for the same diff, whatever the order of its rows', () => {
    fc.assert(
      fc.property(diffArbitrary, fc.nat(), (diff, seed) => {
        const reordered = Object.fromEntries(
          Object.entries(diff).map(([key, value]) => [
            key,
            Array.isArray(value) ? shuffled(value, seed) : value,
          ]),
        ) as RosterDiff;
        const digest = diffDigest('S', diff);
        expect(decodeBase64Url(digest)).toHaveLength(32);
        expect(diffDigest('S', reordered)).toBe(digest);
      }),
      { numRuns: 500 },
    );
  });

  it('changes when one field of one change changes', () => {
    const added = fc.record({ ...placement, lateAdded: fc.boolean() });
    fc.assert(
      fc.property(diffArbitrary, added, (diff, add) => {
        const base = { ...diff, toAdd: [...diff.toAdd, add] };
        const digest = diffDigest('S', base);
        const withAdd = (patch: object) =>
          diffDigest('S', { ...diff, toAdd: [...diff.toAdd, { ...add, ...patch }] });
        // The target section, the name, the order, the late flag.
        expect(diffDigest('T', base)).not.toBe(digest);
        expect(withAdd({ fullName: `${add.fullName}x` })).not.toBe(digest);
        expect(withAdd({ order: add.order + 10 })).not.toBe(digest);
        expect(withAdd({ lateAdded: !add.lateAdded })).not.toBe(digest);
        // Which student is added.
        expect(withAdd({ studentNumber: `${add.studentNumber}0` })).not.toBe(digest);
        // The kind: the same student reactivated instead of added.
        const asReactivated = diffDigest('S', {
          ...diff,
          toReactivate: [...diff.toReactivate, { ...add, rowId: add.studentNumber }],
        });
        expect(asReactivated).not.toBe(digest);
      }),
      { numRuns: 500 },
    );
  });

  it('changes when any field of any kind of change changes', () => {
    const place = { fileRowNumber: 2, studentNumber: '123456789', fullName: 'Ada', order: 1 };
    // Each kind alone, with the fields its record carries.
    const kinds: [Partial<RosterDiff>, Record<string, unknown>[]][] = [
      [
        { toReactivate: [{ ...place, rowId: 'r1' }] },
        [{ rowId: 'r2' }, { fullName: 'Can' }, { order: 2 }],
      ],
      [
        {
          sectionChanges: [{ ...place, oldRowId: 'r1', oldSectionId: 'A', targetRowId: null }],
        },
        [
          { studentNumber: '987654321' },
          { oldRowId: 'r2' },
          { oldSectionId: 'B' },
          { targetRowId: 'r3' },
          { fullName: 'Can' },
          { order: 2 },
        ],
      ],
      [{ toDeactivate: [{ rowId: 'r1', source: 'FILE' }] }, [{ rowId: 'r2' }]],
      [
        { toTrim: [{ rowId: 'r1', sectionId: 'A', inactiveAtMs: 9, newInactiveAtMs: 5 }] },
        [{ rowId: 'r2' }, { sectionId: 'B' }, { newInactiveAtMs: 6 }],
      ],
      [
        { nameChanges: [{ rowId: 'r1', fileRowNumber: 2, oldName: 'Can', newName: 'Ada' }] },
        [{ rowId: 'r2' }, { newName: 'Ela' }],
      ],
      [{ spellingFixes: [{ rowId: 'r1', newName: 'Ada' }] }, [{ rowId: 'r2' }, { newName: 'Ela' }]],
      [{ orderChanges: [{ rowId: 'r1', order: 1 }] }, [{ rowId: 'r2' }, { order: 2 }]],
      [{ sourceChanges: [{ rowId: 'r1' }] }, [{ rowId: 'r2' }]],
    ];
    for (const [part, patches] of kinds) {
      const [key, [change]] = Object.entries(part)[0] as [keyof RosterDiff, object[]];
      const digest = diffDigest('S', { ...EMPTY, ...part });
      for (const patch of patches) {
        const patched = diffDigest('S', { ...EMPTY, [key]: [{ ...change, ...patch }] });
        expect(patched, `${key} ${JSON.stringify(patch)}`).not.toBe(digest);
      }
      // The target section counts where the change places a row.
      const placing = key === 'toReactivate' || key === 'sectionChanges';
      expect(diffDigest('T', { ...EMPTY, ...part }) !== digest, key).toBe(placing);
    }
  });

  it('hashes the sorted JSON records as one JSON array', () => {
    const one = diffDigest('S', { ...EMPTY, sourceChanges: [{ rowId: 'r1' }] });
    expect(one).toBe(encodeBase64Url(sha256(utf8Bytes('[["source","r1"]]'))));
    expect(diffDigest('S', EMPTY)).toBe(encodeBase64Url(sha256(utf8Bytes('[]'))));
    // Two records, sorted as text and joined by a comma.
    const two = diffDigest('S', {
      ...EMPTY,
      sourceChanges: [{ rowId: 'r1' }],
      orderChanges: [{ rowId: 'r1', order: 2 }],
    });
    expect(two).toBe(encodeBase64Url(sha256(utf8Bytes('[["order","r1",2],["source","r1"]]'))));
  });

  it('tells the kinds of change apart for the same row', () => {
    const row = { rowId: 'r1' };
    const digests = [
      diffDigest('S', { ...EMPTY, toDeactivate: [{ ...row, source: 'FILE' }] }),
      diffDigest('S', { ...EMPTY, sourceChanges: [row] }),
      diffDigest('S', { ...EMPTY, orderChanges: [{ ...row, order: 1 }] }),
      diffDigest('S', { ...EMPTY, spellingFixes: [{ ...row, newName: 'Ada' }] }),
      diffDigest('S', {
        ...EMPTY,
        nameChanges: [{ ...row, fileRowNumber: 2, oldName: 'Can', newName: 'Ada' }],
      }),
      diffDigest('S', {
        ...EMPTY,
        toTrim: [{ ...row, sectionId: 'A', inactiveAtMs: 9, newInactiveAtMs: 5 }],
      }),
      diffDigest('S', EMPTY),
    ];
    expect(new Set(digests).size).toBe(digests.length);
  });

  it('leaves out what differs between preview and apply: instants, file rows, counts', () => {
    const trim = { rowId: 'r1', sectionId: 'A', inactiveAtMs: 9, newInactiveAtMs: 5 };
    const change = { rowId: 'r1', fileRowNumber: 2, oldName: 'Can', newName: 'Ada' };
    expect(diffDigest('S', { ...EMPTY, toTrim: [trim] })).toBe(
      diffDigest('S', { ...EMPTY, toTrim: [{ ...trim, inactiveAtMs: 50 }] }),
    );
    expect(diffDigest('S', { ...EMPTY, nameChanges: [change] })).toBe(
      diffDigest('S', { ...EMPTY, nameChanges: [{ ...change, fileRowNumber: 7 }] }),
    );
    expect(diffDigest('S', { ...EMPTY, unchanged: 5 })).toBe(diffDigest('S', EMPTY));
    // Ground control: the cut point itself counts.
    expect(diffDigest('S', { ...EMPTY, toTrim: [trim] })).not.toBe(
      diffDigest('S', { ...EMPTY, toTrim: [{ ...trim, newInactiveAtMs: 6 }] }),
    );
  });

  it('gives the empty diff one digest, in every section', () => {
    expect(diffDigest('S', EMPTY)).toBe(diffDigest('T', EMPTY));
    expect(diffDigest('S', EMPTY)).toHaveLength(43);
  });

  it('refuses a number that is not a safe integer instead of writing null for it', () => {
    const order = (value: number): RosterDiff => ({
      ...EMPTY,
      orderChanges: [{ rowId: 'r1', order: value }],
    });
    expect(() => diffDigest('S', order(Number.NaN))).toThrow('must be a safe integer');
    expect(() => diffDigest('S', order(1.5))).toThrow('must be a safe integer');
    // Ground control: a whole order digests.
    expect(diffDigest('S', order(3))).toHaveLength(43);
  });
});
