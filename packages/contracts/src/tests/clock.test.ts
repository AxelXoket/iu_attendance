import { AFTER_RESTART } from '@iu-attendance/core/clock/codes';
import { describe, expect, it } from 'vitest';
import {
  CHANGE_KINDS,
  CLOCK_AUDIT_EVENTS,
  CLOCK_ERROR_CODES,
  CLOCK_ROUTES,
  CLOCK_SOURCES,
  CLOCK_STATUSES,
  CLOSE_REASONS,
  EARLY_CLOSE_ITEM,
  FIRST_ANCHOR_PHONE_REPORTS,
  FIRST_ANCHOR_STATUSES,
  ITEM_TYPE_CHANGE_KIND,
  NOT_APPLIED_REASONS,
  PRESSED_AT_SOURCES,
  SECOND_ANCHOR_ABSENT_REASONS,
  SECOND_ANCHOR_STATUSES,
  WINDOW_LENGTH_ITEM,
  WINDOW_RESULTS,
  WINDOW_SOURCES,
} from '../clock.ts';
import { defineRoute, type RouteDefinition } from '../shared/index.ts';
import { id, issueCodes } from './helpers.ts';

describe('clock routes', () => {
  it('give the document only to a Bearer session of a student or staff member, without the header', () => {
    const route = CLOCK_ROUTES.clockDocument;
    expect(route).toMatchObject({
      method: 'POST',
      path: '/v1/clock/document',
      auth: ['session'],
      authSources: ['bearer'],
      roles: ['student', 'staff'],
      rate: 'clock',
      clockAttestation: false,
    });
    expect(CLOCK_ROUTES.getWindow).toMatchObject({
      method: 'GET',
      roles: ['staff'],
      rate: 'session',
    });
    for (const definition of Object.values(CLOCK_ROUTES) as RouteDefinition[]) {
      expect(defineRoute(definition)).toBe(definition);
    }
  });

  it('take a 16-byte value as 22 canonical base64url characters, dropping unknown keys', () => {
    const body = CLOCK_ROUTES.clockDocument.request.body;
    const value = 'AAECAwQFBgcICQoLDA0ODw';
    const parsed = body.safeParse({ value, extra: 1 });
    expect(parsed.success && parsed.data).toEqual({ value });
    for (const bad of [
      value.slice(1),
      `${value}A`,
      'AAECAwQFBgcICQoLDA0ODx',
      'AAECAwQFBgcICQoLDA0OD=',
      '',
    ]) {
      expect(body.safeParse({ value: bad }).success, bad).toBe(false);
    }
  });

  it('let answers carry code values added later', () => {
    const answer = CLOCK_ROUTES.getWindow.response.schema;
    const at = '2026-10-05T06:00:00.000Z';
    const window = {
      sessionId: id(1),
      termId: id(2),
      courseId: id(3),
      openAt: at,
      plannedCloseAt: at,
      closeAt: at,
      latestCloseAt: at,
      classEndAt: at,
      movedAt: null,
      plannedWindowMinutes: 15,
      windowMinutes: null,
      windowChosen: true,
      windowSource: 'NEW_SOURCE',
      open: false,
      closedAt: at,
      changes: [
        {
          id: id(4),
          kind: 'NEW_KIND',
          newWindowMinutes: null,
          personId: id(5),
          pressedAtLow: at,
          pressedAtHigh: at,
          effectivePressedAt: at,
          pressedAtSource: 'ARRIVAL',
          arrivedAt: at,
          applied: false,
          notAppliedReason: 'NEW_REASON',
          lateArrival: true,
          // A change pressed before the session moved takes no effect: no close instants.
          previousCloseAt: null,
          nextCloseAt: null,
          effective: false,
        },
      ],
    };
    expect(answer.safeParse(window).success).toBe(true);
    const [change] = window.changes;
    const withPress = (pressedAtLow: string | null) => ({
      ...window,
      changes: [{ ...change, pressedAtLow }],
    });
    expect(answer.safeParse(withPress(null)).success).toBe(false);
  });

  it('take session ids as UUIDv7 only', () => {
    const version4 = '01890a5d-ac96-4000-8000-000000000001';
    expect(CLOCK_ROUTES.getWindow.request.params.safeParse({ sessionId: version4 }).success).toBe(
      false,
    );
    expect(CLOCK_ROUTES.getWindow.request.params.safeParse({ sessionId: id(1) }).success).toBe(
      true,
    );
    expect(EARLY_CLOSE_ITEM.body.safeParse({ sessionId: version4 }).success).toBe(false);
    expect(
      CLOCK_ROUTES.clockDocument.request.body.safeParse({ value: 'A'.repeat(23) }).success,
    ).toBe(false);
  });
});

