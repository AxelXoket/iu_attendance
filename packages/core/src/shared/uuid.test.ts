import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { uuidBytes } from './uuid.ts';

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
