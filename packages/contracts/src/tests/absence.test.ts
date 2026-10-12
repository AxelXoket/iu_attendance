import { FINAL_STATUSES } from '@iu-attendance/core/corrections/catalog';
import { describe, expect, it } from 'vitest';
import {
  ABSENCE_AUDIT_CHANGES,
  ABSENCE_AUDIT_EVENTS,
  ABSENCE_DIFF_KINDS,
  ABSENCE_ERROR_CODES,
  ABSENCE_FINAL_STATUSES,
  ABSENCE_REASON_LIST,
  ABSENCE_REASONS,
  ABSENCE_ROUTES,
  ABSENCE_TRIGGER_KINDS,
  absenceFinalStatusSchema,
} from '../absence.ts';
import { defineRoute, type RouteDefinition } from '../shared/index.ts';
import { id, issueCodes } from './helpers.ts';

describe('absence value lists', () => {
  it('name each reason by itself, thirteen in all, and keep the other lists unique', () => {
    for (const [key, value] of Object.entries(ABSENCE_REASONS)) expect(value).toBe(key);
    expect(ABSENCE_REASON_LIST).toHaveLength(13);
    for (const values of [ABSENCE_REASON_LIST, ABSENCE_TRIGGER_KINDS, ABSENCE_DIFF_KINDS]) {
      expect(new Set(values).size).toBe(values.length);
      for (const value of values) expect(value).toMatch(/^[A-Z]+(?:_[A-Z]+)*$/);
    }
    expect(ABSENCE_TRIGGER_KINDS).toEqual([
      'RECORD',
      'CORRECTION',
      'ISSUE_REPORT',
      'ROSTER_ROW',
      'SESSION',
      'COURSE',
    ]);
    expect(ABSENCE_DIFF_KINDS).toEqual([
      'HOURS',
      'ALLOWANCE_DECISION',
      'SESSION_FINAL_STATUS',
      'COMPUTED_LEVEL',
      'OPEN_FLAG',
      'MISSING_ROW',
      'EXTRA_ROW',
    ]);
  });

  it("are the corrections module's final statuses and letters, plus EXEMPT with M", () => {
    expect(ABSENCE_FINAL_STATUSES.slice(0, -1)).toEqual(
      FINAL_STATUSES.map(({ code, letter }) => ({ code, letter })),
    );
    expect(ABSENCE_FINAL_STATUSES.at(-1)).toEqual({ code: 'EXEMPT', letter: 'M' });
    expect(absenceFinalStatusSchema.safeParse('EXEMPT').success).toBe(true);
    expect(absenceFinalStatusSchema.safeParse('A_STATUS_ADDED_LATER').success).toBe(true);
    // The document lists exactly these codes as the known values.
    expect(absenceFinalStatusSchema.meta()?.['x-extensible-enum']).toEqual(
      ABSENCE_FINAL_STATUSES.map(({ code }) => code),
    );
  });
});

