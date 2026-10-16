import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type AccountConfirmation,
  accountDigest,
  CURSOR_MAX_LENGTH,
  type Cursor,
  decodeCursor,
  encodeCursor,
} from './cursor.ts';

// BigInt and Buffer are oracles here only; the code under test uses neither.
const MAX_VERSION = 2n ** 63n - 1n;
const raw = (fields: readonly string[]) =>
  Buffer.from(fields.join('|'), 'latin1').toString('base64url');
const fieldsOf = (cursor: Cursor) => [
  '1',
  cursor.systemId,
  String(cursor.timeline),
  cursor.generalVersion,
  cursor.scopeVersion,
  cursor.studentVersion,
  String(cursor.structureVersion),
  cursor.accountDigest,
];

const version = fc.bigInt({ min: 0n, max: MAX_VERSION });
const cursorArb: fc.Arbitrary<Cursor> = fc
  .record({
    systemId: fc.bigInt({ min: -(2n ** 63n), max: 2n ** 64n - 1n }),
    timeline: fc.integer({ min: 1, max: 2 ** 32 - 1 }),
    versions: fc.tuple(version, version),
    studentVersion: version,
    structureVersion: fc.integer({ min: 0, max: 2 ** 31 - 1 }),
    accountDigest: fc.stringMatching(/^[0-9a-f]{16}$/),
  })
  .map(({ systemId, versions: [a, b], studentVersion, ...rest }) => ({
    ...rest,
    systemId: String(systemId),
    generalVersion: String(a < b ? a : b),
    scopeVersion: String(a < b ? b : a),
    studentVersion: String(studentVersion),
  }));

const sample: Cursor = {
  systemId: '7300000000000000001',
  timeline: 1,
  generalVersion: '41',
  scopeVersion: '42',
  studentVersion: '0',
  structureVersion: 3,
  accountDigest: '0123456789abcdef',
};

