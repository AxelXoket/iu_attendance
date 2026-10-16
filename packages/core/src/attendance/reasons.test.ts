import { describe, expect, it } from 'vitest';
import { FIRST_ANCHOR_STATUSES, SECOND_ANCHOR_STATUSES } from '../clock/codes.ts';
import { CONTEXT_CHANGING_CODE } from '../verification/codes.ts';
import { CONTEXT_CHANGING_WAIT_SECONDS } from '../verification/constants.ts';
import {
  ITEM_REASONS,
  type ItemReason,
  type ItemReasonResult,
  secondAnchorRetry,
} from './reasons.ts';

const reasons = Object.keys(ITEM_REASONS) as ItemReason[];
const withResult = (result: ItemReasonResult) =>
  reasons.filter((reason) => ITEM_REASONS[reason].result === result).sort();

describe('item reasons', () => {
  it('rejects without storing only the states in which the record cannot be trusted', () => {
    // The module page's list "Saklanmadan RET" (D05-A01, the proposal coded until approved).
    expect(withResult('REJECTED')).toEqual(
      [
        'ATTENDANCE_ENVELOPE_INVALID',
        'ATTENDANCE_TEXT_INVALID',
        'ATTENDANCE_ITEM_ID_MISMATCH',
        'ATTENDANCE_KEY_UNKNOWN',
        'ATTENDANCE_SIGNATURE_KIND_MISMATCH',
        'ATTENDANCE_KEY_DEVICE_MISMATCH',
        'ATTENDANCE_SIGNATURE_INVALID',
        'ATTENDANCE_STUDENT_DEVICE_MISMATCH',
        'ATTENDANCE_SENDER_MISMATCH',
        'ATTENDANCE_SESSION_UNKNOWN',
        'ATTENDANCE_ID_CONFLICT',
        'ATTENDANCE_SEQUENCE_CONFLICT',
        'ATTENDANCE_SESSION_RECORD_LIMIT',
        'ATTENDANCE_NOT_LECTURERS_COURSE',
        'ATTENDANCE_ACCOUNT_MISMATCH',
      ].sort(),
    );
    for (const reason of withResult('REJECTED')) {
      expect(ITEM_REASONS[reason].waitSeconds).toBeNull();
    }
  });

  it('leaves three reasons on the phone with their waits', () => {
    expect(withResult('RETRY')).toEqual([
      'ATTENDANCE_FORMAT_VERSION_UNKNOWN',
      'ATTENDANCE_SECOND_ANCHOR_REQUIRED',
      CONTEXT_CHANGING_CODE,
    ]);
    expect(ITEM_REASONS.ATTENDANCE_FORMAT_VERSION_UNKNOWN.waitSeconds).toBe(3600);
    expect(ITEM_REASONS[CONTEXT_CHANGING_CODE].waitSeconds).toBe(CONTEXT_CHANGING_WAIT_SECONDS);
    // The second anchor's wait depends on the gap: secondAnchorRetry gives it.
    expect(ITEM_REASONS.ATTENDANCE_SECOND_ANCHOR_REQUIRED.waitSeconds).toBeNull();
    // Every reason is one or the other.
    expect(withResult('REJECTED').length + withResult('RETRY').length).toBe(reasons.length);
  });
});

describe('missing second anchor', () => {
  const REPAIRABLE = ['PACKAGE_UNSIGNED', 'SYNC_BROKEN', 'NOT_SENT'];

  it('holds a record on the phone only for a repairable gap with no valid first anchor', () => {
    let held = 0;
    for (const first of FIRST_ANCHOR_STATUSES) {
      for (const second of SECOND_ANCHOR_STATUSES) {
        const retry = secondAnchorRetry(first, second);
        const expected = first !== 'VALID' && REPAIRABLE.includes(second);
        expect(retry !== null, `${first} ${second}`).toBe(expected);
        if (retry === null) continue;
        held += 1;
        expect(retry).toEqual({
          code: 'ATTENDANCE_SECOND_ANCHOR_REQUIRED',
          waitSeconds: second === 'SYNC_BROKEN' ? 300 : null,
        });
      }
    }
    // Ground control: every invalid first anchor with each repairable reason.
    expect(held).toBe((FIRST_ANCHOR_STATUSES.length - 1) * REPAIRABLE.length);
  });

  it('stores the record when the gap is final', () => {
    for (const second of [
      'AFTER_RESTART',
      'RECORD_OVER_7_DAYS',
      'SCAN_PATH',
      'OTHER_DEVICE_SENT',
      'DOCUMENT_INVALID',
      'KEY_COMPROMISED',
    ] as const) {
      expect(secondAnchorRetry('NO_DOCUMENT', second), second).toBeNull();
    }
    expect(secondAnchorRetry('VALID', 'NOT_SENT')).toBeNull();
  });
});
