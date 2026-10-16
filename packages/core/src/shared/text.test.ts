import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { collapseWhitespace, hasControlCharacter, WHITE_SPACE_CHARACTERS } from './text.ts';

// Built at run time: Biome would write the escapes as invisible characters.
const NO_BREAK_SPACE = String.fromCodePoint(0xa0);
const EM_SPACE = String.fromCodePoint(0x2003);
const BYTE_ORDER_MARK = String.fromCodePoint(0xfeff);
const COMBINING_CEDILLA = String.fromCodePoint(0x327);
// Every character trim removes: Unicode white space but U+0085 (a control character),
// and the BOM.
const WHITE_SPACE = [
  ...WHITE_SPACE_CHARACTERS.filter((character) => character !== String.fromCodePoint(0x85)),
  BYTE_ORDER_MARK,
];

describe('collapseWhitespace', () => {
  it('trims the ends and makes every inner run of white space one space', () => {
    expect(collapseWhitespace('  BİL \t\n 301 ')).toBe('BİL 301');
    expect(collapseWhitespace(`a${NO_BREAK_SPACE}${EM_SPACE}b`)).toBe('a b');
    expect(collapseWhitespace(`${BYTE_ORDER_MARK}a`)).toBe('a');
    expect(collapseWhitespace(' \t ')).toBe('');
    expect(collapseWhitespace('')).toBe('');
    // Ground control: text without white space comes back as it was.
    expect(collapseWhitespace('BİL-301')).toBe('BİL-301');
  });

  it('writes the text in NFC', () => {
    expect(collapseWhitespace(`c${COMBINING_CEDILLA}`)).toBe('ç');
  });

  it('keeps every other character, leaves no white space at the ends or doubled, and changes nothing twice', () => {
    const text = fc
      .array(fc.constantFrom(...WHITE_SPACE, 'a', 'İ', 'ç', 'c', COMBINING_CEDILLA, '-'), {
        maxLength: 24,
      })
      .map((characters) => characters.join(''));
    let collapsed = 0;
    fc.assert(
      fc.property(text, (input) => {
        const result = collapseWhitespace(input);
        const words = input.normalize('NFC').split(/\s+/).filter(Boolean);
        if (/^\s|\s$|\s\s|[^\S ]/.test(input.normalize('NFC'))) collapsed += 1;
        expect(result).toBe(result.trim());
        expect(result).not.toMatch(/\s\s/);
        expect(result).not.toMatch(/[^\S ]/);
        expect(result).toBe(result.normalize('NFC'));
        expect(result.replaceAll(' ', '')).toBe(words.join(''));
        // Words stay apart: one space between each two.
        expect(result === '' ? 0 : result.split(' ').length).toBe(words.length);
        expect(collapseWhitespace(result)).toBe(result);
      }),
      { numRuns: 2000 },
    );
    // Ground control: most inputs had white space to trim or collapse.
    expect(collapsed).toBeGreaterThan(1000);
  });
});

describe('hasControlCharacter', () => {
  it('refuses C0, DEL and C1 control characters and nothing else', () => {
    for (const unit of [0x00, 0x09, 0x0a, 0x1f, 0x7f, 0x80, 0x9f]) {
      const control = String.fromCodePoint(unit);
      // At the start, inside and at the end.
      for (const text of [`${control}ab`, `a${control}b`, `ab${control}`]) {
        expect(hasControlCharacter(text), unit.toString(16)).toBe(true);
      }
    }
    // Ground control: the neighbours of the ranges and Turkish letters pass.
    for (const text of [' ', '~', NO_BREAK_SPACE, 'Ğüşiöç İÇÖŞÜ', '']) {
      expect(hasControlCharacter(text), text).toBe(false);
    }
  });
});
