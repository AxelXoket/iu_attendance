import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_NUMBER_MAX_LENGTH,
  DocumentNumberError,
  normalizeDocumentNumber,
} from './document-number.ts';

const tryNormalize = (value: string) => {
  try {
    return normalizeDocumentNumber(value);
  } catch (error) {
    expect(error).toBeInstanceOf(DocumentNumberError);
    return null;
  }
};

describe('Document number normalisation', () => {
  it('is idempotent and its result is NFC with no outer space', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 80 }), (value) => {
        const once = tryNormalize(value);
        if (once === null) return;
        expect(normalizeDocumentNumber(once)).toBe(once);
        expect(once.normalize('NFC')).toBe(once);
        expect(once.trim()).toBe(once);
        expect(once).not.toMatch(/\s{2}/);
      }),
      { numRuns: 1000 },
    );
  });

  it('keeps Turkish letters and folds inner whitespace', () => {
    expect(normalizeDocumentNumber('  ÖİŞ   2026/ığüç ')).toBe('ÖİŞ 2026/ığüç');
  });

  it('gives the same result for NFC and NFD spellings', () => {
    const nfd = 'Şube Kararı'.normalize('NFD');
    expect(nfd).not.toBe('Şube Kararı');
    expect(normalizeDocumentNumber(nfd)).toBe('Şube Kararı');
  });

  // The spec's own bound, written out rather than read from the constant: the document
  // number CHECK allows char_length 1 to 64 (D09 tables.0, invariants.3).
  it('accepts a written-out 64-character number and rejects a 65-character one', () => {
    const sixtyFour = 'ŞUBE/001ŞUBE/002ŞUBE/003ŞUBE/004ŞUBE/005ŞUBE/006ŞUBE/007ŞUBE/008';
    const sixtyFive = 'ŞUBE/001ŞUBE/002ŞUBE/003ŞUBE/004ŞUBE/005ŞUBE/006ŞUBE/007ŞUBE/0089';
    // Ground control: the literals have the lengths their names say, in code points.
    expect([...sixtyFour]).toHaveLength(64);
    expect([...sixtyFive]).toHaveLength(65);
    expect(normalizeDocumentNumber(sixtyFour)).toBe(sixtyFour);
    expect(() => normalizeDocumentNumber(sixtyFive)).toThrow(DocumentNumberError);
  });

  it('accepts one character, the lower bound (control)', () => {
    expect(normalizeDocumentNumber('7')).toBe('7');
  });

  // NFC keeps compatibility characters; NFKC would rewrite the number itself.
  it.each([
    ['a superscript two', 'No\u{B2} 12', 'No2 12'],
    ['full-width digits', '\u{FF12}\u{FF10}\u{FF12}\u{FF16}/7', '2026/7'],
    ['a ligature', '\u{FB01}le 3', 'file 3'],
    ['a Roman numeral', 'Ek-\u{216B}', 'Ek-XII'],
  ])('keeps %s as written: NFC, not NFKC', (_name, value, rewritten) => {
    expect(normalizeDocumentNumber(value)).toBe(value);
    // Ground control: NFKC would give another number.
    expect(value.normalize('NFKC')).toBe(rewritten);
  });

  it.each([
    ['a no-break space', 'A\u{A0}B'],
    ['an ideographic space', 'A\u{3000}B'],
    ['a thin space', 'A\u{2009}B'],
    ['a narrow no-break space', 'A\u{202F}B'],
    ['a run of mixed spaces', 'A \u{A0}\u{3000}\u{2009} B'],
  ])('folds %s inside into one plain space', (_name, value) => {
    expect(normalizeDocumentNumber(value)).toBe('A B');
  });

  it('trims Unicode spaces at either end and keeps one plain space (control)', () => {
    expect(normalizeDocumentNumber('\u{A0}A B\u{3000}')).toBe('A B');
    expect(normalizeDocumentNumber('A B')).toBe('A B');
  });

  it.each([
    ['a tab', 'A\tB'],
    ['a line break', 'A\nB'],
    ['a C1 control', 'A\u0085B'],
    ['nothing but space', '   '],
    ['an empty value', ''],
  ])('rejects %s', (_name, value) => {
    expect(() => normalizeDocumentNumber(value)).toThrow(DocumentNumberError);
  });

  it('counts the length in code points, as char_length does', () => {
    // An astral character is two UTF-16 units: 64 of them are 128 units.
    const astral = '\u{1F600}';
    const longest = astral.repeat(DOCUMENT_NUMBER_MAX_LENGTH);
    expect(longest.length).toBeGreaterThan(DOCUMENT_NUMBER_MAX_LENGTH);
    expect(normalizeDocumentNumber(longest)).toBe(longest);
    expect(() => normalizeDocumentNumber(longest + astral)).toThrow(
      `document number must be 1 to ${DOCUMENT_NUMBER_MAX_LENGTH} characters`,
    );
  });

  const at = (end: 'start' | 'end', character: string) =>
    end === 'start' ? `${character}A` : `A${character}`;

  it.each([
    ['a leading line break', 'start', '\n'],
    ['a trailing line break', 'end', '\n'],
    ['a leading tab', 'start', '\t'],
    ['a trailing carriage return', 'end', '\r'],
    ['a leading NUL', 'start', '\u0000'],
    ['a trailing U+001F', 'end', '\u001f'],
    ['a leading DEL', 'start', '\u007f'],
    ['a trailing U+009F', 'end', '\u009f'],
  ] as const)('rejects %s instead of trimming it', (_name, end, character) => {
    expect(() => normalizeDocumentNumber(at(end, character))).toThrow(
      'document number contains a control character',
    );
    // Ground control: a plain space at the same end is trimmed.
    expect(normalizeDocumentNumber(at(end, ' '))).toBe('A');
  });

  it('names its error', () => {
    const error = (() => {
      try {
        normalizeDocumentNumber('');
      } catch (caught) {
        return caught;
      }
      return null;
    })();
    expect(error).toBeInstanceOf(DocumentNumberError);
    expect(error).toMatchObject({ name: 'DocumentNumberError' });
  });
});
