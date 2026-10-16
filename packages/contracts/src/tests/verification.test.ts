import { encodeBase64Url } from '@iu-attendance/core/shared/base64url';
import {
  CONTEXT_CHANGING_CODE,
  DECISION_REASON_CODES,
  DECISION_SOURCES,
} from '@iu-attendance/core/verification/codes';
import {
  HEAD_COUNT_MAX,
  LOCK_EVENT_RECORDS_MAX,
  RANDOM_NAME_PICKS_MAX,
  VERIFICATION_VALUE_BYTES,
} from '@iu-attendance/core/verification/constants';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { ATTENDANCE_ROUTES, attendancePairKey } from '../attendance.ts';
import { AUDIT_DETAILS_MAX_BYTES } from '../corrections.ts';
import { advisoryLayerOf } from '../database.ts';
import {
  decisionKeys,
  HEAD_COUNT_ITEM,
  VERIFICATION_AUDIT_EVENTS,
  VERIFICATION_ERROR_CODES,
  VERIFICATION_ITEM_CODES,
  VERIFICATION_ROUTES,
  verificationConfirmationKey,
  verificationCounterKey,
  verificationFlagKey,
  verificationRosterKey,
} from '../verification.ts';
import { id, ok } from './helpers.ts';
import { pathsIn } from './schema-walk.ts';

const AT = '2026-10-06T07:05:00.000Z';

describe('verification advisory keys', () => {
  it('write each key once, with its ids in lower case', () => {
    const upper = id(1).toUpperCase();
    expect(verificationConfirmationKey(id(1))).toBe(`verification:confirmation:${id(1)}`);
    expect(verificationRosterKey(id(1))).toBe(`verification:roster:${id(1)}`);
    expect(verificationCounterKey(id(1))).toBe(`verification:counter:${id(1)}`);
    expect(verificationFlagKey(id(1))).toBe(`verification:flag:${id(1)}`);
    // The same id from signed text in capitals gives the same key.
    for (const key of [
      verificationConfirmationKey,
      verificationRosterKey,
      verificationCounterKey,
      verificationFlagKey,
    ]) {
      expect(key(upper)).toBe(key(id(1)));
    }
    expect(attendancePairKey(upper, upper)).toBe(attendancePairKey(id(1), id(1)));
    expect(() => verificationCounterKey('')).toThrow(RangeError);
  });

  it("take each record's pair key and each signing key's counter once, in (layer, key) order", () => {
    const inputs = [
      { sessionId: id(1), studentId: id(3), keyId: id(9) },
      { sessionId: id(1).toUpperCase(), studentId: id(3), keyId: id(9).toUpperCase() },
      { sessionId: id(1), studentId: id(2), keyId: id(8) },
      // A second record signed with the same key shares its counter.
      { sessionId: id(4), studentId: id(2), keyId: id(9) },
      { sessionId: id(1), studentId: id(5), keyId: null },
    ];
    const keys = decisionKeys(inputs);
    const byLayer = [...keys].sort(
      (a, b) =>
        (advisoryLayerOf(a) ?? 0) - (advisoryLayerOf(b) ?? 0) || (a < b ? -1 : a > b ? 1 : 0),
    );
    expect(keys).toEqual(byLayer);
    expect(keys).toEqual([
      attendancePairKey(id(1), id(2)),
      attendancePairKey(id(1), id(3)),
      attendancePairKey(id(1), id(5)),
      attendancePairKey(id(4), id(2)),
      verificationCounterKey(id(8)),
      verificationCounterKey(id(9)),
    ]);
    // Pure: the same input in another order gives the same keys.
    expect(decisionKeys([...inputs].reverse())).toEqual(keys);
    expect(decisionKeys([])).toEqual([]);
  });

  it('sit on layers 1 to 5, a decision path taking only layers 3 and 4', () => {
    expect(
      [
        verificationRosterKey(id(1)),
        verificationConfirmationKey(id(1)),
        attendancePairKey(id(1), id(2)),
        verificationCounterKey(id(1)),
        verificationFlagKey(id(1)),
      ].map(advisoryLayerOf),
    ).toEqual([1, 2, 3, 4, 5]);
    const keys = decisionKeys([{ sessionId: id(1), studentId: id(2), keyId: id(9) }]);
    expect(keys.map(advisoryLayerOf)).toEqual([3, 4]);
  });
});

