import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeCourseCode } from './normalize.ts';

// Built from code points: written out, these would be invisible or easy to mistake.
const NBSP = String.fromCharCode(0xa0);
const CEDILLA = String.fromCodePoint(0x327);
const BREVE = String.fromCodePoint(0x306);
const DOT_ABOVE = String.fromCodePoint(0x307);

describe('course code normalisation', () => {
  it('is a fixed point: normalising twice changes nothing', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ unit: 'grapheme', maxLength: 30 }),
          fc.string({
            unit: fc.constantFrom(
              'a',
              'c',
              'g',
              'i',
              'ı',
              'İ',
              'I',
              'ş',
              ' ',
              '\t',
              '1',
              NBSP,
              CEDILLA,
              BREVE,
              DOT_ABOVE,
            ),
            maxLength: 20,
          }),
        ),
        (text) => {
          const once = normalizeCourseCode(text);
          expect(normalizeCourseCode(once)).toBe(once);
          // NFC, no space at either end, no run of spaces inside, no lower-case i letters.
          expect(once).toBe(once.normalize('NFC'));
          expect(once).toBe(once.trim());
          expect(once).not.toMatch(/\s\s/);
          expect(once).not.toMatch(/[iı]/);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('is a fixed point for every single code point', () => {
    for (let code = 0; code <= 0x10ffff; code += 1) {
      if (code >= 0xd800 && code <= 0xdfff) continue;
      const once = normalizeCourseCode(String.fromCodePoint(code));
      if (normalizeCourseCode(once) !== once)
        throw new Error(`not a fixed point at U+${code.toString(16)}`);
    }
  });

  it.each([
    ['bil 301', 'BİL 301'],
    ['ısı', 'ISI'],
    ['  bil   301  ', 'BİL 301'],
    ['bil\t301\n', 'BİL 301'],
    [`bil${NBSP}301`, 'BİL 301'],
    ['İstanbul', 'İSTANBUL'],
    ['IŞIK', 'IŞIK'],
    ['çağdaş', 'ÇAĞDAŞ'],
    ['mat-101', 'MAT-101'],
    ['', ''],
    ['   ', ''],
  ])('normalises %j to %j', (text, expected) => {
    expect(normalizeCourseCode(text)).toBe(expected);
  });

  it('gives decomposed and composed letters the same code (NFC first)', () => {
    // c + cedilla, a, g + breve: the decomposed spelling of 'çağ'.
    const decomposed = `c${CEDILLA}ag${BREVE} 101`;
    expect(decomposed).not.toBe('çağ 101');
    expect(normalizeCourseCode(decomposed)).toBe('ÇAĞ 101');
    expect(normalizeCourseCode(`I${DOT_ABOVE}`)).toBe('İ');
    expect(normalizeCourseCode(`I${DOT_ABOVE}`)).toBe(normalizeCourseCode('İ'));
  });

  it('gives canonically equivalent texts the same code', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 20 }), (text) => {
        expect(normalizeCourseCode(text.normalize('NFD'))).toBe(normalizeCourseCode(text));
      }),
      { numRuns: 500 },
    );
    // i with a grave accent: composed, it has no plain i to turn into İ; decomposed, it would.
    const grave = String.fromCodePoint(0x300);
    const composed = String.fromCodePoint(0xec);
    expect(normalizeCourseCode(`i${grave}`)).toBe(normalizeCourseCode(composed));
    expect(normalizeCourseCode(composed)).toBe(String.fromCodePoint(0xcc));
  });

  it('upper-cases the Turkish i letters unlike the generic upper case', () => {
    // Ground control: the generic upper case gets i wrong for Turkish.
    expect('i'.toUpperCase()).toBe('I');
    expect(normalizeCourseCode('i')).toBe('İ');
    expect(normalizeCourseCode('ı')).toBe('I');
  });

  // Hermes may run without Intl: the rule must not lean on Intl or the locale methods.
  it('works with Intl and the locale methods out of reach', () => {
    const proto = String.prototype as unknown as Record<string, unknown>;
    const names = ['toLocaleUpperCase', 'toLocaleLowerCase', 'localeCompare'];
    const saved = names.map((name) => proto[name]);
    const savedIntl = Object.getOwnPropertyDescriptor(globalThis, 'Intl');
    const refuse = () => {
      throw new Error('locale method used');
    };
    try {
      for (const name of names) proto[name] = refuse;
      Object.defineProperty(globalThis, 'Intl', { get: refuse, configurable: true });
      // Ground control: the stubs do throw.
      expect(() => 'a'.toLocaleUpperCase('tr-TR')).toThrow('locale method used');
      expect(normalizeCourseCode('bil 301')).toBe('BİL 301');
      expect(normalizeCourseCode('ısı')).toBe('ISI');
      expect(normalizeCourseCode(`c${CEDILLA}ag${BREVE} 101`)).toBe('ÇAĞ 101');
    } finally {
      names.forEach((name, index) => {
        proto[name] = saved[index];
      });
      if (savedIntl !== undefined) Object.defineProperty(globalThis, 'Intl', savedIntl);
    }
    expect('i'.toLocaleUpperCase('tr-TR')).toBe('İ');
  });

  it('refuses a value that is not text', () => {
    expect(() => normalizeCourseCode(301 as unknown as string)).toThrow(TypeError);
  });
});