describe('absence routes', () => {
  const RATE_ERRORS = ['ABSENCE_NOT_FOUND', 'ABSENCE_TERM_LOCKED', 'ABSENCE_COURSE_ARCHIVED'];
  // The spec's four endpoints: method and path, roles, rate class and error answers.
  const SPEC = {
    listPendingDecisions: [
      'GET /v1/absence/courses/{courseId}/pending-decisions',
      ['lecturer'],
      'heavy',
      ['ABSENCE_NOT_FOUND'],
    ],
    setExempt: [
      'PUT /v1/absence/courses/{courseId}/students/{rowId}/exempt',
      ['lecturer'],
      'session',
      [
        'ABSENCE_NOT_FOUND',
        'ABSENCE_ROW_INACTIVE',
        'ABSENCE_TERM_LOCKED',
        'ABSENCE_COURSE_ARCHIVED',
      ],
    ],
    setRates: ['PUT /v1/absence/courses/{courseId}/rates', ['lecturer'], 'session', RATE_ERRORS],
    adminSetRates: [
      'PUT /v1/absence/admin/courses/{courseId}/rates',
      ['admin'],
      'session',
      RATE_ERRORS,
    ],
  } as const;

  it('are the four spec endpoints with their roles, rate classes and error answers', () => {
    expect(Object.keys(ABSENCE_ROUTES)).toEqual(Object.keys(SPEC));
    for (const [key, [endpoint, roles, rate, routeErrors]] of Object.entries(SPEC)) {
      const route = ABSENCE_ROUTES[key as keyof typeof SPEC] as RouteDefinition;
      expect(defineRoute(route)).toBe(route);
      expect(`${route.method} ${route.path}`, key).toBe(endpoint);
      expect(route.roles, key).toEqual(roles);
      expect(route.rate, key).toBe(rate);
      expect(route.errors, key).toEqual(routeErrors);
    }
  });

  it('take whole percents from 0 to 100 for both rates, and a boolean exemption', () => {
    const rates = ABSENCE_ROUTES.setRates.request.body;
    expect(rates.safeParse({ theoryPercent: 0, practicePercent: 0 }).success).toBe(true);
    expect(rates.safeParse({ theoryPercent: 100, practicePercent: 100 }).success).toBe(true);
    for (const bad of [-1, 101, 70.5]) {
      for (const field of ['theoryPercent', 'practicePercent']) {
        const body = { theoryPercent: 70, practicePercent: 70, [field]: bad };
        expect(rates.safeParse(body).success, `${field} ${bad}`).toBe(false);
      }
    }
    expect(rates.safeParse({ theoryPercent: 70 }).success).toBe(false);
    const exempt = ABSENCE_ROUTES.setExempt.request.body;
    expect(exempt.safeParse({ exempt: true }).success).toBe(true);
    expect(exempt.safeParse({ exempt: false }).success).toBe(true);
    expect(exempt.safeParse({ exempt: 'yes' }).success).toBe(false);
    expect(exempt.safeParse({}).success).toBe(false);
    expect(
      ABSENCE_ROUTES.setExempt.request.params.safeParse({ courseId: id(1), rowId: id(2) }).success,
    ).toBe(true);
  });

  it('answer the pending decisions with nullable days and contacts, at most 2,000 students', () => {
    const answer = ABSENCE_ROUTES.listPendingDecisions.response.schema;
    const student = {
      rowId: id(2),
      sectionId: id(3),
      studentNumber: '0123456789',
      fullName: 'Ada',
      reasons: ['NO_CONNECTION'],
      result: 'NOT_MET',
      lastContactAt: null,
      pendingAtLastContact: false,
      singleRecordSessions: [],
      openFlags: [],
    };
    const base = {
      courseId: id(1),
      computedAt: '2026-10-12T08:00:00.000Z',
      lastClassDay: null,
      started: false,
      lastDay: null,
      locked: false,
    };
    const students = (count: number) => Array.from({ length: count }, () => student);
    expect(answer.safeParse({ ...base, students: students(2000) }).success).toBe(true);
    expect(answer.safeParse({ ...base, students: students(2001) }).success).toBe(false);
  });

  it('answer 404 for not found and 409 otherwise, in texts without digits or placeholders', () => {
    for (const [code, definition] of Object.entries(ABSENCE_ERROR_CODES)) {
      expect(definition.http, code).toBe(code === 'ABSENCE_NOT_FOUND' ? 404 : 409);
      for (const text of [definition.lecturer, definition.student]) {
        for (const value of Object.values(text)) expect(value).not.toMatch(/[0-9{}]/);
      }
    }
  });
});

describe('absence audit events', () => {
  it('carry empty strict details and keep the values before and after in the envelope', () => {
    expect(Object.keys(ABSENCE_AUDIT_EVENTS).sort()).toEqual(
      Object.keys(ABSENCE_AUDIT_CHANGES).sort(),
    );
    for (const schema of Object.values(ABSENCE_AUDIT_EVENTS)) {
      expect(schema.safeParse({}).success).toBe(true);
      expect(issueCodes(schema.safeParse({ exempt: true }))).toContain('unrecognized_keys');
    }
    const rates = ABSENCE_AUDIT_CHANGES['absence.rates_changed'].after;
    expect(
      rates.safeParse({ theoryPercent: 70, practicePercent: 80, confirmed: true }).success,
    ).toBe(true);
    expect(rates.safeParse({ theoryPercent: 70, practicePercent: 80 }).success).toBe(false);
    expect(
      ABSENCE_AUDIT_CHANGES['absence.exempt_changed'].before.safeParse({ exempt: false }).success,
    ).toBe(true);
  });
});