describe('clock code lists', () => {
  it('are unique upper case codes, with the subsets the spec states', () => {
    const lists = [
      FIRST_ANCHOR_STATUSES,
      SECOND_ANCHOR_STATUSES,
      SECOND_ANCHOR_ABSENT_REASONS,
      FIRST_ANCHOR_PHONE_REPORTS,
      CLOCK_STATUSES,
      CLOCK_SOURCES,
      WINDOW_RESULTS,
      CLOSE_REASONS,
      CHANGE_KINDS,
      PRESSED_AT_SOURCES,
      NOT_APPLIED_REASONS,
      WINDOW_SOURCES,
    ];
    for (const values of lists) {
      expect(new Set(values).size).toBe(values.length);
      for (const value of values) expect(value).toMatch(/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/);
    }
    for (const reason of SECOND_ANCHOR_ABSENT_REASONS)
      expect(SECOND_ANCHOR_STATUSES).toContain(reason);
    for (const report of FIRST_ANCHOR_PHONE_REPORTS)
      expect(FIRST_ANCHOR_STATUSES).toContain(report);
    expect(SECOND_ANCHOR_STATUSES).toHaveLength(13);
    expect(FIRST_ANCHOR_STATUSES).toHaveLength(9);
  });

  it('use the second anchor text value for a restart after the event', () => {
    expect(SECOND_ANCHOR_ABSENT_REASONS).toContain(AFTER_RESTART);
  });
});

describe('clock queue items', () => {
  it('take a window length of whole minutes or null, and map each item type to a change kind', () => {
    const body = WINDOW_LENGTH_ITEM.body;
    expect(body.safeParse({ sessionId: id(1), newWindowMinutes: 1 }).success).toBe(true);
    expect(body.safeParse({ sessionId: id(1), newWindowMinutes: null }).success).toBe(true);
    for (const bad of [0, 1.5, 1441]) {
      expect(body.safeParse({ sessionId: id(1), newWindowMinutes: bad }).success, String(bad)).toBe(
        false,
      );
    }
    expect(EARLY_CLOSE_ITEM.body.safeParse({ sessionId: id(1) }).success).toBe(true);
    expect(ITEM_TYPE_CHANGE_KIND).toEqual({
      window_length: 'WINDOW_LENGTH',
      early_close: 'EARLY_CLOSE',
    });
    expect([WINDOW_LENGTH_ITEM.module, EARLY_CLOSE_ITEM.module]).toEqual(['clock', 'clock']);
  });
});

describe('clock error catalog', () => {
  it('retries a broken sync after a minute and gives the start-up codes no HTTP status', () => {
    expect(CLOCK_ERROR_CODES.CLOCK_SYNC_BROKEN).toMatchObject({ http: 503, retry: { fixed: 60 } });
    expect(CLOCK_ERROR_CODES.CLOCK_NOT_FOUND.http).toBe(404);
    for (const code of [
      'CLOCK_KID_INVALID',
      'CLOCK_SYNC_SETTING_INVALID',
      'CLOCK_PROCESS_WRONG',
    ] as const) {
      expect(CLOCK_ERROR_CODES[code]).toEqual({ http: null, lecturer: null, student: null });
    }
  });

  it('writes texts without digits or placeholders', () => {
    const texts = Object.values(CLOCK_ERROR_CODES)
      .flatMap((definition) => [definition.lecturer, definition.student])
      .flatMap((text) => (text === null ? [] : Object.values(text)));
    expect(texts.length).toBeGreaterThan(20);
    for (const text of texts) expect(text).not.toMatch(/[0-9{}]/);
  });
});

