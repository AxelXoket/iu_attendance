import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EMAIL_DOMAIN, EMAIL_LOCAL_PART_MAX_LENGTH, normalizeEmail } from './email.ts';

// Non-ASCII characters are written as braced escapes: Biome's formatter turns the
// four-digit form into the bare character, which hides white space and look-alikes.
const CAPITAL_I_WITH_DOT = '\u{130}'; // İ
const SMALL_DOTLESS_I = '\u{131}'; // ı
const COMBINING_DOT_ABOVE = '\u{307}';
const KELVIN_SIGN = '\u{212a}';

// The spec's local-part characters, besides the dot.
const LOCAL_UNITS = [...'abcdefghijklmnopqrstuvwxyz0123456789_-'];

// Oracle for the code unit sweeps, written from the spec text, not from the source:
// what one code unit of a local part reads as, or null when it rejects the address.
// The local-part characters and the dot stay, A to Z become a to z through a written
// table, İ and ı become i.
const CAPITAL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SMALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
function specReading(char: string): string | null {
  if (LOCAL_UNITS.includes(char) || char === '.') return char;
  const capital = CAPITAL_LETTERS.indexOf(char);
  if (capital >= 0) return SMALL_LETTERS.charAt(capital);
  if (char === CAPITAL_I_WITH_DOT || char === SMALL_DOTLESS_I) return 'i';
  return null;
}

const atomArb = fc.string({ unit: fc.constantFrom(...LOCAL_UNITS), minLength: 1, maxLength: 12 });
const localPartArb = fc
  .array(atomArb, { minLength: 1, maxLength: 6 })
  .map((atoms) => atoms.join('.'))
  .filter((local) => local.length <= EMAIL_LOCAL_PART_MAX_LENGTH);
const addressArb = localPartArb.map((local) => `${local}@${EMAIL_DOMAIN}`);

// Every way a person may type one character of a normalized address.
function spellings(char: string): string[] {
  if (char === 'i') return ['i', 'I', CAPITAL_I_WITH_DOT, SMALL_DOTLESS_I];
  if (char >= 'a' && char <= 'z') return [char, String.fromCharCode(char.charCodeAt(0) - 0x20)];
  return [char];
}
const spelledArb = (address: string) =>
  fc
    .tuple(...[...address].map((char) => fc.constantFrom(...spellings(char))))
    .map((chars) => chars.join(''));

// A sample of ECMAScript white space; the BMP sweep below checks the whole set.
const WHITE_SPACE = [
  ' ',
  '\t',
  '\n',
  '\r',
  '\v',
  '\f',
  '\u{a0}',
  '\u{1680}',
  '\u{2000}',
  '\u{200a}',
  '\u{2028}',
  '\u{2029}',
  '\u{202f}',
  '\u{205f}',
  '\u{3000}',
  '\u{feff}',
];
const paddingArb = fc.string({ unit: fc.constantFrom(...WHITE_SPACE), maxLength: 3 });

// Raw input of every kind: arbitrary code points, near misses built from the
// characters the rule cares about, and real addresses typed in any spelling.
const rawInputArb = fc.oneof(
  fc.string({ unit: 'binary', maxLength: 40 }),
  fc.string({
    unit: fc.constantFrom(
      'a',
      'Z',
      'i',
      'I',
      CAPITAL_I_WITH_DOT,
      SMALL_DOTLESS_I,
      '.',
      '@',
      '+',
      '_',
      '-',
      ' ',
      '\u{e7}',
      '7',
    ),
    maxLength: 24,
  }),
  fc
    .tuple(
      fc.string({
        unit: fc.constantFrom('a', 'B', '.', '+', CAPITAL_I_WITH_DOT, SMALL_DOTLESS_I, ' '),
        maxLength: 8,
      }),
      fc.constantFrom(`@${EMAIL_DOMAIN}`, '@ISTANBUL.EDU.TR', '@gmail.com', '@'),
    )
    .map(([local, rest]) => local + rest),
  fc
    .tuple(paddingArb, addressArb.chain(spelledArb), paddingArb)
    .map(([before, spelled, after]) => before + spelled + after),
);

