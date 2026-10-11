import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeBase64Url, encodeBase64Url } from './base64url.ts';

const ascii = (text: string) => Uint8Array.from(text, (letter) => letter.charCodeAt(0));
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

describe('base64url encoding', () => {
  it.each([
    ['', ''],
    ['f', 'Zg'],
    ['fo', 'Zm8'],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg'],
    ['fooba', 'Zm9vYmE'],
    ['foobar', 'Zm9vYmFy'],
  ])('encodes the RFC 4648 vector %j as %j and decodes it back', (plain, encoded) => {
    expect(encodeBase64Url(ascii(plain))).toBe(encoded);
    expect(decodeBase64Url(encoded)).toEqual(ascii(plain));
  });

  it('uses - and _ for the values 62 and 63', () => {
    expect(encodeBase64Url(Uint8Array.from([0xfb, 0xff]))).toBe('-_8');
    expect(decodeBase64Url('-_8')).toEqual(Uint8Array.from([0xfb, 0xff]));
  });

  it('agrees with Node for any bytes and decodes its own output back', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 200 }), (bytes) => {
        const text = encodeBase64Url(bytes);
        expect(text).toBe(Buffer.from(bytes).toString('base64url'));
        expect(decodeBase64Url(text)).toEqual(bytes);
      }),
      { numRuns: 1000 },
    );
  });
});

describe('base64url decoding is strict', () => {
  it.each([
    ['padding', 'Zg=='],
    ['a single padding letter', 'Zm8='],
    ['the standard alphabet letter +', '+_8'],
    ['the standard alphabet letter /', '-/8'],
    ['a space', 'Zm9 v'],
    ['a line break', 'Zm9v\nYg'],
    ['a non-ASCII letter', 'Zm9é'],
    ['a letter above U+FFFF', 'Zm😀'],
    ['a length of 4n + 1', 'Zm9vY'],
    ['a single letter', 'Z'],
    ['spare bits in the last of two letters', 'Zh'],
    ['spare bits in the last of three letters', 'Zm9'],
  ])('rejects %s', (_name, text) => {
    expect(decodeBase64Url(text)).toBeNull();
  });

  it('accepts the canonical neighbours of the rejected spare-bit texts', () => {
    // Ground control for the two spare-bit cases above: only the low bits differ.
    expect(decodeBase64Url('Zg')).toEqual(ascii('f'));
    expect(decodeBase64Url('Zm8')).toEqual(ascii('fo'));
  });

  it('decodes a text only when it encodes back to the same text, and never throws', () => {
    let decoded = 0;
    const letter = fc.constantFrom(...LETTERS, '=', '+', '/', ' ', 'é');
    fc.assert(
      fc.property(fc.string({ unit: letter, maxLength: 40 }), (text) => {
        const bytes = decodeBase64Url(text);
        if (bytes === null) return;
        decoded += 1;
        expect(encodeBase64Url(bytes)).toBe(text);
      }),
      { numRuns: 2000 },
    );
    // Positive control: a good share of the random texts decode at all.
    expect(decoded).toBeGreaterThan(50);
  });

  it('never throws on any UTF-16 text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 60 }), (text) => {
        const bytes = decodeBase64Url(text);
        expect(bytes === null || encodeBase64Url(bytes) === text).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });
});
