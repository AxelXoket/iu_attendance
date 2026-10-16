import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { anchorRange } from './anchor.ts';
import {
  FIRST_ANCHOR_PHONE_REPORTS,
  FIRST_ANCHOR_STATUSES,
  SECOND_ANCHOR_ABSENT_REASONS,
  SECOND_ANCHOR_STATUSES,
} from './codes.ts';
import { DOCUMENT_MAX_AGE_MS, DOCUMENT_REQUEST_MAX_MS } from './constants.ts';
import {
  type ClockResult,
  clockResult,
  type FirstAnchorInput,
  type SecondAnchorInput,
} from './result.ts';
import type { ClockSubject, DeviceId, DocumentVerification, PersonId } from './types.ts';

const DEVICE_A = {
  kind: 'STUDENT_DEVICE',
  deviceId: '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e' as DeviceId,
} as const;
const DEVICE_B = {
  kind: 'STUDENT_DEVICE',
  deviceId: '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0f' as DeviceId,
} as const;
const LECTURER = {
  kind: 'STAFF',
  personId: '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d10' as PersonId,
} as const;
const OTHER_LECTURER = {
  kind: 'STAFF',
  personId: '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d11' as PersonId,
} as const;

const S = 1_792_000_000_000;
const DAY_MS = 86_400_000;
const document = (
  patch: Partial<{ serverTimeMs: number; subject: ClockSubject; keyCompromised: boolean }> = {},
): DocumentVerification => ({
  valid: true,
  kid: 'k1',
  subject: DEVICE_A,
  value: 'AAAAAAAAAAAAAAAAAAAAAA',
  serverTimeMs: S,
  keyCompromised: false,
  ...patch,
});
type FirstDocument = Extract<FirstAnchorInput, { document: unknown }>;
type SecondDocument = Extract<SecondAnchorInput, { document: unknown }>;
const first = (patch: Partial<FirstDocument> = {}): FirstAnchorInput => ({
  document: document(),
  requestDurationMs: 300,
  documentToEventMs: 60_000,
  ...patch,
});
// The second document came 5 minutes after the event the first puts at S + 60 s.
const second = (patch: Partial<SecondDocument> = {}): SecondAnchorInput => ({
  document: document({ serverTimeMs: S + 360_000 }),
  requestDurationMs: 200,
  eventToDocumentMs: 300_000,
  ...patch,
});
const result = (input: Partial<Parameters<typeof clockResult>[0]> = {}): ClockResult =>
  clockResult({
    first: first(),
    second: second(),
    expectedSubject: DEVICE_A,
    phoneClockMs: S + 61_000,
    arrivalMs: S + 400_000,
    syncHealthy: true,
    ...input,
  });
const noAnchors = {
  first: { phoneReport: 'NO_DOCUMENT' },
  second: { absentReason: 'NOT_SENT' },
} as const;
const FIRST_RANGE = anchorRange({
  documentTimeMs: S,
  requestDurationMs: 300,
  elapsedMs: 60_000,
  direction: 'FORWARD',
});
const secondRange = (documentTimeMs: number, requestDurationMs: number, elapsedMs: number) =>
  anchorRange({ documentTimeMs, requestDurationMs, elapsedMs, direction: 'BACKWARD' });

