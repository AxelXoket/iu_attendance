import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TURKISH_CASE_PAIRS } from './name.ts';
import { SECTION_WORDS, sectionKey, sectionsMatch } from './section.ts';

const RUNS = { numRuns: 1000 };

const UPPER_BY_LOWER = new Map(TURKISH_CASE_PAIRS.map(([upper, lower]) => [lower, upper]));
const LOWER_LETTERS = TURKISH_CASE_PAIRS.map(([, lower]) => lower);
const SEPARATORS = [' ', '.', '. ', ':', '-', '/', '_', ',', '\u00a0', '\t', ' - '];

// Written out by hand on purpose: the reference the section key is judged against,
// independent of SECTION_WORDS. Marks and invisible characters are escapes.
const SPELLINGS: Readonly<Record<string, ReadonlyArray<readonly [label: string, key: string]>>> = {
  'the word in Turkish and ASCII letters': [
    ['Şube 1', '1'],
    ['ŞUBE 1', '1'],
    ['şube 1', '1'],
    ['Sube 1', '1'],
    ['SUBE 1', '1'],
    ['1. sube', '1'],
    ['1. SUBE', '1'],
    ['1.ŞUBE', '1'],
  ],
  'the possessive, lowered by the Turkish rule': [
    ['A Şubesi', 'a'],
    ['A ŞUBESİ', 'a'],
    ['A ŞUBESI', 'a'],
    ['A Subesi', 'a'],
    ['A SUBESİ', 'a'],
    ['A SUBESI', 'a'],
    ['B şubesı', 'b'],
    ['C subesı', 'c'],
  ],
  'a number glued to the word': [
    ['1Şube', '1'],
    ['Şube1', '1'],
    ['1ŞUBE', '1'],
    ['ŞUBE1', '1'],
    ['2SUBE', '2'],
    ['SUBE2', '2'],
    ['3Şubesi', '3'],
    ['ŞUBESİ3', '3'],
  ],
  'separators, none or several': [
    ['Şube-1', '1'],
    ['Şube:1', '1'],
    ['Şube/1', '1'],
    ['Şube_1', '1'],
    ['Şube, 1', '1'],
    ['Şube\u00a01', '1'],
    ['Şube\t1', '1'],
    ['(1) Şube', '1'],
    ['Şube: 2/B', '2b'],
    ['1 - A', '1a'],
    // A hyphen or dots inside the word: the first pass joins it, the next drops it.
    ['Şu-be 1', '1'],
    ['Ş.U.B.E. 1', '1'],
  ],
  'combining marks and invisible characters': [
    ['S\u0327ube 1', '1'],
    ['S\u0327UBE 1', '1'],
    ['Şu\u200bbe 1', '1'],
    // A mark on the word makes it another word, and marks stay in the key.
    ['şube\u0335 1', 'şube\u03351'],
    ['ı\u0302', 'ı\u0302'],
    ['1\u0301', '1\u0301'],
  ],
  'leading zeros of a number': [
    ['Şube 01', '1'],
    ['01. Şube', '1'],
    ['001', '1'],
    ['A01', 'a1'],
    ['01A', '1a'],
    ['0', '0'],
    ['00', '0'],
    ['Şube 0', '0'],
    ['0A', '0a'],
    // Zeros inside or after a number stay, and separators do not split a number.
    ['10', '10'],
    ['100', '100'],
    ['010', '10'],
    ['1 01', '101'],
    // Nor does the word, even when it only forms in a later pass: split by dots, a
    // hyphen, a soft hyphen or a word joiner.
    ['1 Ş.U.B.E. 01', '101'],
    ['1 Şu-be 01', '101'],
    ['1 Şu\u00adbe 01', '101'],
    ['1 Şu\u2060be 01', '101'],
    ['1Şu-be00', '100'],
    // Only ASCII zeros: Arabic-Indic and fullwidth digits stay as written.
    ['\u0660\u0661', '\u0660\u0661'],
    ['\uff10\uff11', '\uff10\uff11'],
  ],
};

