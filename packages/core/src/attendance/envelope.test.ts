import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { encodeBase64Url } from '../shared/base64url.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import {
  buildEnvelope,
  ENVELOPE_MAX_BYTES,
  parseEnvelope,
  recordTextOf,
  SIGNATURE_KINDS,
  type SignatureKind,
  scanBodyOf,
  signedBytesOf,
} from './envelope.ts';

const KINDS = Object.values(SIGNATURE_KINDS) as SignatureKind[];
const signature = new Uint8Array([48, 69, 2, 33, 0, 200, 17]);
const record = {
  kind: 'record',
  v: 1,
  id: '01890a5d-ac96-7000-8000-000000000001',
  sequence: 42,
  timeZone: 'Europe/Istanbul',
};
const valid = buildEnvelope(recordTextOf(record), 'ANDROID_P256', signature);

// A JSON value made of the field types a record text carries, non-ASCII text included.
const jsonField = fc.oneof(
  fc.string({ unit: 'grapheme', maxLength: 60, size: 'medium' }),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
);
// Every record names version 1; a newer version is a refusal of its own, tested apart.
// Sized so that about a third of the envelopes are 700 to 1273 bytes, where real records
// are, and about a third are past the limit.
const records = fc
  .dictionary(fc.string({ minLength: 1, maxLength: 20 }), jsonField, {
    maxKeys: 30,
    size: 'medium',
  })
  .map((fields) => ({ ...fields, v: 1 }));
// Up to the largest signature, an App Attest assertion of 142 bytes.
const signatures = fc.uint8Array({ minLength: 1, maxLength: 142, size: 'max' });

// An envelope of exactly this length from buildEnvelope: base64url makes every length but
// 1 modulo 4, so the record grows a little until the signature's share avoids that.
const builtOfLength = (length: number) => {
  for (let pad = 0; pad < 8; pad += 1) {
    const text = recordTextOf({ ...record, pad: 'x'.repeat(pad) });
    const rest = length - `IUY1.${text}.i.`.length;
    if (rest % 4 !== 1) {
      return () => buildEnvelope(text, 'APP_ATTEST', new Uint8Array((rest * 3) >> 2));
    }
  }
  throw new Error('no envelope of this length');
};