describe('clock result: combining anchors', () => {
  it('meets two anchors at their common range with the smaller margin', () => {
    const clock = result();
    const b = secondRange(S + 360_000, 200, 300_000);
    expect(clock).toMatchObject({
      firstAnchorStatus: 'VALID',
      secondAnchorStatus: 'VALID',
      status: 'VERIFIED',
      source: 'BOTH_ANCHORS',
      range: {
        lowMs: Math.max(FIRST_RANGE.lowMs, b.lowMs),
        highMs: Math.min(FIRST_RANGE.highMs, b.highMs),
      },
      marginMs: Math.min(FIRST_RANGE.marginMs, b.marginMs),
    });
    // The first anchor's margin is 306 ms, the second's 230 ms: the estimate is the second's.
    expect(clock.estimateMs).toBe(b.estimateMs);
  });

  it('takes the first anchor when the margins tie', () => {
    // Both margins are 306 ms; the second anchor alone would say S + 60 010 ms.
    const tie = result({
      second: second({
        document: document({ serverTimeMs: S + 360_010 }),
        requestDurationMs: 276,
      }),
    });
    expect(tie.marginMs).toBe(306);
    expect(tie.estimateMs).toBe(S + 60_000);
  });

  it('keeps a verified estimate inside the common range', () => {
    // The second anchor alone would say S + 59.9 s; the first starts at S + 59.994 s.
    const clock = result({ second: second({ eventToDocumentMs: 300_100 }) });
    expect(clock.status).toBe('VERIFIED');
    expect(clock.range?.lowMs).toBe(S + 60_000 - 6);
    expect(clock.estimateMs).toBe(clock.range?.lowMs);
  });

  it('meets ranges that touch at one instant', () => {
    // The first range ends at S + 60 307 ms; this second range starts there.
    const clock = result({ second: second({ document: document({ serverTimeMs: S + 360_337 }) }) });
    expect(clock).toMatchObject({
      status: 'VERIFIED',
      range: { lowMs: S + 60_307, highMs: S + 60_307 },
      estimateMs: S + 60_307,
    });
  });

  it('covers both ranges when the anchors do not meet', () => {
    const clock = result({ second: second({ eventToDocumentMs: 200_000 }) });
    const b = secondRange(S + 360_000, 200, 200_000);
    expect(b.lowMs).toBeGreaterThan(FIRST_RANGE.highMs);
    expect(clock).toMatchObject({
      status: 'ANCHORS_DISAGREE',
      source: 'BOTH_ANCHORS',
      range: { lowMs: FIRST_RANGE.lowMs, highMs: b.highMs },
      estimateMs: b.estimateMs,
      marginMs: b.marginMs,
    });
  });

  it('takes the one valid anchor when the other is missing', () => {
    const { estimateMs, marginMs, ...range } = FIRST_RANGE;
    expect(result({ second: { absentReason: 'SCAN_PATH' } })).toMatchObject({
      status: 'VERIFIED',
      source: 'FIRST_ANCHOR',
      secondAnchorStatus: 'SCAN_PATH',
      range,
      estimateMs,
      marginMs,
    });
    const b = secondRange(S + 360_000, 200, 300_000);
    expect(result({ first: { phoneReport: 'BEFORE_RESTART' } })).toEqual({
      status: 'VERIFIED',
      source: 'SECOND_ANCHOR',
      firstAnchorStatus: 'BEFORE_RESTART',
      secondAnchorStatus: 'VALID',
      range: { lowMs: b.lowMs, highMs: b.highMs },
      estimateMs: b.estimateMs,
      marginMs: b.marginMs,
      startsAfterArrival: false,
      arrivedWhileSyncBroken: false,
    });
  });

  it('falls back to the phone clock, or to nothing, with no valid anchor', () => {
    expect(result({ ...noAnchors, phoneClockMs: S })).toMatchObject({
      status: 'UNVERIFIED',
      source: 'PHONE_CLOCK',
      range: { lowMs: S, highMs: S },
      estimateMs: S,
      marginMs: null,
    });
    // An instant of 0 is a phone clock too.
    expect(result({ ...noAnchors, phoneClockMs: 0 }).source).toBe('PHONE_CLOCK');
    expect(result({ ...noAnchors, phoneClockMs: null })).toMatchObject({
      status: 'UNVERIFIED',
      source: 'NONE',
      range: null,
      estimateMs: null,
      marginMs: null,
    });
  });
});

