import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CROCKFORD_ALPHABET,
  decodeRegistrationCode,
  encodeRegistrationCode,
  formatRegistrationCode,
  parseRegistrationCode,
  REGISTRATION_CODE_BYTES,
  REGISTRATION_CODE_GROUP_LENGTH,
  REGISTRATION_CODE_LENGTH,
} from './registration-code.ts';

const bytesArb = fc.uint8Array({
  minLength: REGISTRATION_CODE_BYTES,
  maxLength: REGISTRATION_CODE_BYTES,
});
const codeArb = fc.string({
  unit: fc.constantFrom(...CROCKFORD_ALPHABET),
  minLength: REGISTRATION_CODE_LENGTH,
  maxLength: REGISTRATION_CODE_LENGTH,
});

const fromHex = (hex: string) =>
  Uint8Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

// Independent oracle: Python's base64.b32encode (RFC 4648) with its alphabet swapped
// for Crockford's, which keeps the same big-endian 5-bit groups. 'fooba' is the RFC
// 4648 section 10 vector MZXW6YTB; the four middle rows hold every symbol in order.
const KNOWN_CODES: ReadonlyArray<readonly [string, string]> = [
  ['666f6f6261', 'CSQPYRK1'],
  ['68656c6c6f', 'D1JPRV3F'],
  ['0000000000', '00000000'],
  ['ffffffffff', 'ZZZZZZZZ'],
  ['00443214c7', '01234567'],
  ['4254b635cf', '89ABCDEF'],
  ['84653a56d7', 'GHJKMNPQ'],
  ['c675be77df', 'RSTVWXYZ'],
  ['0123456789', '04HMASW9'],
];

// Non-ASCII characters are written as braced escapes: Biome's formatter turns the
// four-digit form into the bare character, which hides look-alikes.
const CAPITAL_I_WITH_DOT = '\u{130}'; // İ
const SMALL_DOTLESS_I = '\u{131}'; // ı

