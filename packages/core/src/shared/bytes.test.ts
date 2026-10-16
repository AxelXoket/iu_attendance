import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { equalBytes, readUint64, writeUint64 } from './bytes.ts';

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

describe('writeUint64 and readUint64', () => {
  const at = (value: number, offset = 3) => {
    const view = new DataView(new ArrayBuffer(offset + 8));
    writeUint64(view, offset, value);
    return view;
  };

  it('write a safe whole number big-endian, as the 64-bit writer does, and read it back', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), (value) => {
        const view = at(value);
        // The oracle, in the test file only.
        expect(view.getBigUint64(3)).toBe(BigInt(value));
        expect(readUint64(view, 3)).toBe(value);
      }),
      { numRuns: 2_000 },
    );
    for (const value of [0, 2 ** 32 - 1, 2 ** 32, Number.MAX_SAFE_INTEGER]) {
      expect(at(value).getBigUint64(3), String(value)).toBe(BigInt(value));
    }
  });

  it('read null for a value above the safe integers', () => {
    const view = new DataView(new ArrayBuffer(8));
    view.setBigUint64(0, 2n ** 53n);
    expect(readUint64(view, 0)).toBeNull();
    // Ground control: one below is read.
    view.setBigUint64(0, 2n ** 53n - 1n);
    expect(readUint64(view, 0)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