describe('clock result: anchor statuses', () => {
  const statuses = (clock: ClockResult) => [clock.firstAnchorStatus, clock.secondAnchorStatus];

  it('holds the seven day bound on both anchors', () => {
    const atBound = result({
      first: first({ documentToEventMs: DOCUMENT_MAX_AGE_MS }),
      second: second({
        document: document({ serverTimeMs: S + DOCUMENT_MAX_AGE_MS + 60_000 }),
        eventToDocumentMs: DOCUMENT_MAX_AGE_MS,
      }),
    });
    expect(statuses(atBound)).toEqual(['VALID', 'VALID']);
    const over = result({
      first: first({ documentToEventMs: DOCUMENT_MAX_AGE_MS + 1 }),
      second: second({ eventToDocumentMs: DOCUMENT_MAX_AGE_MS + 1 }),
    });
    expect(over).toMatchObject({
      firstAnchorStatus: 'DOCUMENT_OVER_7_DAYS',
      secondAnchorStatus: 'RECORD_OVER_7_DAYS',
      status: 'UNVERIFIED',
      source: 'PHONE_CLOCK',
      range: { lowMs: S + 61_000, highMs: S + 61_000 },
      estimateMs: S + 61_000,
      marginMs: null,
    });
  });

  it('sets no anchor from a request over 10 seconds or a duration outside its form', () => {
    const both = (requestDurationMs: number, elapsedMs = 60_000) =>
      statuses(
        result({
          first: first({ requestDurationMs, documentToEventMs: elapsedMs }),
          second: second({ requestDurationMs, eventToDocumentMs: elapsedMs }),
        }),
      );
    expect(both(DOCUMENT_REQUEST_MAX_MS)).toEqual(['VALID', 'VALID']);
    expect(both(DOCUMENT_REQUEST_MAX_MS + 1)).toEqual(['REQUEST_TOO_SLOW', 'REQUEST_TOO_SLOW']);
    const invalid = ['DURATION_INVALID', 'DURATION_INVALID'];
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60]) {
      expect(both(bad), `request ${bad}`).toEqual(invalid);
      expect(both(300, bad), `elapsed ${bad}`).toEqual(invalid);
    }
    // The form comes before the size: a fraction over a bound is still a bad duration.
    expect(both(DOCUMENT_REQUEST_MAX_MS + 1.5)).toEqual(invalid);
    expect(both(300, DOCUMENT_MAX_AGE_MS + 1.5)).toEqual(invalid);
    // The request bound comes before the seven days.
    expect(both(DOCUMENT_REQUEST_MAX_MS + 1, DOCUMENT_MAX_AGE_MS + 1)).toEqual([
      'REQUEST_TOO_SLOW',
      'REQUEST_TOO_SLOW',
    ]);
  });

  it('sets no anchor from another subject, a bad document or a compromised key', () => {
    expect(statuses(result({ expectedSubject: DEVICE_A }))).toEqual(['VALID', 'VALID']);
    expect(statuses(result({ expectedSubject: DEVICE_B }))).toEqual([
      'SUBJECT_MISMATCH',
      'SUBJECT_MISMATCH',
    ]);
    const firstStatus = (doc: DocumentVerification, expectedSubject: ClockSubject, q = 300) =>
      result({
        first: first({ document: doc, requestDurationMs: q }),
        second: { absentReason: 'NOT_SENT' },
        expectedSubject,
      }).firstAnchorStatus;
    // A lecturer's document checked against the lecturer acting, and against another.
    const lecturerDocument = document({ subject: LECTURER });
    expect(firstStatus(lecturerDocument, LECTURER)).toBe('VALID');
    expect(firstStatus(lecturerDocument, OTHER_LECTURER)).toBe('SUBJECT_MISMATCH');
    // A device and a person with the same UUID are different subjects, both ways round.
    const asDevice = {
      kind: 'STUDENT_DEVICE',
      deviceId: LECTURER.personId as string as DeviceId,
    } as const;
    const asPerson = { kind: 'STAFF', personId: DEVICE_A.deviceId as string as PersonId } as const;
    expect(firstStatus(lecturerDocument, asDevice)).toBe('SUBJECT_MISMATCH');
    expect(firstStatus(document(), asPerson)).toBe('SUBJECT_MISMATCH');
    // The same UUID in upper case is the same subject.
    const upperPerson = {
      kind: 'STAFF',
      personId: LECTURER.personId.toUpperCase() as PersonId,
    } as const;
    const upperDevice = {
      kind: 'STUDENT_DEVICE',
      deviceId: DEVICE_A.deviceId.toUpperCase() as DeviceId,
    } as const;
    expect(firstStatus(lecturerDocument, upperPerson)).toBe('VALID');
    expect(firstStatus(document(), upperDevice)).toBe('VALID');
    expect(firstStatus(document({ subject: upperDevice }), DEVICE_A)).toBe('VALID');
    expect(firstStatus(document({ subject: upperPerson }), LECTURER)).toBe('VALID');
    // The subject comes before the durations.
    expect(firstStatus(document({ subject: DEVICE_B }), DEVICE_A, -1)).toBe('SUBJECT_MISMATCH');
    // A bad document, also one claiming a time that is not integer milliseconds.
    expect(firstStatus({ valid: false, reason: 'MAC' }, DEVICE_A)).toBe('DOCUMENT_INVALID');
    for (const serverTimeMs of [Number.NaN, S + 0.5]) {
      expect(firstStatus(document({ serverTimeMs }), DEVICE_A)).toBe('DOCUMENT_INVALID');
    }
    // A compromised key comes before the subject, for a device and a lecturer alike.
    const compromised = result({
      first: first({ document: document({ subject: DEVICE_B, keyCompromised: true }) }),
    });
    expect(compromised.firstAnchorStatus).toBe('KEY_COMPROMISED');
    expect(compromised.source).toBe('SECOND_ANCHOR');
    const lecturerKey = document({ subject: LECTURER, keyCompromised: true });
    expect(firstStatus(lecturerKey, OTHER_LECTURER)).toBe('KEY_COMPROMISED');
  });

  it('passes what the phone reported through as the anchor status', () => {
    for (const phoneReport of FIRST_ANCHOR_PHONE_REPORTS) {
      expect(result({ first: { phoneReport } }).firstAnchorStatus).toBe(phoneReport);
    }
    for (const absentReason of SECOND_ANCHOR_ABSENT_REASONS) {
      expect(result({ second: { absentReason } }).secondAnchorStatus).toBe(absentReason);
    }
  });
});

