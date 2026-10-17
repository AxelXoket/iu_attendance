import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hmac } from '../testing/hmac.ts';
import { BACKUP_CODE_DIGITS, backupCode, backupCodeFor } from './backup-code.ts';
import { MESSAGE_PURPOSES } from './constants.ts';
import { codeMessage, qrVerificationCode } from './mac.ts';
import type { CodeFields } from './qr-content.ts';

const fields: CodeFields = { version: 1, slot: 3, shortCode: 1_234_567_890, slice: 351_234_567 };

// The oracle, in the test file only: the first 8 bytes as a BigInt, modulo 1,000,000.
const bigIntBackupCode = (bytes: Uint8Array) =>
  (bytes.subarray(0, 8).reduce((value, byte) => value * 256n + BigInt(byte), 0n) % 1_000_000n)
    .toString()
    .padStart(6, '0');

describe('Yedek kod 8 baytın 1.000.000a göre kalanıdır (the backup code is 8 bytes mod 1,000,000)', () => {
  it('equals the BigInt oracle for any 8 bytes and is exactly 6 digits', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 8, maxLength: 8 }), (bytes) => {
        const code = backupCode(bytes);
        expect(code).toBe(bigIntBackupCode(bytes));
        expect(code).toMatch(/^[0-9]{6}$/);
      }),
      { numRuns: 5000 },
    );
    expect(BACKUP_CODE_DIGITS).toBe(6);
  });

  it('gives the known values of eight 0xFF bytes and eight zero bytes', () => {
    expect(backupCode(new Uint8Array(8).fill(0xff))).toBe('551615');
    expect(backupCode(new Uint8Array(8))).toBe('000000');
  });

  it('reads the first 8 bytes of a longer digest only', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 8, maxLength: 8 }),
        fc.uint8Array({ minLength: 0, maxLength: 24 }),
        (head, tail) => {
          expect(backupCode(new Uint8Array([...head, ...tail]))).toBe(backupCode(head));
        },
      ),
    );
  });

  it('rejects a digest shorter than 8 bytes', () => {
    expect(() => backupCode(new Uint8Array(7))).toThrow(RangeError);
    // Ground control: 8 bytes are enough.
    expect(backupCode(new Uint8Array(8))).toBe('000000');
  });

  it('draws the code from the message with the backup code purpose', () => {
    const message = codeMessage('BACKUP_CODE', fields);
    expect(message[0]).toBe(MESSAGE_PURPOSES.BACKUP_CODE);
    expect(backupCodeFor(fields, hmac)).toBe(bigIntBackupCode(hmac(message)));
    // The test vector the lecturer's phone runs too.
    expect(backupCodeFor(fields, hmac)).toBe('110200');
    // The QR code of the same fields comes from another message, so it is not this code
    // with more digits.
    expect(qrVerificationCode(fields, hmac).endsWith(backupCodeFor(fields, hmac))).toBe(false);
  });
});