// The spec's alphabet rebuilt from its wording, so the oracles below do not lean on
// the exported constant: digits, then the capital letters without I, L, O and U.
const SPEC_SYMBOLS = [...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ']
  .filter((char) => !'ILOU'.includes(char))
  .join('');

// What a code copied from the lecturer's screen may carry at either end.
const PASTED_WHITE_SPACE = ' \t\r\n';
const paddingArb = fc.string({ unit: fc.constantFrom(...PASTED_WHITE_SPACE), maxLength: 3 });

// Every way a person may type one symbol: the Crockford aliases, small letters and
// the Turkish keyboard's İ and ı for 1.
function spellings(symbol: string): string[] {
  if (symbol === '0') return ['0', 'O', 'o'];
  if (symbol === '1') return ['1', 'I', 'i', 'L', 'l', CAPITAL_I_WITH_DOT, SMALL_DOTLESS_I];
  if (symbol >= 'A' && symbol <= 'Z') return [symbol, symbol.toLowerCase()];
  return [symbol];
}
const hyphensArb = fc.string({ unit: fc.constant('-'), maxLength: 2 });
const typedArb = (code: string) =>
  fc
    .tuple(
      fc.tuple(
        ...[...code].map((symbol) => fc.tuple(hyphensArb, fc.constantFrom(...spellings(symbol)))),
      ),
      hyphensArb,
    )
    .map(([pairs, tail]) => pairs.map(([hyphens, typed]) => hyphens + typed).join('') + tail);

describe('Registration code format', () => {
  it('uses the Crockford alphabet: digits, then capital letters without I, L, O and U', () => {
    expect(CROCKFORD_ALPHABET).toBe(SPEC_SYMBOLS);
  });

  it.each(KNOWN_CODES)('encodes the bytes %s as %s and decodes them back', (hex, code) => {
    expect(encodeRegistrationCode(fromHex(hex))).toBe(code);
    expect(decodeRegistrationCode(code)).toEqual(fromHex(hex));
  });

  it('produces 8 symbols carrying all 40 bits of the random bytes', () => {
    fc.assert(
      fc.property(bytesArb, (bytes) => {
        const code = encodeRegistrationCode(bytes);
        expect(code).toHaveLength(REGISTRATION_CODE_LENGTH);
        for (const symbol of code) expect(CROCKFORD_ALPHABET).toContain(symbol);
        // Nothing is lost: the 40 bits come back from the 8 symbols.
        expect(decodeRegistrationCode(code)).toEqual(bytes);
      }),
      { numRuns: 2000 },
    );
    // And nothing is wasted: every 8-symbol code is the image of some 40 bits.
    fc.assert(
      fc.property(codeArb, (code) => {
        expect(encodeRegistrationCode(decodeRegistrationCode(code))).toBe(code);
      }),
      { numRuns: 2000 },
    );
  });

  it('takes exactly 5 bytes, so a short random draw cannot make a weaker code', () => {
    // Ground control: the right length encodes.
    expect(encodeRegistrationCode(new Uint8Array(REGISTRATION_CODE_BYTES))).toHaveLength(
      REGISTRATION_CODE_LENGTH,
    );
    for (const length of [0, REGISTRATION_CODE_BYTES - 1, REGISTRATION_CODE_BYTES + 1]) {
      expect(() => encodeRegistrationCode(new Uint8Array(length))).toThrow(RangeError);
    }
  });

  it('parses every spelling with case, O for 0, I and L for 1, hyphens and white space at either end to the same code', () => {
    fc.assert(
      fc.property(
        codeArb.chain((code) =>
          fc.tuple(fc.constant(code), paddingArb, typedArb(code), paddingArb),
        ),
        ([code, before, typed, after]) => {
          // Ground control: the canonical code parses to itself.
          expect(parseRegistrationCode(code)).toEqual({ ok: true, code });
          expect(parseRegistrationCode(before + typed + after)).toEqual({ ok: true, code });
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('reads the 32 symbols, their small letters, O and o as 0, and I, i, L, l, İ, ı as 1, and no other code unit', () => {
    // Oracle written from the spec and the decisions, not from the source. The unit
    // sits in the middle, so the end trim plays no part; a dropped hyphen leaves 7
    // symbols, which rejects.
    const capitals = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const smalls = 'abcdefghijklmnopqrstuvwxyz';
    const readAsOne = `IiLl${CAPITAL_I_WITH_DOT}${SMALL_DOTLESS_I}`;
    const wrong: string[] = [];
    let accepted = 0;
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      const char = String.fromCharCode(unit);
      const capital = capitals.charAt(smalls.indexOf(char));
      let symbol: string | null = null;
      if (SPEC_SYMBOLS.includes(char)) symbol = char;
      else if (smalls.includes(char) && SPEC_SYMBOLS.includes(capital)) symbol = capital;
      else if (char === 'O' || char === 'o') symbol = '0';
      else if (readAsOne.includes(char)) symbol = '1';
      const result = parseRegistrationCode(`0000${char}000`);
      const want = symbol === null ? { ok: false } : { ok: true, code: `0000${symbol}000` };
      if (result.ok) accepted += 1;
      if (JSON.stringify(result) !== JSON.stringify(want)) wrong.push(unit.toString(16));
    }
    expect(wrong).toEqual([]);
    // Positive control: 32 symbols, the small forms of the 22 letters among them and
    // the 8 aliases.
    expect(accepted).toBe(62);
  });

  // A code copied from the lecturer's screen can bring the white space around it along.
  it.each([
    [' ABCD-EFGH'],
    ['ABCD-EFGH '],
    ['\tABCD-EFGH\n'],
    ['ABCD-EFGH\r\n'],
    [' \t\r\nABCD-EFGH\r\n\t '],
    [' -ABCD-EFGH- '],
  ])('trims the white space around %j', (typed) => {
    // Ground control: the code without the white space parses to the same code.
    expect(parseRegistrationCode('ABCD-EFGH')).toEqual({ ok: true, code: 'ABCDEFGH' });
    expect(parseRegistrationCode(typed)).toEqual({ ok: true, code: 'ABCDEFGH' });
  });

  it('ignores only space, tab, CR, LF and hyphens at either end and only hyphens inside, over every code unit', () => {
    const ignoredAtEnds = `${PASTED_WHITE_SPACE}-`;
    const wrong: string[] = [];
    let accepted = 0;
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      const char = String.fromCharCode(unit);
      // A unit that is read as a symbol makes 9 symbols here, so it rejects too.
      const cases: ReadonlyArray<readonly [string, string, boolean]> = [
        ['leading', `${char}ABCD-EFGH`, ignoredAtEnds.includes(char)],
        ['trailing', `ABCD-EFGH${char}`, ignoredAtEnds.includes(char)],
        ['inside', `ABCD${char}EFGH`, char === '-'],
      ];
      for (const [place, typed, ignored] of cases) {
        const result = parseRegistrationCode(typed);
        const want = ignored ? { ok: true, code: 'ABCDEFGH' } : { ok: false };
        if (result.ok) accepted += 1;
        if (JSON.stringify(result) !== JSON.stringify(want)) {
          wrong.push(`${place} ${unit.toString(16)}`);
        }
      }
    }
    expect(wrong).toEqual([]);
    // Positive control: the 4 white space units and the hyphen at each end, and the
    // hyphen inside.
    expect(accepted).toBe(11);
  });

  it.each([
    ['abcd-efgh', 'ABCDEFGH'],
    ['O0o0-IiLl', '00001111'],
    ['-ab-cd--ef-gh-', 'ABCDEFGH'],
    ['ZZZZZZZZ', 'ZZZZZZZZ'],
    // Turkish keyboard: Shift+i gives İ and the dotless key gives ı.
    [
      `${CAPITAL_I_WITH_DOT}${SMALL_DOTLESS_I}11-${SMALL_DOTLESS_I}${CAPITAL_I_WITH_DOT}lI`,
      '11111111',
    ],
  ])('parses %j as %s', (typed, code) => {
    expect(parseRegistrationCode(typed)).toEqual({ ok: true, code });
  });

  // Each row: the rejected text, then the smallest fix of it that parses.
  it.each([
    ['U, which Crockford leaves out', 'ABCD-EFGU', 'ABCD-EFGV'],
    ['a small u', 'abcd-efgu', 'abcd-efgv'],
    ['seven symbols', 'ABCD-EFG', 'ABCD-EFGH'],
    ['nine symbols', 'ABCD-EFGHJ', 'ABCD-EFGH'],
    ['an empty string', '', 'ABCDEFGH'],
    ['only hyphens', '--------', '-ABCDEFGH-'],
    ['only white space', ' \t\r\n', ' ABCDEFGH\r\n'],
    ['a space as the separator', 'ABCD EFGH', 'ABCD-EFGH'],
    ['a tab inside', 'ABCD\tEFGH', 'ABCD-EFGH'],
    ['a line break inside', 'ABCD\r\nEFGH', 'ABCD-EFGH'],
    ['spaces around the hyphen', 'ABCD - EFGH', 'ABCD-EFGH'],
    // The trim looks at the ends of the typed text, not of the symbols.
    ['a space after a leading hyphen', '- ABCD-EFGH', '-ABCD-EFGH'],
    // Only ASCII white space is trimmed: the fix keeps the place and swaps the kind of
    // space. The sweep above checks every other unit.
    ['a no-break space at an end', '\u{a0}ABCD-EFGH', ' ABCD-EFGH'],
    ['a dot as the separator', 'ABCD.EFGH', 'ABCD-EFGH'],
    ['an underscore as the separator', 'ABCD_EFGH', 'ABCD-EFGH'],
    ['a Unicode hyphen (U+2010)', 'ABCD\u{2010}EFGH', 'ABCD-EFGH'],
    ['a minus sign (U+2212)', 'ABCD\u{2212}EFGH', 'ABCD-EFGH'],
    [
      'full-width digits',
      '\u{ff10}\u{ff11}\u{ff12}\u{ff13}\u{ff14}\u{ff15}\u{ff16}\u{ff17}',
      '01234567',
    ],
    ['Arabic-Indic digits', '\u{660}\u{661}\u{662}\u{663}\u{664}\u{665}\u{666}\u{667}', '01234567'],
    ['a Turkish letter outside the aliases (Ç)', 'ABCD-EFG\u{c7}', 'ABCD-EFGC'],
    ['a character outside the BMP', 'ABCD-EFG\u{1f600}', 'ABCD-EFGH'],
  ])('rejects %s', (_name, typed, fixed) => {
    // Ground control: the fixed text parses, so the defect is what is rejected.
    expect(parseRegistrationCode(fixed).ok).toBe(true);
    expect(parseRegistrationCode(typed)).toEqual({ ok: false });
  });

  it('gives only canonical codes, and parsing a parsed code changes nothing', () => {
    const typedOrNotArb = fc.oneof(
      fc.string({ unit: 'binary', maxLength: 12 }),
      fc.string({
        unit: fc.constantFrom(
          'A',
          'z',
          '0',
          'O',
          'i',
          'L',
          'U',
          'u',
          '-',
          ' ',
          CAPITAL_I_WITH_DOT,
          SMALL_DOTLESS_I,
        ),
        maxLength: 12,
      }),
      codeArb.chain(typedArb),
    );
    let accepted = 0;
    let rejected = 0;
    fc.assert(
      fc.property(typedOrNotArb, (typed) => {
        const result = parseRegistrationCode(typed);
        if (!result.ok) {
          rejected += 1;
          return;
        }
        accepted += 1;
        expect(result.code).toHaveLength(REGISTRATION_CODE_LENGTH);
        for (const symbol of result.code) expect(CROCKFORD_ALPHABET).toContain(symbol);
        expect(parseRegistrationCode(result.code)).toEqual(result);
      }),
      { numRuns: 2000 },
    );
    // Positive control: both branches were exercised.
    expect(accepted).toBeGreaterThan(0);
    expect(rejected).toBeGreaterThan(0);
  });

  it('shows the code as two groups of 4 joined by a hyphen, which parses back', () => {
    expect(formatRegistrationCode('ABCDEFGH')).toBe('ABCD-EFGH');
    fc.assert(
      fc.property(codeArb, (code) => {
        const shown = formatRegistrationCode(code);
        const groups = shown.split('-');
        expect(groups).toHaveLength(2);
        for (const group of groups) expect(group).toHaveLength(REGISTRATION_CODE_GROUP_LENGTH);
        expect(groups.join('')).toBe(code);
        expect(parseRegistrationCode(shown)).toEqual({ ok: true, code });
      }),
    );
  });

  // Each row: the refused code, then its canonical form.
  it.each([
    ['small letters', 'abcdefgh', 'ABCDEFGH'],
    ['the display form', 'ABCD-EFGH', 'ABCDEFGH'],
    ['an alias symbol', 'ABCDEFGO', 'ABCDEFG0'],
    ['a symbol outside the alphabet', 'ABCDEFGU', 'ABCDEFGV'],
    ['seven symbols', 'ABCDEFG', 'ABCDEFGH'],
    ['nine symbols', 'ABCDEFGHJ', 'ABCDEFGH'],
  ])('refuses to format or decode a code with %s', (_name, code, canonical) => {
    // Ground control: the canonical form formats and decodes.
    expect(() => formatRegistrationCode(canonical)).not.toThrow();
    expect(() => decodeRegistrationCode(canonical)).not.toThrow();
    expect(() => formatRegistrationCode(code)).toThrow(RangeError);
    expect(() => decodeRegistrationCode(code)).toThrow(RangeError);
  });
});