// Upper-cases the letters picked by index through the explicit Turkish table.
const casedWith = (text: string, picks: readonly boolean[]) =>
  [...text].map((c, index) => (picks[index] ? (UPPER_BY_LOWER.get(c) ?? c) : c)).join('');

// A label core: lower case letters and digits holding no spelling of the word şube and
// no number with a leading zero, so the core is its own key.
const cores = fc
  .array(fc.constantFrom(...'0123456789', ...LOWER_LETTERS), { minLength: 1, maxLength: 5 })
  .map((units) => units.join(''))
  .filter((core) => !SECTION_WORDS.some((word) => core.includes(word)))
  .filter((core) => !/(?:^|[^0-9])0[0-9]/.test(core));

// Puts `count` zeros in front of every number in a core.
const zeroPadded = (core: string, count: number) =>
  core.replace(/(^|[^0-9])([0-9])/g, `$1${'0'.repeat(count)}$2`);

const sectionWords = fc
  .tuple(fc.constantFrom(...SECTION_WORDS), fc.array(fc.boolean(), { maxLength: 6 }))
  .map(([word, picks]) => casedWith(word, picks));

// Between the word and the core: a separator, or nothing where the core has a digit at
// that edge, since a digit ends the word.
const joints = (digitAtEdge: boolean) => (digitAtEdge ? ['', ...SEPARATORS] : SEPARATORS);

// The core spelled as a file might: letters in either case, separators or a zero width
// space between characters, the word şube before or after it, padding, NFC or NFD.
const spellings = (core: string) =>
  fc
    .record({
      picks: fc.array(fc.boolean(), { maxLength: 5 }),
      gaps: fc.array(fc.constantFrom('', '', '.', ' ', '-', '\u200b'), { maxLength: 5 }),
      before: fc.option(fc.tuple(sectionWords, fc.constantFrom(...joints(/^[0-9]/.test(core)))), {
        nil: null,
      }),
      after: fc.option(fc.tuple(fc.constantFrom(...joints(/[0-9]$/.test(core))), sectionWords), {
        nil: null,
      }),
      pad: fc.constantFrom('', ' ', '\u00a0', '\t'),
      nfd: fc.boolean(),
    })
    .map(({ picks, gaps, before, after, pad, nfd }) => {
      const body = [...casedWith(core, picks)].map((c, index) => `${gaps[index] ?? ''}${c}`);
      const label = `${pad}${before ? before.join('') : ''}${body.join('')}${after ? after.join('') : ''}${pad}`;
      return nfd ? label.normalize('NFD') : label;
    });

// Fragments that build and break the word şube, to stress the repeat-until-stable rule.
const fragments = fc.string({
  unit: fc.constantFrom(
    'ş',
    'Ş',
    's',
    'S',
    'u',
    'U',
    'b',
    'B',
    'e',
    'E',
    'i',
    'I',
    'İ',
    'ı',
    '0',
    '1',
    '.',
    '-',
    ' ',
    '\u0327',
    '\u0307',
    '\u200b',
    'Şube',
    'şu',
    'be',
  ),
  maxLength: 12,
});

