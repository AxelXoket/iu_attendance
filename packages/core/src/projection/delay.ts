// The delay rule (D11, Gecikme kurali): how late a verified QR or backup code was scanned
// after its 5-second slice was shown. With t the student's estimate and p its margin (to
// the far end of the D04 range), h and q the lecturer's correction and margin (a
// projection code is the server's own: 0 and 0), g = t - (slice start + h) and P = p + q.
// Uncertainty counts for the student: a scan is rejected only when it is late even at its
// earliest (g - P > 30 s), scanned before only when it is early even at its latest
// (g + P < -tolerance; the projection is trusted to 1 s, a phone to 0) and normal when it
// is on time even at its latest (g + P < 10 s, 20 s with a backup code). The checks run in
// the rule's order, so a scan whose latest instant is on time is normal even when the
// student's margin alone reaches the limit. Integer milliseconds only, no floating point.
// The evidence row stores the terms with the result, and the record's recomputation uses
// this same function.

import type { ClockEstimate } from '../clock/result.ts';
import type { DELAY_LIMIT_DEFAULTS_MS, DisplaySource, EvidenceKind, QrDelay } from './constants.ts';
import { farMarginMs, type LecturerClock } from './lecturer-clock.ts';
import { sliceStartMs } from './slice.ts';

/** The rule's limits: the projection settings' four fields (defaults DELAY_LIMIT_DEFAULTS_MS). */
export type DelayLimits = { readonly [Name in keyof typeof DELAY_LIMIT_DEFAULTS_MS]: number };

type PhoneDisplay = {
  readonly source: Extract<DisplaySource, 'LECTURER_PHONE'>;
  /** The record's evidence: a scanned QR code or a typed backup code. */
  readonly evidenceKind: Exclude<EvidenceKind, 'NONE'>;
  /** When the code's key slot was revoked; null while it stands. */
  readonly slotRevokedAtMs: number | null;
  /** The clock of the display record covering the slice; null while none has come. */
  readonly lecturerClock: LecturerClock | null;
};

/** Where the scanned code was shown. */
export type DelayDisplay =
  | {
      readonly source: Extract<DisplaySource, 'PROJECTION'>;
      /** The slice lies in one of the session's connection intervals or in a loss window. */
      readonly insideConnection: boolean;
    }
  | PhoneDisplay;

/**
 * The result and the terms it was read from, as the evidence row stores them; the terms
 * are null when a check before the arithmetic decided.
 */
export type DelayResult = {
  readonly delay: QrDelay;
  /** p (ogrenci_pay_ms). */
  readonly studentMarginMs: number | null;
  /** h (hoca_duzeltme_ms); 0 for a projection code. */
  readonly lecturerCorrectionMs: number | null;
  /** q (hoca_pay_ms); 0 for a projection code. */
  readonly lecturerMarginMs: number | null;
  /** g - P (gecikme_alt_ms): the delay read in the student's favour. */
  readonly delayLowMs: number | null;
  /** g + P (gecikme_ust_ms): the delay read against the student. */
  readonly delayHighMs: number | null;
};

type Terms = {
  readonly correctionMs: number;
  readonly marginMs: number;
  readonly toleranceMs: number;
  readonly normalMs: number;
};

// The normal limit of each scanned kind; a new evidence kind does not compile until it has one.
const NORMAL_LIMITS: {
  readonly [Kind in Exclude<EvidenceKind, 'NONE'>]: 'normalLimitMs' | 'backupCodeNormalLimitMs';
} = { QR: 'normalLimitMs', BACKUP_CODE: 'backupCodeNormalLimitMs' };

// A lecturer phone's code is judged on the clock of the display record covering its
// slice, with no tolerance.
function phoneTerms(display: PhoneDisplay, limits: DelayLimits): Terms | QrDelay {
  const clock = display.lecturerClock;
  if (clock === null) return 'PENDING';
  if (clock.status === 'NONE') return 'NO_LECTURER_CLOCK';
  if (clock.status === 'ANCHORS_DISAGREE') return 'LECTURER_ANCHORS_DIVERGE';
  return {
    correctionMs: clock.correctionMs,
    marginMs: clock.marginMs,
    toleranceMs: 0,
    normalMs: limits[NORMAL_LIMITS[display.evidenceKind]],
  };
}

const decidedEarly = (delay: QrDelay): DelayResult => ({
  delay,
  studentMarginMs: null,
  lecturerCorrectionMs: null,
  lecturerMarginMs: null,
  delayLowMs: null,
  delayHighMs: null,
});

/**
 * The delay result of a code whose verification is VALID. Throws RangeError when the
 * slice, a limit, an instant or a margin is not an integer.
 */
export function qrDelay(input: {
  readonly studentClock: ClockEstimate;
  readonly slice: number;
  readonly display: DelayDisplay;
  readonly limits: DelayLimits;
}): DelayResult {
  const { studentClock, slice, display, limits } = input;
  const numbers = [
    slice,
    limits.normalLimitMs,
    limits.backupCodeNormalLimitMs,
    limits.rejectLimitMs,
    limits.projectionToleranceMs,
    display.source === 'LECTURER_PHONE' ? (display.slotRevokedAtMs ?? 0) : 0,
  ];
  if (!numbers.every(Number.isSafeInteger)) {
    throw new RangeError('qrDelay expects an integer slice, limits and revocation instant');
  }
  const startMs = sliceStartMs(slice);
  if (
    display.source === 'LECTURER_PHONE' &&
    display.slotRevokedAtMs !== null &&
    display.slotRevokedAtMs <= startMs
  ) {
    return decidedEarly('KEY_REVOKED');
  }
  if (studentClock.status !== 'VERIFIED') return decidedEarly('CLOCK_UNVERIFIED');
  const terms: Terms | QrDelay =
    display.source === 'PROJECTION'
      ? {
          correctionMs: 0,
          marginMs: 0,
          toleranceMs: limits.projectionToleranceMs,
          normalMs: limits.normalLimitMs,
        }
      : phoneTerms(display, limits);
  if (typeof terms === 'string') return decidedEarly(terms);
  const { estimateMs, range } = studentClock;
  const clocks = [estimateMs, range.lowMs, range.highMs, terms.correctionMs, terms.marginMs];
  if (!clocks.every(Number.isSafeInteger)) {
    throw new RangeError('qrDelay expects integer milliseconds for the clocks');
  }
  const studentMarginMs = farMarginMs(estimateMs, range);
  const g = estimateMs - (startMs + terms.correctionMs);
  const margin = studentMarginMs + terms.marginMs;
  const delayLowMs = g - margin;
  const delayHighMs = g + margin;
  const result = (delay: QrDelay): DelayResult => ({
    delay,
    studentMarginMs,
    lecturerCorrectionMs: terms.correctionMs,
    lecturerMarginMs: terms.marginMs,
    delayLowMs,
    delayHighMs,
  });
  if (delayLowMs > limits.rejectLimitMs) return result('REJECTED');
  if (delayHighMs < -terms.toleranceMs) return result('SCANNED_BEFORE');
  if (display.source === 'PROJECTION' && !display.insideConnection) {
    return result('OUTSIDE_DISPLAY');
  }
  if (delayHighMs < terms.normalMs) return result('NORMAL');
  // Normal is out of reach for the student's clock alone (D11-A04).
  if (studentMarginMs >= terms.normalMs) return result('ANCHORS_STALE');
  return result('IN_REVIEW');
}
