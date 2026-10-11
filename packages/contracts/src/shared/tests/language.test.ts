import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ACCEPT_LANGUAGE_MAX_LENGTH,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  selectLanguage,
} from '../language.ts';

const [TURKISH, ENGLISH] = LANGUAGES;

// Well-formed list elements, written compact or with optional whitespace (space and
// tab) around the comma and the semicolon.
const TAGS = ['tr', 'en', 'EN', 'en-GB', 'tr-TR', 'de', 'fr', '*'];
const WEIGHTS = ['', 'q=0', 'q=0.5', 'q=1', 'q=0.123', 'q=1.000', 'Q=0.7'];
const ows = fc.string({ unit: fc.constantFrom(' ', '\t'), maxLength: 3 });
const element = fc.record({
  tag: fc.constantFrom(...TAGS),
  weight: fc.constantFrom(...WEIGHTS),
  pads: fc.tuple(ows, ows, ows, ows),
});
type Element = { tag: string; weight: string; pads: [string, string, string, string] };
const compact = (elements: readonly Element[]) =>
  elements.map(({ tag, weight }) => (weight === '' ? tag : `${tag};${weight}`)).join(',');
const padded = (elements: readonly Element[]) =>
  elements
    .map(({ tag, weight, pads: [before, beforeSemicolon, afterSemicolon, after] }) =>
      weight === ''
        ? `${before}${tag}${after}`
        : `${before}${tag}${beforeSemicolon};${afterSemicolon}${weight}${after}`,
    )
    .join(',');

// A list element whose weight the test knows as a whole number of thousandths (null:
// no weight, which counts as 1), written with at least `decimals` decimals.
type Weighted = { tag: string; thousandths: number | null; decimals: number; dot: boolean };
const weighted = fc.record({
  tag: fc.constantFrom('tr', 'en', 'de', '*'),
  thousandths: fc.option(fc.integer({ min: 0, max: 1000 })),
  decimals: fc.integer({ min: 0, max: 3 }),
  dot: fc.boolean(),
});

// Any valid RFC 9110 qvalue for the weight: "0.5", "0.50", "0.500"; "1", "1.", "1.000".
const writeWeighted = ({ tag, thousandths, decimals, dot }: Weighted) => {
  if (thousandths === null) return tag;
  const whole = thousandths === 1000 ? '1' : '0';
  const digits = thousandths === 1000 ? '000' : String(thousandths).padStart(3, '0');
  const fraction = digits.slice(0, Math.max(decimals, digits.replace(/0+$/, '').length));
  return `${tag};q=${whole}${fraction === '' ? (dot ? '.' : '') : `.${fraction}`}`;
};

// The language the rule gives, from the known weights alone: the first element with
// the highest weight above 0 among the languages and "*"; "*" or nothing gives the
// default.
const expectedLanguage = (elements: readonly Weighted[]) => {
  let best: { tag: string; weight: number } | null = null;
  for (const { tag, thousandths } of elements) {
    const weight = thousandths ?? 1000;
    const candidate = tag === '*' || (LANGUAGES as readonly string[]).includes(tag);
    if (candidate && weight > 0 && (best === null || weight > best.weight)) best = { tag, weight };
  }
  return best === null || best.tag === '*' ? DEFAULT_LANGUAGE : best.tag;
};

// Whitespace that is not optional whitespace in HTTP.
// Built from code points: written out, most of these would be invisible in the source.
const NBSP = String.fromCodePoint(0xa0);
const IDEOGRAPHIC_SPACE = String.fromCodePoint(0x3000);
const NOT_OWS = [
  NBSP,
  IDEOGRAPHIC_SPACE,
  String.fromCodePoint(0x2028),
  '\n',
  '\r',
  '\v',
  '\f',
  String.fromCodePoint(0xfeff),
];

