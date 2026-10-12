import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeBase64Url, encodeBase64Url } from '../shared/base64url.ts';
import { hmacSha256 } from '../shared/hmac-sha256.ts';
import { DOCUMENT_BYTES, DOCUMENT_CHARS, VALUE_BYTES } from './constants.ts';
import { decodeDocument, documentSigningInput } from './document.ts';
import samples from './document-samples.json' with { type: 'json' };
import type { ClockSubject, DeviceId, DocumentFields, PersonId } from './types.ts';

const hexBytes = (hex: string) =>
  Uint8Array.from({ length: hex.length / 2 }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );

function fieldsOf(sample: (typeof samples.samples)[number]): DocumentFields {
  const subject: ClockSubject =
    sample.subjectKind === 'STAFF'
      ? { kind: 'STAFF', personId: sample.subjectId as PersonId }
      : { kind: 'STUDENT_DEVICE', deviceId: sample.subjectId as DeviceId };
  return {
    kid: sample.kid,
    subject,
    value: encodeBase64Url(hexBytes(sample.valueHex)),
    serverTimeMs: sample.serverTimeMs,
  };
}

// What the server sends: the signed bytes, then their HMAC.
function documentOf(fields: DocumentFields, key: Uint8Array): string {
  const signed = documentSigningInput(fields);
  const bytes = new Uint8Array(DOCUMENT_BYTES);
  bytes.set(signed);
  bytes.set(hmacSha256(key, signed), signed.length);
  return encodeBase64Url(bytes);
}

const keyOf = (sample: (typeof samples.samples)[number]) => new Uint8Array(32).fill(sample.keyByte);

// Reads the sample's bytes, changes them, and decodes the result.
function decodeChanged(change: (bytes: Uint8Array) => Uint8Array) {
  const bytes = decodeBase64Url((samples.samples[0] as (typeof samples.samples)[number]).document);
  if (bytes === null) throw new Error('sample is not base64url');
  return decodeDocument(encodeBase64Url(change(bytes)));
}

describe('clock document: the recorded samples', () => {
  it('matches Node crypto byte for byte and reads back every field', () => {
    for (const sample of samples.samples) {
      const fields = fieldsOf(sample);
      const text = documentOf(fields, keyOf(sample));
      expect(text).toBe(sample.document);
      expect(text).toHaveLength(DOCUMENT_CHARS);
      const decoded = decodeDocument(sample.document);
      expect(decoded).toEqual({ ...fields, mac: decodeBase64Url(sample.document)?.slice(50) });
    }
    // The first sample is the spec's: 2026-10-05T06:00:00.000Z.
    expect(samples.samples[0]?.serverTimeMs).toBe(Date.UTC(2026, 9, 5, 6));
  });

  it('gives the same results where Buffer, atob and btoa do not exist (Hermes)', () => {
    const globals = globalThis as Record<string, unknown>;
    const saved = { Buffer: globals.Buffer, atob: globals.atob, btoa: globals.btoa };
    try {
      for (const name of Object.keys(saved)) delete globals[name];
      expect(globals.Buffer).toBeUndefined();
      for (const sample of samples.samples) {
        expect(documentOf(fieldsOf(sample), keyOf(sample))).toBe(sample.document);
        expect(decodeDocument(sample.document)).toMatchObject(fieldsOf(sample));
      }
    } finally {
      Object.assign(globals, saved);
    }
  });
});