describe('cursor encoding', () => {
  it('decodes what it encodes, within the length limit', () => {
    fc.assert(
      fc.property(cursorArb, (cursor) => {
        const text = encodeCursor(cursor);
        expect(text.length).toBeLessThanOrEqual(CURSOR_MAX_LENGTH);
        expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(decodeCursor(text)).toEqual({ ok: true, cursor });
        // Independent check of the text itself.
        expect(text).toBe(raw(fieldsOf(cursor)));
      }),
      { numRuns: 2000 },
    );
  });

  it('takes the lowest timeline and structure version, 1 and 0', () => {
    const lowest: Cursor = { ...sample, timeline: 1, structureVersion: 0 };
    expect(encodeCursor(lowest)).toBe(raw(fieldsOf(lowest)));
    expect(decodeCursor(raw(fieldsOf(lowest)))).toEqual({ ok: true, cursor: lowest });
  });

  it('keeps 64-bit values above 2^53 exactly', () => {
    const cursor: Cursor = {
      ...sample,
      systemId: '9007199254740993',
      generalVersion: '9007199254740993',
      scopeVersion: '9223372036854775807',
      studentVersion: '9007199254740995',
    };
    const reading = decodeCursor(encodeCursor(cursor));
    expect(reading).toEqual({ ok: true, cursor });
    // Ground control: a number would have rounded the identifier.
    expect(String(Number('9007199254740993'))).not.toBe('9007199254740993');
  });

  it.each([
    ['the largest unsigned print', '18446744073709551615'],
    ['the smallest signed print', '-9223372036854775808'],
    ['a negative identifier of a cluster made after 2038', '-8070450532247928832'],
    ['zero', '0'],
  ])('accepts the system identifier at %s', (_name, systemId) => {
    const cursor = { ...sample, systemId };
    expect(decodeCursor(encodeCursor(cursor))).toEqual({ ok: true, cursor });
  });

  it('refuses fields of the wrong type that would print like valid ones', () => {
    // A number prints as digits, so only the type check stops these.
    const asNumber = { ...sample, systemId: 7300000000000000 as unknown as string };
    expect(() => encodeCursor(asNumber)).toThrow(RangeError);
    const digestNumber = { ...sample, accountDigest: 1234567890123456 as unknown as string };
    expect(() => encodeCursor(digestNumber)).toThrow(RangeError);
    // Ground control: the same values as text are fine.
    expect(() => encodeCursor({ ...sample, systemId: '7300000000000000' })).not.toThrow();
    expect(() => encodeCursor({ ...sample, accountDigest: '1234567890123456' })).not.toThrow();
  });

  it('fits the longest possible cursor in 256 letters', () => {
    // The limit is the specification's number (D06 rule "İmleç biçimi").
    expect(CURSOR_MAX_LENGTH).toBe(256);
    const longest: Cursor = {
      systemId: '-9223372036854775808',
      timeline: 2 ** 32 - 1,
      generalVersion: String(MAX_VERSION),
      scopeVersion: String(MAX_VERSION),
      studentVersion: String(MAX_VERSION),
      structureVersion: 2 ** 31 - 1,
      accountDigest: 'ffffffffffffffff',
    };
    expect(encodeCursor(longest).length).toBeLessThanOrEqual(CURSOR_MAX_LENGTH);
  });

  it('does not recognise a cursor whose general version is above its scope version', () => {
    const fields = fieldsOf({ ...sample, generalVersion: '43', scopeVersion: '42' });
    expect(decodeCursor(raw(fields))).toEqual({ ok: false, reason: 'UNREADABLE' });
    // Ground control: equal versions are fine.
    expect(decodeCursor(raw(fieldsOf({ ...sample, generalVersion: '42' })))).toMatchObject({
      ok: true,
    });
    expect(() => encodeCursor({ ...sample, generalVersion: '43' })).toThrow(RangeError);
  });

  it.each<[string, Partial<Cursor>]>([
    ['a system identifier with a leading zero', { systemId: '01' }],
    ['minus zero as system identifier', { systemId: '-0' }],
    ['a system identifier below -2^63', { systemId: '-9223372036854775809' }],
    ['a system identifier above 2^64 - 1', { systemId: '18446744073709551616' }],
    ['timeline 0', { timeline: 0 }],
    ['a timeline above 2^32 - 1', { timeline: 2 ** 32 }],
    ['a fractional timeline', { timeline: 1.5 }],
    // These two keep general <= scope as text, so only the version check stops them.
    ['a general version with a leading zero', { generalVersion: '01' }],
    ['a scope version above 2^63 - 1', { scopeVersion: '9223372036854775808' }],
    ['a general version above 2^63 - 1', { generalVersion: '9223372036854775808' }],
    ['a student version with a leading zero', { studentVersion: '00' }],
    ['a student version above 2^63 - 1', { studentVersion: '9223372036854775808' }],
    ['a negative structure version', { structureVersion: -1 }],
    ['a structure version above 2^31 - 1', { structureVersion: 2 ** 31 }],
    ['an upper-case account digest', { accountDigest: '0123456789ABCDEF' }],
    ['a short account digest', { accountDigest: '0123456789abcde' }],
  ])('refuses to encode and does not recognise %s', (_name, change) => {
    const cursor = { ...sample, ...change };
    expect(() => encodeCursor(cursor)).toThrow(RangeError);
    expect(decodeCursor(raw(fieldsOf(cursor)))).toEqual({ ok: false, reason: 'UNREADABLE' });
  });
});

