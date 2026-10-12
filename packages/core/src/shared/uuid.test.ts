import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { uuidBytes, uuidText } from './uuid.ts';

const hex = (bytes: Uint8Array | null) =>
  bytes === null ? null : Buffer.from(bytes).toString('hex');

describe('uuidBytes', () => {
  it('gives the 16 bytes of any UUID, in either case', () => {
    fc.assert(
      fc.property(fc.uuid(), (text) => {
        const expected = text.replaceAll('-', '').toLowerCase();
        expect(hex(uuidBytes(text))).toBe(expected);
        expect(hex(uuidBytes(text.toUpperCase()))).toBe(expected);
      }),
      { numRuns: 1000 },
    );
  });

  it('reads the nil and max UUIDs', () => {
    expect(hex(uuidBytes('00000000-0000-0000-0000-000000000000'))).toBe('0'.repeat(32));
    expect(hex(uuidBytes('ffffffff-ffff-ffff-ffff-ffffffffffff'))).toBe('f'.repeat(32));
  });

  it.each([
    ['no dashes', '0190f2a45b6c7d8e9fa0b1c2d3e4f506'],
    ['braces', '{0190f2a4-5b6c-7d8e-9fa0-b1c2d3e4f506}'],
    ['a dash in the wrong place', '0190f2a-45b6c-7d8e-9fa0-b1c2d3e4f506'],
    ['a letter that is not hex', '0190f2a4-5b6c-7d8e-9fa0-b1c2d3e4f50g'],
    ['one digit short', '0190f2a4-5b6c-7d8e-9fa0-b1c2d3e4f50'],
    ['a trailing line break', '0190f2a4-5b6c-7d8e-9fa0-b1c2d3e4f506\n'],
    ['an empty text', ''],
  ])('refuses %s', (_name, text) => {
    expect(uuidBytes(text)).toBeNull();
  });

  it('refuses a value that is not text', () => {
    expect(uuidBytes(42 as unknown as string)).toBeNull();
  });
});

describe('uuidText', () => {
  it('writes the lowercase canonical text that uuidBytes reads back', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 16, maxLength: 16 }), (bytes) => {
        const text = uuidText(bytes);
        expect(text).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(uuidBytes(text)).toEqual(bytes);
      }),
    );
    expect(uuidText(new Uint8Array(16).fill(0xab))).toBe('abababab-abab-abab-abab-abababababab');
    expect(uuidText(Uint8Array.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15))).toBe(
      '00010203-0405-0607-0809-0a0b0c0d0e0f',
    );
  });

  it('rejects any length other than 16 bytes', () => {
    expect(() => uuidText(new Uint8Array(15))).toThrow(RangeError);
    expect(() => uuidText(new Uint8Array(17))).toThrow(RangeError);
  });
});
