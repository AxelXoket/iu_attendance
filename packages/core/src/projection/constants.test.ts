import { describe, expect, it } from 'vitest';
import {
  DELAY_LIMIT_DEFAULTS_MS,
  LECTERN_CODE_SLICES,
  LECTERN_STATUSES,
  QR_DELAY_RESULTS,
  QR_PARSE_ERRORS,
  QR_VERIFICATION_RESULTS,
} from './constants.ts';

describe('projection result dictionaries (D11 DOGRULAMA, GECIKME)', () => {
  it('verify with VALID first, then the parse errors, then the later checks, 12 codes in all', () => {
    expect(QR_VERIFICATION_RESULTS).toEqual([
      'VALID',
      'MALFORMED',
      'VERSION_UNKNOWN',
      'SESSION_MISMATCH',
      'KEY_NOT_FOUND',
      'KEY_RETIRED',
      'KEY_COMPROMISED',
      'NO_DOWNLOAD_RECORD',
      'MAC_INVALID',
      'BACKUP_CODE_MISMATCH',
      'BACKUP_CODE_LIMIT',
      'NONE',
    ]);
    expect(QR_VERIFICATION_RESULTS.slice(1, 3)).toEqual(QR_PARSE_ERRORS);
  });

  it('have 11 delay codes and 7 lectern states, each once', () => {
    expect(QR_DELAY_RESULTS).toEqual([
      'NORMAL',
      'IN_REVIEW',
      'REJECTED',
      'SCANNED_BEFORE',
      'OUTSIDE_DISPLAY',
      'PENDING',
      'CLOCK_UNVERIFIED',
      'NO_LECTURER_CLOCK',
      'LECTURER_ANCHORS_DIVERGE',
      'KEY_REVOKED',
      'ANCHORS_STALE',
    ]);
    expect(LECTERN_STATUSES).toEqual([
      'AWAITING_PAIRING',
      'CODE_EXPIRED',
      'ATTENDANCE_NOT_OPEN',
      'CONNECTED',
      'ATTENDANCE_CLOSED',
      'SERVER_CLOCK_BROKEN',
      'CLOSED',
    ]);
  });

  it('let the lectern page hold the current slice and six ahead', () => {
    expect(LECTERN_CODE_SLICES).toBe(1 + 6);
  });

  it("hold the delay rule's limits as the plan states them", () => {
    expect(DELAY_LIMIT_DEFAULTS_MS).toEqual({
      normal: 10_000,
      backupCodeNormal: 20_000,
      reject: 30_000,
      projectionTolerance: 1_000,
    });
  });
});
