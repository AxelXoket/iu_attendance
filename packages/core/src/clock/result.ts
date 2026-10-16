// Clock result (D04, D07-B19): the one clock computation for a record and for a
// lecturer's action. Pure: the document check, the instants and the subject come from
// outside, and the subject check is inside, so no caller can forget it. Each anchor gets
// a status; a record whose clock cannot be verified carries no reason code of its own,
// its reason is the pair of anchor statuses. D05 writes the result into the record's
// columns and rebuilds it from them; D07 maps it to a decision and a label.
//
// Two valid anchors: where their ranges meet the clock is VERIFIED to the meeting range;
// where they do not, ANCHORS_DISAGREE with the range covering both. In both cases the
// estimate and the margin are the anchor's with the smaller margin (the first on a tie),
// and a verified estimate is kept inside the meeting range. One valid anchor: its range.
// None: UNVERIFIED, at the phone's own clock as a single instant, or with no estimate at
// all when the phone sent no clock. The phone's clock is only a note: a range from it
// is never checked against the arrival, since a phone clock past the arrival is known
// to be wrong.

import { isWholeFromZero } from '../shared/number.ts';
import { idKey } from '../shared/uuid.ts';
import { type AnchorDirection, type AnchorRange, anchorRange } from './anchor.ts';
import type {
  ClockSource,
  FirstAnchorPhoneReport,
  FirstAnchorStatus,
  SecondAnchorAbsentReason,
  SecondAnchorStatus,
} from './codes.ts';
import { DOCUMENT_MAX_AGE_MS, DOCUMENT_REQUEST_MAX_MS } from './constants.ts';
import type { ClockRange, ClockSubject, DocumentVerification } from './types.ts';

/** The first anchor: the document the record carries, or what the phone reported instead. */
export type FirstAnchorInput =
  | {
      readonly document: DocumentVerification;
      readonly requestDurationMs: number;
      readonly documentToEventMs: number;
    }
  | { readonly phoneReport: FirstAnchorPhoneReport };

/** The second anchor: the document fetched before sending, or why there is none. */
export type SecondAnchorInput =
  | {
      readonly document: DocumentVerification;
      readonly requestDurationMs: number;
      readonly eventToDocumentMs: number;
    }
  | { readonly absentReason: SecondAnchorAbsentReason };

type AnchorSource = Exclude<ClockSource, 'PHONE_CLOCK' | 'NONE'>;

/**
 * The clock itself. The estimate is null only when the source is NONE (I023), and an
 * anchored clock always has a margin; the union makes both so.
 */
export type ClockEstimate =
  | {
      readonly status: 'VERIFIED';
      readonly source: AnchorSource;
      readonly range: ClockRange;
      readonly estimateMs: number;
      readonly marginMs: number;
    }
  | {
      readonly status: 'ANCHORS_DISAGREE';
      readonly source: 'BOTH_ANCHORS';
      readonly range: ClockRange;
      readonly estimateMs: number;
      readonly marginMs: number;
    }
  | {
      readonly status: 'UNVERIFIED';
      readonly source: 'PHONE_CLOCK';
      readonly range: ClockRange;
      readonly estimateMs: number;
      readonly marginMs: null;
    }
  | {
      readonly status: 'UNVERIFIED';
      readonly source: 'NONE';
      readonly range: null;
      readonly estimateMs: null;
      readonly marginMs: null;
    };

export type ClockResult = ClockEstimate & {
  readonly firstAnchorStatus: FirstAnchorStatus;
  readonly secondAnchorStatus: SecondAnchorStatus;
  /** An anchored range starts after the record reached the server. */
  readonly startsAfterArrival: boolean;
  /** The server's clock sync was broken when the record arrived. */
  readonly arrivedWhileSyncBroken: boolean;
};

// The statuses both anchors share, and the seven day status of each direction.
type SharedAnchorStatus = Extract<FirstAnchorStatus, SecondAnchorStatus>;
const OVER_AGE = { FORWARD: 'DOCUMENT_OVER_7_DAYS', BACKWARD: 'RECORD_OVER_7_DAYS' } as const;

type AnchorCheck<Status> = { readonly status: Status; readonly range: AnchorRange | null };

const sameSubject = (a: ClockSubject, b: ClockSubject) =>
  a.kind === 'STUDENT_DEVICE'
    ? b.kind === 'STUDENT_DEVICE' && idKey(a.deviceId) === idKey(b.deviceId)
    : b.kind === 'STAFF' && idKey(a.personId) === idKey(b.personId);