describe('cursor decoding', () => {
  // Built by the layout, not by encodeCursor, so a broken encoder fails a test instead of
  // stopping this file from loading.
  const good = raw(fieldsOf(sample));

  it.each<[string, unknown]>([
    ['null', null],
    ['a number', 42],
    ['an object', { cursor: good }],
    ['an empty text', ''],
    ['a text longer than 256 letters', 'A'.repeat(CURSOR_MAX_LENGTH + 4)],
    ['padding', `${good}=`],
    // The sample payload is 50 bytes: its last letter carries 2 spare bits, and B sets one.
    ['a non-canonical last letter', `${raw(fieldsOf(sample)).slice(0, -1)}B`],
    ['seven fields', raw(fieldsOf(sample).slice(0, 7))],
    ['nine fields', raw([...fieldsOf(sample), 'x'])],
    ['format 0', raw(['0', ...fieldsOf(sample).slice(1)])],
    ['format 01', raw(['01', ...fieldsOf(sample).slice(1)])],
    ['a timeline with a plus sign', raw(fieldsOf(sample).map((f, i) => (i === 2 ? '+1' : f)))],
    ['a timeline in exponent form', raw(fieldsOf(sample).map((f, i) => (i === 2 ? '1e0' : f)))],
    ['a non-ASCII byte', raw([...fieldsOf(sample).slice(0, 7), '0123456789abcdeé'])],
    ['a control byte', raw([...fieldsOf(sample).slice(0, 7), '0123456789abcde\u0000'])],
  ])('does not recognise %s', (_name, text) => {
    expect(decodeCursor(text)).toEqual({ ok: false, reason: 'UNREADABLE' });
  });

  it('has a sample whose last letter carries spare bits', () => {
    // Ground control for the non-canonical last letter case above.
    expect(fieldsOf(sample).join('|').length % 3).toBe(2);
    expect(decodeCursor(good)).toEqual({ ok: true, cursor: sample });
  });

  it('tells a cursor of another format version apart', () => {
    expect(decodeCursor(raw(['2', ...fieldsOf(sample).slice(1)]))).toEqual({
      ok: false,
      reason: 'UNKNOWN_FORMAT',
    });
    expect(decodeCursor(raw(['2']))).toEqual({ ok: false, reason: 'UNKNOWN_FORMAT' });
  });

  it('never throws on random text, and what it accepts encodes back to the same text', () => {
    let recognised = 0;
    const nearCursor = fc
      .tuple(cursorArb, fc.nat({ max: 200 }), fc.integer({ min: 0, max: 63 }))
      .map(([cursor, position, letter]) => {
        // One letter of a good cursor replaced: often still a cursor, often not.
        const text = encodeCursor(cursor);
        const at = position % text.length;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        return text.slice(0, at) + alphabet.charAt(letter) + text.slice(at + 1);
      });
    fc.assert(
      fc.property(fc.oneof(fc.string({ unit: 'binary', maxLength: 300 }), nearCursor), (text) => {
        const reading = decodeCursor(text);
        if (!reading.ok) return;
        recognised += 1;
        expect(encodeCursor(reading.cursor)).toBe(text);
      }),
      { numRuns: 3000 },
    );
    // Positive control: many of the near cursors are still read as cursors (about 120 of
    // 3000 runs in practice; the bar sits well below, so it never flakes).
    expect(recognised).toBeGreaterThan(40);
  });
});

describe('account digest', () => {
  const person = '0190f2a4-5b6c-7d8e-9fa0-b1c2d3e4f506';

  it('is the first 16 hex digits of SHA-256 over person id, bar and confirmation', () => {
    for (const confirmation of ['1', '0', '-'] as const) {
      const expected = createHash('sha256')
        .update(`${person}|${confirmation}`, 'utf8')
        .digest('hex')
        .slice(0, 16);
      expect(accountDigest(person, confirmation)).toBe(expected);
    }
  });

  it('changes with the confirmation state and with the person', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (a, b) => {
        const digests = new Set(
          ['1', '0', '-'].map((c) => accountDigest(a, c as AccountConfirmation)),
        );
        expect(digests.size).toBe(3);
        if (a !== b) expect(accountDigest(a, '1')).not.toBe(accountDigest(b, '1'));
      }),
      { numRuns: 500 },
    );
  });

  it.each<[string, string, string]>([
    ['an upper-case person id', person.toUpperCase(), '1'],
    ['a person id without dashes', person.replaceAll('-', ''), '1'],
    ['an empty person id', '', '1'],
    ['confirmation true', person, 'true'],
    ['an empty confirmation', person, ''],
  ])('throws RangeError for %s', (_name, personId, confirmation) => {
    expect(() => accountDigest(personId, confirmation as AccountConfirmation)).toThrow(RangeError);
  });
});
