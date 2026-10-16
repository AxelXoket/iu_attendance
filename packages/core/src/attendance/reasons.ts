// Item reasons (D05): the one table of why an attendance item is turned away, and the
// rule for a missing second anchor. REJECTED stores no record (a scan still keeps its
// receipt row with the reason) and the phone does not send the item again on its own,
// only once after an app or remote update: states in which the record cannot be trusted
// (D05-A01, the proposal coded until it is approved); every other signed record of the
// student's own device is stored and D07 decides it, a rejection included. RETRY leaves
// the item on the phone; waitSeconds is the server's wait, null for the phone's own
// backoff. The attendance contract builds its reject and retry lists from this table.

import type { FirstAnchorStatus, SecondAnchorStatus } from '../clock/codes.ts';
import { CONTEXT_CHANGING_CODE } from '../verification/codes.ts';
import { CONTEXT_CHANGING_WAIT_SECONDS } from '../verification/constants.ts';

const REJECT = { result: 'REJECTED', waitSeconds: null } as const;
const retry = (waitSeconds: number | null) => ({ result: 'RETRY', waitSeconds }) as const;

export const ITEM_REASONS = {
  ATTENDANCE_ENVELOPE_INVALID: REJECT,
  ATTENDANCE_TEXT_INVALID: REJECT,
  ATTENDANCE_ITEM_ID_MISMATCH: REJECT,
  ATTENDANCE_KEY_UNKNOWN: REJECT,
  ATTENDANCE_SIGNATURE_KIND_MISMATCH: REJECT,
  ATTENDANCE_KEY_DEVICE_MISMATCH: REJECT,
  ATTENDANCE_SIGNATURE_INVALID: REJECT,
  ATTENDANCE_STUDENT_DEVICE_MISMATCH: REJECT,
  ATTENDANCE_SENDER_MISMATCH: REJECT,
  ATTENDANCE_SESSION_UNKNOWN: REJECT,
  ATTENDANCE_ID_CONFLICT: REJECT,
  ATTENDANCE_SEQUENCE_CONFLICT: REJECT,
  ATTENDANCE_SESSION_RECORD_LIMIT: REJECT,
  // The last two come only from a receipt scan.
  ATTENDANCE_NOT_LECTURERS_COURSE: REJECT,
  ATTENDANCE_ACCOUNT_MISMATCH: REJECT,
  // A format newer than this server: it passes once the server is updated.
  ATTENDANCE_FORMAT_VERSION_UNKNOWN: retry(3600),
  // The wait depends on why the anchor is missing: secondAnchorRetry gives it.
  ATTENDANCE_SECOND_ANCHOR_REQUIRED: retry(null),
  // The verification module's code, passed through as it is (D07).
  [CONTEXT_CHANGING_CODE]: retry(CONTEXT_CHANGING_WAIT_SECONDS),
} as const satisfies Readonly<
  Record<string, { result: 'REJECTED' | 'RETRY'; waitSeconds: number | null }>
>;

export type ItemReason = keyof typeof ITEM_REASONS;
export type ItemReasonResult = (typeof ITEM_REASONS)[ItemReason]['result'];
type ReasonWith<Result extends ItemReasonResult> = {
  [Reason in ItemReason]: (typeof ITEM_REASONS)[Reason]['result'] extends Result ? Reason : never;
}[ItemReason];
export type RetryReason = ReasonWith<'RETRY'>;
export type RejectReason = ReasonWith<'REJECTED'>;

// Why a second anchor may be missing for now, a gap the phone can repair: the package was
// not signed, the server's clock sync was broken, the phone has not sent it. Every other
// reason is final.
const REPAIRABLE: ReadonlySet<SecondAnchorStatus> = new Set([
  'PACKAGE_UNSIGNED',
  'SYNC_BROKEN',
  'NOT_SENT',
]);
const SYNC_BROKEN_WAIT_SECONDS = 300;

/**
 * Whether a record must wait on the phone for its second anchor: its first anchor is
 * not valid and the second is missing for a reason the phone can repair. The record is
 * then not stored. A restart after the event, a record over 7 days, a bad second
 * document, a scan or another device's package are final: the record is stored.
 */
export function secondAnchorRetry(
  firstAnchorStatus: FirstAnchorStatus,
  secondAnchorStatus: SecondAnchorStatus,
): {
  readonly code: 'ATTENDANCE_SECOND_ANCHOR_REQUIRED';
  readonly waitSeconds: number | null;
} | null {
  if (firstAnchorStatus === 'VALID' || !REPAIRABLE.has(secondAnchorStatus)) return null;
  return {
    code: 'ATTENDANCE_SECOND_ANCHOR_REQUIRED',
    waitSeconds: secondAnchorStatus === 'SYNC_BROKEN' ? SYNC_BROKEN_WAIT_SECONDS : null,
  };
}