describe('verification error catalog', () => {
  const routeCodes = Object.values(VERIFICATION_ROUTES).flatMap((route) => route.errors);
  const listed = new Set<string>([...routeCodes, ...VERIFICATION_ITEM_CODES.head_count]);

  it('lists every code a client sees, and gives each listed code its texts', () => {
    const shown = Object.entries(VERIFICATION_ERROR_CODES)
      .filter(([, definition]) => definition.lecturer !== null)
      .map(([code]) => code);
    // The retry code reaches the phone through the attendance module's item result.
    expect(shown.filter((code) => !listed.has(code))).toEqual([CONTEXT_CHANGING_CODE]);
    expect(Object.hasOwn(VERIFICATION_ERROR_CODES, CONTEXT_CHANGING_CODE)).toBe(true);
    for (const code of listed) {
      const definition = VERIFICATION_ERROR_CODES[code as keyof typeof VERIFICATION_ERROR_CODES];
      expect([definition.lecturer, definition.student], code).not.toContain(null);
    }
    // Ground control: the three outer-face results carry no text and reach no client.
    const silent = Object.entries(VERIFICATION_ERROR_CODES)
      .filter(([, definition]) => definition.lecturer === null)
      .map(([code]) => code);
    expect(silent).toEqual([
      'VERIFICATION_VALUE_INVALID',
      'VERIFICATION_DECISION_CHANGED',
      'VERIFICATION_TRANSITION_INVALID',
    ]);
    expect(silent.filter((code) => listed.has(code))).toEqual([]);
  });

  it("gives each route and the item the module page's error list", () => {
    expect(
      Object.fromEntries(
        Object.entries(VERIFICATION_ROUTES).map(([name, route]) => [name, route.errors]),
      ),
    ).toEqual({
      issueValue: [],
      getHeadCount: ['VERIFICATION_NOT_FOUND'],
      pickRandomNames: [
        'VERIFICATION_NOT_FOUND',
        'VERIFICATION_SESSION_CANCELLED',
        'VERIFICATION_SESSION_DAY_PASSED',
        'VERIFICATION_TERM_LOCKED',
        'VERIFICATION_PICK_ID_CONFLICT',
        'VERIFICATION_PICK_LIMIT',
      ],
      markNotInClass: [
        'VERIFICATION_NOT_FOUND',
        'VERIFICATION_STUDENT_RECORD_MISSING',
        'VERIFICATION_STUDENT_NOT_PICKED',
        'VERIFICATION_SESSION_DAY_PASSED',
        'VERIFICATION_TERM_LOCKED',
      ],
      undoNotInClass: [
        'VERIFICATION_NOT_FOUND',
        'VERIFICATION_MARK_MISSING',
        'VERIFICATION_MARKED_BY_OTHER_LECTURER',
        'VERIFICATION_SESSION_DAY_PASSED',
        'VERIFICATION_TERM_LOCKED',
      ],
    });
    expect(VERIFICATION_ITEM_CODES.head_count).toEqual([
      'VERIFICATION_NOT_FOUND',
      'VERIFICATION_LECTURER_UNAUTHORIZED',
      'VERIFICATION_BODY_INVALID',
    ]);
  });
});

describe('verification routes and item', () => {
  it('takes a head count from 0 to the largest, in the item and in its audit event', () => {
    const event = VERIFICATION_AUDIT_EVENTS['verification.head_count_entered'];
    const entered = {
      sessionId: id(1),
      courseId: id(2),
      unitId: id(3),
      previousHeadCount: null,
      headCount: 0,
      coursesResult: 'written',
      lecturerId: id(4),
    };
    for (const headCount of [0, HEAD_COUNT_MAX]) {
      expect(ok(HEAD_COUNT_ITEM.body, { sessionId: id(1), headCount })).toBe(true);
      expect(ok(event, { ...entered, headCount, previousHeadCount: headCount })).toBe(true);
    }
    for (const headCount of [-1, HEAD_COUNT_MAX + 1, 1.5]) {
      expect(ok(HEAD_COUNT_ITEM.body, { sessionId: id(1), headCount }), `${headCount}`).toBe(false);
      expect(ok(event, { ...entered, headCount }), `${headCount}`).toBe(false);
      expect(ok(event, { ...entered, previousHeadCount: headCount }), `${headCount}`).toBe(false);
    }
  });

  it('answers a value request with the value and its end', () => {
    const route = VERIFICATION_ROUTES.issueValue;
    expect(ok(route.request.body, { purpose: 'device_change' })).toBe(true);
    expect(ok(route.request.body, { purpose: 'login' })).toBe(false);
    const bytes = (length: number) => encodeBase64Url(new Uint8Array(length).fill(7));
    const answer = { value: bytes(VERIFICATION_VALUE_BYTES), expiresAt: AT };
    expect(ok(route.response.schema, answer)).toBe(true);
    for (const length of [VERIFICATION_VALUE_BYTES - 1, VERIFICATION_VALUE_BYTES + 1]) {
      expect(ok(route.response.schema, { ...answer, value: bytes(length) }), `${length}`).toBe(
        false,
      );
    }
  });

  it('picks up to the most students a press allows', () => {
    const schema = VERIFICATION_ROUTES.pickRandomNames.response.schema;
    const students = (count: number) =>
      Array.from({ length: count }, (_, n) => ({
        studentId: id(n + 1),
        fullName: 'Ad Soyad',
        studentNumber: `012345678${n}`,
      }));
    expect(ok(schema, { pickId: id(9), students: students(RANDOM_NAME_PICKS_MAX) })).toBe(true);
    expect(ok(schema, { pickId: id(9), students: students(RANDOM_NAME_PICKS_MAX + 1) })).toBe(
      false,
    );
  });
});

