import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareVersions, parseVersion, VERSION_MAX_LENGTH, versionSchema } from '../version.ts';

const part = fc.integer({ min: 0, max: 9999 });
// Small parts as well, so equal versions and near neighbours come up often.
const smallPart = fc.integer({ min: 0, max: 3 });
const versions = fc.oneof(
  fc.tuple(part, part, part).map((parts) => parts.join('.')),
  fc.tuple(smallPart, smallPart, smallPart).map((parts) => parts.join('.')),
);
// Texts close to a version: a part with a leading zero, five digits, a sign, a fourth
// part, a space, a missing part.
const nearMisses = fc
  .tuple(versions, fc.constantFrom('0', '00000', '-', '.1', ' ', 'v', ''))
  .chain(([version, piece]) =>
    fc
      .integer({ min: 0, max: version.length })
      .map((at) => `${version.slice(0, at)}${piece}${version.slice(at)}`),
  );

describe('compareVersions', () => {
  it('is a total order: reflexive, antisymmetric and transitive', () => {
    fc.assert(
      fc.property(versions, versions, versions, (a, b, c) => {
        expect(compareVersions(a, a)).toBe(0);
        expect(compareVersions(a, b) + compareVersions(b, a)).toBe(0);
        expect(compareVersions(a, b) === 0).toBe(a === b);
        if (compareVersions(a, b) <= 0 && compareVersions(b, c) <= 0) {
          expect(compareVersions(a, c)).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('orders the parts as numbers, the major part first', () => {
    fc.assert(
      fc.property(versions, versions, (a, b) => {
        const [left, right] = [parseVersion(a), parseVersion(b)];
        if (left === null || right === null) throw new Error('not a version');
        const first = left.findIndex((value, index) => value !== right[index]);
        const expected = first === -1 ? 0 : (left[first] ?? 0) < (right[first] ?? 0) ? -1 : 1;
        expect(compareVersions(a, b)).toBe(expected);
      }),
      { numRuns: 1000 },
    );
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.9.9999', '1.10.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.9999.9999')).toBe(1);
    // Ground control: as texts these two order the other way.
    expect('1.10.0' < '1.9.0').toBe(true);
  });
});

describe('parseVersion and versionSchema', () => {
  it('read three parts of at most four digits without a leading zero, and nothing else', () => {
    expect(parseVersion('1.10.0')).toEqual([1, 10, 0]);
    expect(parseVersion('9999.9999.9999')).toEqual([9999, 9999, 9999]);
    expect('9999.9999.9999').toHaveLength(VERSION_MAX_LENGTH);
    for (const text of [
      '',
      '1',
      '1.2',
      '1.2.3.4',
      '10000.0.0',
      '1.02.3',
      '01.2.3',
      '1.2.-3',
      ' 1.2.3',
      '1.2.3 ',
      'v1.2.3',
      '1.2.3-beta',
      '1..3',
      '١.٢.٣',
    ]) {
      expect(parseVersion(text), text).toBeNull();
      expect(versionSchema.safeParse(text).success, text).toBe(false);
      // An invalid text never enters a comparison.
      expect(() => compareVersions(text, '1.0.0'), text).toThrow(RangeError);
      expect(() => compareVersions('1.0.0', text), text).toThrow(RangeError);
    }
  });

  it('accept exactly the texts the parser reads, which print back the same', () => {
    fc.assert(
      fc.property(fc.oneof(versions, nearMisses, fc.string({ maxLength: 16 })), (text) => {
        const parts = parseVersion(text);
        expect(versionSchema.safeParse(text).success).toBe(parts !== null);
        if (parts !== null) expect(parts.join('.')).toBe(text);
      }),
      { numRuns: 1000 },
    );
  });
});