describe('Section key stays the same across spelling differences', () => {
  it('gives one key for the spellings of section 1', () => {
    expect(sectionKey('1')).toBe('1');
    for (const label of ['1. Şube', '1.ŞUBE', 'şube 1', ' 1 ']) {
      expect(sectionKey(label)).toBe(sectionKey('1'));
    }
  });

  it('keeps 1 and 11, and A and B, apart', () => {
    expect(sectionKey('1')).not.toBe(sectionKey('11'));
    expect(sectionKey('A')).not.toBe(sectionKey('B'));
  });

  for (const [group, rows] of Object.entries(SPELLINGS)) {
    it.each(rows)(`${group}: %j gives %j`, (label, key) => {
      expect(sectionKey(label)).toBe(key);
    });
  }

  it('keeps a word that only contains şube', () => {
    expect(sectionKey('Şubeler')).toBe('şubeler');
    expect(sectionKey('A Şube Si')).toBe('asi');
    // A letter glued to the word makes one longer word.
    expect(sectionKey('AŞUBE')).toBe('aşube');
  });

  it('lowers the label by the Turkish rule', () => {
    expect(sectionKey('İ')).toBe(sectionKey('i'));
    expect(sectionKey('I')).toBe(sectionKey('ı'));
    expect(sectionKey('I')).not.toBe(sectionKey('i'));
    expect(sectionKey('Ş')).not.toBe(sectionKey('S'));
  });

  it('gives every spelling of a label the key of its letters and digits', () => {
    let decorated = 0;
    fc.assert(
      fc.property(
        cores.chain((core) => spellings(core).map((label) => [core, label] as const)),
        ([core, label]) => {
          if (label !== core) decorated += 1;
          expect(sectionKey(label)).toBe(core);
        },
      ),
      RUNS,
    );
    // Ground control: most labels were really spelled differently from the core.
    expect(decorated).toBeGreaterThan(500);
  });

  it('drops the leading zeros of every number, wherever the separators fall', () => {
    let padded = 0;
    fc.assert(
      fc.property(
        fc
          .tuple(cores, fc.integer({ min: 1, max: 3 }))
          .chain(([core, count]) =>
            spellings(zeroPadded(core, count)).map((label) => [core, label] as const),
          ),
        ([core, label]) => {
          if (zeroPadded(core, 1) !== core) padded += 1;
          expect(sectionKey(label)).toBe(core);
        },
      ),
      RUNS,
    );
    // Ground control: many cores held a number that really got zeros in front.
    expect(padded).toBeGreaterThan(300);
  });

  it('keeps labels apart whose letters and digits differ', () => {
    fc.assert(
      fc.property(cores, cores, (a, b) => {
        fc.pre(a !== b);
        expect(sectionKey(a)).not.toBe(sectionKey(b));
      }),
      RUNS,
    );
  });

  it('gives null or a key of letters and digits without leading zeros, and the key of a key is the key', () => {
    let none = 0;
    let keys = 0;
    fc.assert(
      fc.property(fc.oneof(fragments, fc.string({ unit: 'binary', maxLength: 20 })), (label) => {
        const key = sectionKey(label);
        if (key === null) {
          none += 1;
          return;
        }
        keys += 1;
        expect(key).toMatch(/^[\p{L}\p{M}\p{Nd}]+$/u);
        expect(key).not.toMatch(/(?:^|[^0-9])0[0-9]/);
        expect(sectionKey(key)).toBe(key);
      }),
      RUNS,
    );
    // Ground control: labels with a key and labels without one both occurred.
    expect(none).toBeGreaterThan(150);
    expect(keys).toBeGreaterThan(400);
  });
});

describe('No section key when nothing is left', () => {
  // Every class the audit found: empty, spaces, separators, the word alone, and numbers
  // that are not decimal digits.
  it.each([
    ['an empty label', ''],
    ['a space', ' '],
    ['spaces', ' \t\u00a0'],
    ['a zero width space', '\u200b'],
    ['a hyphen', '-'],
    ['a full stop', '.'],
    ['an em dash', '\u2014'],
    ['the word in capitals', 'ŞUBE'],
    ['the possessive', 'Şubesi'],
    ['the ASCII word', 'sube'],
    ['the word between separators', ' (Şube). '],
    ['roman numeral two', '\u2161'],
    ['circled digit one', '\u2460'],
    ['superscript two', '\u00b2'],
    ['the fraction one quarter', '\u00bc'],
  ])('gives null for %s', (_case, label) => {
    expect(sectionKey(label)).toBeNull();
  });

  it('gives a key to a lone zero, a single letter and a digit of another script', () => {
    // Positive control: one character that is a letter or a decimal digit is a key.
    expect(sectionKey('0')).toBe('0');
    expect(sectionKey('Şube 0')).toBe('0');
    expect(sectionKey('A')).toBe('a');
    expect(sectionKey('\u0661')).toBe('\u0661');
  });
});