describe('Language selection follows the Accept-Language rule', () => {
  it('never throws and always returns one of the languages', () => {
    const inputs = fc.oneof(
      fc.string(),
      fc.string({ unit: 'binary' }),
      fc.constantFrom('', null, undefined),
      fc.string({ minLength: ACCEPT_LANGUAGE_MAX_LENGTH + 1, maxLength: 600 }),
      fc.array(element, { maxLength: 6 }).map(padded),
    );
    fc.assert(
      fc.property(inputs, (value) => {
        expect(LANGUAGES).toContain(selectLanguage(value));
      }),
    );
  });

  it.each([
    ['en', ENGLISH],
    ['en-GB', ENGLISH],
    ['EN-us', ENGLISH],
    ['fr;q=0.9, en;q=0.8', ENGLISH],
    ['tr', TURKISH],
    ['tr-TR', TURKISH],
    ['*', DEFAULT_LANGUAGE],
    ['de', DEFAULT_LANGUAGE],
    ['en;q=0', DEFAULT_LANGUAGE],
    ['tr;q=0.5, en;q=0.6', ENGLISH],
    ['en, tr', ENGLISH],
    ['tr, en', TURKISH],
    ['en-US,en;q=0.9', ENGLISH],
    ['tr;q=0.1, en;q=0.9', ENGLISH],
    ['*, en;q=0.5', DEFAULT_LANGUAGE],
    ['de, , en', ENGLISH],
    ['en ; q=0.7 , tr;q=0.6', ENGLISH],
    ['\ten\t;\tq=0.7,\ttr;q=0.6\t', ENGLISH],
    ['en;Q=0.7, tr;q=0.6', ENGLISH],
    // Weights compare by value, not by how many digits they are written with.
    ['tr;q=0.5, en;q=1', ENGLISH],
    ['tr;q=0.5, en;q=0.25', TURKISH],
    ['tr;q=0.999, en;q=1.0', ENGLISH],
    ['en;q=0.05, tr;q=0.1', TURKISH],
  ])('%j gives %s', (header, expected) => {
    expect(selectLanguage(header)).toBe(expected);
  });

  it.each([
    ['a missing header', undefined],
    ['null', null],
    ['an empty header', ''],
    // Well formed, so only the length decides: 2 + 3 * 85 = 257 characters.
    ['a header longer than the limit', `en${',de'.repeat(85)}`],
    ['a malformed weight', 'en;q=1.5'],
    ['a malformed tag', 'en_US'],
    ['a malformed range after a valid one', 'en, en_US'],
    ['a malformed range before a valid one', 'en_US, en'],
    ['an unknown parameter', 'en;level=1'],
    ['a second weight', 'en;q=0.5;q=0.9'],
    ['space before =', 'en;q =0.5'],
    ['space after =', 'en;q= 0.5'],
    ['a weight without a range', ';q=0.5, en'],
    ['a no-break space before the range', `${NBSP}en`],
    ['an ideographic space after the range', `en${IDEOGRAPHIC_SPACE}`],
    ['a no-break space before the semicolon', `en${NBSP};q=0.5`],
    ['a line feed after the comma', 'tr;q=0.1,\nen'],
  ])('falls back to the default for %s', (_name, header) => {
    expect(selectLanguage(header)).toBe(DEFAULT_LANGUAGE);
  });

  it('keeps English when the long header is exactly at the limit', () => {
    const header = `en${',de'.repeat(84)},d`;
    expect(header).toHaveLength(ACCEPT_LANGUAGE_MAX_LENGTH);
    expect(selectLanguage(header)).toBe(ENGLISH);
  });

  it('picks the highest weight, whatever digits express it (independent oracle)', () => {
    fc.assert(
      fc.property(fc.array(weighted, { minLength: 1, maxLength: 5 }), (elements) => {
        const header = elements.map(writeWeighted).join(', ');
        expect(selectLanguage(header)).toBe(expectedLanguage(elements));
      }),
      {
        // The two cases a scale or padding slip gets wrong, checked on every run.
        examples: [
          [
            [
              { tag: 'tr', thousandths: 500, decimals: 1, dot: true },
              { tag: 'en', thousandths: 1000, decimals: 0, dot: false },
            ],
          ],
          [
            [
              { tag: 'tr', thousandths: 500, decimals: 1, dot: true },
              { tag: 'en', thousandths: 250, decimals: 2, dot: true },
            ],
          ],
        ],
      },
    );
  });

  it('has an oracle that gives the hand-computed answers (ground control)', () => {
    const element = (tag: string, thousandths: number | null): Weighted => ({
      tag,
      thousandths,
      decimals: 0,
      dot: false,
    });
    expect(expectedLanguage([element('tr', 500), element('en', 1000)])).toBe(ENGLISH);
    expect(expectedLanguage([element('tr', 500), element('en', 250)])).toBe(TURKISH);
    expect(expectedLanguage([element('de', null), element('en', 1)])).toBe(ENGLISH);
    expect(expectedLanguage([element('en', 0)])).toBe(DEFAULT_LANGUAGE);
    expect(expectedLanguage([element('*', 900), element('en', 800)])).toBe(DEFAULT_LANGUAGE);
    expect(writeWeighted({ tag: 'en', thousandths: 250, decimals: 3, dot: true })).toBe(
      'en;q=0.250',
    );
    expect(writeWeighted({ tag: 'en', thousandths: 1000, decimals: 0, dot: true })).toBe('en;q=1.');
    expect(writeWeighted({ tag: 'en', thousandths: null, decimals: 2, dot: true })).toBe('en');
  });

  it('ignores space and tab around commas and semicolons', () => {
    fc.assert(
      fc.property(fc.array(element, { minLength: 1, maxLength: 6 }), (elements) => {
        expect(selectLanguage(padded(elements))).toBe(selectLanguage(compact(elements)));
      }),
    );
  });

  it('gives the default when any other whitespace appears anywhere', () => {
    fc.assert(
      fc.property(
        fc.array(element, { maxLength: 4 }),
        fc.constantFrom(...NOT_OWS),
        fc.nat(),
        (rest, whitespace, at) => {
          // An English range first with q=1, so the header picks English as written.
          const header = padded([{ tag: 'en', weight: '', pads: ['', '', '', ''] }, ...rest]);
          expect(selectLanguage(header)).toBe(ENGLISH);
          const position = at % (header.length + 1);
          const broken = `${header.slice(0, position)}${whitespace}${header.slice(position)}`;
          expect(selectLanguage(broken)).toBe(DEFAULT_LANGUAGE);
        },
      ),
    );
  });
});
