import tlds from 'tlds' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { checkLinks, SPECIAL_USE_NAMES } from './link-check.ts';

// The examples of the spec's link check table (D14, Baglanti denetimi).
const PASSING = [
  'isletim.wal_arsivi',
  'chrony.json',
  '12.37.0',
  'D14-B05',
  'saat 02:15',
  '/durum/saat',
  'oturum_pencere_kapat',
];
const CAUGHT = [
  'ornek.example',
  'www.x.com',
  'a@b.co',
  'http://x',
  'HTTPS://X.COM',
  'ftp://y',
  'mailto:z',
  'istanbul.edu.tr',
  'x.com/yol',
  '(www.x.com).',
];

describe('checkLinks (D14 Baglanti denetimi)', () => {
  it("lets the table's passing tokens through unchanged", () => {
    for (const text of PASSING) {
      expect(checkLinks(text), text).toEqual({ linkCount: 0, cleanText: text });
    }
  });

  it("catches the table's links and writes [adres] in their place, keeping the punctuation", () => {
    for (const text of CAUGHT) {
      const expected = text === '(www.x.com).' ? '([adres]).' : '[adres]';
      expect(checkLinks(text), text).toEqual({ linkCount: 1, cleanText: expected });
    }
  });

  it('counts each link in a longer text and keeps everything else as written', () => {
    const text = 'Disk dolu: chrony.json\nbak:  www.x.com ve a@b.co, (isletim.wal_arsivi).';
    expect(checkLinks(text)).toEqual({
      linkCount: 2,
      cleanText: 'Disk dolu: chrony.json\nbak:  [adres] ve [adres], (isletim.wal_arsivi).',
    });
    expect(checkLinks('')).toEqual({ linkCount: 0, cleanText: '' });
    expect(checkLinks('... ()')).toEqual({ linkCount: 0, cleanText: '... ()' });
  });

  it('catches a host with a port, a query or a fragment, a Turkish suffix, quote marks or letters of any script', () => {
    const cases: readonly (readonly [string, string])[] = [
      ['evil.com:8080', '[adres]'],
      ['istanbul.edu.tr:443/giris', '[adres]'],
      ['evil.com?x=1', '[adres]'],
      ['evil.com#giris', '[adres]'],
      ["istanbul.edu.tr'ye", "[adres]'ye"],
      ['x.com’a', '[adres]’a'],
      ['<evil.com>', '<[adres]>'],
      ['«evil.com»', '«[adres]»'],
      ['“evil.com”', '“[adres]”'],
      ['evil.com…', '[adres]…'],
      ['örnek.com.tr', '[adres]'],
    ];
    for (const [text, cleanText] of cases) {
      expect(checkLinks(text), text).toEqual({ linkCount: 1, cleanText });
    }
    // Ground control: a suffix, a port or a quote mark makes no link of a name that is none.
    for (const text of ["chrony.json'dan", 'chrony.json:12', '“isletim.wal_arsivi”', "Ayşe'nin"]) {
      expect(checkLinks(text), text).toEqual({ linkCount: 0, cleanText: text });
    }
  });

  it('catches a host spelled with look-alike dots, full-width letters or invisible characters', () => {
    // Written with code points: a raw invisible character in the source cannot be reviewed.
    const at = (...codes: number[]) => String.fromCodePoint(...codes);
    const hosts = [
      `evil${at(0xff0e)}com`, // full-width full stop
      `evil${at(0x3002)}com`, // ideographic full stop
      `evil${at(0xff61)}com`, // half-width ideographic full stop
      `evil${at(0xad)}.com`, // soft hyphen
      `evil.${at(0x200b)}com`, // zero-width space
      `${at(0xff45, 0xff56, 0xff49, 0xff4c)}.com`, // full-width letters
      `www${at(0xff0e)}x${at(0xff0e)}com`,
      `a${at(0xff20)}b.co`, // full-width commercial at
    ];
    for (const host of hosts) {
      expect(checkLinks(host), host).toEqual({ linkCount: 1, cleanText: '[adres]' });
      expect(checkLinks(`(${host}).`), host).toEqual({ linkCount: 1, cleanText: '([adres]).' });
    }
    // Ground control: folding makes no link of a name that is none.
    for (const text of [
      `chrony${at(0xff0e)}json`,
      `isletim${at(0x3002)}wal_arsivi`,
      `12${at(0xff0e)}37`,
    ]) {
      expect(checkLinks(text), text).toEqual({ linkCount: 0, cleanText: text });
    }
  });

  it('takes a host name only when its last label is a top-level domain, in any case', () => {
    // .sh is a top-level domain, so a script name counts (an operations e-mail gets [adres]).
    expect(checkLinks('kur.sh').linkCount).toBe(1);
    expect(checkLinks('ISTANBUL.EDU.TR').linkCount).toBe(1);
    // The spec's special-use names, written out once.
    expect([...SPECIAL_USE_NAMES]).toEqual([
      'example',
      'invalid',
      'localhost',
      'test',
      'local',
      'onion',
      'internal',
    ]);
    for (const name of SPECIAL_USE_NAMES) expect(checkLinks(`x.${name}`).linkCount, name).toBe(1);
    // Ground control: an unknown last label, a single label, a label holding _.
    expect(checkLinks('x.notatld').linkCount).toBe(0);
    expect(checkLinks('com').linkCount).toBe(0);
    expect(checkLinks('a_b.com').linkCount).toBe(0);
    // www. counts only at the start.
    expect(checkLinks('awww.notatld').linkCount).toBe(0);
    expect(checkLinks('www.notatld').linkCount).toBe(1);
    // The pinned list is the IANA one, not an empty or partial copy.
    expect(tlds).toContain('com');
    expect(tlds).not.toContain('json');
    expect(tlds.length).toBeGreaterThan(1000);
  });

  it('reads a scheme anywhere as ://, or at the start as http:, https:, ftp: or mailto:', () => {
    expect(checkLinks('git+ssh://host').linkCount).toBe(1);
    expect(checkLinks('Mailto:x').linkCount).toBe(1);
    // Ground control: the same words in the middle, and a colon that is no scheme.
    expect(checkLinks('xhttp:y').linkCount).toBe(0);
    expect(checkLinks('not:mailto').linkCount).toBe(0);
  });
});
