import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CORRECTION_REASONS } from './catalog.ts';
import { DocumentNumberError } from './document-number.ts';
import {
  DIGEST_DOCUMENT_NUMBER_FIELD,
  type DigestFields,
  type DigestValue,
  requestDigest,
} from './request-digest.ts';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const nodeSha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

// [1, <hole>, 2]: an array with nothing at index 1.
const holey = (): unknown[] => {
  const list: unknown[] = [1];
  list[2] = 2;
  return list;
};

// Every key order at every depth: reverses the keys of each object.
const reverseKeys = (value: DigestValue): DigestValue => {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, member]) => [key, reverseKeys(member)]),
    );
  }
  return value;
};

const fieldsArb = fc.record({
  id: fc.uuid(),
  sessionId: fc.uuid(),
  reasonCode: fc.constantFrom(...CORRECTION_REASONS.map((entry) => entry.code)),
  theoryHours: fc.option(fc.integer({ min: 0, max: 24 }), { nil: null }),
  practiceHours: fc.option(fc.integer({ min: 0, max: 24 }), { nil: null }),
  [DIGEST_DOCUMENT_NUMBER_FIELD]: fc.option(fc.constantFrom('Şube Kararı 12', 'ÖİŞ 2026/7'), {
    nil: null,
  }),
  record: fc.option(fc.record({ termId: fc.uuid(), recordId: fc.uuid() }), { nil: null }),
});

