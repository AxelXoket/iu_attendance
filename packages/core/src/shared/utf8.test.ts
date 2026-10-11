import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeUtf8, utf8Bytes } from './utf8.ts';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const encoder = new TextEncoder();
// TextDecoder is the oracle; fatal mode rejects what decodeUtf8 must reject.
const strict = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const oracle = (bytes: Uint8Array): string | null => {
  try {
    return strict.decode(bytes);
  } catch {
    return null;
  }
};

describe('utf8Bytes', () => {
  it('agrees with TextEncoder for any text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 50 }), (text) => {
        expect(utf8Bytes(text)).toEqual(encoder.encode(text));
      }),
      { numRuns: 1000 },
    );
  });

  it('agrees with TextEncoder for any UTF-16 code units, lone surrogates included', () => {
    const codeUnit = fc.integer({ min: 0, max: 0xffff }).map((unit) => String.fromCharCode(unit));
    const surrogate = fc
      .integer({ min: 0xd800, max: 0xdfff })
      .map((unit) => String.fromCharCode(unit));
    let illFormed = 0;
    fc.assert(
      fc.property(fc.string({ unit: fc.oneof(codeUnit, surrogate), maxLength: 40 }), (text) => {
        if (!text.isWellFormed()) illFormed += 1;
        expect(utf8Bytes(text)).toEqual(encoder.encode(text));
      }),
      { numRuns: 1000 },
    );
    // Ground control: many runs carry a lone surrogate.
    expect(illFormed).toBeGreaterThan(300);
  });

  // Each text is given as UTF-16 code units, so the surrogates stay explicit.
  it.each([
    ['U+007F, the last one-byte code point', [0x7f], '7f'],
    ['U+0080, the first two-byte code point', [0x80], 'c280'],
    ['U+07FF, the last two-byte code point', [0x7ff], 'dfbf'],
    ['U+0800, the first three-byte code point', [0x800], 'e0a080'],
    ['U+D7FF, just below the surrogates', [0xd7ff], 'ed9fbf'],
    ['U+E000, just above the surrogates', [0xe000], 'ee8080'],
    ['U+FFFF, the last three-byte code point', [0xffff], 'efbfbf'],
    ['U+10000, the first four-byte code point', [0xd800, 0xdc00], 'f0908080'],
    ['U+10FFFF, the last code point', [0xdbff, 0xdfff], 'f48fbfbf'],
    ['a lone high surrogate at the end', [0x61, 0xd800], '61efbfbd'],
    ['a lone high surrogate before a letter', [0xdbff, 0x61], 'efbfbd61'],
    ['a lone low surrogate', [0xdc00], 'efbfbd'],
    ['the last lone low surrogate', [0xdfff], 'efbfbd'],
    ['a low surrogate before a high one', [0xdc00, 0xd800], 'efbfbdefbfbd'],
    ['a high surrogate before a pair', [0xd800, 0xd800, 0xdc00], 'efbfbdf0908080'],
  ])('encodes %s as TextEncoder does', (_name, units, expected) => {
    const text = String.fromCharCode(...units);
    expect(hex(utf8Bytes(text))).toBe(expected);
    // Ground control: the expectation is TextEncoder's own output.
    expect(hex(encoder.encode(text))).toBe(expected);
  });
});

describe('decodeUtf8', () => {
  it('reads any well-formed text back', () => {
    const encoder = new TextEncoder();
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 60 }), (text) => {
        expect(decodeUtf8(encoder.encode(text))).toBe(text);
      }),
      { numRuns: 1000 },
    );
  });

  it('agrees with a fatal TextDecoder on any bytes', () => {
    let invalid = 0;
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 24 }), (bytes) => {
        const expected = oracle(bytes);
        if (expected === null) invalid += 1;
        expect(decodeUtf8(bytes)).toBe(expected);
      }),
      { numRuns: 3000 },
    );
    // Ground control: random bytes are mostly not UTF-8, and some are.
    expect(invalid).toBeGreaterThan(1000);
  });

  it('agrees with a fatal TextDecoder on bytes near the edges of each sequence', () => {
    const edge = fc.constantFrom(
      0x00,
      0x7f,
      0x80,
      0x8f,
      0x90,
      0x9f,
      0xa0,
      0xbf,
      0xc0,
      0xc1,
      0xc2,
      0xdf,
      0xe0,
      0xe1,
      0xec,
      0xed,
      0xee,
      0xef,
      0xf0,
      0xf1,
      0xf3,
      0xf4,
      0xf5,
      0xff,
    );
    let valid = 0;
    fc.assert(
      fc.property(fc.array(edge, { maxLength: 8 }), (list) => {
        const bytes = Uint8Array.from(list);
        const expected = oracle(bytes);
        if (expected !== null && list.some((byte) => byte >= 0x80)) valid += 1;
        expect(decodeUtf8(bytes)).toBe(expected);
      }),
      { numRuns: 5000 },
    );
    // Ground control: some edge sequences are valid multi-byte text (about 20 in 5000).
    expect(valid).toBeGreaterThan(5);
  });

  it.each([
    ['an overlong two-byte slash', [0xc0, 0xaf]],
    ['an overlong three-byte form', [0xe0, 0x80, 0xaf]],
    ['an overlong four-byte form', [0xf0, 0x80, 0x80, 0xaf]],
    ['a high surrogate', [0xed, 0xa0, 0x80]],
    ['a low surrogate', [0xed, 0xbf, 0xbf]],
    ['a code point above U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
    ['the lead byte F5', [0xf5, 0x80, 0x80, 0x80]],
    ['the lead byte F7', [0xf7, 0xbf, 0xbf, 0xbf]],
    ['the lead byte F8', [0xf8, 0x88, 0x80, 0x80, 0x80]],
    ['a lone continuation byte', [0x80]],
    ['a cut-off three-byte sequence', [0xe2, 0x82]],
    ['a cut-off four-byte sequence at the end', [0x41, 0xf0, 0x9f, 0x98]],
    ['a bad third byte', [0xe2, 0x82, 0x41]],
  ])('rejects %s', (_name, list) => {
    expect(decodeUtf8(Uint8Array.from(list))).toBeNull();
    // Ground control: the oracle rejects it too.
    expect(oracle(Uint8Array.from(list))).toBeNull();
  });

  // Expected texts are built from code points: written out, these would be invisible.
  it.each([
    ['U+0080', [0xc2, 0x80], [0x80]],
    ['U+07FF', [0xdf, 0xbf], [0x7ff]],
    ['U+0800', [0xe0, 0xa0, 0x80], [0x800]],
    ['U+D7FF', [0xed, 0x9f, 0xbf], [0xd7ff]],
    ['U+E000', [0xee, 0x80, 0x80], [0xe000]],
    ['U+FFFF', [0xef, 0xbf, 0xbf], [0xffff]],
    ['U+10000', [0xf0, 0x90, 0x80, 0x80], [0x10000]],
    ['U+10FFFF', [0xf4, 0x8f, 0xbf, 0xbf], [0x10ffff]],
    ['a byte order mark, kept', [0xef, 0xbb, 0xbf, 0x41], [0xfeff, 0x41]],
  ])('reads %s', (_name, list, codePoints) => {
    expect(decodeUtf8(Uint8Array.from(list))).toBe(String.fromCodePoint(...codePoints));
  });
});
