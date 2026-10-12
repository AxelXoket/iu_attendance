import {
  COUNTER_NAMES,
  isDaySkippable,
  type PhoneCounterBody,
  phoneCounterBodySchema,
  SCREEN_KINDS,
} from '@iu-attendance/contracts/operations';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

// The phone skips a day only when it has nothing to tell (I090): the property the phone
// app and the server share through isDaySkippable.

const uuid = '01890a5d-ac96-7000-8000-000000000001';
const count = fc.oneof(fc.constant(0), fc.integer({ min: 1, max: 1_000_000 }));
const permission = fc.constantFrom(true, false, undefined);
const screenError = fc.record({
  kind: fc.constantFrom('ERROR_BOUNDARY' as const, 'GENERAL' as const),
  screen: fc.constantFrom('head_count', 'review'),
  count: fc.integer({ min: 1, max: 9 }),
});
const rejection = fc.record({
  http: fc.integer({ min: 400, max: 599 }),
  code: fc.option(fc.constant('ATTENDANCE_TEXT_INVALID'), { nil: null }),
  count: fc.integer({ min: 1, max: 9 }),
});
// The schema brands session ids; a generated UUID stands in for one.
const screenTime = fc
  .record({
    sessionId: fc.uuid(),
    screenKind: fc.constantFrom(...SCREEN_KINDS),
    seconds: fc.integer({ min: 1, max: 86_400 }),
  })
  .map((entry) => entry as PhoneCounterBody['screenTimes'][number]);
const bodies = fc.record({
  format: fc.constant(1 as const),
  day: fc.constant('2026-10-12'),
  platform: fc.constantFrom('android' as const, 'ios' as const),
  appVersion: fc.constant('1.4.0'),
  runtimeVersion: fc.option(fc.constant('1.4'), { nil: null }),
  updateId: fc.option(fc.uuid(), { nil: null }),
  counters: fc.record(
    {
      unsentRecords: count,
      failedAttempts: count,
      nativeModuleCrashes: count,
      internalCounterReadErrors: count,
      unknownResults: count,
      notificationPermission: fc.boolean(),
    },
    { requiredKeys: [] },
  ),
  screenErrors: fc.array(screenError, { maxLength: 2 }),
  rejections: fc.array(rejection, { maxLength: 2 }),
  screenTimes: fc.array(screenTime, { maxLength: 2 }),
}) as fc.Arbitrary<PhoneCounterBody>;

// The oracle, written apart from the code: an absent counter is a zero.
const quiet = (body: PhoneCounterBody) =>
  Object.entries(body.counters).every(
    ([name, value]) => name === 'notificationPermission' || value === undefined || value === 0,
  ) && body.screenErrors.length + body.rejections.length + body.screenTimes.length === 0;

// The same body with nothing to tell, under the given permission.
const silenced = (body: PhoneCounterBody, given: boolean | undefined): PhoneCounterBody => ({
  ...body,
  counters: given === undefined ? {} : { notificationPermission: given },
  screenErrors: [],
  rejections: [],
  screenTimes: [],
});

describe('isDaySkippable', () => {
  it('skips a day of zero counters and empty lists whatever the permission, and no other', () => {
    const counted = COUNTER_NAMES.filter((name) => name !== 'notificationPermission');
    fc.assert(
      fc.property(
        bodies,
        permission,
        screenError,
        rejection,
        screenTime,
        fc.constantFrom(...counted),
        (body, given, error, refused, time, counter) => {
          expect(phoneCounterBodySchema.safeParse(body).success).toBe(true);
          expect(isDaySkippable(body)).toBe(quiet(body));
          const empty = silenced(body, given);
          expect(isDaySkippable(empty)).toBe(true);
          // One thing to tell, and the day is sent.
          expect(isDaySkippable({ ...empty, screenTimes: [time] })).toBe(false);
          expect(isDaySkippable({ ...empty, rejections: [refused] })).toBe(false);
          expect(isDaySkippable({ ...empty, screenErrors: [error] })).toBe(false);
          expect(isDaySkippable({ ...empty, counters: { ...empty.counters, [counter]: 1 } })).toBe(
            false,
          );
          // A counter written as zero is no news.
          expect(isDaySkippable({ ...empty, counters: { ...empty.counters, [counter]: 0 } })).toBe(
            true,
          );
        },
      ),
      { numRuns: 2000 },
    );
  });

  it("sends a lecturer's day of zero counters with a screen open", () => {
    const lecturerDay = phoneCounterBodySchema.parse({
      format: 1,
      day: '2026-10-12',
      platform: 'android',
      appVersion: '1.4.0',
      runtimeVersion: null,
      updateId: null,
      counters: { unsentRecords: 0, notificationPermission: false },
      screenErrors: [],
      rejections: [],
      screenTimes: [{ sessionId: uuid, screenKind: 'HEAD_COUNT', seconds: 60 }],
    });
    expect(isDaySkippable(lecturerDay)).toBe(false);
    // Ground control: without the screen the same day is skipped.
    expect(isDaySkippable({ ...lecturerDay, screenTimes: [] })).toBe(true);
    // A body the phone builds by hand may write an absent counter as undefined.
    const handBuilt = { ...lecturerDay, screenTimes: [], counters: { unsentRecords: undefined } };
    expect(isDaySkippable(handBuilt as PhoneCounterBody)).toBe(true);
  });
});