describe('decodeDocument', () => {
  it('reports VERSION for another version byte, whatever the length', () => {
    expect(decodeChanged((bytes) => Uint8Array.of(2, ...bytes.slice(1)))).toEqual({
      error: 'VERSION',
    });
    expect(decodeChanged((bytes) => Uint8Array.of(0, ...bytes.slice(1, 40)))).toEqual({
      error: 'VERSION',
    });
  });

  it('reports FORMAT for text that is not a version 1 document of 82 bytes', () => {
    expect(decodeDocument('not base64url!')).toEqual({ error: 'FORMAT' });
    expect(decodeDocument('')).toEqual({ error: 'FORMAT' });
    expect(decodeChanged((bytes) => bytes.slice(0, 81))).toEqual({ error: 'FORMAT' });
    expect(decodeChanged((bytes) => Uint8Array.of(...bytes, 0))).toEqual({ error: 'FORMAT' });
  });

  it('reports FORMAT for a kid outside [a-z0-9-]{1,8} or not padded with zeros', () => {
    const withKid = (kid: number[]) =>
      decodeChanged((bytes) => {
        const copy = bytes.slice();
        copy.set(kid, 1);
        return copy;
      });
    expect(withKid([0, 0, 0, 0, 0, 0, 0, 0])).toEqual({ error: 'FORMAT' });
    expect(withKid([0x41, 0, 0, 0, 0, 0, 0, 0])).toEqual({ error: 'FORMAT' });
    expect(withKid([0x6b, 0, 0x31, 0, 0, 0, 0, 0])).toEqual({ error: 'FORMAT' });
    expect(withKid([0x6b, 0, 0, 0, 0, 0, 0, 0x31])).toEqual({ error: 'FORMAT' });
    // Ground control: one character padded with zeros, and eight without padding.
    expect(withKid([0x6b, 0, 0, 0, 0, 0, 0, 0])).toMatchObject({ kid: 'k' });
    expect(withKid([0x61, 0x62, 0x63, 0x2d, 0x31, 0x32, 0x33, 0x34])).toMatchObject({
      kid: 'abc-1234',
    });
  });

  it('reports FORMAT for an unknown subject kind and a time beyond the safe integers', () => {
    for (const kind of [0, 3, 255]) {
      expect(
        decodeChanged((bytes) =>
          Uint8Array.from(bytes, (byte, index) => (index === 9 ? kind : byte)),
        ),
      ).toEqual({
        error: 'FORMAT',
      });
    }
    const withHigh = (high: number[]) =>
      decodeChanged((bytes) => {
        const copy = bytes.slice();
        copy.set(high, 42);
        return copy;
      });
    expect(withHigh([0, 0x20, 0, 0])).toEqual({ error: 'FORMAT' });
    expect(withHigh([0x80, 0, 0, 0])).toEqual({ error: 'FORMAT' });
    expect(withHigh([0, 0x1f, 0xff, 0xff])).toMatchObject({
      serverTimeMs: 0x1f_ffff * 2 ** 32 + 0x0aa5_cb00,
    });
  });
});

describe('documentSigningInput', () => {
  const fields = fieldsOf(samples.samples[0] as (typeof samples.samples)[number]);

  it('rejects fields outside their form', () => {
    for (const kid of ['', 'ABC', '123456789', 'a b']) {
      expect(() => documentSigningInput({ ...fields, kid })).toThrow(RangeError);
    }
    const notUuid = 'not-a-uuid' as PersonId;
    expect(() =>
      documentSigningInput({ ...fields, subject: { kind: 'STAFF', personId: notUuid } }),
    ).toThrow(RangeError);
    // A kind from outside the types is refused rather than written as byte 0.
    const subjectId = samples.samples[0]?.subjectId;
    const unknownKind = { kind: 'BOGUS', deviceId: subjectId } as unknown as ClockSubject;
    expect(() => documentSigningInput({ ...fields, subject: unknownKind })).toThrow(RangeError);
    // Ground control: the same id under a known kind signs.
    const device = { kind: 'STUDENT_DEVICE', deviceId: subjectId as DeviceId } as const;
    expect(documentSigningInput({ ...fields, subject: device })).toHaveLength(50);
  });

  it('takes the person as a staff subject, never a sign-in session id', () => {
    const sessionId = 'a-session' as string & { readonly __id: 'AuthSession' };
    // @ts-expect-error a sign-in session id is not a person id (D04-B14)
    const wrong: ClockSubject = { kind: 'STAFF', personId: sessionId };
    expect(wrong.kind).toBe('STAFF');
    for (const length of [VALUE_BYTES - 1, VALUE_BYTES + 1]) {
      const value = encodeBase64Url(new Uint8Array(length));
      expect(() => documentSigningInput({ ...fields, value })).toThrow(RangeError);
    }
    expect(() => documentSigningInput({ ...fields, value: '!' })).toThrow(RangeError);
    for (const serverTimeMs of [-1, 1.5, 2 ** 53, Number.NaN]) {
      expect(() => documentSigningInput({ ...fields, serverTimeMs })).toThrow(RangeError);
    }
    expect(documentSigningInput({ ...fields, serverTimeMs: 0 })).toHaveLength(50);
  });

  it('round-trips any valid fields through the 82-byte document', () => {
    const kid = fc.stringMatching(/^[a-z0-9-]{1,8}$/);
    const id = fc.uuid().map((text) => text.toLowerCase());
    const subject = fc.oneof(
      id.map((text): ClockSubject => ({ kind: 'STUDENT_DEVICE', deviceId: text as DeviceId })),
      id.map((text): ClockSubject => ({ kind: 'STAFF', personId: text as PersonId })),
    );
    const value = fc
      .uint8Array({ minLength: VALUE_BYTES, maxLength: VALUE_BYTES })
      .map(encodeBase64Url);
    const time = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });
    fc.assert(
      fc.property(kid, subject, value, time, (k, s, v, t) => {
        const original: DocumentFields = { kid: k, subject: s, value: v, serverTimeMs: t };
        const text = documentOf(original, new Uint8Array(32));
        expect(text).toHaveLength(DOCUMENT_CHARS);
        expect(decodeDocument(text)).toMatchObject(original);
      }),
      { numRuns: 1000 },
    );
  });
});
