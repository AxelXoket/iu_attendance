import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { INVISIBLE_CHARACTERS, WHITE_SPACE_CHARACTERS } from '../shared/text.ts';
import { nameKey, namesMatch, TURKISH_CASE_PAIRS } from './name.ts';

const RUNS = { numRuns: 1000 };

// Written out by hand on purpose: the reference the explicit table is judged against.
const TURKISH_ALPHABET =
  'Aa Ââ Bb Cc Çç Dd Ee Ff Gg Ğğ Hh Iı İi Îî Jj Kk Ll Mm Nn Oo Öö Pp Rr Ss Şş Tt Uu Ûû Üü Vv Yy Zz'
    .split(' ')
    .map((pair) => [...pair] as [string, string]);

// D03-B18: no letter simplification, so none of these pairs match.
const SIMPLIFICATIONS: ReadonlyArray<readonly [string, string]> = [
  ['Ş', 'S'],
  ['Ç', 'C'],
  ['Ğ', 'G'],
  ['Ö', 'O'],
  ['Ü', 'U'],
  ['I', 'i'],
  ['ş', 's'],
  ['ç', 'c'],
  ['ğ', 'g'],
  ['ö', 'o'],
  ['ü', 'u'],
  ['ı', 'i'],
];

const UPPER_BY_LOWER = new Map(TURKISH_CASE_PAIRS.map(([upper, lower]) => [lower, upper]));
const LOWER_BY_UPPER = new Map(TURKISH_CASE_PAIRS);
const otherCase = (letter: string) => UPPER_BY_LOWER.get(letter) ?? LOWER_BY_UPPER.get(letter);

// Upper-cases the Turkish letters picked by index through the explicit table.
const upperCaseTurkish = (text: string, picked: (index: number) => boolean = () => true) =>
  [...text].map((c, index) => (picked(index) ? (UPPER_BY_LOWER.get(c) ?? c) : c)).join('');

const COMBINING_MARKS = [
  '\u0307',
  '\u0300',
  '\u0301',
  '\u0302',
  '\u0306',
  '\u0308',
  '\u0323',
  '\u0327',
  '\u0328',
  '\u0345',
];
const OTHER_CHARACTERS = ["'", '-', '.', '0', '7', 'Q', 'W', 'X', 'É', 'ß', 'Σ', '\u212a'];

// Turkish letters in both cases, U+00A0 and the other spaces, the zero width
// characters and combining marks (the combining dot first), as D03 asks.
const nameUnit = fc.oneof(
  { weight: 8, arbitrary: fc.constantFrom(...TURKISH_CASE_PAIRS.flat()) },
  { weight: 2, arbitrary: fc.constantFrom(...WHITE_SPACE_CHARACTERS) },
  { weight: 2, arbitrary: fc.constant('\u00a0') },
  { weight: 2, arbitrary: fc.constantFrom(...INVISIBLE_CHARACTERS) },
  { weight: 3, arbitrary: fc.constantFrom(...COMBINING_MARKS) },
  { weight: 2, arbitrary: fc.constantFrom(...OTHER_CHARACTERS) },
  { weight: 1, arbitrary: fc.string({ unit: 'binary', minLength: 1, maxLength: 1 }) },
);
const names = fc.string({ unit: nameUnit, maxLength: 30 });

// Names without combining marks: lower case Turkish letters, spaces and punctuation.
const plainNames = fc.string({
  unit: fc.constantFrom(...TURKISH_CASE_PAIRS.map(([, lower]) => lower), ' ', "'", '-', '9'),
  minLength: 1,
  maxLength: 30,
});

// The same name spelled differently: upper case, NFD, other spaces, padding.
const variantOf = (name: string) =>
  fc
    .record({
      upper: fc.boolean(),
      nfd: fc.boolean(),
      pad: fc.constantFrom('', ' ', '\u00a0', '\u200b', '\ufeff'),
    })
    .map(({ upper, nfd, pad }) => {
      const cased = upper ? upperCaseTurkish(name) : name;
      const formed = nfd ? cased.normalize('NFD') : cased;
      return `${pad}${formed.replaceAll(' ', '\u00a0  ')}${pad}`;
    });

