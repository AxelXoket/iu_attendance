import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hmac } from '../testing/hmac.ts';
import { backupCodeFor } from './backup-code.ts';
import {
  type BluetoothWindow,
  bluetoothCandidateSlices,
  bluetoothCode,
  bluetoothCodeFor,
  bluetoothResult,
  bluetoothSlice,
  type SeenCode,
} from './bluetooth.ts';
import {
  BLUETOOTH_CODE,
  BLUETOOTH_CODE_HEX_DIGITS,
  BLUETOOTH_RESULTS,
  MESSAGE_PURPOSES,
  SLICE_MAX,
} from './constants.ts';
import { codeMessage, qrVerificationCode } from './mac.ts';
import type { CodeFields } from './qr-content.ts';

// 2025-08-26T01:47:15Z in 15-second slices.
const fields: CodeFields = { version: 1, slot: 3, shortCode: 1_234_567_890, slice: 117_078_189 };

const windowArb: fc.Arbitrary<BluetoothWindow> = fc.record({
  sliceMs: fc.integer({ min: 10_000, max: 15_000 }),
  studentMarginMs: fc.integer({ min: 0, max: 60_000 }),
  lecturerMarginMs: fc.integer({ min: 0, max: 60_000 }),
});
const instantArb = fc.integer({ min: 0, max: 4_102_444_800_000 });

describe('the Bluetooth code (D11-B26)', () => {
  it('counts slices of the given length from the epoch', () => {
    expect(bluetoothSlice(1_756_172_835_000, 15_000)).toBe(117_078_189);
    expect(bluetoothSlice(14_999, 15_000)).toBe(0);
    expect(bluetoothSlice(15_000, 15_000)).toBe(1);
    expect(bluetoothSlice(25_000, 10_000)).toBe(2);
    for (const [instant, length] of [
      [-1, 15_000],
      [0.5, 15_000],
      [0, 0],
      [15_000, -15_000],
      [0, 1.5],
      [(SLICE_MAX + 1) * 10_000, 10_000],
    ] as const) {
      expect(() => bluetoothSlice(instant, length)).toThrow(RangeError);
    }
    // The last slice the layout carries is taken.
    expect(bluetoothSlice(SLICE_MAX * 10_000, 10_000)).toBe(SLICE_MAX);
  });

  it('is the first 8 digest bytes in 16 lowercase hex digits', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 8, maxLength: 40 }), (digest) => {
        const code = bluetoothCode(digest);
        expect(code).toBe(Buffer.from(digest.subarray(0, 8)).toString('hex'));
        expect(code).toMatch(BLUETOOTH_CODE);
        // The record schema reads the same pattern: upper case is not a code.
        if (/[a-f]/.test(code)) expect(code.toUpperCase()).not.toMatch(BLUETOOTH_CODE);
        expect(code).toHaveLength(BLUETOOTH_CODE_HEX_DIGITS);
      }),
    );
    expect(bluetoothCode(new Uint8Array(8).fill(0xab))).toBe('abababababababab');
    expect(() => bluetoothCode(new Uint8Array(7))).toThrow(RangeError);
  });

  it('draws the code from the message with the Bluetooth purpose', () => {
    const message = codeMessage('BLUETOOTH', fields);
    expect(message[0]).toBe(MESSAGE_PURPOSES.BLUETOOTH);
    expect(bluetoothCodeFor(fields, hmac)).toBe(bluetoothCode(hmac(message)));
    // The test vector the lecturer's phone runs too.
    expect(bluetoothCodeFor(fields, hmac)).toBe('774c1f4dd1befd77');
  });

  it('comes from its own message, not the QR or backup code one of the same fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        fc.integer({ min: 1, max: 9_999_999_999 }),
        fc.integer({ min: 0, max: 999_999_999 }),
        (slot, shortCode, slice) => {
          const same: CodeFields = { version: 1, slot, shortCode, slice };
          // The whole 8 bytes differ; a 6-digit backup code may share a remainder by chance.
          const bluetooth = bluetoothCodeFor(same, hmac);
          expect(bluetooth).not.toBe(bluetoothCode(hmac(codeMessage('QR', same))));
          expect(bluetooth).not.toBe(bluetoothCode(hmac(codeMessage('BACKUP_CODE', same))));
          expect(BigInt(qrVerificationCode(same, hmac))).not.toBe(BigInt(`0x${bluetooth}`));
          expect(backupCodeFor(same, hmac)).toMatch(/^[0-9]{6}$/);
        },
      ),
    );
  });
});

