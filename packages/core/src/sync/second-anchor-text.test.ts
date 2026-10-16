import { generateKeyPairSync, sign, verify } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AFTER_RESTART } from '../clock/codes.ts';
import { DEVICE_KEY_KINDS, type DeviceKeyKind } from '../identity/device-key.ts';
import {
  buildSecondAnchorText,
  parseSecondAnchorText,
  SECOND_ANCHOR_TEXT_MAX_LENGTH,
  type SecondAnchorFields,
  type SignatureType,
  signatureKeyMatches,
  signedBytes,
} from './second-anchor-text.ts';

// Buffer and node:crypto are oracles here only.
const encodeJson = (value: unknown) =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const itemArb = fc.oneof(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 64 }),
    eventToDocumentMs: fc.maxSafeInteger(),
  }),
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 64 }),
    absentReason: fc.constant(AFTER_RESTART),
  }),
);
const fieldsArb: fc.Arbitrary<SecondAnchorFields> = fc.record({
  installation: fc.uuid(),
  batch: fc.uuid(),
  document: fc.string({ unit: 'binary', minLength: 1, maxLength: 300 }),
  requestDurationMs: fc.maxSafeInteger(),
  items: fc.uniqueArray(itemArb, { selector: (item) => item.id, maxLength: 20 }),
});

const sample: SecondAnchorFields = {
  installation: '0190f2a4-5b6c-7d8e-9fa0-b1c2d3e4f506',
  batch: '0190f2a4-6000-7000-8000-000000000001',
  document: 'clock-document',
  requestDurationMs: 420,
  items: [
    { id: 'item-1', eventToDocumentMs: 1500 },
    { id: 'item-2', absentReason: AFTER_RESTART },
  ],
};
const sampleJson = {
  kind: 'second_anchor',
  v: 1,
  installation: sample.installation,
  batch: sample.batch,
  document: sample.document,
  requestDurationMs: sample.requestDurationMs,
  items: sample.items,
};