describe('verification audit events', () => {
  const lock = (recordCount: number, part = 1, partCount = 1) => ({
    sessionId: id(1),
    courseId: id(2),
    unitId: id(3),
    termId: id(4),
    lockedAt: AT,
    part,
    partCount,
    recordIds: Array.from({ length: recordCount }, (_, n) => id(100 + n)),
  });

  it('split a lock into parts that each stay within the details limit', () => {
    for (const name of [
      'verification.unapproved_locked',
      'verification.undecided_locked',
    ] as const) {
      const schema = VERIFICATION_AUDIT_EVENTS[name];
      const full = lock(LOCK_EVENT_RECORDS_MAX, 2, 2);
      expect(ok(schema, full), name).toBe(true);
      expect(new TextEncoder().encode(JSON.stringify(full)).length).toBeLessThan(
        AUDIT_DETAILS_MAX_BYTES,
      );
      expect(ok(schema, lock(LOCK_EVENT_RECORDS_MAX + 1)), name).toBe(false);
      expect(ok(schema, lock(0)), name).toBe(false);
      expect(ok(schema, lock(1, 3, 2)), name).toBe(false);
      expect(ok(schema, lock(1, 0, 2)), name).toBe(false);
    }
  });

  it('close the revocation status and the anomaly kind', () => {
    const revoked = VERIFICATION_AUDIT_EVENTS['verification.device_revoked'];
    expect(ok(revoked, { deviceId: id(1), proofId: id(2), status: 'REVOKED' })).toBe(true);
    expect(ok(revoked, { deviceId: id(1), proofId: id(2), status: 'GONE' })).toBe(false);
    const anomaly = VERIFICATION_AUDIT_EVENTS['verification.ios_unexpected_field'];
    expect(ok(anomaly, { deviceId: id(1), anomaly: 'UNEXPECTED_DISTRIBUTION_KIND' })).toBe(true);
    expect(ok(anomaly, { deviceId: id(1), anomaly: 'beta' })).toBe(false);
  });

  it('carry the unit on every event that carries a course', () => {
    const shapes = Object.entries(VERIFICATION_AUDIT_EVENTS).map(
      ([event, schema]) => [event, Object.keys((schema as z.ZodObject).shape)] as const,
    );
    for (const [event, fields] of shapes) {
      if (fields.includes('courseId')) expect(fields, event).toContain('unitId');
    }
    // Ground control: some events carry a course and some do not.
    const withCourse = shapes.filter(([, fields]) => fields.includes('courseId')).length;
    expect([withCourse > 0, withCourse < shapes.length]).toEqual([true, true]);
  });
});

describe('decision lists in the answers', () => {
  // The value list of every field with this name the routes answer with; undefined for a
  // field that is not an extensible list.
  const listsAt = (routes: readonly { response: { schema: unknown } }[], field: string) =>
    routes
      .flatMap((route) => pathsIn(route.response.schema as z.ZodType))
      .filter(([path, node]) => {
        const wrapper = ['nullable', 'optional'].includes((node.def as { type: string }).type);
        return path.endsWith(`.${field}`) && !wrapper;
      })
      .map(([, node]) => node.meta()?.['x-extensible-enum']);

  it('take the reasons and sources from the core lists', () => {
    const attendance = Object.values(ATTENDANCE_ROUTES);
    const verification = Object.values(VERIFICATION_ROUTES);
    const lists = [
      [listsAt(attendance, 'decisionReason'), DECISION_REASON_CODES],
      [listsAt(verification, 'reason'), DECISION_REASON_CODES],
      [listsAt(attendance, 'decisionSource'), DECISION_SOURCES],
    ] as const;
    for (const [found, expected] of lists) {
      // Ground control: each field is found at least once.
      expect(found.length).toBeGreaterThan(0);
      for (const list of found) expect(list).toEqual([...expected]);
    }
  });
});
