import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SHORT_CODE_DIGITS, SHORT_CODE_MAX } from '../courses/sessions.ts';
import {
  QR_CONTENT_LENGTH,
  QR_PARSE_ERRORS,
  QR_VERSION,
  SLICE_DIGITS,
  SLICE_MAX,
  SLOT_MAX,
  VERIFICATION_CODE_DIGITS,
} from './constants.ts';
import { verificationCode } from './mac.ts';
import { formatQrContent, parseQrContent, type QrFields } from './qr-content.ts';

const fieldsArbitrary = fc.record({
  version: fc.constant(QR_VERSION),
  slot: fc.integer({ min: 0, max: SLOT_MAX }),
  shortCode: fc.integer({ min: 1, max: SHORT_CODE_MAX }),
  slice: fc.integer({ min: 0, max: SLICE_MAX }),
  verificationCode: fc.uint8Array({ minLength: 8, maxLength: 8 }).map(verificationCode),
});
const sample: QrFields = {
  version: 1,
  slot: 3,
  shortCode: 42,
  slice: 7,
  verificationCode: '00000000000000000099',
};

describe('QR content (D11)', () => {
  it('has the layout the spec counts: 1 + 1 + 10 + 9 + 20 = 41 digits, version 1', () => {
    expect(1 + 1 + SHORT_CODE_DIGITS + SLICE_DIGITS + VERIFICATION_CODE_DIGITS).toBe(
      QR_CONTENT_LENGTH,
    );
    expect([QR_CONTENT_LENGTH, QR_VERSION, SHORT_CODE_MAX, SLICE_MAX]).toEqual([
      41, 1, 9_999_999_999, 999_999_999,
    ]);
    expect(formatQrContent(sample)).toBe('13000000004200000000700000000000000000099');
    // BICIM_BOZUK and SURUM_BILINMIYOR, by the name map.
    expect(QR_PARSE_ERRORS).toEqual(['MALFORMED', 'VERSION_UNKNOWN']);
  });

  it('writes 41 digits and reads back the same fields (10,000 runs)', () => {
    fc.assert(
      fc.property(fieldsArbitrary, (fields) => {
        const content = formatQrContent(fields);
        expect(content).toMatch(/^[0-9]{41}$/);
        expect(parseQrContent(content)).toEqual({ ok: true, fields });
      }),
      { numRuns: 10_000 },
    );
  });

  it('reads a content that is not 41 ASCII digits as MALFORMED, another version as VERSION_UNKNOWN', () => {
    const good = formatQrContent(sample);
    const malformed = [
      good.slice(1),
      `${good}0`,
      `${good}\n`,
      `${good.slice(0, 40)}a`,
      `${good.slice(0, 40)} `,
      // An Arabic-Indic digit is a digit, but not an ASCII one.
      `${good.slice(0, 40)}${String.fromCodePoint(0x0663)}`,
      '',
      // A non-digit in the version, slot, short code or slice, which Number() would not catch.
      `a${good.slice(1)}`,
      `1x${good.slice(2)}`,
      `${good.slice(0, 5)} ${good.slice(6)}`,
      `${good.slice(0, 15)}.${good.slice(16)}`,
    ];
    for (const text of malformed) {
      expect(parseQrContent(text), JSON.stringify(text)).toEqual({ ok: false, error: 'MALFORMED' });
    }
    for (const version of ['0', '2', '9']) {
      expect(parseQrContent(`${version}${good.slice(1)}`), version).toEqual({
        ok: false,
        error: 'VERSION_UNKNOWN',
      });
    }
    // A wrong length wins over an unknown version.
    expect(parseQrContent(`2${good}`)).toEqual({ ok: false, error: 'MALFORMED' });
  });

  it('reads any other 41 digits as they stand: a short code of 0 and a code above 2^64 - 1 are for the later checks', () => {
    const read = (text: string) => {
      const parsed = parseQrContent(text);
      return parsed.ok ? parsed.fields : parsed.error;
    };
    // The session check answers SESSION_MISMATCH and the MAC check MAC_INVALID (D11 table).
    expect(read(`13${'0'.repeat(10)}000000007${sample.verificationCode}`)).toEqual({
      ...sample,
      shortCode: 0,
    });
    expect(read(`130000000042000000007${'9'.repeat(20)}`)).toEqual({
      ...sample,
      verificationCode: '9'.repeat(20),
    });
    // The largest short code and slice, and the largest code a key gives.
    expect(read(`19${'9'.repeat(10)}${'9'.repeat(9)}18446744073709551615`)).toEqual({
      version: 1,
      slot: 9,
      shortCode: SHORT_CODE_MAX,
      slice: SLICE_MAX,
      verificationCode: '18446744073709551615',
    });
  });

  it('refuses to write fields outside the layout', () => {
    const bad: Partial<QrFields>[] = [
      { version: 2 },
      { slot: 10 },
      { slot: -1 },
      { slot: 1.5 },
      { shortCode: 0 },
      { shortCode: SHORT_CODE_MAX + 1 },
      { slice: -1 },
      { slice: SLICE_MAX + 1 },
      { slice: 0.5 },
      { verificationCode: '1'.repeat(19) },
      { verificationCode: '18446744073709551616' },
      { verificationCode: `${'0'.repeat(19)}a` },
    ];
    for (const patch of bad) {
      expect(() => formatQrContent({ ...sample, ...patch }), JSON.stringify(patch)).toThrow(
        RangeError,
      );
    }
    // Ground control: the largest code a key gives is written.
    expect(formatQrContent({ ...sample, verificationCode: '18446744073709551615' })).toHaveLength(
      QR_CONTENT_LENGTH,
    );
  });
});
