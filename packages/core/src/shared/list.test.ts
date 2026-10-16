import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { nonEmpty } from './list.ts';

describe('nonEmpty', () => {
  it('gives back a copy of a list with items, in order', () => {
    fc.assert(
      fc.property(fc.array(fc.anything(), { minLength: 1 }), (items) => {
        const list = nonEmpty(items);
        expect(list).toEqual(items);
        expect(list).not.toBe(items);
      }),
    );
  });

  it('keeps an undefined first item, and refuses an empty list', () => {
    expect(nonEmpty([undefined])).toEqual([undefined]);
    expect(() => nonEmpty([])).toThrow(RangeError);
  });
});
