import { describe, expect, it } from 'vitest';
import {
  DECISION_EVENTS,
  DECISION_PRIORITY,
  DECISION_REASON_CODES,
  DECISION_REASONS,
  type DecisionReason,
  HISTORY_EVENTS,
  INTERNAL_REEVALUATION_REASONS,
  IOS_ANOMALY_KINDS,
  type Labels,
  labelList,
  PROOF_REASONS,
  RECORD_DECISIONS,
  RECORD_LABELS,
  REEVALUATION_REASONS,
  REVOCATION_STATUSES,
  reasonDefinition,
  SESSION_FLAG_KINDS,
  VERIFICATION_PURPOSES,
} from './codes.ts';

const codesOf = (pick: (entry: (typeof DECISION_REASONS)[number]) => boolean) =>
  DECISION_REASONS.filter(pick).map((entry) => entry.code);

// The module page's catalog (dogrulama.html, Gerekçe kodları), by decision in table order.
const CATALOG = {
  REJECTED: [
    'CONFIRMATION_REJECTED',
    'DELETED_ACCOUNT',
    'DEVICE_NOT_APPROVED',
    'OLD_DEVICE',
    'SESSION_CANCELLED',
    'NOT_ON_ROSTER',
    'AFTER_ARRIVAL',
    'OUTSIDE_WINDOW',
    'QR_SESSION_MISMATCH',
    'QR_LECTURER_UNAUTHORIZED',
    'QR_MAC_INVALID',
    'BACKUP_CODE_WRONG',
    'QR_DELAY_EXCEEDED',
    'NOT_IN_CLASS_AT_CHECK',
    'SELF_DECLARED_REJECTED',
    'LECTURER_REJECTED',
  ],
  PENDING: [
    'CONFIRMATION_PENDING',
    'DEVICE_CHANGE_PENDING',
    'SETTING_NOT_FINAL',
    'QR_DISPLAY_PENDING',
  ],
  IN_REVIEW: [
    'AFTER_LAST_DAY',
    'CLOSED_DEVICE_TIME_UNCERTAIN',
    'DEVICE_CHANGE_EXPIRED',
    'COUNTER_NOT_INCREASED',
    'CLOCK_KEY_COMPROMISED',
    'ANCHORS_DISAGREE',
    'SERVER_SYNC_BROKEN',
    'FAULTY_VERSION',
    'OLD_SCHEDULE',
    'OVERLAPPING_SESSION',
    'NO_QR_IN_QR_CLASS',
    'QR_DELAY_UNCERTAIN',
    'QR_SCANNED_EARLY',
    'QR_OUTSIDE_DISPLAY',
    'QR_DISPLAY_MISSING',
    'QR_LECTURER_CLOCK_MISSING',
    'QR_KEY_COMPROMISED',
    'QR_KEY_REVOKED',
    'QR_ANCHORS_OLD',
    'BACKUP_CODE_LIMIT',
    'SHARED_LIMIT_EXCEEDED',
  ],
  PRESENT: ['ACCEPTED_BY_SHARED_LIMIT', 'LECTURER_APPROVED', 'SELF_DECLARED_APPROVED'],
} as const;

describe('decision reason catalog', () => {
  it('finds each reason row by its code, and refuses a code it does not have', () => {
    for (const entry of DECISION_REASONS) expect(reasonDefinition(entry.code)).toBe(entry);
    expect(() => reasonDefinition('LATER_REASON' as DecisionReason)).toThrow(
      'unknown decision reason LATER_REASON',
    );
  });

  it("holds the module page's rows, each decision in priority order", () => {
    expect([...DECISION_PRIORITY].sort()).toEqual([...RECORD_DECISIONS].sort());
    expect(Object.keys(CATALOG)).toEqual([...DECISION_PRIORITY]);
    for (const decision of DECISION_PRIORITY) {
      expect(
        codesOf((entry) => entry.decision === decision),
        decision,
      ).toEqual(CATALOG[decision]);
    }
    // The catalog runs through the decisions in priority order, never back.
    expect(DECISION_REASON_CODES).toEqual(Object.values(CATALOG).flat());
    expect(new Set(DECISION_REASON_CODES).size).toBe(DECISION_REASONS.length);
  });

  it('keeps every open flag on a decision that may still change', () => {
    // Pending and in review are open, but a record past the last day freezes in review.
    expect(
      codesOf(
        (entry) =>
          entry.openFlag !== (entry.decision === 'PENDING' || entry.decision === 'IN_REVIEW'),
      ),
    ).toEqual(['AFTER_LAST_DAY']);
    expect(codesOf((entry) => entry.openFlag)).toHaveLength(
      CATALOG.PENDING.length + CATALOG.IN_REVIEW.length - 1,
    );
  });

  it('gives the lecturer five reasons, all final', () => {
    expect(codesOf((entry) => entry.source === 'LECTURER')).toEqual([
      'NOT_IN_CLASS_AT_CHECK',
      'SELF_DECLARED_REJECTED',
      'LECTURER_REJECTED',
      'LECTURER_APPROVED',
      'SELF_DECLARED_APPROVED',
    ]);
  });

  it('keeps the QR and backup code reasons for stage 2', () => {
    // Five rejections, one wait and ten reviews.
    expect(codesOf((entry) => entry.stage === 2)).toEqual([
      'QR_SESSION_MISMATCH',
      'QR_LECTURER_UNAUTHORIZED',
      'QR_MAC_INVALID',
      'BACKUP_CODE_WRONG',
      'QR_DELAY_EXCEEDED',
      'QR_DISPLAY_PENDING',
      'NO_QR_IN_QR_CLASS',
      'QR_DELAY_UNCERTAIN',
      'QR_SCANNED_EARLY',
      'QR_OUTSIDE_DISPLAY',
      'QR_DISPLAY_MISSING',
      'QR_LECTURER_CLOCK_MISSING',
      'QR_KEY_COMPROMISED',
      'QR_KEY_REVOKED',
      'QR_ANCHORS_OLD',
      'BACKUP_CODE_LIMIT',
    ]);
  });
});

