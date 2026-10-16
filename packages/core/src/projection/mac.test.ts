import { createHmac } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SHORT_CODE_MAX } from '../courses/sessions.ts';
import {
  MESSAGE_PURPOSES,
  QR_VERSION,
  SLICE_MAX,
  SLOT_MAX,
  VERIFICATION_CODE_DIGITS,
} from './constants.ts';
import {
  codeMessage,
  type Hmac,
  qrContentFor,
  qrVerificationCode,
  verificationCode,
} from './mac.ts';
import { type CodeFields, parseQrContent } from './qr-content.ts';

const KEY = Buffer.from('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', 'hex');
const hmacWith =
  (key: Uint8Array): Hmac =>
  (message) =>
    new Uint8Array(createHmac('sha256', key).update(message).digest());
const fields: CodeFields = { version: 1, slot: 3, shortCode: 1_234_567_890, slice: 351_234_567 };

// The oracles, in the test file only: 8 bytes as a BigInt in 20 digits, and the message
// written with Node's 64-bit writer.
const bigIntCode = (bytes: Uint8Array) =>
  bytes
    .subarray(0, 8)
    .reduce((value, byte) => value * 256n + BigInt(byte), 0n)
    .toString()
    .padStart(VERIFICATION_CODE_DIGITS, '0');
const oracleMessage = (purpose: number, value: CodeFields) => {
  const message = Buffer.alloc(19);
  message.writeUInt8(purpose, 0);
  message.writeUInt8(value.version, 1);
  message.writeUInt8(value.slot, 2);
  message.writeBigUInt64BE(BigInt(value.shortCode), 3);
  message.writeBigUInt64BE(BigInt(value.slice), 11);
  return new Uint8Array(message);
};
const fieldsArbitrary = fc.record({
  version: fc.constant(QR_VERSION),
  slot: fc.integer({ min: 0, max: SLOT_MAX }),
  shortCode: fc.integer({ min: 1, max: SHORT_CODE_MAX }),
  slice: fc.integer({ min: 0, max: SLICE_MAX }),
});

describe('verification code (D11)', () => {
  it('lays out the 19 message bytes: purpose, version, slot, big-endian short code and slice', () => {
    expect(MESSAGE_PURPOSES).toEqual({ QR: 1, BACKUP_CODE: 2, BLUETOOTH: 3 });
    expect([...codeMessage('QR', fields)]).toEqual([
      1, 1, 3, 0, 0, 0, 0, 0x49, 0x96, 0x02, 0xd2, 0, 0, 0, 0, 0x14, 0xef, 0x6a, 0x07,
    ]);
    fc.assert(
      fc.property(
        fieldsArbitrary,
        fc.constantFrom('QR', 'BACKUP_CODE', 'BLUETOOTH'),
        (value, purpose) => {
          expect(codeMessage(purpose, value)).toEqual(
            oracleMessage(MESSAGE_PURPOSES[purpose], value),
          );
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('writes eight 0xFF bytes and eight 0x00 bytes as the spec shows, as the BigInt oracle does', () => {
    expect(verificationCode(new Uint8Array(8).fill(0xff))).toBe('18446744073709551615');
    expect(verificationCode(new Uint8Array(8))).toBe('00000000000000000000');
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 8, maxLength: 40 }), (digest) => {
        expect(verificationCode(digest)).toBe(bigIntCode(digest));
      }),
      { numRuns: 10_000 },
    );
  });

  it("is HMAC-SHA256's first 8 bytes in 20 digits, and each purpose gives its own message", () => {
    const expected = bigIntCode(
      new Uint8Array(createHmac('sha256', KEY).update(codeMessage('QR', fields)).digest()),
    );
    expect(qrVerificationCode(fields, hmacWith(KEY))).toBe(expected);
    expect(codeMessage('BACKUP_CODE', fields)[0]).toBe(2);
    expect(codeMessage('BACKUP_CODE', fields).subarray(1)).toEqual(
      codeMessage('QR', fields).subarray(1),
    );
    // Another key gives another code.
    expect(qrVerificationCode(fields, hmacWith(KEY.subarray(1)))).not.toBe(expected);
  });

  it('draws content the server reads back and checks against the same key', () => {
    fc.assert(
      fc.property(fieldsArbitrary, (value) => {
        const hmac = hmacWith(KEY);
        const parsed = parseQrContent(qrContentFor(value, hmac));
        expect(parsed.ok && parsed.fields).toEqual({
          ...value,
          verificationCode: qrVerificationCode(value, hmac),
        });
      }),
      { numRuns: 1_000 },
    );
  });

  it('refuses a short digest, an unknown purpose and fields outside the layout', () => {
    expect(() => verificationCode(new Uint8Array(7))).toThrow(RangeError);
    expect(verificationCode(new Uint8Array(8))).toHaveLength(20);
    expect(() => codeMessage('LATER' as 'QR', fields)).toThrow(RangeError);
    expect(() => codeMessage(Symbol('later') as unknown as 'QR', fields)).toThrow(RangeError);
    expect(() => codeMessage('QR', { ...fields, slot: 10 })).toThrow(RangeError);
    expect(() => qrContentFor({ ...fields, version: 2 }, hmacWith(KEY))).toThrow(RangeError);
  });
});