describe('clock result: arrival and sync', () => {
  it('checks an anchored range against the arrival', () => {
    const low = result().range?.lowMs ?? 0;
    expect(result({ arrivalMs: low - 1 }).startsAfterArrival).toBe(true);
    expect(result({ arrivalMs: low }).startsAfterArrival).toBe(false);
    // The phone clock is only a note: past the arrival, it is known to be wrong.
    const fastPhone = result({ ...noAnchors, phoneClockMs: S + 1, arrivalMs: S });
    expect(fastPhone.startsAfterArrival).toBe(false);
    const nothing = result({ ...noAnchors, phoneClockMs: null, arrivalMs: 0 });
    expect(nothing.startsAfterArrival).toBe(false);
  });

  it('carries a broken sync whatever the clock', () => {
    expect(result().arrivedWhileSyncBroken).toBe(false);
    expect(result({ syncHealthy: false }).arrivedWhileSyncBroken).toBe(true);
    const nothing = result({ ...noAnchors, phoneClockMs: null, syncHealthy: false });
    expect(nothing.arrivedWhileSyncBroken).toBe(true);
  });

  it('refuses a phone clock or an arrival that is not integer milliseconds', () => {
    for (const bad of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => result({ phoneClockMs: bad }), `${bad}`).toThrow(RangeError);
      expect(() => result({ arrivalMs: bad }), `${bad}`).toThrow(RangeError);
    }
  });
});