describe('clock audit events', () => {
  it('name five strict events', () => {
    const events = Object.entries(CLOCK_AUDIT_EVENTS);
    expect(events).toHaveLength(5);
    for (const [type, schema] of events) {
      expect(type).toMatch(/^clock\.[a-z]+(?:_[a-z]+)*$/);
      expect(issueCodes(schema.safeParse({ unexpectedKey: 1 }))).toContain('unrecognized_keys');
    }
    const at = '2026-10-05T06:00:00.000Z';
    const closed = {
      sessionId: id(1),
      courseId: id(2),
      unitId: null,
      changeId: id(3),
      previousCloseAt: at,
      nextCloseAt: at,
      pressedAtSource: 'FIRST_ANCHOR',
      lateArrival: false,
    };
    expect(CLOCK_AUDIT_EVENTS['clock.closed_early'].safeParse(closed).success).toBe(true);
    const changed = CLOCK_AUDIT_EVENTS['clock.window_length_changed'];
    expect(changed.safeParse({ ...closed, newWindowMinutes: 10 }).success).toBe(true);
    expect(changed.safeParse({ ...closed, newWindowMinutes: 0 }).success).toBe(false);
    // Positive controls for the three events that store or refuse a change.
    const context = { sessionId: id(1), courseId: id(2), unitId: id(5) };
    expect(
      CLOCK_AUDIT_EVENTS['clock.window_change_stored'].safeParse({
        ...context,
        changeId: id(3),
        kind: 'EARLY_CLOSE',
        notAppliedReason: 'TERM_LOCKED',
      }).success,
    ).toBe(true);
    expect(
      CLOCK_AUDIT_EVENTS['clock.item_id_conflict'].safeParse({
        ...context,
        changeId: id(3),
        installId: id(4),
      }).success,
    ).toBe(true);
    expect(
      CLOCK_AUDIT_EVENTS['clock.unauthorized_window_change'].safeParse({
        ...context,
        kind: 'WINDOW_LENGTH',
        installId: id(4),
      }).success,
    ).toBe(true);
  });
});

describe('clock bounds', () => {
  it('refuse a canonical value of the wrong size', () => {
    const body = CLOCK_ROUTES.clockDocument.request.body;
    // 15 bytes are 20 canonical characters, 17 bytes are 23.
    for (const value of ['AAECAwQFBgcICQoLDA0O', 'AAECAwQFBgcICQoLDA0ODxA']) {
      expect(body.safeParse({ value }).success, value).toBe(false);
    }
  });

  it('answer the document as 110 base64url characters', () => {
    const document = CLOCK_ROUTES.clockDocument.response.schema;
    expect(document.safeParse({ document: 'A'.repeat(110) }).success).toBe(true);
    for (const text of ['A'.repeat(109), 'A'.repeat(111), `${'A'.repeat(109)}=`]) {
      expect(document.safeParse({ document: text }).success, text).toBe(false);
    }
  });

  it('take the longest window of a day', () => {
    const body = WINDOW_LENGTH_ITEM.body;
    expect(body.safeParse({ sessionId: id(1), newWindowMinutes: 1440 }).success).toBe(true);
  });

  it('keep both ends of the press range in every change', () => {
    const changeShape = CLOCK_ROUTES.getWindow.response.schema.shape.changes.element.shape;
    const at = '2026-10-05T06:00:00.000Z';
    for (const field of ['pressedAtLow', 'pressedAtHigh'] as const) {
      expect(changeShape[field].safeParse(at).success, field).toBe(true);
      expect(changeShape[field].safeParse(null).success, field).toBe(false);
    }
  });
});
