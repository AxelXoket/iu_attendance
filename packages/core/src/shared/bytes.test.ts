import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { equalBytes } from './bytes.ts';

describe('equalBytes', () => {
  it('is true only for the same bytes', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 40 }), fc.uint8Array({ maxLength: 40 }), (a, b) => {
        expect(equalBytes(a, b)).toBe(Buffer.from(a).equals(Buffer.from(b)));
        expect(equalBytes(a, Uint8Array.from(a))).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it.each([
    ['the first byte', 0],
    ['a middle byte', 15],
    ['the last byte', 31],
  ])('notices a difference in %s', (_name, index) => {
    const a = new Uint8Array(32).fill(7);
    const b = Uint8Array.from(a);
    b[index] = 8;
    expect(equalBytes(a, b)).toBe(false);
  });

  it('is false for a prefix and for different lengths', () => {
    expect(equalBytes(Uint8Array.from([1, 2]), Uint8Array.from([1, 2, 3]))).toBe(false);
    expect(equalBytes(new Uint8Array(0), new Uint8Array(0))).toBe(true);
  });
});