describe('E-mail normalization', () => {
  it('normalizing twice changes nothing', () => {
    let accepted = 0;
    let rejected = 0;
    fc.assert(
      fc.property(rawInputArb, (raw) => {
        const first = normalizeEmail(raw);
        if (!first.ok) {
          rejected += 1;
          return;
        }
        accepted += 1;
        expect(normalizeEmail(first.address)).toEqual(first);
      }),
      { numRuns: 2000 },
    );
    // Positive control: both branches were exercised.
    expect(accepted).toBeGreaterThan(0);
    expect(rejected).toBeGreaterThan(0);
  });

  it('lands every case, İ, I and ı spelling of an address, white space around it, on the same address', () => {
    fc.assert(
      fc.property(
        addressArb.chain((address) =>
          fc.tuple(fc.constant(address), paddingArb, spelledArb(address), paddingArb),
        ),
        ([address, before, spelled, after]) => {
          // Ground control: the normalized form is accepted as it is.
          expect(normalizeEmail(address)).toEqual({ ok: true, address });
          expect(normalizeEmail(before + spelled + after)).toEqual({ ok: true, address });
        },
      ),
      { numRuns: 1000 },
    );
  });

  it.each([
    [`${CAPITAL_I_WITH_DOT}LKER.YILMAZ@${CAPITAL_I_WITH_DOT}STANBUL.EDU.TR`],
    [`${SMALL_DOTLESS_I}lker.y${SMALL_DOTLESS_I}lmaz@${SMALL_DOTLESS_I}stanbul.edu.tr`],
    ['Ilker.Yilmaz@Istanbul.Edu.Tr'],
    [' \tilker.yilmaz@istanbul.edu.tr\r\n'],
  ])('reads %j as ilker.yilmaz@istanbul.edu.tr', (raw) => {
    expect(normalizeEmail(raw)).toEqual({ ok: true, address: 'ilker.yilmaz@istanbul.edu.tr' });
  });

  it('maps İ to a plain i, without the combining dot toLowerCase adds', () => {
    // Ground control: the engine's own lower-casing does add U+0307.
    expect(CAPITAL_I_WITH_DOT.toLowerCase()).toBe(`i${COMBINING_DOT_ABOVE}`);
    const result = normalizeEmail(`${CAPITAL_I_WITH_DOT}PEK@${EMAIL_DOMAIN}`);
    expect(result).toEqual({ ok: true, address: `ipek@${EMAIL_DOMAIN}` });
    expect(result.ok && result.address.includes(COMBINING_DOT_ABOVE)).toBe(false);
  });

  it('rejects a domain other than istanbul.edu.tr and any subdomain of it', () => {
    const otherDomainArb = fc
      .oneof(
        fc.domain(),
        fc.stringMatching(/^[a-z0-9]{1,10}$/).map((label) => `${label}.${EMAIL_DOMAIN}`),
        fc.constantFrom(
          `${EMAIL_DOMAIN}.`,
          `${EMAIL_DOMAIN}.com`,
          `ogr.${EMAIL_DOMAIN}`,
          'istanbul.edu',
          'edu.tr',
          'iu.edu.tr',
          'ogr.iu.edu.tr',
          'istanbu1.edu.tr',
          'istanbul-edu.tr',
          '',
        ),
      )
      .filter((domain) => domain.toLowerCase() !== EMAIL_DOMAIN);
    fc.assert(
      fc.property(localPartArb, otherDomainArb, (local, domain) => {
        // Ground control: the same local part passes with the fixed domain.
        expect(normalizeEmail(`${local}@${EMAIL_DOMAIN}`).ok).toBe(true);
        expect(normalizeEmail(`${local}@${domain}`)).toEqual({ ok: false });
      }),
      { numRuns: 1000 },
    );
  });

  it('rejects plus addressing', () => {
    fc.assert(
      fc.property(atomArb, atomArb, (first, second) => {
        // Ground control: the same address with a hyphen instead of the plus passes.
        expect(normalizeEmail(`${first}-${second}@${EMAIL_DOMAIN}`).ok).toBe(true);
        expect(normalizeEmail(`${first}+${second}@${EMAIL_DOMAIN}`)).toEqual({ ok: false });
      }),
    );
  });

  it('outputs only a-z, 0-9, dot, underscore and hyphen, one @ and the fixed domain', () => {
    let accepted = 0;
    fc.assert(
      fc.property(rawInputArb, (raw) => {
        const result = normalizeEmail(raw);
        if (!result.ok) return;
        accepted += 1;
        const [local = '', domain, ...rest] = result.address.split('@');
        expect(rest).toEqual([]);
        expect(domain).toBe(EMAIL_DOMAIN);
        expect(local).toMatch(/^[a-z0-9._-]+$/);
        expect(local.length).toBeLessThanOrEqual(EMAIL_LOCAL_PART_MAX_LENGTH);
      }),
      { numRuns: 2000 },
    );
    // Positive control: the shape was checked on accepted addresses, not on none.
    expect(accepted).toBeGreaterThan(0);
  });

  it.each([
    ['a single character', 'a'],
    ['dots between runs', 'ali.veli.can'],
    ['underscore and hyphen', 'a_b-c'],
    ['a run of only punctuation', '_-_'],
    ['digits', '2026'],
    ['the longest local part', 'x'.repeat(EMAIL_LOCAL_PART_MAX_LENGTH)],
  ])('accepts %s', (_name, local) => {
    expect(normalizeEmail(`${local}@${EMAIL_DOMAIN}`)).toEqual({
      ok: true,
      address: `${local}@${EMAIL_DOMAIN}`,
    });
  });

  it('accepts a local part of 64 characters and rejects 65, as the spec and RFC 5321 say', () => {
    // A known answer written out, not built from the exported limit, so the limit
    // cannot drift and take the test along: 26 letters, 10 digits, 26 letters, 2 digits.
    const sixtyFour = 'abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz01';
    // Ground control on the test data itself.
    expect(sixtyFour).toHaveLength(64);
    expect(normalizeEmail(`${sixtyFour}@${EMAIL_DOMAIN}`)).toEqual({
      ok: true,
      address: `${sixtyFour}@${EMAIL_DOMAIN}`,
    });
    expect(normalizeEmail(`${sixtyFour}2@${EMAIL_DOMAIN}`)).toEqual({ ok: false });
  });

  it('keeps a-z, 0-9, dot, underscore and hyphen, folds only A to Z, İ and ı, and rejects every other code unit in the first atom', () => {
    const wrong: string[] = [];
    let accepted = 0;
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      const char = String.fromCharCode(unit);
      const expected = specReading(char);
      // One unit alone between two letters, so a single extra fold shows.
      const result = normalizeEmail(`a${char}b@${EMAIL_DOMAIN}`);
      const want =
        expected === null ? { ok: false } : { ok: true, address: `a${expected}b@${EMAIL_DOMAIN}` };
      if (result.ok) accepted += 1;
      if (JSON.stringify(result) !== JSON.stringify(want)) wrong.push(unit.toString(16));
    }
    expect(wrong).toEqual([]);
    // Positive control: 26 small letters, 10 digits, dot, underscore and hyphen kept,
    // 26 capitals lowered, İ and ı folded.
    expect(accepted).toBe(67);
  });

  it('reads every code unit the same in a later atom and right before the @, and accepts only the @ itself as the separator', () => {
    const wrong: string[] = [];
    let accepted = 0;
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      const char = String.fromCharCode(unit);
      const expected = specReading(char);
      const cases: ReadonlyArray<readonly [string, string, string | null]> = [
        // Inside an atom after a dot.
        [
          'later atom',
          `a.b${char}c@${EMAIL_DOMAIN}`,
          expected === null ? null : `a.b${expected}c@${EMAIL_DOMAIN}`,
        ],
        // Right before the @; a dot there ends the local part, so it rejects.
        [
          'before the @',
          `ab${char}@${EMAIL_DOMAIN}`,
          expected === null || expected === '.' ? null : `ab${expected}@${EMAIL_DOMAIN}`,
        ],
        // As the separator: only the @ itself joins a local part to the domain. The
        // first-atom sweep cannot show a fold into @, since its probe already holds one.
        ['separator', `ab${char}${EMAIL_DOMAIN}`, char === '@' ? `ab@${EMAIL_DOMAIN}` : null],
      ];
      for (const [place, raw, address] of cases) {
        const result = normalizeEmail(raw);
        const want = address === null ? { ok: false } : { ok: true, address };
        if (result.ok) accepted += 1;
        if (JSON.stringify(result) !== JSON.stringify(want)) {
          wrong.push(`${place} ${unit.toString(16)}`);
        }
      }
    }
    expect(wrong).toEqual([]);
    // Positive control: the 67 units of the first-atom sweep in a later atom, the same
    // without the dot right before the @, and the @ alone as the separator.
    expect(accepted).toBe(67 + 66 + 1);
  });

  // Each row: the rejected local part, then the smallest fix of it that passes. The
  // code unit sweeps above check every character on its own.
  it.each([
    ['an empty local part', '', 'a'],
    [
      'a local part one character too long',
      'x'.repeat(EMAIL_LOCAL_PART_MAX_LENGTH + 1),
      'x'.repeat(EMAIL_LOCAL_PART_MAX_LENGTH),
    ],
    ['consecutive dots', 'ali..veli', 'ali.veli'],
    ['a leading dot', '.ali', 'ali'],
    ['a trailing dot', 'ali.', 'ali'],
    ['a lone dot', '.', 'a'],
    ['white space inside', 'ali veli', 'ali.veli'],
    ['white space right before the @', 'ali ', 'ali'],
    ['a quote', '"ali"', 'ali'],
    ['an apostrophe', "o'neil", 'oneil'],
    ['other punctuation', 'ali!veli#x=y/z', 'ali-veli_x.y.z'],
    // Plus addressing after a dot, the form a staff address (name.surname) has.
    ['a plus sign in a later atom', 'ali.veli+ders', 'ali.veli-ders'],
    // ç ğ ş ö ü, and ı, which alone would pass.
    [
      'small Turkish letters outside the table',
      `\u{e7}a\u{11f}${SMALL_DOTLESS_I}\u{15f}\u{f6}\u{fc}`,
      `cag${SMALL_DOTLESS_I}sou`,
    ],
    // Ç Ğ Ş Ö Ü, and I, which alone would pass.
    ['capital Turkish letters outside the table', '\u{c7}A\u{11e}I\u{15e}\u{d6}\u{dc}', 'CAGISOU'],
    ['the Kelvin sign, which toLowerCase turns into k', `${KELVIN_SIGN}emal`, 'Kemal'],
    ['full-width letters', '\u{ff41}\u{ff4c}\u{ff49}', 'ali'],
    [
      'a decomposed İ (I plus combining dot)',
      `I${COMBINING_DOT_ABOVE}pek`,
      `${CAPITAL_I_WITH_DOT}pek`,
    ],
    ['a character outside the BMP', '\u{1f600}', 'a'],
  ])('rejects %s', (_name, local, fixed) => {
    // Ground control: the fixed local part passes, so the defect is what is rejected.
    expect(normalizeEmail(`${fixed}@${EMAIL_DOMAIN}`).ok).toBe(true);
    expect(normalizeEmail(`${local}@${EMAIL_DOMAIN}`)).toEqual({ ok: false });
  });

  it('accepts the ASCII K where it rejects the Kelvin sign', () => {
    // Ground control for the row above: toLowerCase would have merged the two.
    expect(KELVIN_SIGN.toLowerCase()).toBe('k');
    expect(normalizeEmail(`Kemal@${EMAIL_DOMAIN}`)).toEqual({
      ok: true,
      address: `kemal@${EMAIL_DOMAIN}`,
    });
  });

  // Each row: the rejected input, then the smallest fix of it that passes.
  it.each([
    ['no @ at all', 'ali.istanbul.edu.tr', 'ali@istanbul.edu.tr'],
    // Without an @ the whole text would stand where the domain is compared.
    ['the bare domain, with no @', EMAIL_DOMAIN, `a@${EMAIL_DOMAIN}`],
    ['the bare domain in capitals, with no @', 'ISTANBUL.EDU.TR', 'A@ISTANBUL.EDU.TR'],
    ['two @', `ali@veli@${EMAIL_DOMAIN}`, `ali.veli@${EMAIL_DOMAIN}`],
    ['two @ around a valid address', `@ali@${EMAIL_DOMAIN}`, `ali@${EMAIL_DOMAIN}`],
    ['only the domain', `@${EMAIL_DOMAIN}`, `a@${EMAIL_DOMAIN}`],
    ['nothing after the @', 'ali@', `ali@${EMAIL_DOMAIN}`],
    ['white space after the @', `ali@ ${EMAIL_DOMAIN}`, `ali@${EMAIL_DOMAIN}`],
    ['an empty string', '', `a@${EMAIL_DOMAIN}`],
    ['only white space', ' \t\n', ` \ta@${EMAIL_DOMAIN}\n`],
  ])('rejects %s', (_name, raw, fixed) => {
    // Ground control: the fixed input passes, so the defect is what is rejected.
    expect(normalizeEmail(fixed).ok).toBe(true);
    expect(normalizeEmail(raw)).toEqual({ ok: false });
  });

  it('trims exactly the white space String.prototype.trim removes, at either end', () => {
    // The rule keeps its own table so Hermes and V8 agree; this pins the table to
    // the ECMAScript white space set on the reference engine, over the whole BMP.
    const address = `ali@${EMAIL_DOMAIN}`;
    const mismatches: string[] = [];
    let trimmed = 0;
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      if (unit >= 0xd800 && unit <= 0xdfff) continue;
      const char = String.fromCharCode(unit);
      const isWhiteSpace = char.trim() === '';
      const leading = normalizeEmail(char + address);
      const trailing = normalizeEmail(address + char);
      const leadingTrimmed = leading.ok && leading.address === address;
      const trailingTrimmed = trailing.ok && trailing.address === address;
      if (
        leadingTrimmed !== isWhiteSpace ||
        trailingTrimmed !== isWhiteSpace ||
        (!isWhiteSpace && trailing.ok)
      ) {
        mismatches.push(unit.toString(16));
      }
      if (isWhiteSpace) trimmed += 1;
    }
    expect(mismatches).toEqual([]);
    // Positive control: some characters were white space.
    expect(trimmed).toBeGreaterThan(0);
  });

  it('says nothing more than ok: false when it rejects', () => {
    // Positive control: the same key listing shows both keys of an accepted result.
    expect(Object.keys(normalizeEmail(`ali@${EMAIL_DOMAIN}`))).toEqual(['ok', 'address']);
    for (const raw of ['ali@gmail.com', `ali+x@${EMAIL_DOMAIN}`, '']) {
      const result = normalizeEmail(raw);
      expect(result).toStrictEqual({ ok: false });
      expect(Object.keys(result)).toEqual(['ok']);
    }
  });
});
