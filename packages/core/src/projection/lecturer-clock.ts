// The lecturer's clock for a display record (D11, Hoca saati). The phone labels its codes
// with its own clock, so the server rebuilds the real clock at the display's start and
// end from the record's two anchors (D04 clockResult, the lecturer as subject). The first
// anchor is measured from its document to the display start and the second from the
// display end to its document, so each event adds the display length to the other one.
// An event's margin is the distance from its estimate to the far end of its D04 range
// (D04's own margin can miss the range's high end by 1 ms). The two corrections are
// averaged and half their difference widens the margin. A label inside the display is
// read from the nearer event, across at most half the display, so the margin also takes
// the counter's drift over half the display (D04's k). The real instant of every label
// in the display then stays within label + correction +- margin.

import { driftMs } from '../clock/anchor.ts';
import type { FirstAnchorStatus, SecondAnchorStatus } from '../clock/codes.ts';
import {
  type ClockResult,
  clockResult,
  type FirstAnchorInput,
  type SecondAnchorInput,
} from '../clock/result.ts';
import type { ClockRange, PersonId } from '../clock/types.ts';
import { isWholeFromZero } from '../shared/number.ts';
import type { LecturerClockStatus } from './constants.ts';

/**
 * The rebuilt clock, verified with a correction and a margin or why there is none, and
 * the two anchors' statuses as the display record stores them: the first anchor's at the
 * display start, the second's at the display end, where each was measured.
 */
export type LecturerClock = (
  | {
      readonly status: Extract<LecturerClockStatus, 'VERIFIED'>;
      readonly correctionMs: number;
      readonly marginMs: number;
    }
  | { readonly status: Extract<LecturerClockStatus, 'ANCHORS_DISAGREE'> }
  | { readonly status: Extract<LecturerClockStatus, 'NONE'> }
) & {
  readonly firstAnchorStatus: FirstAnchorStatus;
  readonly secondAnchorStatus: SecondAnchorStatus;
};

/** The distance from an estimate to the far end of its range. */
export const farMarginMs = (estimateMs: number, range: ClockRange) =>
  Math.max(estimateMs - range.lowMs, range.highMs - estimateMs);

type EventClock =
  | { readonly estimateMs: number; readonly marginMs: number }
  | 'ANCHORS_DISAGREE'
  | 'NONE';

// An event without a verified clock, or whose clock starts after the record arrived, has
// none (DOGRULANAMADI, ulasma anini asiyor).
function eventClock(result: ClockResult): EventClock {
  if (result.status === 'ANCHORS_DISAGREE') return 'ANCHORS_DISAGREE';
  if (result.status === 'UNVERIFIED' || result.startsAfterArrival) return 'NONE';
  return { estimateMs: result.estimateMs, marginMs: farMarginMs(result.estimateMs, result.range) };
}

/**
 * The lecturer's clock over one display. Disagreeing anchors at either event win over a
 * missing clock: both send the record to review, and the disagreement says more. Throws
 * RangeError for a label base that is not integer milliseconds or a display length that
 * is not whole milliseconds from 0 (the contract checks both).
 */
export function lecturerClock(input: {
  readonly lecturerId: PersonId;
  /** Its elapsed time runs from the document to the display start. */
  readonly first: FirstAnchorInput;
  /** Its elapsed time runs from the display end to the document. */
  readonly second: SecondAnchorInput;
  /** The phone's own estimate of the display start: the codes' labels count from it. */
  readonly labelBaseMs: number;
  /** How long the display ran, by the phone's counter. */
  readonly displayDurationMs: number;
  /** When the display record reached the server. */
  readonly arrivedAtMs: number;
}): LecturerClock {
  const { lecturerId, first, second, labelBaseMs, displayDurationMs, arrivedAtMs } = input;
  if (!Number.isSafeInteger(labelBaseMs) || !isWholeFromZero(displayDurationMs)) {
    throw new RangeError('lecturerClock expects integer milliseconds for the label and display');
  }
  const at = (firstAnchor: FirstAnchorInput, secondAnchor: SecondAnchorInput) =>
    clockResult({
      first: firstAnchor,
      second: secondAnchor,
      expectedSubject: { kind: 'STAFF', personId: lecturerId },
      phoneClockMs: null,
      arrivedAtMs,
      // The lecturer's clock does not read the server's sync state.
      syncHealthy: true,
    });
  const startResult = at(
    first,
    'document' in second
      ? { ...second, eventToDocumentMs: second.eventToDocumentMs + displayDurationMs }
      : second,
  );
  const endResult = at(
    'document' in first
      ? { ...first, documentToEventMs: first.documentToEventMs + displayDurationMs }
      : first,
    second,
  );
  const statuses = {
    firstAnchorStatus: startResult.firstAnchorStatus,
    secondAnchorStatus: endResult.secondAnchorStatus,
  };
  const start = eventClock(startResult);
  const end = eventClock(endResult);
  if (start === 'ANCHORS_DISAGREE' || end === 'ANCHORS_DISAGREE') {
    return { status: 'ANCHORS_DISAGREE', ...statuses };
  }
  if (start === 'NONE' || end === 'NONE') return { status: 'NONE', ...statuses };
  const startCorrectionMs = start.estimateMs - labelBaseMs;
  const endCorrectionMs = end.estimateMs - (labelBaseMs + displayDurationMs);
  return {
    status: 'VERIFIED',
    correctionMs: Math.floor((startCorrectionMs + endCorrectionMs) / 2),
    marginMs:
      Math.max(start.marginMs, end.marginMs) +
      Math.ceil(Math.abs(startCorrectionMs - endCorrectionMs) / 2) +
      driftMs(Math.floor(displayDurationMs / 2)),
    ...statuses,
  };
}
