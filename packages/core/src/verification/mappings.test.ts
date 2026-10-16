import { describe, expect, it } from 'vitest';
import { WINDOW_RESULTS } from '../clock/codes.ts';
import { QR_DELAY_RESULTS, QR_VERIFICATION_RESULTS } from '../projection/constants.ts';
import { type DecisionReason, reasonDefinition } from './codes.ts';
import { QR_VERIFICATION_REASONS, qrDelayReason, windowReason } from './decision.ts';

// The spec's mapping tables (D07, Durumlar ve kurallar), written out as the oracle.
const WINDOW_TABLE = {
  INSIDE: [null, null],
  CHANGE_SLICE: ['SETTING_NOT_FINAL', 'OUTSIDE_WINDOW'],
  OLD_SCHEDULE: ['OLD_SCHEDULE', 'OLD_SCHEDULE'],
  OUTSIDE: ['OUTSIDE_WINDOW', 'OUTSIDE_WINDOW'],
} as const;
const VERIFICATION_TABLE = {
  VALID: null,
  MALFORMED: 'QR_MAC_INVALID',
  VERSION_UNKNOWN: 'QR_MAC_INVALID',
  SESSION_MISMATCH: 'QR_SESSION_MISMATCH',
  KEY_NOT_FOUND: 'QR_LECTURER_UNAUTHORIZED',
  KEY_RETIRED: 'QR_KEY_REVOKED',
  KEY_COMPROMISED: 'QR_KEY_COMPROMISED',
  NO_DOWNLOAD_RECORD: 'QR_KEY_REVOKED',
  MAC_INVALID: 'QR_MAC_INVALID',
  BACKUP_CODE_MISMATCH: 'BACKUP_CODE_WRONG',
  BACKUP_CODE_LIMIT: 'BACKUP_CODE_LIMIT',
  NONE: null,
} as const;
// [before the sending time ends, after it].
const DELAY_TABLE = {
  NORMAL: [null, null],
  IN_REVIEW: ['QR_DELAY_UNCERTAIN', 'QR_DELAY_UNCERTAIN'],
  REJECTED: ['QR_DELAY_EXCEEDED', 'QR_DELAY_EXCEEDED'],
  SCANNED_BEFORE: ['QR_SCANNED_EARLY', 'QR_SCANNED_EARLY'],
  OUTSIDE_DISPLAY: ['QR_OUTSIDE_DISPLAY', 'QR_OUTSIDE_DISPLAY'],
  // The display record awaited, then given up when the sending time ends.
  PENDING: ['QR_DISPLAY_PENDING', 'QR_DISPLAY_MISSING'],
  // No reason of its own: an unverified clock reaches the shared limit through its label,
  // disagreeing anchors are in review ANCHORS_DISAGREE.
  CLOCK_UNVERIFIED: [null, null],
  NO_LECTURER_CLOCK: ['QR_LECTURER_CLOCK_MISSING', 'QR_LECTURER_CLOCK_MISSING'],
  LECTURER_ANCHORS_DIVERGE: ['QR_LECTURER_CLOCK_MISSING', 'QR_LECTURER_CLOCK_MISSING'],
  KEY_REVOKED: ['QR_KEY_REVOKED', 'QR_KEY_REVOKED'],
  // In review while D11-A04 waits for the owner.
  ANCHORS_STALE: ['QR_ANCHORS_OLD', 'QR_ANCHORS_OLD'],
} as const;

const keysOf = (record: object) => Object.keys(record).sort();

describe('the window result mapping (D07 pencereEslemesi)', () => {
  it('maps every D04 window result, the setting final or not', () => {
    expect(keysOf(WINDOW_TABLE)).toEqual([...WINDOW_RESULTS].sort());
    for (const result of WINDOW_RESULTS) {
      const [notFinal, final] = WINDOW_TABLE[result];
      expect(windowReason(result, false)).toBe(notFinal);
      expect(windowReason(result, true)).toBe(final);
    }
  });

  it('throws for a value D04 does not have, so a new one cannot pass unmapped', () => {
    // The Record type breaks the build first; this is the runtime side of the same claim.
    expect(() => windowReason('SOMEWHERE' as (typeof WINDOW_RESULTS)[number], false)).toThrow(
      TypeError,
    );
  });
});

describe('the QR result mapping is complete (D07 qrEslemesi)', () => {
  it('has a row for exactly every D11 verification and delay value', () => {
    expect(keysOf(QR_VERIFICATION_REASONS)).toEqual([...QR_VERIFICATION_RESULTS].sort());
    expect(keysOf(VERIFICATION_TABLE)).toEqual([...QR_VERIFICATION_RESULTS].sort());
    expect(keysOf(DELAY_TABLE)).toEqual([...QR_DELAY_RESULTS].sort());
    // The delay side is a function like the window's; a value D11 does not have throws.
    expect(() => qrDelayReason('LATER' as (typeof QR_DELAY_RESULTS)[number], false)).toThrow(
      TypeError,
    );
  });

  it("maps every value as the spec's table does", () => {
    for (const value of QR_VERIFICATION_RESULTS) {
      expect([value, QR_VERIFICATION_REASONS[value]]).toEqual([value, VERIFICATION_TABLE[value]]);
    }
    for (const value of QR_DELAY_RESULTS) {
      const [before, after] = DELAY_TABLE[value];
      expect([value, qrDelayReason(value, false)]).toEqual([value, before]);
      expect([value, qrDelayReason(value, true)]).toEqual([value, after]);
    }
  });

  it('puts a compromised key and a missing download record in review', () => {
    const decisionOf = (reason: DecisionReason | null) =>
      reason === null ? null : reasonDefinition(reason).decision;
    expect(QR_VERIFICATION_REASONS.KEY_COMPROMISED).toBe('QR_KEY_COMPROMISED');
    expect(decisionOf(QR_VERIFICATION_REASONS.KEY_COMPROMISED)).toBe('IN_REVIEW');
    expect(QR_VERIFICATION_REASONS.NO_DOWNLOAD_RECORD).toBe('QR_KEY_REVOKED');
    expect(decisionOf(QR_VERIFICATION_REASONS.NO_DOWNLOAD_RECORD)).toBe('IN_REVIEW');
  });

  it('gives only stage 2 reasons', () => {
    const reasons = [
      ...Object.values(QR_VERIFICATION_REASONS),
      ...QR_DELAY_RESULTS.flatMap((value) => [
        qrDelayReason(value, false),
        qrDelayReason(value, true),
      ]),
    ];
    const given = reasons.filter((reason): reason is DecisionReason => reason !== null);
    expect(given.length).toBeGreaterThan(10);
    expect(given.filter((reason) => reasonDefinition(reason).stage !== 2)).toEqual([]);
  });
});
