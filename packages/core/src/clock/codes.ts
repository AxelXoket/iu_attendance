// Clock code lists (D04): the anchor statuses, the clock status and source, and the
// window change kinds and results. Contracts re-export them; the record and window
// change tables build their CHECK lists from them; the second anchor text (D06) takes
// AFTER_RESTART from here.

/** The first anchor's status. */
export const FIRST_ANCHOR_STATUSES = [
  'VALID',
  'BEFORE_RESTART',
  'DOCUMENT_OVER_7_DAYS',
  'NO_DOCUMENT',
  'DOCUMENT_INVALID',
  'KEY_COMPROMISED',
  'SUBJECT_MISMATCH',
  'REQUEST_TOO_SLOW',
  'DURATION_INVALID',
] as const;

/** The one absent reason the phone writes into the second anchor text: a restart after the event. */
export const AFTER_RESTART = 'AFTER_RESTART';

/**
 * Why the second anchor could not be set: OTHER_DEVICE_SENT, another device sent the
 * record's package; SCAN_PATH, the record came through a scan. There is no "not set".
 */
export const SECOND_ANCHOR_ABSENT_REASONS = [
  AFTER_RESTART,
  'PACKAGE_UNSIGNED',
  'SCAN_PATH',
  'OTHER_DEVICE_SENT',
  'SYNC_BROKEN',
  'NOT_SENT',
] as const;

/** The second anchor's status, in the spec's order. */
export const SECOND_ANCHOR_STATUSES = [
  'VALID',
  AFTER_RESTART,
  'RECORD_OVER_7_DAYS',
  'PACKAGE_UNSIGNED',
  'SCAN_PATH',
  'OTHER_DEVICE_SENT',
  'SYNC_BROKEN',
  'NOT_SENT',
  'DOCUMENT_INVALID',
  'KEY_COMPROMISED',
  'SUBJECT_MISMATCH',
  'REQUEST_TOO_SLOW',
  'DURATION_INVALID',
] as const;

/** What the phone itself reports for the first anchor; a subset of FIRST_ANCHOR_STATUSES. */
export const FIRST_ANCHOR_PHONE_REPORTS = [
  'BEFORE_RESTART',
  'DOCUMENT_OVER_7_DAYS',
  'NO_DOCUMENT',
] as const;

export const CLOCK_STATUSES = ['VERIFIED', 'ANCHORS_DISAGREE', 'UNVERIFIED'] as const;

/** Where the clock comes from; NONE: no range and no estimate. */
export const CLOCK_SOURCES = [
  'BOTH_ANCHORS',
  'FIRST_ANCHOR',
  'SECOND_ANCHOR',
  'PHONE_CLOCK',
  'NONE',
] as const;

export const CHANGE_KINDS = ['WINDOW_LENGTH', 'EARLY_CLOSE'] as const;
export const WINDOW_RESULTS = ['INSIDE', 'CHANGE_SLICE', 'OLD_SCHEDULE', 'OUTSIDE'] as const;

export type FirstAnchorStatus = (typeof FIRST_ANCHOR_STATUSES)[number];
export type SecondAnchorStatus = (typeof SECOND_ANCHOR_STATUSES)[number];
export type SecondAnchorAbsentReason = (typeof SECOND_ANCHOR_ABSENT_REASONS)[number];
export type FirstAnchorPhoneReport = (typeof FIRST_ANCHOR_PHONE_REPORTS)[number];
export type ClockStatus = (typeof CLOCK_STATUSES)[number];
export type ClockSource = (typeof CLOCK_SOURCES)[number];
export type ChangeKind = (typeof CHANGE_KINDS)[number];
export type WindowResult = (typeof WINDOW_RESULTS)[number];