describe('Name key is unchanged when applied twice', () => {
  it('holds for names with Turkish letters, U+00A0, zero width characters and combining marks', () => {
    let rewritten = 0;
    fc.assert(
      fc.property(names, (name) => {
        const key = nameKey(name);
        if (key !== name) rewritten += 1;
        expect(nameKey(key)).toBe(key);
      }),
      RUNS,
    );
    // Ground control: the key really rewrote these inputs, it is not the identity.
    expect(rewritten).toBeGreaterThan(300);
  });

  it('holds for any Unicode text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 30 }), (text) => {
        const key = nameKey(text);
        expect(nameKey(key)).toBe(key);
      }),
      RUNS,
    );
  });

  // Each of these is left half done by the order NFC first, NFC once: the second
  // application would change it again.
  it.each([
    ['a zero width space between e and its accent', 'e\u200b\u0301', 'é'],
    ['a dot above before another accent on i', 'i\u0307\u0301', 'í'],
    ['two dots above after i', 'i\u0307\u0307', 'i'],
    ['an accent after İ', 'İ\u0301', 'í'],
  ])('settles %s in one step', (_case, name, expected) => {
    expect(nameKey(name)).toBe(expected);
    expect(nameKey(expected)).toBe(expected);
  });
});

describe('Name matching is reflexive and symmetric', () => {
  it('matches every name with itself', () => {
    fc.assert(
      fc.property(fc.oneof(names, fc.string({ unit: 'binary', maxLength: 30 })), (name) => {
        expect(namesMatch(name, name)).toBe(true);
      }),
      RUNS,
    );
  });

  it('gives the same answer both ways', () => {
    const answers = new Set<boolean>();
    const pairs = fc.oneof(
      fc.tuple(names, names),
      names.chain((name) => variantOf(name).map((variant) => [name, variant] as const)),
    );
    fc.assert(
      fc.property(pairs, ([a, b]) => {
        const forward = namesMatch(a, b);
        answers.add(forward);
        expect(namesMatch(b, a)).toBe(forward);
      }),
      RUNS,
    );
    // Ground control: matching and non-matching pairs both occurred.
    expect([...answers].sort()).toEqual([false, true]);
  });
});

describe('A Turkish capital matches its own lower case, letters are not simplified', () => {
  it.each(TURKISH_ALPHABET)('%s lowers to %s', (upper, lower) => {
    expect(nameKey(upper)).toBe(lower);
    expect(namesMatch(upper, lower)).toBe(true);
  });

  it('matches any name without combining marks, upper-cased through the explicit table, with its lower case', () => {
    let changed = 0;
    const cased = fc
      .tuple(plainNames, fc.array(fc.boolean(), { maxLength: 30 }))
      .map(
        ([name, picks]) => [name, upperCaseTurkish(name, (index) => picks[index] ?? true)] as const,
      );
    fc.assert(
      fc.property(cased, ([name, upper]) => {
        if (upper !== name) changed += 1;
        expect(namesMatch(upper, name)).toBe(true);
      }),
      RUNS,
    );
    // Ground control: the names really were upper-cased.
    expect(changed).toBeGreaterThan(500);
  });

  it.each(SIMPLIFICATIONS)('%s does not match %s', (turkish, plain) => {
    expect(namesMatch(turkish, plain)).toBe(false);
  });

  it('never matches a name with one Turkish letter simplified', () => {
    fc.assert(
      fc.property(names, names, fc.constantFrom(...SIMPLIFICATIONS), (left, right, pair) => {
        const [turkish, plain] = pair;
        const original = `${left} ${turkish} ${right}`;
        expect(namesMatch(original, `${left} ${plain} ${right}`)).toBe(false);
        // Ground control: the same letter in its other case still matches.
        expect(namesMatch(original, `${left} ${otherCase(turkish)} ${right}`)).toBe(true);
      }),
      RUNS,
    );
  });

  it('lowers every other letter locale-free: only I and İ differ from the Unicode default', () => {
    const differing: string[] = [];
    for (let code = 0; code < 0x10000; code += 1) {
      const letter = String.fromCharCode(code);
      if (!/\p{L}/u.test(letter)) continue;
      if (nameKey(letter) !== letter.normalize('NFC').toLowerCase().normalize('NFC')) {
        differing.push(letter);
      }
    }
    expect(differing).toEqual(['I', 'İ']);
  });
});

// The known gap of D03-B18: NFC composes I or İ with a following mark before the table
// lowers it. Written out by hand, in code point order: after ı every mark that composes
// with I (U+0340, U+0341 and U+0344 decompose to such marks); after i the marks below
// that compose with I ahead of the dot of İ.
const DOTLESS_I_MARKS = [
  '\u0300',
  '\u0301',
  '\u0302',
  '\u0303',
  '\u0304',
  '\u0306',
  '\u0307',
  '\u0308',
  '\u0309',
  '\u030c',
  '\u030f',
  '\u0311',
  '\u0323',
  '\u0328',
  '\u0330',
  '\u0340',
  '\u0341',
  '\u0344',
];
const DOTTED_I_MARKS = ['\u0323', '\u0328', '\u0330'];

