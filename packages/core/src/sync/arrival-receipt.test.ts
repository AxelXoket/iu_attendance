import { createHash, createHmac } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  issueArrivalReceipt,
  RECEIPT_MAX_BYTES,
  type ReceiptKey,
  type ReceiptKeyState,
  type ReceiptSubject,
  readArrivalReceipt,
  verifyArrivalReceipt,
} from './arrival-receipt.ts';

// node:crypto, Buffer and BigInt are oracles here only; the code under test uses none of them.
const digestOf = (body: string) =>
  new Uint8Array(createHash('sha256').update(body, 'utf8').digest());
const u64 = (value: bigint) => {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64BE(value);
  return bytes;
};
const uuidHex = (text: string) => Buffer.from(text.replaceAll('-', ''), 'hex');
const oracleReceipt = (
  secret: Uint8Array,
  kid: string,
  subject: ReceiptSubject,
  acceptedAtMs: number,
): string => {
  const input = Buffer.concat([
    Buffer.from('esitleme.ulasma.1', 'ascii'),
    uuidHex(subject.installation),
    u64(BigInt(subject.sequence)),
    uuidHex(subject.itemId),
    Buffer.from(subject.bodyDigest),
    u64(BigInt(acceptedAtMs)),
  ]);
  const mac = createHmac('sha256', secret).update(input).digest();
  return Buffer.concat([
    Buffer.from([1, kid.length]),
    Buffer.from(kid, 'ascii'),
    u64(BigInt(acceptedAtMs)),
    mac,
  ]).toString('base64url');
};

const secret = Uint8Array.from({ length: 32 }, (_, index) => index);
const subject: ReceiptSubject = {
  installation: '0190f2a4-5b6c-7d8e-9fa0-b1c2d3e4f506',
  sequence: Number.MAX_SAFE_INTEGER,
  itemId: '0190f2a4-6000-7000-8000-0000000abcd0',
  bodyDigest: digestOf('{"kind":"attendance"}'),
};
// 2100-01-01T00:00:00Z: above 2^32, so both halves of the 8-byte field carry bits.
const LATE = 4102444800000;
const keyRing =
  (state: ReceiptKeyState) =>
  (kid: string): ReceiptKey | null =>
    kid === 'sb27b' ? { kid, secret, state } : null;

const subjectArb: fc.Arbitrary<ReceiptSubject> = fc.record({
  installation: fc.uuid(),
  sequence: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  itemId: fc.uuid(),
  bodyDigest: fc.uint8Array({ minLength: 32, maxLength: 32 }),
});
const timeArb = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });
const kidArb = fc.stringMatching(/^[a-z0-9-]{1,8}$/);