describe('envelope round trip', () => {
  it('parses back the fields it was built from, or refuses to build past the limit', () => {
    fc.assert(
      fc.property(records, fc.constantFrom(...KINDS), signatures, (fields, kind, bytes) => {
        const text = recordTextOf(fields);
        if (`IUY1.${text}.a.${encodeBase64Url(bytes)}`.length > ENVELOPE_MAX_BYTES) {
          expect(() => buildEnvelope(text, kind, bytes)).toThrow(RangeError);
          return;
        }
        const envelope = buildEnvelope(text, kind, bytes);
        const parsed = parseEnvelope(envelope);
        if ('error' in parsed) throw new Error(`parse failed: ${parsed.error}`);
        expect(parsed.record).toEqual(JSON.parse(JSON.stringify(fields)));
        expect(parsed.signatureKind).toBe(kind);
        expect(parsed.signature).toEqual(bytes);
        expect(buildEnvelope(parsed.recordText, parsed.signatureKind, parsed.signature)).toBe(
          envelope,
        );
      }),
      { numRuns: 1000 },
    );
  });

  it('writes the spec letter of each signature kind', () => {
    const text = recordTextOf(record);
    const sig = encodeBase64Url(signature);
    for (const [kind, letter] of [
      ['ANDROID_P256', 'a'],
      ['SECURE_ENCLAVE', 's'],
      ['APP_ATTEST', 'i'],
    ] as const) {
      expect(buildEnvelope(text, kind, signature), kind).toBe(`IUY1.${text}.${letter}.${sig}`);
      expect(parseEnvelope(`IUY1.${text}.${letter}.${sig}`), letter).toMatchObject({
        signatureKind: kind,
      });
    }
  });

  it('signs the ASCII bytes of the record text', () => {
    const text = recordTextOf(record);
    expect(signedBytesOf(text)).toEqual(utf8Bytes(text));
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('writes the receipt scan body once, as version 1 JSON in a fixed field order', () => {
    const body = scanBodyOf(valid, '01890a5d-ac96-7000-8000-000000000009');
    expect(body).toBe(
      `{"v":1,"envelope":"${valid}","lecturerId":"01890a5d-ac96-7000-8000-000000000009"}`,
    );
    expect(scanBodyOf(valid, '01890a5d-ac96-7000-8000-000000000009')).toBe(body);
  });

  it('keeps an unknown field in the parsed record for the schema to drop', () => {
    const parsed = parseEnvelope(
      buildEnvelope(recordTextOf({ ...record, laterField: 'x' }), 'APP_ATTEST', signature),
    );
    expect(parsed).toMatchObject({ record: { laterField: 'x' }, signatureKind: 'APP_ATTEST' });
  });
});

describe('envelope refusals', () => {
  it('refuses a non-canonical record text or signature, whatever the record', () => {
    fc.assert(
      fc.property(records, fc.uint8Array({ minLength: 1, maxLength: 40 }), (fields, bytes) => {
        const text = recordTextOf(fields);
        const sig = encodeBase64Url(bytes);
        fc.pre(`IUY1.${text}.s.${sig}`.length <= ENVELOPE_MAX_BYTES);
        // A last letter with its unused low bits set: same length, not canonical.
        const bend = (part: string) =>
          part.length % 4 === 0 ? null : `${part.slice(0, -1)}${part.endsWith('B') ? 'C' : 'B'}`;
        const bentText = bend(text);
        const bentSig = bend(sig);
        if (bentText !== null) {
          expect(parseEnvelope(`IUY1.${bentText}.s.${sig}`)).toEqual({ error: 'INVALID' });
        }
        if (bentSig !== null) {
          expect(parseEnvelope(`IUY1.${text}.s.${bentSig}`)).toEqual({ error: 'INVALID' });
        }
        // Ground control: the unbent parts parse.
        expect(parseEnvelope(`IUY1.${text}.s.${sig}`)).not.toHaveProperty('error');
      }),
      { numRuns: 1000 },
    );
  });

  it('takes 1273 bytes and refuses 1274', () => {
    // An envelope of exactly this length whose parts are all canonical: a run of A letters
    // decodes to zero bytes unless its length is 1 modulo 4, so the record grows a little
    // until the rest avoids that; three growth steps always cover two other remainders.
    const sized = (length: number) => {
      for (let pad = 0; pad < 8; pad += 1) {
        const head = `IUY1.${recordTextOf({ ...record, pad: 'x'.repeat(pad) })}.i.`;
        const rest = length - head.length;
        if (rest % 4 !== 1) return `${head}${'A'.repeat(rest)}`;
      }
      throw new Error('no envelope of this length');
    };
    const fits = sized(ENVELOPE_MAX_BYTES);
    const over = sized(ENVELOPE_MAX_BYTES + 1);
    expect([fits.length, over.length]).toEqual([1273, 1274]);
    expect(parseEnvelope(fits)).toMatchObject({ signatureKind: 'APP_ATTEST' });
    expect(parseEnvelope(over)).toEqual({ error: 'INVALID' });
    // The builder holds the same line.
    expect(builtOfLength(ENVELOPE_MAX_BYTES)()).toHaveLength(1273);
    expect(builtOfLength(ENVELOPE_MAX_BYTES + 1)).toThrow(RangeError);
  });

  it('tells a broken frame, a broken text and a newer version apart', () => {
    const text = recordTextOf(record);
    const sig = encodeBase64Url(signature);
    const textOf = (value: string) => encodeBase64Url(utf8Bytes(value));
    for (const broken of [
      `IUX1.${text}.a.${sig}`,
      `XIUY1.${text}.a.${sig}`,
      // Not a newer format either: the prefix starts the envelope.
      `XIUY2.${text}.a.${sig}`,
      `IUY1.${text}.x.${sig}`,
      `IUY1.${text}.a.`,
      `IUY1.${text}.a.${sig}.more`,
      `IUY1.${text}.a`,
      `IUY01.${text}.a.${sig}`,
      `IUY1.${text}.a.${sig} `,
      `IUY1.${text}.a.${sig}ı`,
      '',
    ]) {
      expect(parseEnvelope(broken), broken).toEqual({ error: 'INVALID' });
    }
    for (const json of ['[1,2]', '"text"', 'null', '{"a":', 'not json']) {
      expect(parseEnvelope(`IUY1.${textOf(json)}.a.${sig}`), json).toEqual({
        error: 'TEXT_INVALID',
      });
    }
    // Bytes that are not UTF-8.
    const latin = encodeBase64Url(new Uint8Array([0x7b, 0xff, 0x7d]));
    expect(parseEnvelope(`IUY1.${latin}.a.${sig}`)).toEqual({ error: 'TEXT_INVALID' });
    expect(parseEnvelope(`IUY2.${text}.a.${sig}`)).toEqual({ error: 'VERSION_UNKNOWN' });
    expect(parseEnvelope(`IUY12.anything`)).toEqual({ error: 'VERSION_UNKNOWN' });
    const newer = recordTextOf({ ...record, v: 2 });
    expect(parseEnvelope(`IUY1.${newer}.a.${sig}`)).toEqual({ error: 'VERSION_UNKNOWN' });
    // Ground control: the same envelope with v 1 parses.
    expect(parseEnvelope(valid)).toMatchObject({ signatureKind: 'ANDROID_P256' });
    // A v that is no whole number above 1 is not newer: the record parses and the schema
    // refuses it, so the phone is not told to wait for a server update that never helps.
    const { v: _v, ...noVersion } = record;
    for (const fields of [
      { ...record, v: 1.5 },
      { ...record, v: 1e300 },
      { ...record, v: 0 },
      { ...record, v: '2' },
      noVersion,
    ]) {
      const parsed = parseEnvelope(`IUY1.${recordTextOf(fields)}.a.${sig}`);
      expect(parsed, JSON.stringify(fields)).toMatchObject({ record: { id: record.id } });
    }
  });

  it('refuses to build from parts outside their form', () => {
    const text = recordTextOf(record);
    expect(() => buildEnvelope(text, 'OTHER' as SignatureKind, signature)).toThrow(RangeError);
    expect(() => buildEnvelope('', 'APP_ATTEST', signature)).toThrow(RangeError);
    expect(() => buildEnvelope('A', 'APP_ATTEST', signature)).toThrow(RangeError);
    expect(() => buildEnvelope(text, 'APP_ATTEST', new Uint8Array())).toThrow(RangeError);
  });
});

describe('envelope on the phone engine', () => {
  it('works without Buffer, atob, btoa, TextEncoder and TextDecoder', () => {
    const globals = globalThis as Record<string, unknown>;
    const names = ['Buffer', 'atob', 'btoa', 'TextEncoder', 'TextDecoder'];
    const saved = names.map((name) => globals[name]);
    try {
      for (const name of names) delete globals[name];
      const envelope = buildEnvelope(
        recordTextOf({ ...record, timeZone: 'İstanbul' }),
        'SECURE_ENCLAVE',
        signature,
      );
      expect(parseEnvelope(envelope)).toMatchObject({ record: { timeZone: 'İstanbul' } });
    } finally {
      names.forEach((name, index) => {
        globals[name] = saved[index];
      });
    }
  });
});
