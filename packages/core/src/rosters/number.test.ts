import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { WHITE_SPACE_CHARACTERS } from '../shared/text.ts';
import { isStudentNumber, parseStudentNumber } from './number.ts';

const digits = (min: number, max: number) =>
  fc
    .array(fc.constantFrom(...'0123456789'), { minLength: min, maxLength: max })
    .map((list) => list.join(''));
const studentNumber = fc.oneof(digits(9, 9), digits(10, 10));
// What trim removes: Unicode white space (but U+0085, a control character) and the BOM.
const TRIMMED = [
  ...WHITE_SPACE_CHARACTERS.filter((character) => character !== String.fromCodePoint(0x85)),
  String.fromCodePoint(0xfeff),
];
const whiteSpace = fc
  .array(fc.constantFrom(...TRIMMED), { maxLength: 3 })
  .map((list) => list.join(''));

describe('student number', () => {
  it('takes 9 or 10 ASCII digits, with white space and the ="..." wrapper peeled off', () => {
    fc.assert(
      fc.property(studentNumber, whiteSpace, whiteSpace, (number, before, after) => {
        expect(isStudentNumber(number)).toBe(true);
        expect(parseStudentNumber(number)).toBe(number);
        expect(parseStudentNumber(`${before}${number}${after}`)).toBe(number);
        expect(parseStudentNumber(`${before}="${number}"${after}`)).toBe(number);
      }),
      { numRuns: 500 },
    );
    expect(parseStudentNumber('="0123456789"')).toBe('0123456789');
  });

  it('refuses every other text as NUMBER_FORMAT would', () => {
    // Texts near a number as well as any text, so both answers occur.
    const cell = fc.oneof(
      fc.string({ maxLength: 14 }),
      digits(0, 12),
      studentNumber.map((number) => `="${number}"`),
      fc.tuple(studentNumber, fc.string({ maxLength: 2 })).map(([number, tail]) => number + tail),
    );
    let accepted = 0;
    fc.assert(
      fc.property(cell, (text) => {
        const trimmed = text.trim();
        const expected =
          /^="([0-9]{9,10})"$/.exec(trimmed)?.[1] ??
          (/^[0-9]{9,10}$/.test(trimmed) ? trimmed : null);
        expect(parseStudentNumber(text)).toBe(expected);
        if (expected !== null) accepted += 1;
      }),
      { numRuns: 1000 },
    );
    expect(accepted).toBeGreaterThan(100);
    for (const cell of [
      '12345678',
      '12345678901',
      '1234 56789',
      '+123456789',
      '123456789.0',
      '="12345678"',
      '=" 123456789"',
      '="123456789',
      '123456789"',
      '"123456789"',
      // Fullwidth and Arabic-Indic digits are digits, but not ASCII.
      '１２３４５６７８９',
      '١٢٣٤٥٦٧٨٩',
      '',
    ]) {
      expect(parseStudentNumber(cell), cell).toBeNull();
    }
    // isStudentNumber peels nothing.
    expect(isStudentNumber(' 123456789')).toBe(false);
    expect(isStudentNumber('="123456789"')).toBe(false);
  });
});