describe('verification lists', () => {
  it('name the labels, events and re-evaluation reasons of the module page', () => {
    expect(RECORD_LABELS).toEqual([
      'NO_QR',
      'SELF_DECLARED',
      'CLOCK_UNVERIFIED',
      'DEVICE_UNVERIFIED',
      'SECOND_PROFILE',
      'BACKUP_CODE',
      'VERIFIED',
    ]);
    expect(DECISION_EVENTS).toEqual([
      'SELF_DECLARED_APPROVE',
      'SELF_DECLARED_REJECT',
      'REVIEW_APPROVE',
      'REVIEW_REJECT',
      'FLAGGED_SESSION_REJECT',
      'CHANGE_DECISION',
      'NOT_IN_CLASS',
      'NOT_IN_CLASS_UNDONE',
    ]);
    expect(REEVALUATION_REASONS).toEqual([
      'CONFIRMATION_GIVEN',
      'CONFIRMATION_REJECTED',
      'DEVICE_CHANGE_APPROVED',
      'DEVICE_CHANGE_REJECTED',
      'CHANGE_CANCELLED',
      'ACCOUNT_DELETED',
      'ACCOUNT_CLOSED',
      'DEVICE_CLOSED',
      'ROSTER_CHANGED',
      'QR_DISPLAY_RECORDED',
      'KEY_COMPROMISED',
    ]);
    expect(INTERNAL_REEVALUATION_REASONS).toEqual([
      'WINDOW_CHANGED',
      'HEAD_COUNT_ARRIVED',
      'SETTING_FINAL',
      'OUTAGE_CLOSED',
      'WAIT_EXPIRED',
    ]);
  });

  it("write a record's labels as the list of those set, in the list order", () => {
    const none = Object.fromEntries(RECORD_LABELS.map((label) => [label, false])) as Labels;
    expect(labelList(none)).toEqual([]);
    expect(labelList({ ...none, VERIFIED: true, NO_QR: true })).toEqual(['NO_QR', 'VERIFIED']);
    const all = Object.fromEntries(RECORD_LABELS.map((label) => [label, true])) as Labels;
    expect(labelList(all)).toEqual(RECORD_LABELS);
    // Labels read back from a row may come in another key order; the list order holds.
    const reversed = Object.fromEntries(
      [...RECORD_LABELS].reverse().map((label) => [label, true]),
    ) as Labels;
    expect(Object.keys(reversed)).not.toEqual(RECORD_LABELS);
    expect(labelList(reversed)).toEqual(RECORD_LABELS);
  });

  it('lists every history event once: the arrival, then the reasons and the events', () => {
    expect(HISTORY_EVENTS).toEqual([
      'RECORD_ARRIVED',
      ...REEVALUATION_REASONS,
      ...INTERNAL_REEVALUATION_REASONS,
      ...DECISION_EVENTS,
    ]);
    expect(new Set(HISTORY_EVENTS).size).toBe(HISTORY_EVENTS.length);
  });

  it('rejects a proof only for a bad binding or an app that is not ours', () => {
    expect(PROOF_REASONS).toEqual({
      BINDING_SIGNATURE_INVALID: 'rejected',
      NO_EVIDENCE: 'unverified',
      CHAIN_INVALID: 'unverified',
      ROOT_UNKNOWN: 'unverified',
      ON_REVOCATION_LIST: 'unverified',
      CHALLENGE_MISMATCH: 'unverified',
      KEY_MISMATCH: 'unverified',
      PACKAGE_MISMATCH: 'rejected',
      SIGNING_CERTIFICATE_MISMATCH: 'rejected',
      APP_ID_MISMATCH: 'rejected',
      SOFTWARE_SECURITY_LEVEL: 'unverified',
      BOOT_NOT_VERIFIED: 'unverified',
      BOOTLOADER_UNLOCKED: 'unverified',
      APP_ATTEST_INVALID: 'unverified',
      APP_ATTEST_DEVELOPMENT: 'unverified',
    });
  });

  it("name the identity module's purposes, the flag kinds and the audit kinds", () => {
    expect(VERIFICATION_PURPOSES).toEqual(['registration', 'device_change', 'app_attest_renewal']);
    expect(SESSION_FLAG_KINDS).toEqual(['HEAD_COUNT_EXCEEDED', 'QR_DISPLAY_WITHOUT_DOCUMENT']);
    expect(REVOCATION_STATUSES).toEqual(['REVOKED', 'SUSPENDED']);
    expect(IOS_ANOMALY_KINDS).toEqual([
      'UNPUBLISHED_PACKAGE_VERSION',
      'UNEXPECTED_DISTRIBUTION_KIND',
    ]);
  });
});