describe('the candidate Bluetooth slices', () => {
  it('are exactly the slices that start within one slice and both margins of the record', () => {
    fc.assert(
      fc.property(instantArb, windowArb, (recordAtMs, window) => {
        const reachMs = window.sliceMs + window.studentMarginMs + window.lecturerMarginMs;
        const within = (slice: number) =>
          slice >= 0 && Math.abs(slice * window.sliceMs - recordAtMs) <= reachMs;
        const slices = bluetoothCandidateSlices(recordAtMs, window);
        expect(slices.length).toBeGreaterThan(0);
        for (const slice of slices) expect(within(slice)).toBe(true);
        slices.forEach((slice, index) => {
          if (index > 0) expect(slice).toBe((slices[index - 1] as number) + 1);
        });
        // Ground control: the neighbours on either side are out.
        expect(within((slices[0] as number) - 1)).toBe(false);
        expect(within((slices.at(-1) as number) + 1)).toBe(false);
      }),
      { numRuns: 2000 },
    );
  });

  it('takes a slice that starts exactly at the reach and none a millisecond past it', () => {
    const window = { sliceMs: 15_000, studentMarginMs: 2_000, lecturerMarginMs: 3_000 };
    // Reach 20 s: from a record at 100 s, slices starting at 80 s to 120 s.
    expect(bluetoothCandidateSlices(100_000, window).map((slice) => slice * 15_000)).toEqual([
      90_000, 105_000, 120_000,
    ]);
    expect(bluetoothCandidateSlices(95_000, window).map((slice) => slice * 15_000)).toEqual([
      75_000, 90_000, 105_000,
    ]);
    expect(bluetoothCandidateSlices(95_001, window).map((slice) => slice * 15_000)).toEqual([
      90_000, 105_000,
    ]);
    // Near the epoch no slice is negative.
    expect(bluetoothCandidateSlices(1_000, window)).toEqual([0, 1]);
  });

  it('rejects values that are not whole milliseconds', () => {
    const window = { sliceMs: 15_000, studentMarginMs: 0, lecturerMarginMs: 0 };
    for (const bad of [
      { sliceMs: 0 },
      { sliceMs: -15_000 },
      { sliceMs: 1.5 },
      { sliceMs: 2 ** 53 },
      { studentMarginMs: -1 },
      { studentMarginMs: 0.5 },
      { studentMarginMs: Number.NaN },
      { lecturerMarginMs: -1 },
      { lecturerMarginMs: Number.NaN },
    ]) {
      expect(() => bluetoothCandidateSlices(100_000, { ...window, ...bad })).toThrow(RangeError);
      // At the epoch no slice is past the layout, so only the input check can refuse.
      expect(() => bluetoothCandidateSlices(0, { ...window, ...bad })).toThrow(RangeError);
    }
    expect(() => bluetoothCandidateSlices(-1, window)).toThrow(RangeError);
    expect(() => bluetoothCandidateSlices(0.5, window)).toThrow(RangeError);
    // A slice past the layout's nine digits is refused, not handed to the message.
    expect(() => bluetoothCandidateSlices(SLICE_MAX * 15_000, window)).toThrow(RangeError);
    // Positive control: a window whose last slice is the last one the layout carries is taken.
    expect(bluetoothCandidateSlices((SLICE_MAX - 1) * 15_000, window).at(-1)).toBe(SLICE_MAX);
    // Ground control: the same window is taken.
    expect(bluetoothCandidateSlices(100_000, window)).toEqual([6, 7]);
  });
});

describe('the Bluetooth result', () => {
  const expected = new Set(['00000000000000aa', '00000000000000bb']);
  const seen = (code: string, rssi: number): SeenCode => ({ code, rssi });

  it('is NO_BLUETOOTH without a scan, whether or not a display covers the record', () => {
    for (const displayCovers of [true, false]) {
      expect(bluetoothResult({ seen: null, displayCovers, expected })).toEqual({
        result: 'NO_BLUETOOTH',
        bestRssi: null,
      });
    }
  });

  it('waits for a covering display record before it judges a scan', () => {
    // Before the lecturer's display record arrives nothing is expected yet: a scan of any
    // codes, or of none, waits rather than becoming NOT_SEEN for good.
    for (const scan of [[seen('00000000000000cc', -60)], []]) {
      expect(bluetoothResult({ seen: scan, displayCovers: false, expected: new Set() })).toEqual({
        result: 'PENDING',
        bestRssi: null,
      });
    }
    expect(
      bluetoothResult({ seen: [seen('00000000000000aa', -60)], displayCovers: false, expected }),
    ).toEqual({ result: 'PENDING', bestRssi: null });
  });

  it('is SEEN with the strongest matching signal, ignoring codes of no candidate', () => {
    const scan = [
      seen('00000000000000aa', -80),
      seen('00000000000000cc', -30),
      seen('00000000000000bb', -55),
      seen('00000000000000aa', -70),
    ];
    expect(bluetoothResult({ seen: scan, displayCovers: true, expected })).toEqual({
      result: 'SEEN',
      bestRssi: -55,
    });
  });

  it('is NOT_SEEN when no seen code is expected, an empty scan included', () => {
    for (const scan of [[seen('00000000000000cc', -30)], []]) {
      expect(bluetoothResult({ seen: scan, displayCovers: true, expected })).toEqual({
        result: 'NOT_SEEN',
        bestRssi: null,
      });
    }
    // Ground control: the same scan with its code expected is SEEN.
    expect(
      bluetoothResult({
        seen: [seen('00000000000000cc', -30)],
        displayCovers: true,
        expected: new Set(['00000000000000cc']),
      }),
    ).toEqual({ result: 'SEEN', bestRssi: -30 });
  });

  it('gives only values of the result list', () => {
    fc.assert(
      fc.property(
        fc.option(
          fc.array(
            fc.record({
              code: fc.constantFrom('00000000000000aa', '00000000000000bb', '00000000000000cc'),
              rssi: fc.integer({ min: -127, max: 20 }),
            }),
            { maxLength: 32 },
          ),
        ),
        fc.boolean(),
        (scan, displayCovers) => {
          const { result, bestRssi } = bluetoothResult({ seen: scan, displayCovers, expected });
          expect(BLUETOOTH_RESULTS).toContain(result);
          expect(bestRssi === null).toBe(result !== 'SEEN');
        },
      ),
    );
  });
});
