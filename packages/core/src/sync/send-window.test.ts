import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../clock/constants.ts';
import { sendWindowEndAtMs } from './send-window.ts';

// The oracle: seven days, not the rule's own constant; the dated examples pin the length.
const SEVEN_DAYS_MS = 7 * DAY_MS;
const at = (iso: string) => Date.parse(iso);
// Instants the instant schema allows, from 1970 to the last millisecond of 9999.
const instant = fc.integer({ min: 0, max: 253_402_300_799_999 - SEVEN_DAYS_MS });

describe('sendWindowEndAtMs (D06 Gonderme suresi)', () => {
  it('ends seven days after the session when the course has no unit term', () => {
    // A session ending 2026-10-16 12:50 in Istanbul (09:50 UTC).
    const end = sendWindowEndAtMs(at('2026-10-16T09:50:00.000Z'), null);
    expect(end).toBe(at('2026-10-23T09:50:00.000Z'));
  });

  it('ends at the lock when the lock comes first', () => {
    // Last day 2027-01-15, so the lock is 2027-01-16 00:00 in Istanbul (21:00 UTC).
    const lockAt = at('2027-01-15T21:00:00.000Z');
    const end = sendWindowEndAtMs(at('2027-01-12T10:00:00.000Z'), lockAt);
    expect(end).toBe(lockAt);
  });

  it('keeps the seven days when the lock is later, and either when they meet', () => {
    const sessionEnd = at('2027-01-04T10:00:00.000Z');
    const sevenDays = at('2027-01-11T10:00:00.000Z');
    expect(sendWindowEndAtMs(sessionEnd, at('2027-01-15T21:00:00.000Z'))).toBe(sevenDays);
    expect(sendWindowEndAtMs(sessionEnd, sevenDays + 1)).toBe(sevenDays);
    expect(sendWindowEndAtMs(sessionEnd, sevenDays)).toBe(sevenDays);
    expect(sendWindowEndAtMs(sessionEnd, sevenDays - 1)).toBe(sevenDays - 1);
  });

  it('is never later than either bound and is one of them', () => {
    fc.assert(
      fc.property(instant, fc.option(instant, { nil: null }), (sessionEndAtMs, lockAtMs) => {
        const end = sendWindowEndAtMs(sessionEndAtMs, lockAtMs);
        const sevenDays = sessionEndAtMs + SEVEN_DAYS_MS;
        expect(end).toBeLessThanOrEqual(sevenDays);
        if (lockAtMs === null) expect(end).toBe(sevenDays);
        else {
          expect(end).toBeLessThanOrEqual(lockAtMs);
          expect([sevenDays, lockAtMs]).toContain(end);
        }
      }),
      { numRuns: 2000 },
    );
  });

  // The suite also runs under TZ=Europe/Istanbul (pnpm test:istanbul); the instants above are
  // UTC, so both runs check the same numbers.
  it('gives the same end with Intl out of reach', () => {
    const intl = globalThis.Intl;
    try {
      Reflect.deleteProperty(globalThis, 'Intl');
      expect(typeof globalThis.Intl).toBe('undefined');
      expect(sendWindowEndAtMs(at('2026-10-16T09:50:00.000Z'), null)).toBe(
        at('2026-10-23T09:50:00.000Z'),
      );
    } finally {
      globalThis.Intl = intl;
    }
  });
});
