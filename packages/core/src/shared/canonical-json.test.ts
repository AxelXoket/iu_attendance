import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from './canonical-json.ts';

// JSON values canonicalJson takes: safe integers only for numbers.
const { value: jsonValue } = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: 'small' },
    fc.constant(null),
    fc.boolean(),
    fc.maxSafeInteger(),
    fc.string(),
    fc.array(tie('value')),
    fc.dictionary(fc.string(), tie('value')),
  ),
}));

// The same value with every object's keys in reverse order.
const reversed = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reversed);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, member]) => [key, reversed(member)]),
    );
  }
  return value;
};

describe('canonicalJson', () => {
  it('writes keys sorted at every depth, arrays in order, and no whitespace', () => {
    expect(canonicalJson({ b: [2, { d: null, c: true }], a: 'x y' }, 'v')).toBe(
      '{"a":"x y","b":[2,{"c":true,"d":null}]}',
    );
  });

  it('gives one text per value, whatever the key order, and reads back as the value', () => {
    fc.assert(
      fc.property(jsonValue, (value) => {
        const text = canonicalJson(value, 'v');
        expect(canonicalJson(reversed(value), 'v')).toBe(text);
        expect(JSON.parse(text)).toEqual(value);
      }),
    );
  });

  it.each<[string, unknown, string]>([
    ['a fraction', { n: 1.5 }, 'digest value v.n must be a safe integer'],
    ['NaN', [Number.NaN], 'digest value v[0] must be a safe integer'],
    ['2^53', { n: 2 ** 53 }, 'digest value v.n must be a safe integer'],
    ['undefined', { n: undefined }, 'digest value v.n is not JSON'],
    // biome-ignore lint/suspicious/noSparseArray: the hole is the case
    ['a hole', [1, , 2], 'digest value v[1] is not JSON'],
    ['a Date', { at: new Date(0) }, 'digest value v.at is not JSON'],
    ['a Map', new Map(), 'digest value v is not JSON'],
    ['a function', { run: () => 1 }, 'digest value v.run is not JSON'],
    ['a bigint', { n: 1n }, 'digest value v.n is not JSON'],
  ])('refuses %s, naming where', (_name, value, message) => {
    expect(() => canonicalJson(value, 'v')).toThrow(message);
  });

  it('takes a null-prototype object like a plain one (control)', () => {
    const bare = Object.assign(Object.create(null) as object, { b: 1, a: 2 });
    expect(canonicalJson(bare, 'v')).toBe('{"a":2,"b":1}');
  });
});