describe('arrival receipt format', () => {
  it('matches the stored vector at sequence 2^53 - 1 and a time above 2^32', () => {
    const stored = 'AQVzYjI3YgAAA7ssw9gAY4PpcK8yeMnyKfmpIIzS2o2JCP1pgzYD-y4mJVYHr4Q';
    expect(issueArrivalReceipt({ kid: 'sb27b', secret }, subject, LATE)).toBe(stored);
    // The stored vector is node:crypto's and BigInt's, not a copy of the code's output.
    expect(oracleReceipt(secret, 'sb27b', subject, LATE)).toBe(stored);
  });

  it('agrees with node:crypto and BigInt for any subject, kid and time', () => {
    fc.assert(
      fc.property(
        subjectArb,
        kidArb,
        timeArb,
        fc.uint8Array({ minLength: 1, maxLength: 64 }),
        (s, kid, time, key) => {
          expect(issueArrivalReceipt({ kid, secret: key }, s, time)).toBe(
            oracleReceipt(key, kid, s, time),
          );
        },
      ),
      { numRuns: 500 },
    );
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    'keeps a receipt with a kid of %i letters within 50 bytes and 67 letters',
    (length) => {
      const text = issueArrivalReceipt({ kid: 'k'.repeat(length), secret }, subject, LATE);
      const bytes = Buffer.from(text, 'base64url');
      expect(bytes.length).toBe(42 + length);
      expect(bytes.length).toBeLessThanOrEqual(RECEIPT_MAX_BYTES);
      expect(text.length).toBeLessThanOrEqual(67);
      expect(bytes[1]).toBe(length);
    },
  );

  it('reads back the kid and the time it carries', () => {
    fc.assert(
      fc.property(subjectArb, kidArb, timeArb, (s, kid, time) => {
        const content = readArrivalReceipt(issueArrivalReceipt({ kid, secret }, s, time));
        expect(content?.kid).toBe(kid);
        expect(content?.acceptedAtMs).toBe(time);
      }),
      { numRuns: 500 },
    );
  });
});

describe('arrival receipt check', () => {
  const receipt = issueArrivalReceipt({ kid: 'sb27b', secret }, subject, LATE);

  it('gives back the first arrival time for the same item', () => {
    expect(verifyArrivalReceipt(receipt, subject, keyRing('ACTIVE'))).toBe(LATE);
    // UUIDs in upper case are the same bytes.
    const upper = { ...subject, installation: subject.installation.toUpperCase() };
    expect(verifyArrivalReceipt(receipt, upper, keyRing('ACTIVE'))).toBe(LATE);
  });

  it('fails when any one of installation, sequence, item id, body or time changes', () => {
    let checked = 0;
    fc.assert(
      fc.property(subjectArb, subjectArb, timeArb, timeArb, (s, other, time, otherTime) => {
        const text = issueArrivalReceipt({ kid: 'sb27b', secret }, s, time);
        expect(verifyArrivalReceipt(text, s, keyRing('ACTIVE'))).toBe(time);
        const changes: ReceiptSubject[] = [
          { ...s, installation: other.installation },
          { ...s, sequence: other.sequence },
          { ...s, itemId: other.itemId },
          { ...s, bodyDigest: other.bodyDigest },
        ];
        for (const changed of changes) {
          if (
            JSON.stringify({ ...changed, bodyDigest: [...changed.bodyDigest] }) ===
            JSON.stringify({ ...s, bodyDigest: [...s.bodyDigest] })
          )
            continue;
          checked += 1;
          expect(verifyArrivalReceipt(text, changed, keyRing('ACTIVE'))).toBeNull();
        }
        // The time travels in the receipt: a receipt claiming another time fails.
        if (otherTime !== time) {
          const bytes = Buffer.from(text, 'base64url');
          bytes.set(u64(BigInt(otherTime)), 2 + 5);
          expect(
            verifyArrivalReceipt(bytes.toString('base64url'), s, keyRing('ACTIVE')),
          ).toBeNull();
        }
      }),
      { numRuns: 300 },
    );
    expect(checked).toBeGreaterThan(1000);
  });

  // The kid is not in the MAC input (D06 rule "Ulaşma makbuzu"): it names the key, and every
  // kid has its own random secret (D15), so a receipt moved to another kid fails.
  it('fails when its kid is changed to another key', () => {
    const bytes = Buffer.from(receipt, 'base64url');
    bytes.set(Buffer.from('sb27c', 'ascii'), 2);
    const otherSecret = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
    const ring = (kid: string): ReceiptKey | null =>
      kid === 'sb27b'
        ? { kid, secret, state: 'ACTIVE' }
        : { kid, secret: otherSecret, state: 'ACTIVE' };
    expect(verifyArrivalReceipt(bytes.toString('base64url'), subject, ring)).toBeNull();
    // Ground control: the untouched receipt passes with that ring.
    expect(verifyArrivalReceipt(receipt, subject, ring)).toBe(LATE);
  });

  it.each<[ReceiptKeyState, boolean]>([
    ['READY', true],
    ['ACTIVE', true],
    ['VERIFY_ONLY', true],
    ['COMPROMISED', false],
    ['DELETED', false],
    ['GENERATED', false],
  ])('treats a receipt under a %s key as valid: %s', (state, valid) => {
    expect(verifyArrivalReceipt(receipt, subject, keyRing(state))).toBe(valid ? LATE : null);
  });

  it('fails when any single byte of the receipt changes, the MAC bytes included', () => {
    const bytes = Buffer.from(receipt, 'base64url');
    let flips = 0;
    for (let index = 0; index < bytes.length; index += 1) {
      for (let bit = 0; bit < 8; bit += 1) {
        const changed = Buffer.from(bytes);
        changed[index] = (changed[index] as number) ^ (1 << bit);
        expect(
          verifyArrivalReceipt(changed.toString('base64url'), subject, keyRing('ACTIVE')),
        ).toBeNull();
        flips += 1;
      }
    }
    // Every bit of all 47 bytes, the 32 MAC bytes among them.
    expect(flips).toBe(47 * 8);
    expect(verifyArrivalReceipt(receipt, subject, keyRing('ACTIVE'))).toBe(LATE);
  });

  it('fails when any byte of a random receipt changes to any other value', () => {
    fc.assert(
      fc.property(
        subjectArb,
        timeArb,
        fc.nat(),
        fc.integer({ min: 1, max: 255 }),
        (s, time, at, delta) => {
          const bytes = Buffer.from(
            issueArrivalReceipt({ kid: 'sb27b', secret }, s, time),
            'base64url',
          );
          const index = at % bytes.length;
          bytes[index] = ((bytes[index] as number) + delta) & 0xff;
          expect(
            verifyArrivalReceipt(bytes.toString('base64url'), s, keyRing('ACTIVE')),
          ).toBeNull();
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('fails, without throwing, for a subject that is not well-formed', () => {
    expect(
      verifyArrivalReceipt(receipt, { ...subject, itemId: 'item-1' }, keyRing('ACTIVE')),
    ).toBeNull();
    const shortDigest = { ...subject, bodyDigest: subject.bodyDigest.subarray(1) };
    expect(verifyArrivalReceipt(receipt, shortDigest, keyRing('ACTIVE'))).toBeNull();
  });

  it('fails for a kid the key list no longer has, or a key filed under another kid', () => {
    expect(verifyArrivalReceipt(receipt, subject, () => null)).toBeNull();
    const misfiled = (): ReceiptKey => ({ kid: 'other', secret, state: 'ACTIVE' });
    expect(verifyArrivalReceipt(receipt, subject, misfiled)).toBeNull();
  });

  it('never throws on random text, and fails it', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ unit: 'binary', maxLength: 80 }), fc.base64String()),
        (text) => {
          expect(verifyArrivalReceipt(text, subject, keyRing('ACTIVE'))).toBeNull();
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe('arrival receipt reading', () => {
  const bytesOf = () =>
    Buffer.from(issueArrivalReceipt({ kid: 'sb27b', secret }, subject, LATE), 'base64url');

  it.each<[string, (bytes: Buffer) => Buffer]>([
    ['format 2', (b) => Buffer.concat([Buffer.from([2]), b.subarray(1)])],
    [
      'a kid length that does not fit',
      (b) => Buffer.concat([b.subarray(0, 1), Buffer.from([6]), b.subarray(2)]),
    ],
    ['a kid of length 0', (b) => Buffer.concat([Buffer.from([1, 0]), b.subarray(7)])],
    [
      'an upper-case kid',
      (b) => Buffer.concat([b.subarray(0, 2), Buffer.from('SB27B', 'ascii'), b.subarray(7)]),
    ],
    [
      'a kid with a byte above ASCII',
      (b) =>
        Buffer.concat([
          b.subarray(0, 2),
          Buffer.from([0xe9, 0x62, 0x32, 0x37, 0x62]),
          b.subarray(7),
        ]),
    ],
    ['a missing MAC byte', (b) => b.subarray(0, b.length - 1)],
    ['an extra byte', (b) => Buffer.concat([b, Buffer.from([0])])],
    ['a time of 2^53', (b) => Buffer.concat([b.subarray(0, 7), u64(2n ** 53n), b.subarray(15)])],
    ['one byte', () => Buffer.from([1])],
  ])('does not read a receipt with %s', (_name, change) => {
    expect(readArrivalReceipt(change(bytesOf()).toString('base64url'))).toBeNull();
  });

  it('reads the untouched receipt (ground control for the cases above)', () => {
    expect(readArrivalReceipt(bytesOf().toString('base64url'))?.acceptedAtMs).toBe(LATE);
  });

  it('does not read a value that is not text, or text that is not base64url', () => {
    expect(readArrivalReceipt(null)).toBeNull();
    expect(readArrivalReceipt('AQ==')).toBeNull();
  });
});

describe('arrival receipt issue', () => {
  it.each<[string, () => unknown]>([
    ['an upper-case kid', () => issueArrivalReceipt({ kid: 'SB27B', secret }, subject, LATE)],
    [
      'a kid of 9 letters',
      () => issueArrivalReceipt({ kid: 'k'.repeat(9), secret }, subject, LATE),
    ],
    ['an empty kid', () => issueArrivalReceipt({ kid: '', secret }, subject, LATE)],
    [
      'an empty secret',
      () => issueArrivalReceipt({ kid: 'k', secret: new Uint8Array(0) }, subject, LATE),
    ],
    ['a negative time', () => issueArrivalReceipt({ kid: 'k', secret }, subject, -1)],
    ['a fractional time', () => issueArrivalReceipt({ kid: 'k', secret }, subject, 1.5)],
    ['a time of 2^53', () => issueArrivalReceipt({ kid: 'k', secret }, subject, 2 ** 53)],
    [
      'an installation that is not a UUID',
      () => issueArrivalReceipt({ kid: 'k', secret }, { ...subject, installation: 'x' }, LATE),
    ],
    [
      'sequence 0',
      () => issueArrivalReceipt({ kid: 'k', secret }, { ...subject, sequence: 0 }, LATE),
    ],
    [
      'sequence 2^53',
      () => issueArrivalReceipt({ kid: 'k', secret }, { ...subject, sequence: 2 ** 53 }, LATE),
    ],
    [
      'an item id that is not a UUID',
      () => issueArrivalReceipt({ kid: 'k', secret }, { ...subject, itemId: 'item-1' }, LATE),
    ],
    [
      'a body digest of 31 bytes',
      () =>
        issueArrivalReceipt(
          { kid: 'k', secret },
          { ...subject, bodyDigest: new Uint8Array(31) },
          LATE,
        ),
    ],
  ])('throws RangeError for %s', (_name, run) => {
    expect(run).toThrow(RangeError);
  });

  it('issues for time 0 and sequence 1 (ground control for the bounds above)', () => {
    const text = issueArrivalReceipt({ kid: 'k', secret }, { ...subject, sequence: 1 }, 0);
    expect(
      verifyArrivalReceipt(text, { ...subject, sequence: 1 }, () => ({
        kid: 'k',
        secret,
        state: 'ACTIVE',
      })),
    ).toBe(0);
  });
});