// One anchor's status: the document, its key and its subject first, then the form of the
// two durations (an integer of 0 or more), then their size (the request at most 10
// seconds, the elapsed time at most 7 days).
function checkAnchor<Direction extends AnchorDirection>(
  anchor: {
    readonly document: DocumentVerification;
    readonly requestDurationMs: number;
    readonly elapsedMs: number;
  },
  expectedSubject: ClockSubject,
  direction: Direction,
): AnchorCheck<SharedAnchorStatus | (typeof OVER_AGE)[Direction]> {
  const { document, requestDurationMs, elapsedMs } = anchor;
  const fail = (status: Exclude<SharedAnchorStatus, 'VALID'> | (typeof OVER_AGE)[Direction]) => ({
    status,
    range: null,
  });
  if (!document.valid || !Number.isSafeInteger(document.serverTimeMs)) {
    return fail('DOCUMENT_INVALID');
  }
  if (document.keyCompromised) return fail('KEY_COMPROMISED');
  if (!sameSubject(document.subject, expectedSubject)) return fail('SUBJECT_MISMATCH');
  if (!isWholeFromZero(requestDurationMs) || !isWholeFromZero(elapsedMs))
    return fail('DURATION_INVALID');
  if (requestDurationMs > DOCUMENT_REQUEST_MAX_MS) return fail('REQUEST_TOO_SLOW');
  if (elapsedMs > DOCUMENT_MAX_AGE_MS) return fail(OVER_AGE[direction]);
  const range = anchorRange({
    documentTimeMs: document.serverTimeMs,
    requestDurationMs,
    elapsedMs,
    direction,
  });
  return { status: 'VALID', range };
}

function combineAnchors(
  first: AnchorRange | null,
  second: AnchorRange | null,
  phoneClockMs: number | null,
): ClockEstimate {
  const single = (anchor: AnchorRange, source: AnchorSource): ClockEstimate => ({
    status: 'VERIFIED',
    source,
    // The range alone, without the anchor's estimate and margin.
    range: { lowMs: anchor.lowMs, highMs: anchor.highMs },
    estimateMs: anchor.estimateMs,
    marginMs: anchor.marginMs,
  });
  if (first !== null && second !== null) {
    const precise = second.marginMs < first.marginMs ? second : first;
    const lowMs = Math.max(first.lowMs, second.lowMs);
    const highMs = Math.min(first.highMs, second.highMs);
    if (lowMs <= highMs) {
      return {
        status: 'VERIFIED',
        source: 'BOTH_ANCHORS',
        range: { lowMs, highMs },
        estimateMs: Math.min(Math.max(precise.estimateMs, lowMs), highMs),
        marginMs: precise.marginMs,
      };
    }
    return {
      status: 'ANCHORS_DISAGREE',
      source: 'BOTH_ANCHORS',
      range: {
        lowMs: Math.min(first.lowMs, second.lowMs),
        highMs: Math.max(first.highMs, second.highMs),
      },
      estimateMs: precise.estimateMs,
      marginMs: precise.marginMs,
    };
  }
  if (first !== null) return single(first, 'FIRST_ANCHOR');
  if (second !== null) return single(second, 'SECOND_ANCHOR');
  if (phoneClockMs === null) {
    return { status: 'UNVERIFIED', source: 'NONE', range: null, estimateMs: null, marginMs: null };
  }
  return {
    status: 'UNVERIFIED',
    source: 'PHONE_CLOCK',
    range: { lowMs: phoneClockMs, highMs: phoneClockMs },
    estimateMs: phoneClockMs,
    marginMs: null,
  };
}

/**
 * The clock of one record or lecturer action (D04 saatSonucu). Throws RangeError for a
 * phone clock or an arrival that is not integer milliseconds (the caller parsed them).
 */
export function clockResult(input: {
  readonly first: FirstAnchorInput;
  readonly second: SecondAnchorInput;
  readonly expectedSubject: ClockSubject;
  readonly phoneClockMs: number | null;
  readonly arrivalMs: number;
  readonly syncHealthy: boolean;
}): ClockResult {
  const { first, second, expectedSubject, phoneClockMs, arrivalMs, syncHealthy } = input;
  if (
    (phoneClockMs !== null && !Number.isSafeInteger(phoneClockMs)) ||
    !Number.isSafeInteger(arrivalMs)
  ) {
    throw new RangeError('clockResult expects integer milliseconds for the clocks');
  }
  const firstCheck: AnchorCheck<FirstAnchorStatus> =
    'phoneReport' in first
      ? { status: first.phoneReport, range: null }
      : checkAnchor({ ...first, elapsedMs: first.documentToEventMs }, expectedSubject, 'FORWARD');
  const secondCheck: AnchorCheck<SecondAnchorStatus> =
    'absentReason' in second
      ? { status: second.absentReason, range: null }
      : checkAnchor(
          { ...second, elapsedMs: second.eventToDocumentMs },
          expectedSubject,
          'BACKWARD',
        );
  const clock = combineAnchors(firstCheck.range, secondCheck.range, phoneClockMs);
  return {
    ...clock,
    firstAnchorStatus: firstCheck.status,
    secondAnchorStatus: secondCheck.status,
    startsAfterArrival: clock.marginMs !== null && clock.range.lowMs > arrivalMs,
    arrivedWhileSyncBroken: !syncHealthy,
  };
}