describe('clock result: the estimate (I023)', () => {
  it('leaves the estimate empty only when the source is NONE', () => {
    // Weighted to the valid case, so that both anchors are often valid together.
    const mostly = <T>(likely: fc.Arbitrary<T>, other: fc.Arbitrary<T>) =>
      fc.oneof({ arbitrary: likely, weight: 4 }, { arbitrary: other, weight: 1 });
    const subject = mostly(
      fc.constant<ClockSubject>(DEVICE_A),
      fc.constantFrom<ClockSubject>(DEVICE_B, LECTURER),
    );
    const verification = mostly(
      fc
        .record({
          subject,
          keyCompromised: mostly(fc.constant(false), fc.constant(true)),
          serverTimeMs: fc.integer({ min: S - 10 * DAY_MS, max: S }),
        })
        .map((patch) => document(patch)),
      fc.constant<DocumentVerification>({ valid: false, reason: 'UNKNOWN_KID' }),
    );
    const duration = mostly(
      fc.integer({ min: 0, max: DOCUMENT_REQUEST_MAX_MS + 2000 }),
      fc.constantFrom(-1, 0.5),
    );
    const elapsed = mostly(fc.integer({ min: 0, max: DOCUMENT_MAX_AGE_MS + 10 }), fc.constant(-5));
    const firstInput = mostly<FirstAnchorInput>(
      fc.record({
        document: verification,
        requestDurationMs: duration,
        documentToEventMs: elapsed,
      }),
      fc.constantFrom(...FIRST_ANCHOR_PHONE_REPORTS).map((phoneReport) => ({ phoneReport })),
    );
    const secondInput = mostly<SecondAnchorInput>(
      fc.record({
        document: verification,
        requestDurationMs: duration,
        eventToDocumentMs: elapsed,
      }),
      fc.constantFrom(...SECOND_ANCHOR_ABSENT_REASONS).map((absentReason) => ({ absentReason })),
    );
    const sources = new Set<string>();
    fc.assert(
      fc.property(
        firstInput,
        secondInput,
        fc.option(fc.integer({ min: S - 1000, max: S + 1000 }), { nil: null }),
        (firstAnchor, secondAnchor, phoneClockMs) => {
          const clock = clockResult({
            first: firstAnchor,
            second: secondAnchor,
            expectedSubject: DEVICE_A,
            phoneClockMs,
            arrivalMs: S,
            syncHealthy: true,
          });
          sources.add(clock.source);
          expect(FIRST_ANCHOR_STATUSES).toContain(clock.firstAnchorStatus);
          expect(SECOND_ANCHOR_STATUSES).toContain(clock.secondAnchorStatus);
          const anyValid =
            clock.firstAnchorStatus === 'VALID' || clock.secondAnchorStatus === 'VALID';
          if (clock.source === 'NONE') {
            expect([clock.range, clock.estimateMs, clock.marginMs]).toEqual([null, null, null]);
            expect(anyValid || phoneClockMs !== null).toBe(false);
          } else {
            const { lowMs, highMs } = clock.range;
            expect(lowMs <= clock.estimateMs && clock.estimateMs <= highMs).toBe(true);
          }
          if (!anyValid) {
            expect(clock.status).toBe('UNVERIFIED');
            expect(clock.source).toBe(phoneClockMs === null ? 'NONE' : 'PHONE_CLOCK');
            if (phoneClockMs !== null) expect(clock.estimateMs).toBe(phoneClockMs);
          }
        },
      ),
      { numRuns: 5000 },
    );
    // Ground control: every source occurred.
    expect([...sources].sort()).toEqual([
      'BOTH_ANCHORS',
      'FIRST_ANCHOR',
      'NONE',
      'PHONE_CLOCK',
      'SECOND_ANCHOR',
    ]);
  });
});