// Labels that leave nothing: spellings of the word şube and separators, kept apart by
// spaces so that no two words join into a longer one, in NFC or NFD.
const keylessLabels = fc
  .tuple(
    fc.array(fc.oneof(sectionWords, fc.constantFrom(...SEPARATORS, '\u200b', '(', ')')), {
      maxLength: 4,
    }),
    fc.boolean(),
  )
  .map(([parts, nfd]) => {
    const label = parts.join(' ');
    return nfd ? label.normalize('NFD') : label;
  });

describe('Section labels match only when both have the same key', () => {
  it.each([
    ['1', 'Şube 01'],
    ['1. Şube', '01'],
    ['A', 'a'],
    ['Şube: 2/B', '2b'],
    ['1 Şu-be 01', '101'],
  ])('%j matches %j', (a, b) => {
    // Ground control: the labels differ as text, so the match is not plain equality.
    expect(a).not.toBe(b);
    expect(sectionsMatch(a, b)).toBe(true);
    expect(sectionsMatch(b, a)).toBe(true);
  });

  it.each([
    ['1', '11'],
    ['A', 'B'],
    ['Şube 1', 'Şube 2'],
  ])('%j does not match %j: the keys differ', (a, b) => {
    expect(sectionsMatch(a, b)).toBe(false);
    expect(sectionsMatch(b, a)).toBe(false);
    // Positive control: each label matches itself.
    expect(sectionsMatch(a, a)).toBe(true);
    expect(sectionsMatch(b, b)).toBe(true);
  });

  // A null key matches nothing, not even another null key or itself.
  it.each([
    ['Şube', ''],
    ['Şube', 'ŞUBE'],
    ['Şube', 'Şube'],
    ['', ''],
    [' ', '-'],
    ['(Şube)', '\u200b'],
  ])('%j does not match %j: neither has a key', (a, b) => {
    // Ground control: both labels really have no key.
    expect(sectionKey(a)).toBeNull();
    expect(sectionKey(b)).toBeNull();
    expect(sectionsMatch(a, b)).toBe(false);
    expect(sectionsMatch(b, a)).toBe(false);
    // Positive control: the same labels with the same section number do match.
    expect(sectionsMatch(`${a} 1`, `${b} 1`)).toBe(true);
  });

  it.each([
    ['Şube', '1'],
    ['', '0'],
    ['-', 'A'],
  ])('%j does not match %j: only the second has a key', (a, b) => {
    // Ground control: the first label has no key, the second has one.
    expect(sectionKey(a)).toBeNull();
    expect(sectionKey(b)).not.toBeNull();
    expect(sectionsMatch(a, b)).toBe(false);
    expect(sectionsMatch(b, a)).toBe(false);
    // Positive control: the label with a key matches itself.
    expect(sectionsMatch(b, b)).toBe(true);
  });

  it('matches any two spellings of the same letters and digits', () => {
    let different = 0;
    fc.assert(
      fc.property(
        cores.chain((core) => fc.tuple(spellings(core), spellings(core))),
        ([a, b]) => {
          if (a !== b) different += 1;
          expect(sectionsMatch(a, b)).toBe(true);
        },
      ),
      RUNS,
    );
    // Ground control: most pairs were spelled differently.
    expect(different).toBeGreaterThan(500);
  });

  it('never matches a label without a key, not even with itself', () => {
    let keyed = 0;
    fc.assert(
      fc.property(keylessLabels, fc.oneof(keylessLabels, cores.chain(spellings)), (a, b) => {
        // Ground control: the label really has no key.
        expect(sectionKey(a)).toBeNull();
        if (sectionKey(b) !== null) keyed += 1;
        expect(sectionsMatch(a, b)).toBe(false);
        expect(sectionsMatch(b, a)).toBe(false);
        expect(sectionsMatch(a, a)).toBe(false);
        // Positive control: given a section number, the label matches that number.
        expect(sectionsMatch(`${a} 1`, '1')).toBe(true);
      }),
      RUNS,
    );
    // Ground control: the other label had a key in many cases and none in many others.
    expect(keyed).toBeGreaterThan(300);
    expect(keyed).toBeLessThan(700);
  });
});