describe('Request digest is deterministic', () => {
  it('gives the same 32 bytes whatever the field order at any depth', () => {
    fc.assert(
      fc.property(fieldsArb, (fields) => {
        const reversed = reverseKeys(fields) as DigestFields;
        expect(JSON.stringify(reversed)).not.toBe(JSON.stringify(fields));
        const digest = requestDigest(fields);
        expect(digest).toHaveLength(32);
        expect(requestDigest(reversed)).toEqual(digest);
      }),
      { numRuns: 1000 },
    );
  });

  it('tells a null field from a resolved value', () => {
    fc.assert(
      fc.property(fieldsArb, fc.integer({ min: 0, max: 24 }), (fields, hours) => {
        const withNull = { ...fields, theoryHours: null };
        expect(requestDigest({ ...withNull, theoryHours: hours })).not.toEqual(
          requestDigest(withNull),
        );
      }),
      { numRuns: 1000 },
    );
  });

  it('gives the same digest for the NFC and NFD spelling of a document number', () => {
    fc.assert(
      fc.property(fieldsArb, (fields) => {
        const nfd = {
          ...fields,
          [DIGEST_DOCUMENT_NUMBER_FIELD]: 'Şube Kararı 12'.normalize('NFD'),
        };
        const nfc = { ...fields, [DIGEST_DOCUMENT_NUMBER_FIELD]: 'Şube Kararı 12' };
        expect(requestDigest(nfd)).toEqual(requestDigest(nfc));
      }),
      { numRuns: 1000 },
    );
  });

  it('gives a different digest for a different reason code', () => {
    fc.assert(
      fc.property(
        fieldsArb,
        fc.constantFrom(...CORRECTION_REASONS.map((entry) => entry.code)),
        (fields, other) => {
          fc.pre(other !== fields.reasonCode);
          expect(requestDigest({ ...fields, reasonCode: other })).not.toEqual(
            requestDigest(fields),
          );
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('digests a reversal by its kind and target only', () => {
    const target = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e';
    expect(requestDigest({ kind: 'REVERSAL', target })).toEqual(
      requestDigest({ target, kind: 'REVERSAL' }),
    );
    expect(requestDigest({ kind: 'REVERSAL', target })).not.toEqual(
      requestDigest({ kind: 'REVERSAL', target: target.replace('e', 'f') }),
    );
  });
});

describe('Request digest canonical form', () => {
  // A correction item as sent. The canonical text is written out by hand and hashed by
  // node:crypto, so a change to the canonical form, UTF-8 or SHA-256 turns this red:
  // stored digests would stop matching retries after a deploy.
  const correctionItem = {
    id: '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e',
    sessionId: '0192f5c4-7d2a-7b3c-8d4e-000000000001',
    rosterRowId: '0192f5c4-7d2a-7b3c-8d4e-000000000002',
    reasonCode: 'OFFICIAL_DUTY',
    theoryHours: 2,
    practiceHours: null,
    documentNumber: '  Şube   Kararı 12 ',
    record: {
      termId: '0192f5c4-7d2a-7b3c-8d4e-000000000003',
      recordId: '0192f5c4-7d2a-7b3c-8d4e-000000000004',
    },
  };
  const correctionText =
    '{"documentNumber":"Şube Kararı 12","id":"0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e","practiceHours":null,"reasonCode":"OFFICIAL_DUTY","record":{"recordId":"0192f5c4-7d2a-7b3c-8d4e-000000000004","termId":"0192f5c4-7d2a-7b3c-8d4e-000000000003"},"rosterRowId":"0192f5c4-7d2a-7b3c-8d4e-000000000002","sessionId":"0192f5c4-7d2a-7b3c-8d4e-000000000001","theoryHours":2}';
  const correctionDigest = 'f5a8de9107a1d5d7f077829350dd677542b713648d1b4752d0034632c99ee818';

  // Arrays in order, nested and empty containers, escapes, a nested document number and
  // a top-level string kept as sent, keys sorted by code unit ('B' < 'a' < 'z' < 'É').
  const structureItem = {
    z: [3, -7, 'b', null, true, false, { y: 1, x: [] }, []],
    a: { c: { e: 'é\n"\\', d: {} }, b: 'A', documentNumber: '  x  ' },
    É: 0,
    note: ' kept  as sent ',
    B: '\u{1F600}',
  };
  const structureText =
    '{"B":"\u{1F600}","a":{"b":"A","c":{"d":{},"e":"é\\n\\"\\\\"},"documentNumber":"  x  "},"note":" kept  as sent ","z":[3,-7,"b",null,true,false,{"x":[],"y":1},[]],"É":0}';
  const structureDigest = '569ef5ad73abb0a53b8a5d4a70c64cbe8ad44f1ab4f6360bb87362268d01a084';

  it.each([
    ['a correction item', correctionItem, correctionText, correctionDigest],
    ['nested values', structureItem, structureText, structureDigest],
  ])('matches the golden digest of %s', (_name, item, text, digest) => {
    // Ground control: the written text is canonical JSON and hashes to the pinned digest.
    expect(JSON.stringify(JSON.parse(text))).toBe(text);
    expect(nodeSha256(text)).toBe(digest);
    expect(hex(requestDigest(item as DigestFields))).toBe(digest);
  });

  it('keeps array order', () => {
    expect(requestDigest({ list: [1, 2] })).not.toEqual(requestDigest({ list: [2, 1] }));
    // Control: the same array gives the same digest.
    expect(requestDigest({ list: [1, 2] })).toEqual(requestDigest({ list: [1, 2] }));
  });

  it('normalises the top-level document number only', () => {
    expect(requestDigest({ documentNumber: ' A  B ' })).toEqual(
      requestDigest({ documentNumber: 'A B' }),
    );
    expect(requestDigest({ record: { documentNumber: ' A  B ' } })).not.toEqual(
      requestDigest({ record: { documentNumber: 'A B' } }),
    );
    expect(requestDigest({ note: ' A  B ' })).not.toEqual(requestDigest({ note: 'A B' }));
    expect(requestDigest({ documentNumber: null })).not.toEqual(requestDigest({}));
  });

  it('normalises the document number inside the walk: key order and the object check first', () => {
    const control = String.fromCodePoint(1);
    // courseId sorts before documentNumber, so its error comes first.
    expect(() =>
      requestDigest({ courseId: 1.5, documentNumber: control } as unknown as DigestFields),
    ).toThrow('digest value item.courseId must be a safe integer');
    expect(() => requestDigest({ documentNumber: control })).toThrow(DocumentNumberError);
    // An item that is not a plain object is refused before its document number is read.
    const inherited = Object.create({ documentNumber: ' P ' }) as DigestFields;
    expect(() => requestDigest(inherited)).toThrow('digest value item is not JSON');
    class Item {
      documentNumber = ' P ';
    }
    expect(() => requestDigest(new Item() as unknown as DigestFields)).toThrow(
      'digest value item is not JSON',
    );
    // A document number that is not an own enumerable field is not part of the item.
    const hidden = Object.defineProperty({}, 'documentNumber', { value: ' P ', enumerable: false });
    expect(requestDigest(hidden as DigestFields)).toEqual(requestDigest({}));
  });

  it('gives a no-break space in the document number the digest of a plain space', () => {
    expect(requestDigest({ documentNumber: 'A\u{A0}B' })).toEqual(
      requestDigest({ documentNumber: 'A B' }),
    );
    expect(requestDigest({ documentNumber: 'A\u{3000}B' })).toEqual(
      requestDigest({ documentNumber: 'A B' }),
    );
    // Control: nested, the same text is digested as sent.
    expect(requestDigest({ record: { documentNumber: 'A\u{A0}B' } })).not.toEqual(
      requestDigest({ record: { documentNumber: 'A B' } }),
    );
  });

  it('rejects an invalid top-level document number', () => {
    expect(() => requestDigest({ documentNumber: 'A\nB' })).toThrow(DocumentNumberError);
    // Control: the same text nested is digested as sent.
    expect(requestDigest({ record: { documentNumber: 'A\nB' } })).toHaveLength(32);
  });

  // Each bad value comes with a JSON value in the same place as its ground control.
  it.each([
    ['a fraction', { hours: 1.5 }, { hours: 1 }, 'digest value item.hours must be a safe integer'],
    ['NaN', { hours: Number.NaN }, { hours: 0 }, 'digest value item.hours must be a safe integer'],
    [
      'infinity',
      { hours: Number.POSITIVE_INFINITY },
      { hours: Number.MAX_SAFE_INTEGER },
      'digest value item.hours must be a safe integer',
    ],
    [
      'an unsafe integer',
      { hours: 2 ** 53 },
      { hours: 2 ** 53 - 1 },
      'digest value item.hours must be a safe integer',
    ],
    [
      'a nested fraction',
      { record: { n: 0.5 } },
      { record: { n: 5 } },
      'digest value item.record.n must be a safe integer',
    ],
    [
      'a fraction in an array',
      { list: [1, 0.5] },
      { list: [1, 5] },
      'digest value item.list[1] must be a safe integer',
    ],
    ['undefined', { hours: undefined }, { hours: null }, 'digest value item.hours is not JSON'],
    [
      'a nested undefined',
      { record: { n: undefined } },
      { record: { n: null } },
      'digest value item.record.n is not JSON',
    ],
    [
      'a hole in an array',
      { list: holey() },
      { list: [1, null, 2] },
      'digest value item.list[1] is not JSON',
    ],
    ['a Date', { at: new Date(0) }, { at: 0 }, 'digest value item.at is not JSON'],
    ['a Map', { map: new Map() }, { map: {} }, 'digest value item.map is not JSON'],
    ['a function', { run: () => 1 }, { run: 1 }, 'digest value item.run is not JSON'],
    [
      'a class instance',
      { error: new Error('x') },
      { error: { message: 'x' } },
      'digest value item.error is not JSON',
    ],
  ])('rejects %s', (_name, bad, good, message) => {
    expect(() => requestDigest(bad as unknown as DigestFields)).toThrow(message);
    expect(requestDigest(good as DigestFields)).toHaveLength(32);
  });

  it('accepts the edge values JSON allows (control)', () => {
    const safe = { high: Number.MAX_SAFE_INTEGER, low: -Number.MAX_SAFE_INTEGER, zero: 0 };
    expect(requestDigest(safe)).toHaveLength(32);
    const bare = Object.assign(Object.create(null) as Record<string, DigestValue>, { a: 1 });
    expect(requestDigest({ record: bare })).toEqual(requestDigest({ record: { a: 1 } }));
  });
});