describe('second anchor text', () => {
  it('parses what it builds, for any fields', () => {
    fc.assert(
      fc.property(fieldsArb, (fields) => {
        const text = buildSecondAnchorText(fields);
        expect(text).toMatch(/^[A-Za-z0-9_-]*$/);
        expect(parseSecondAnchorText(text)).toEqual(fields);
      }),
      { numRuns: 1000 },
    );
  });

  it('writes the JSON the specification names, in a fixed key order', () => {
    expect(buildSecondAnchorText(sample)).toBe(encodeJson(sampleJson));
  });

  it('is signed over its own ASCII bytes, and one changed letter fails the check', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    fc.assert(
      fc.property(fieldsArb, fc.nat(), fc.nat({ max: 63 }), (fields, at, letter) => {
        const text = buildSecondAnchorText(fields);
        const bytes = signedBytes(text);
        // The signed bytes are the text itself, one byte per letter.
        expect(Buffer.from(bytes).toString('latin1')).toBe(text);
        const signature = sign('sha256', bytes, privateKey);
        expect(verify('sha256', bytes, publicKey, signature)).toBe(true);
        const position = at % text.length;
        const replacement =
          letters.charAt(letter) === text.charAt(position)
            ? letters.charAt((letter + 1) % 64)
            : letters.charAt(letter);
        const changed = text.slice(0, position) + replacement + text.slice(position + 1);
        expect(verify('sha256', signedBytes(changed), publicKey, signature)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('checks a signature only with the matching key type', () => {
    const pairs: [SignatureType, DeviceKeyKind][] = [];
    for (const signatureType of ['a', 's', 'o'] as const) {
      for (const keyType of DEVICE_KEY_KINDS) {
        pairs.push([signatureType, keyType]);
      }
    }
    const matching = pairs.filter(([signatureType, keyType]) =>
      signatureKeyMatches(signatureType, keyType),
    );
    expect(matching).toEqual([
      ['a', 'android_p256'],
      ['s', 'secure_enclave'],
    ]);
  });

  it.each<[string, unknown]>([
    ['another kind', { ...sampleJson, kind: 'record' }],
    ['version 2', { ...sampleJson, v: 2 }],
    ['version 1 as text', { ...sampleJson, v: '1' }],
    ['an extra key', { ...sampleJson, extra: true }],
    ['a missing key', { ...sampleJson, document: undefined }],
    ['an installation that is not a UUID', { ...sampleJson, installation: 'installation-1' }],
    ['a batch that is not a UUID', { ...sampleJson, batch: '' }],
    ['an empty document', { ...sampleJson, document: '' }],
    ['a document that is not text', { ...sampleJson, document: { mac: 'x' } }],
    ['a fractional request duration', { ...sampleJson, requestDurationMs: 1.5 }],
    ['a request duration above 2^53 - 1', { ...sampleJson, requestDurationMs: 2 ** 53 }],
    ['items that are not a list', { ...sampleJson, items: {} }],
    [
      'an item with both fields',
      { ...sampleJson, items: [{ id: 'x', eventToDocumentMs: 1, absentReason: AFTER_RESTART }] },
    ],
    [
      'an item with another absent reason',
      { ...sampleJson, items: [{ id: 'x', absentReason: 'SYNC_BROKEN' }] },
    ],
    [
      'an item with a fractional time',
      { ...sampleJson, items: [{ id: 'x', eventToDocumentMs: 2.5 }] },
    ],
    ['an item with an empty id', { ...sampleJson, items: [{ id: '', eventToDocumentMs: 1 }] }],
    [
      'an item id of 65 letters',
      { ...sampleJson, items: [{ id: 'x'.repeat(65), eventToDocumentMs: 1 }] },
    ],
    ['an item that is a list', { ...sampleJson, items: [['x', 1]] }],
    [
      'two items with the same id',
      {
        ...sampleJson,
        items: [
          { id: 'x', eventToDocumentMs: 1 },
          { id: 'x', absentReason: AFTER_RESTART },
        ],
      },
    ],
    [
      '201 items',
      {
        ...sampleJson,
        items: Array.from({ length: 201 }, (_, i) => ({ id: `i${i}`, eventToDocumentMs: i })),
      },
    ],
    ['a list instead of an object', [sampleJson]],
    ['null', null],
  ])('does not read a text with %s', (_name, value) => {
    expect(parseSecondAnchorText(encodeJson(value))).toBeNull();
  });

  it('reads the sample itself and a full batch of 200 items (ground control for the cases above)', () => {
    expect(parseSecondAnchorText(encodeJson(sampleJson))).toEqual(sample);
    const full = Array.from({ length: 200 }, (_, i) => ({ id: `i${i}`, eventToDocumentMs: i }));
    expect(parseSecondAnchorText(encodeJson({ ...sampleJson, items: full }))?.items).toHaveLength(
      200,
    );
  });

  // D04 judges each anchor's times (negative or over 7 days is SURE_GECERSIZ), so the text
  // passes them on: one bad item time leaves the other items' anchors intact.
  it('reads negative and very long times and passes them on unchanged', () => {
    const items = [
      { id: 'a', eventToDocumentMs: -1 },
      { id: 'b', eventToDocumentMs: 1500 },
      { id: 'c', eventToDocumentMs: 8 * 86400000 },
    ];
    const fields = parseSecondAnchorText(
      encodeJson({ ...sampleJson, requestDurationMs: -7, items }),
    );
    expect(fields?.items).toEqual(items);
    expect(fields?.requestDurationMs).toBe(-7);
    expect(buildSecondAnchorText({ ...sample, items })).toBe(encodeJson({ ...sampleJson, items }));
  });

  it.each<[string, unknown]>([
    ['a value that is not text', 42],
    ['text that is not base64url', 'not base64url!'],
    ['bytes that are not UTF-8', Buffer.from([0x7b, 0xff, 0x7d]).toString('base64url')],
    ['text that is not JSON', Buffer.from('{kind:', 'utf8').toString('base64url')],
    ['a text over the length limit', 'A'.repeat(SECOND_ANCHOR_TEXT_MAX_LENGTH + 4)],
  ])('does not read %s', (_name, text) => {
    expect(parseSecondAnchorText(text)).toBeNull();
  });

  it('does not read a well-formed text over the length limit', () => {
    const long = encodeJson({ ...sampleJson, document: 'd'.repeat(25000) });
    expect(long.length).toBeGreaterThan(SECOND_ANCHOR_TEXT_MAX_LENGTH);
    expect(parseSecondAnchorText(long)).toBeNull();
  });

  it('never throws on random text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 200 }), (text) => {
        const fields = parseSecondAnchorText(text);
        if (fields !== null) expect(buildSecondAnchorText(fields)).toBeTypeOf('string');
      }),
      { numRuns: 1000 },
    );
  });

  it('refuses to build from fields it would not read back', () => {
    expect(() => buildSecondAnchorText({ ...sample, installation: 'x' })).toThrow(RangeError);
    expect(() => buildSecondAnchorText({ ...sample, requestDurationMs: 0.5 })).toThrow(RangeError);
    expect(() =>
      buildSecondAnchorText({ ...sample, items: [{ id: '', eventToDocumentMs: 0 }] }),
    ).toThrow(RangeError);
  });

  it('refuses to build a text longer than the request allows', () => {
    const long = { ...sample, document: 'd'.repeat(25000) };
    expect(() => buildSecondAnchorText(long)).toThrow(RangeError);
    // Ground control: a document just inside the limit builds.
    const inside = { ...sample, document: 'd'.repeat(24000) };
    expect(buildSecondAnchorText(inside).length).toBeLessThanOrEqual(SECOND_ANCHOR_TEXT_MAX_LENGTH);
  });
});
