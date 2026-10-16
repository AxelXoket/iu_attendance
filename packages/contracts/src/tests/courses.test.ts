import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CANCEL_REASONS,
  COURSES_AUDIT_CHANGES,
  COURSES_AUDIT_EVENTS,
  COURSES_ERROR_CODES,
  COURSES_ROUTES,
  courseSummarySchema,
  EXAM_KINDS,
  HELD_STATUSES,
  LAST_DAY_REASONS,
  LECTURER_ACCOUNT_STATUSES,
  lecturerHistorySchema,
  panelSessionSchema,
  SEMESTERS,
  SESSION_GENERATION_REASONS,
  SESSION_KINDS,
  SESSION_STATUSES,
  sessionChangeFieldsSchema,
  TRANSFER_REASONS,
  UNIT_KINDS,
} from '../courses.ts';
import { defineRoute, type RouteDefinition, routePathPrefix } from '../shared/index.ts';
import { id, issueCodes, ok } from './helpers.ts';

const routes = Object.entries(COURSES_ROUTES) as [string, RouteDefinition][];

function requestParts(route: RouteDefinition): [string, z.ZodType][] {
  return Object.entries(route.request).filter(
    (part): part is [string, z.ZodType] => part[1] !== undefined,
  );
}

describe('courses routes', () => {
  it('defines 31 routes under /v1/courses, each named by its key and unique by method and path', () => {
    expect(routes).toHaveLength(31);
    for (const [key, route] of routes) {
      expect(route.name).toBe(key);
      expect(route.module).toBe('courses');
      expect(
        route.path === '/v1/courses' || route.path.startsWith(routePathPrefix('courses')),
      ).toBe(true);
    }
    expect(new Set(routes.map(([, route]) => `${route.method} ${route.path}`)).size).toBe(31);
  });

  it('passes the route definition checks, which reject a broken copy', () => {
    for (const [, route] of routes) expect(defineRoute(route)).toBe(route);
    const [, getCourse] = routes.find(([key]) => key === 'getCourse') ?? [];
    expect(getCourse).toBeDefined();
    expect(() =>
      defineRoute({ ...(getCourse as RouteDefinition), path: '/v1/rosters/{courseId}' }),
    ).toThrow(/must start with \/v1\/courses\//);
  });

  it('drops an unknown key in every request object instead of rejecting it (D13-B24)', () => {
    let checked = 0;
    for (const [, route] of routes) {
      for (const [, schema] of requestParts(route)) {
        expect(issueCodes(schema.safeParse({ unexpectedKey: 1 }))).not.toContain(
          'unrecognized_keys',
        );
        checked += 1;
      }
    }
    // Ground control: the loop reached the bodies, queries and params.
    expect(checked).toBeGreaterThan(30);
    // Positive control: a strict object reports the key.
    expect(issueCodes(z.strictObject({}).safeParse({ unexpectedKey: 1 }))).toContain(
      'unrecognized_keys',
    );
    const parsed = COURSES_ROUTES.answerHeld.request.body.safeParse({ held: true, extra: 1 });
    expect(parsed.success && parsed.data).toEqual({ held: true });
  });

  it('answers 201 only for a new course and gives the admin paths only the admin role', () => {
    for (const [key, route] of routes) {
      expect(route.response.statuses).toEqual(key === 'createCourse' ? [201, 200] : [200]);
      if (route.path.includes('/admin/')) expect(route.roles).toEqual(['admin']);
    }
    expect(COURSES_ROUTES.listUnits.auth).toEqual(['anonymous']);
    // A repeated create id whose row lies outside the admin's scope answers not found.
    for (const key of ['adminCreateUnit', 'adminCreateTerm', 'adminCreateDepartment'] as const) {
      expect(COURSES_ROUTES[key].errors).toContain('COURSES_NOT_FOUND');
    }
  });
});

describe('courses value lists', () => {
  const lowerSnake = /^[a-z]+(?:_[a-z]+)*$/;
  const lists = {
    SESSION_KINDS,
    SESSION_STATUSES,
    CANCEL_REASONS,
    HELD_STATUSES,
    UNIT_KINDS,
    SEMESTERS,
    EXAM_KINDS,
    LAST_DAY_REASONS,
    TRANSFER_REASONS,
    LECTURER_ACCOUNT_STATUSES,
    SESSION_GENERATION_REASONS,
  };

  it('are unique lower case words', () => {
    for (const [name, values] of Object.entries(lists)) {
      expect(new Set(values).size, name).toBe(values.length);
      for (const value of values) expect(value, name).toMatch(lowerSnake);
    }
    // Ground control: the pattern rejects upper case and spaces.
    for (const bad of ['Planned', 'not held', 'exam-week']) expect(bad).not.toMatch(lowerSnake);
  });
});

describe('courses error catalog', () => {
  it('gives 404 to not found, 403 to the review account, 400 to three body checks, 409 to the rest', () => {
    const byStatus = new Map<number | null, string[]>();
    for (const [code, definition] of Object.entries(COURSES_ERROR_CODES)) {
      byStatus.set(definition.http, [...(byStatus.get(definition.http) ?? []), code]);
    }
    expect(byStatus.get(404)).toEqual(['COURSES_NOT_FOUND']);
    expect(byStatus.get(403)).toEqual(['COURSES_REVIEW_ACCOUNT']);
    expect(byStatus.get(400)?.sort()).toEqual([
      'COURSES_CALENDAR_DATES_INVALID',
      'COURSES_RANGE_TOO_WIDE',
      'COURSES_SCHEDULE_OVERLAP',
    ]);
    expect(byStatus.get(409)).toHaveLength(Object.keys(COURSES_ERROR_CODES).length - 5);
    expect([...byStatus.keys()].sort()).toEqual([400, 403, 404, 409]);
  });

  it('sends the current version with a version change', () => {
    const details = COURSES_ERROR_CODES.COURSES_VERSION_CHANGED.details;
    expect(details.safeParse({ currentVersion: 3 }).success).toBe(true);
    expect(details.safeParse({ currentVersion: -1 }).success).toBe(false);
  });
});

describe('courses error texts', () => {
  it('carry no digits and no placeholders (D13 catalog rule)', () => {
    const texts = Object.values(COURSES_ERROR_CODES)
      .flatMap((definition) => [definition.lecturer, definition.student])
      .flatMap((text) => Object.values(text));
    expect(texts).toHaveLength(Object.keys(COURSES_ERROR_CODES).length * 4);
    for (const text of texts) expect(text).not.toMatch(/[0-9{}]/);
    // Ground control: the pattern catches a limit written as a number.
    expect('en çok 20 şube').toMatch(/[0-9{}]/);
  });
});

describe('courses audit events', () => {
  it('names 26 courses events, each with a strict detail schema', () => {
    const events = Object.entries(COURSES_AUDIT_EVENTS);
    expect(events).toHaveLength(26);
    for (const [type, schema] of events) {
      expect(type).toMatch(/^courses\.[a-z]+(?:_[a-z]+)*$/);
      expect(issueCodes(schema.safeParse({ unexpectedKey: 1 }))).toContain('unrecognized_keys');
    }
    expect(COURSES_AUDIT_EVENTS['courses.session_changed'].safeParse({}).success).toBe(true);
    expect(
      COURSES_AUDIT_EVENTS['courses.course_archived'].safeParse({ cancelledSessions: 4 }).success,
    ).toBe(true);
  });

  it('gives every event strict before and after schemas, or none', () => {
    expect(Object.keys(COURSES_AUDIT_CHANGES).sort()).toEqual(
      Object.keys(COURSES_AUDIT_EVENTS).sort(),
    );
    let checked = 0;
    for (const { before, after } of Object.values(COURSES_AUDIT_CHANGES)) {
      for (const schema of [before, after]) {
        if (schema === null) continue;
        expect(issueCodes(schema.safeParse({ unexpectedKey: 1 }))).toContain('unrecognized_keys');
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(30);
    const opened = COURSES_AUDIT_CHANGES['courses.course_opened'].after;
    const course = {
      courseCode: 'BIL 101',
      courseName: 'Programlama',
      termId: id(2),
      unitId: id(3),
      departmentId: null,
      windowMinutes: 15,
      theoryPercent: 70,
      practicePercent: 80,
      ratesConfirmed: false,
      sectionLabels: ['1'],
    };
    expect(opened.safeParse(course).success).toBe(true);
    const changed = COURSES_AUDIT_CHANGES['courses.course_changed'];
    expect(changed.before.safeParse({ courseCode: 'BIL 101' }).success).toBe(true);
    expect(changed.after.safeParse({}).success).toBe(true);
  });

  it('keeps the audit writer forbidden names out of every audit schema', () => {
    const forbidden = [
      'studentNumber',
      'number',
      'fullName',
      'name',
      'email',
      'code',
      'key',
      'token',
      'documentNumber',
    ];
    const schemas = [
      ...Object.values(COURSES_AUDIT_EVENTS),
      ...Object.values(COURSES_AUDIT_CHANGES).flatMap(({ before, after }) => [before, after]),
    ].filter((schema) => schema !== null);
    for (const schema of schemas) {
      for (const field of forbidden) {
        expect(issueCodes(schema.safeParse({ [field]: 'x' })), field).toContain(
          'unrecognized_keys',
        );
      }
    }
  });
});

describe('courses jsonb columns', () => {
  it('keeps only the last lecturer open in the assignment history', () => {
    const at = '2026-10-05T06:00:00.000Z';
    const closed = { personId: id(1), startAt: at, endAt: at };
    const open = { personId: id(2), startAt: at, endAt: null };
    expect(lecturerHistorySchema.safeParse([open]).success).toBe(true);
    expect(lecturerHistorySchema.safeParse([closed, open]).success).toBe(true);
    expect(lecturerHistorySchema.safeParse([open, open]).success).toBe(false);
    expect(lecturerHistorySchema.safeParse([open, closed]).success).toBe(false);
    expect(lecturerHistorySchema.safeParse([closed]).success).toBe(false);
    expect(lecturerHistorySchema.safeParse([]).success).toBe(false);
  });

  it('records a session change as full before and after field sets', () => {
    const fields = {
      room: 'D-101',
      theoryHours: 2,
      practiceHours: 0,
      windowMinutes: 15,
      cancelReason: null,
      sectionIds: [id(4)],
      held: null,
    };
    expect(
      sessionChangeFieldsSchema.safeParse({ before: fields, after: { ...fields, room: null } })
        .success,
    ).toBe(true);
    expect(
      sessionChangeFieldsSchema.safeParse({ before: fields, after: { ...fields, extra: 1 } })
        .success,
    ).toBe(false);
  });
});

describe('courses request rules', () => {
  const createCourse = COURSES_ROUTES.createCourse.request.body;
  const course = {
    id: id(1),
    termId: id(2),
    unitId: id(3),
    departmentId: null,
    code: 'BIL 101',
    name: 'Programlamaya Giriş',
    windowMinutes: null,
    sections: [
      { id: id(4), label: '1' },
      { id: id(5), label: '2' },
    ],
  };

  it('opens a course with or without rates, and rejects repeated labels, blank text and long codes', () => {
    expect(createCourse.safeParse(course).success).toBe(true);
    expect(
      createCourse.safeParse({ ...course, rates: { theoryPercent: 0, practicePercent: 0 } })
        .success,
    ).toBe(true);
    expect(createCourse.safeParse({ ...course, rates: null }).success).toBe(true);
    const twin = { ...course, sections: [course.sections[0], { id: id(6), label: '1' }] };
    expect(createCourse.safeParse(twin).success).toBe(false);
    expect(createCourse.safeParse({ ...course, code: '   ' }).success).toBe(false);
    expect(createCourse.safeParse({ ...course, name: '   ' }).success).toBe(false);
    const blankLabel = { ...course, sections: [{ id: id(4), label: ' ' }] };
    expect(createCourse.safeParse(blankLabel).success).toBe(false);
    expect(createCourse.safeParse({ ...course, code: 'X'.repeat(21) }).success).toBe(false);
    expect(createCourse.safeParse({ ...course, code: 'X'.repeat(20) }).success).toBe(true);
    const many = Array.from({ length: 21 }, (_, n) => ({ id: id(100 + n), label: String(n) }));
    expect(createCourse.safeParse({ ...course, sections: many }).success).toBe(false);
    expect(createCourse.safeParse({ ...course, sections: many.slice(0, 20) }).success).toBe(true);
  });

  const putSchedule = COURSES_ROUTES.putSchedule.request.body;
  const slot = {
    id: id(10),
    weekday: 1,
    startTime: '09:00',
    endTime: '10:50',
    theoryHours: 2,
    practiceHours: 0,
    room: 'D-101',
    sectionIds: [id(4)],
  };
  const schedule = (slots: unknown[]) =>
    putSchedule.safeParse({ expectedVersion: 0, scheduleSlots: slots });

  it('checks a schedule slot: end after start, 1 to 12 hours, validity in order, sections once', () => {
    expect(schedule([slot]).success).toBe(true);
    expect(schedule([]).success).toBe(true);
    expect(schedule([{ ...slot, endTime: '09:00' }]).success).toBe(false);
    expect(schedule([{ ...slot, endTime: '08:59' }]).success).toBe(false);
    expect(schedule([{ ...slot, endTime: '09:01' }]).success).toBe(true);
    expect(schedule([{ ...slot, theoryHours: 0 }]).success).toBe(false);
    expect(schedule([{ ...slot, theoryHours: 6, practiceHours: 6 }]).success).toBe(true);
    expect(schedule([{ ...slot, theoryHours: 6, practiceHours: 7 }]).success).toBe(false);
    expect(schedule([{ ...slot, validFrom: '2026-10-05', validTo: '2026-10-05' }]).success).toBe(
      true,
    );
    expect(schedule([{ ...slot, validFrom: '2026-10-06', validTo: '2026-10-05' }]).success).toBe(
      false,
    );
    expect(schedule([{ ...slot, validFrom: '2026-10-06' }]).success).toBe(true);
    expect(schedule([{ ...slot, sectionIds: [id(4), id(4)] }]).success).toBe(false);
    expect(schedule([{ ...slot, sectionIds: [] }]).success).toBe(false);
    const sectionIds = Array.from({ length: 21 }, (_, n) => id(400 + n));
    expect(schedule([{ ...slot, sectionIds: sectionIds.slice(0, 20) }]).success).toBe(true);
    expect(schedule([{ ...slot, sectionIds }]).success).toBe(false);
    expect(schedule([{ ...slot, weekday: 8 }]).success).toBe(false);
  });

  it('takes at most 20 slots with distinct ids', () => {
    const slots = Array.from({ length: 21 }, (_, n) => ({ ...slot, id: id(200 + n) }));
    expect(schedule(slots.slice(0, 20)).success).toBe(true);
    expect(schedule(slots).success).toBe(false);
    expect(schedule([slot, { ...slot, weekday: 2 }]).success).toBe(false);
  });

  const addMakeup = COURSES_ROUTES.addMakeup.request.body;
  const makeup = {
    id: id(20),
    date: '2026-11-03',
    startTime: '13:00',
    endTime: '14:50',
    theoryHours: 2,
    practiceHours: 0,
    room: null,
  };

  it('moves a session only when it names the session it makes up for', () => {
    const plain = addMakeup.safeParse(makeup);
    expect(plain.success && plain.data.cancelOld).toBe(false);
    expect(addMakeup.safeParse({ ...makeup, cancelOld: true }).success).toBe(false);
    expect(
      addMakeup.safeParse({ ...makeup, cancelOld: true, makeupForSessionId: id(21) }).success,
    ).toBe(true);
    expect(addMakeup.safeParse({ ...makeup, makeupForSessionId: id(21) }).success).toBe(true);
    expect(addMakeup.safeParse({ ...makeup, endTime: '12:00' }).success).toBe(false);
  });

  const updateSession = COURSES_ROUTES.updateSession.request.body;

  it('undoes a cancellation only on its own, and checks times given together', () => {
    expect(updateSession.safeParse({ undoCancel: true }).success).toBe(true);
    expect(updateSession.safeParse({ undoCancel: true, room: 'D-101' }).success).toBe(false);
    expect(updateSession.safeParse({}).success).toBe(true);
    expect(updateSession.safeParse({ endTime: '08:00' }).success).toBe(true);
    expect(updateSession.safeParse({ startTime: '09:00', endTime: '08:00' }).success).toBe(false);
    expect(updateSession.safeParse({ theoryHours: 0, practiceHours: 0 }).success).toBe(false);
    expect(updateSession.safeParse({ theoryHours: 0 }).success).toBe(true);
  });

  it('opens a term only for consecutive years', () => {
    const term = COURSES_ROUTES.adminCreateTerm.request.body;
    expect(
      term.safeParse({ id: id(30), academicYear: '2026-2027', semester: 'fall' }).success,
    ).toBe(true);
    expect(
      term.safeParse({ id: id(30), academicYear: '2026-2028', semester: 'fall' }).success,
    ).toBe(false);
    expect(
      term.safeParse({ id: id(30), academicYear: '2026-2026', semester: 'fall' }).success,
    ).toBe(false);
    expect(
      term.safeParse({ id: id(30), academicYear: '2026/2027', semester: 'fall' }).success,
    ).toBe(false);
  });

  it('answers at most 200 distinct sessions in one batch', () => {
    const batch = COURSES_ROUTES.answerHeldBatch.request.body;
    const ids = Array.from({ length: 201 }, (_, n) => id(300 + n));
    expect(batch.safeParse({ items: ids.slice(0, 200), held: true }).success).toBe(true);
    const tooMany = batch.safeParse({ items: ids, held: true });
    expect(tooMany.error?.issues[0]).toMatchObject({ code: 'too_big', path: ['items'] });
    expect(batch.safeParse({ items: [id(1), id(1)], held: true }).success).toBe(false);
  });

  it('collides section labels that differ only in spacing', () => {
    const body = COURSES_ROUTES.createCourse.request.body;
    const base = {
      id: id(1),
      termId: id(2),
      unitId: id(3),
      departmentId: null,
      code: 'BIL 101',
      name: 'Programlama',
      windowMinutes: 15,
    };
    const sections = (a: string, b: string) => [
      { id: id(4), label: a },
      { id: id(5), label: b },
    ];
    expect(body.safeParse({ ...base, sections: sections('1', '2') }).success).toBe(true);
    expect(body.safeParse({ ...base, sections: sections('1', '1 ') }).success).toBe(false);
    expect(body.safeParse({ ...base, sections: sections('A  B', 'A B') }).success).toBe(false);
  });

  it('defaults a new exam week to no classes, but a replaced calendar sends every value', () => {
    const calendar = {
      name: 'Güz',
      classesStart: '2026-09-28',
      classesEnd: '2027-01-08',
      addDropEnd: '2026-10-09',
      lastDay: '2027-01-15',
      holidays: [
        {
          id: id(40),
          name: 'Cumhuriyet',
          start: '2026-10-29',
          end: '2026-10-29',
          halfDayStart: '13:00',
        },
      ],
    };
    const week = { id: id(41), kind: 'midterm', start: '2026-11-16', end: '2026-11-20' };
    const create = COURSES_ROUTES.adminCreateCalendar.request.body;
    const created = create.safeParse({ id: id(42), termId: id(2), ...calendar, examWeeks: [week] });
    expect(created.success).toBe(true);
    expect(created.data?.examWeeks[0]?.classesHeld).toBe(false);
    const put = COURSES_ROUTES.adminPutCalendar.request.body;
    const replaced = { expectedVersion: 1, ...calendar };
    expect(put.safeParse({ ...replaced, examWeeks: [week] }).success).toBe(false);
    expect(
      put.safeParse({ ...replaced, examWeeks: [{ ...week, classesHeld: true }] }).success,
    ).toBe(true);
    const midnight = { ...calendar.holidays[0], halfDayStart: '00:00' };
    expect(
      create.safeParse({
        id: id(42),
        termId: id(2),
        ...calendar,
        holidays: [midnight],
        examWeeks: [],
      }).success,
    ).toBe(false);
    const halfDay = { ...midnight, halfDayStart: '00:01' };
    expect(
      create.safeParse({
        id: id(42),
        termId: id(2),
        ...calendar,
        holidays: [halfDay],
        examWeeks: [],
      }).success,
    ).toBe(true);
  });

  it('refuses an answer list beyond 2,000 rows rather than cutting it', () => {
    const answer = COURSES_ROUTES.listUnconfirmedSessions.response.schema;
    const session = {
      sessionId: id(1),
      courseId: id(2),
      courseCode: 'BIL 101',
      courseName: 'Programlama',
      date: '2026-10-05',
      startTime: '09:00',
      endTime: '10:50',
      theoryHours: 2,
      practiceHours: 0,
      status: 'planned',
      conflicting: false,
      headCount: null,
    };
    const rows = (count: number) => Array.from({ length: count }, () => session);
    expect(answer.safeParse({ sessions: rows(2000), total: 2000 }).success).toBe(true);
    expect(answer.safeParse({ sessions: rows(2001), total: 2001 }).success).toBe(false);
  });

  it('closes request enums but lets answers carry a value added later', () => {
    const query = COURSES_ROUTES.listCourses.request.query;
    expect(query.safeParse({ status: 'archived' }).success).toBe(true);
    expect(query.safeParse({ status: 'frozen' }).success).toBe(false);
    const summary = {
      id: id(1),
      termId: id(2),
      unitId: null,
      departmentId: null,
      code: 'BIL 101',
      name: 'Programlamaya Giriş',
      theoryPercent: 70,
      practicePercent: 80,
      ratesConfirmedAt: null,
      windowMinutes: null,
      qrAttendance: false,
      trial: false,
      trackingStart: null,
      status: 'frozen',
      archiveReason: null,
      editVersion: 0,
      sections: [{ id: id(4), label: '1', status: 'active' }],
      lock: { lastDay: null, lockAt: null, locked: false },
    };
    expect(courseSummarySchema.safeParse(summary).success).toBe(true);
  });
});

describe('courses field bounds', () => {
  it('counts the unanswered sessions of a unit term, a whole number from 0', () => {
    const schema = COURSES_ROUTES.adminListLocks.response.schema as z.ZodType;
    const unitTerm = {
      unitId: id(1),
      unitName: 'Unit',
      termId: id(2),
      academicYear: '2026-2027',
      semester: 'fall',
      calendarId: id(3),
      lastDay: '2027-01-15',
      lockAt: '2027-01-20T21:00:00.000Z',
      locked: false,
      lockAppliedAt: null,
      unansweredSessionCount: 1,
    };
    const answer = (row: object) => ({ termBreak: false, unitTerms: [row] });
    expect(schema.parse(answer(unitTerm))).toEqual(answer(unitTerm));
    expect(ok(schema, answer({ ...unitTerm, unansweredSessionCount: -1 }))).toBe(false);
    expect(ok(schema, answer({ ...unitTerm, unansweredSessionCount: 1.5 }))).toBe(false);
  });

  const createCourse = COURSES_ROUTES.createCourse.request.body;
  const course = {
    id: id(1),
    termId: id(2),
    unitId: id(3),
    departmentId: null,
    code: 'BIL 101',
    name: 'Programlama',
    windowMinutes: null,
    sections: [{ id: id(4), label: '1' }],
  };

  it('ends only a trial session at 24:00', () => {
    const endTime = panelSessionSchema.shape.endTime;
    expect(ok(endTime, '24:00')).toBe(true);
    expect(ok(endTime, '23:59')).toBe(true);
    expect(ok(endTime, '24:01')).toBe(false);
    expect(ok(COURSES_ROUTES.addMakeup.request.body.shape.endTime, '24:00')).toBe(false);
  });

  it('carries the short code in the 10 zero-padded digits the QR layout writes', () => {
    const shortCode = panelSessionSchema.shape.shortCode;
    expect(ok(shortCode, '0000000042')).toBe(true);
    expect(ok(shortCode, '9999999999')).toBe(true);
    for (const bad of ['000000042', '00000000042', '00000000a2', ' 000000042', '0000000042 ']) {
      expect(ok(shortCode, bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('treats an id in upper case as the same id', () => {
    const upper = (n: number) => id(n).toUpperCase();
    const batch = COURSES_ROUTES.answerHeldBatch.request.body;
    expect(ok(batch, { items: [id(1), upper(2)], held: true })).toBe(true);
    expect(ok(batch, { items: [id(1), upper(1)], held: true })).toBe(false);
    const sections = [
      { id: id(4), label: '1' },
      { id: upper(4), label: '2' },
    ];
    expect(ok(createCourse, { ...course, sections })).toBe(false);
    const departments = COURSES_ROUTES.adminUpdateUnit.request.body;
    expect(ok(departments, { departments: [{ id: id(5) }, { id: id(6) }] })).toBe(true);
    expect(ok(departments, { departments: [{ id: id(5) }, { id: upper(5) }] })).toBe(false);
  });

  it('bounds a course code by its normal form', () => {
    const withCode = (code: string) => ok(createCourse, { ...course, code });
    // 23 code units decomposed, 20 characters once composed.
    expect(withCode('BİLGİSAYAR MÜH 30101'.normalize('NFD'))).toBe(true);
    expect(withCode(`  BIL    101  ${' '.repeat(40)}`)).toBe(true);
    // Twenty ß upper-case to forty characters.
    expect(withCode('ß'.repeat(20))).toBe(false);
    expect(withCode('ß'.repeat(10))).toBe(true);
    expect(withCode(`B${' '.repeat(80)}`)).toBe(false);
  });

  it('collides labels that differ only in composition', () => {
    const sections = [
      { id: id(4), label: 'Ş' },
      { id: id(5), label: 'Ş'.normalize('NFD') },
    ];
    expect(ok(createCourse, { ...course, sections })).toBe(false);
  });

  it('bounds window minutes, rates, weekdays and hours', () => {
    for (const [windowMinutes, valid] of [
      [0, false],
      [1, true],
      [240, true],
      [241, false],
    ] as const) {
      expect(ok(createCourse, { ...course, windowMinutes }), String(windowMinutes)).toBe(valid);
    }
    for (const [theoryPercent, valid] of [
      [-1, false],
      [0, true],
      [100, true],
      [101, false],
    ] as const) {
      const rates = { theoryPercent, practicePercent: 70 };
      expect(ok(createCourse, { ...course, rates }), String(theoryPercent)).toBe(valid);
    }
    const schedule = COURSES_ROUTES.putSchedule.request.body;
    const slot = {
      id: id(10),
      weekday: 1,
      startTime: '09:00',
      endTime: '10:50',
      theoryHours: 2,
      practiceHours: 0,
      room: null,
      sectionIds: [id(4)],
    };
    const withSlot = (patch: Record<string, unknown>) =>
      ok(schedule, { expectedVersion: 0, scheduleSlots: [{ ...slot, ...patch }] });
    expect(withSlot({ weekday: 7 })).toBe(true);
    expect(withSlot({ weekday: 0 })).toBe(false);
    expect(withSlot({ theoryHours: -1, practiceHours: 2 })).toBe(false);
  });

  it('refuses repeated holiday and exam week ids in a calendar', () => {
    const create = COURSES_ROUTES.adminCreateCalendar.request.body;
    const holiday = {
      id: id(40),
      name: 'Bayram',
      start: '2026-10-29',
      end: '2026-10-29',
      halfDayStart: null,
    };
    const week = { id: id(41), kind: 'midterm', start: '2026-11-16', end: '2026-11-20' };
    const calendar = (holidays: unknown[], examWeeks: unknown[]) =>
      ok(create, {
        id: id(42),
        termId: id(2),
        name: 'Güz',
        classesStart: '2026-09-28',
        classesEnd: '2027-01-08',
        addDropEnd: '2026-10-09',
        lastDay: '2027-01-15',
        holidays,
        examWeeks,
      });
    expect(calendar([holiday], [week])).toBe(true);
    expect(calendar([holiday, { ...holiday, start: '2026-10-30', end: '2026-10-30' }], [])).toBe(
      false,
    );
    expect(calendar([], [week, { ...week, kind: 'final' }])).toBe(false);
  });

  it('keeps the lecturer history a closed chain of at most 100 entries', () => {
    const at = (second: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, second)).toISOString();
    const chain = (count: number) =>
      Array.from({ length: count }, (_, n) => ({
        personId: id(n + 1),
        startAt: at(n),
        endAt: n === count - 1 ? null : at(n + 1),
      }));
    expect(ok(lecturerHistorySchema, chain(1))).toBe(true);
    expect(ok(lecturerHistorySchema, chain(100))).toBe(true);
    expect(ok(lecturerHistorySchema, chain(101))).toBe(false);
    const [first, second] = chain(2);
    expect(ok(lecturerHistorySchema, [{ ...first, endAt: at(5) }, second])).toBe(false);
    const backwards = [
      { ...first, startAt: at(9), endAt: at(1) },
      { ...second, startAt: at(1) },
    ];
    expect(ok(lecturerHistorySchema, backwards)).toBe(false);
  });

  it('takes a transfer target only as a UUIDv7', () => {
    const transfer = COURSES_ROUTES.adminTransferCourse.request.body;
    expect(ok(transfer, { targetPersonId: id(7), reason: 'lecturer_left' })).toBe(true);
    const v4 = '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e';
    expect(ok(transfer, { targetPersonId: v4, reason: 'lecturer_left' })).toBe(false);
  });
});