describe('Combining marks on ı and i: known exceptions to the upper case match', () => {
  it.each([
    ['ı before a mark that composes with I', 'ı\u0302', 'I\u0302', 'ı\u0302', 'î'],
    ['ı before a dot above, which composes with I to İ', 'ı\u0307', 'I\u0307', 'ı\u0307', 'i'],
    [
      'i before a mark below, which composes with I ahead of the dot',
      'i\u0323',
      'İ\u0323',
      '\u1ecb',
      '\u1ecb\u0307',
    ],
  ])('%s', (_case, lower, upper, lowerKey, upperKey) => {
    expect(upperCaseTurkish(lower)).toBe(upper);
    expect(nameKey(lower)).toBe(lowerKey);
    expect(nameKey(upper)).toBe(upperKey);
    expect(namesMatch(upper, lower)).toBe(false);
  });

  it('are the only single marks after a Turkish letter whose upper case does not match', () => {
    const marks: string[] = [];
    for (let code = 0; code <= 0x10ffff; code += 1) {
      if (code >= 0xd800 && code <= 0xdfff) continue;
      const character = String.fromCodePoint(code);
      if (/\p{M}/u.test(character)) marks.push(character);
    }
    const missed: string[] = [];
    for (const [upper, lower] of TURKISH_CASE_PAIRS) {
      for (const mark of marks) {
        if (!namesMatch(`${upper}${mark}`, `${lower}${mark}`)) missed.push(`${lower}${mark}`);
      }
    }
    const expected = [
      ...DOTLESS_I_MARKS.map((mark) => `ı${mark}`),
      ...DOTTED_I_MARKS.map((mark) => `i${mark}`),
    ];
    expect(missed.sort()).toEqual(expected.sort());
    // Ground control: every combining mark of the engine's Unicode was tried.
    expect(marks.length).toBeGreaterThan(2000);
  });
});

describe('Spellings of the matching scenario', () => {
  it.each([
    ['IŞIK', 'ışık', true],
    ['Sahin', 'Şahin', false],
    ['Ali\u00a0Veli', 'Ali Veli', true],
    ['Ali  Veli', 'Ali Veli', true],
    ['  Ali Veli\t', 'ali veli', true],
    ['Ali\u200bVeli', 'AliVeli', true],
    ['i\u0307lker', 'İlker', true],
    // Two İ lowered by a locale-free tool (JavaScript, Python): a dot above after each i.
    ['i\u0307smai\u0307l', 'İSMAİL', true],
    ['IŞIK'.normalize('NFD'), 'IŞIK', true],
    ['İLKER'.normalize('NFD'), 'ilker', true],
    ['Ilker', 'ilker', false],
    ['Ali-Veli', 'Ali Veli', false],
    ["O'Neil", 'ONeil', false],
  ])('%s and %s match: %s', (a, b, expected) => {
    expect(namesMatch(a, b)).toBe(expected);
  });
});

describe('Spaces and invisible characters', () => {
  it('turns exactly the Unicode White_Space characters into a space', () => {
    const spaces: string[] = [];
    const unicode: string[] = [];
    for (let code = 0; code < 0x10000; code += 1) {
      const character = String.fromCharCode(code);
      if (nameKey(`a${character}b`) === 'a b') spaces.push(character);
      if (/\p{White_Space}/u.test(character)) unicode.push(character);
    }
    expect(spaces).toContain('\u00a0');
    expect(spaces).toEqual(unicode);
  });

  it('drops U+200B, U+200C, U+200D and U+FEFF and keeps other format characters', () => {
    for (const character of ['\u200b', '\u200c', '\u200d', '\ufeff']) {
      expect(nameKey(`a${character}b`)).toBe('ab');
    }
    // Positive control: only the four of the rule go.
    for (const character of ['\u2060', '\u00ad', '\u200e']) {
      expect(nameKey(`a${character}b`)).toBe(`a${character}b`);
    }
  });

  it('collapses space runs and trims both ends', () => {
    expect(nameKey('  Ali \u00a0 \t Veli \u3000')).toBe('ali veli');
    expect(nameKey(' \u00a0 ')).toBe('');
  });
});
