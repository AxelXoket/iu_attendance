// Absence contract (D08): the calculation reasons, trigger kinds and diff kinds the other
// modules import, the session final statuses (the corrections module's plus EXEMPT), the
// audit event schemas, the four routes and the ABSENCE_ error catalog. The module's four
// tables import these lists for their CHECK constraints. Request and answer objects drop
// unknown keys (D13-B24); the audit schemas are strict.

import {
  DECISION_PENDING_REASONS,
  OPEN_FLAG_KINDS,
} from '@iu-attendance/core/absence/decision-pending';
import {
  ABSENCE_FINAL_STATUS_CODES,
  ABSENCE_FINAL_STATUSES,
  type AbsenceFinalStatus,
} from '@iu-attendance/core/absence/session-layer';
import type { CourseResult } from '@iu-attendance/core/absence/types';
import { nonEmpty } from '@iu-attendance/core/shared/list';
import { z } from 'zod';
import { courseIdSchema, sectionIdSchema, sessionIdSchema } from './courses.ts';
import {
  dateSchema,
  defineErrorCodes,
  defineRoute,
  extensibleEnum,
  fullListSchema,
  instantSchema,
  percentSchema,
  rosterRowIdSchema,
  sameText,
  sessionAccess,
} from './shared/index.ts';

// Why an absence calculation runs: the job data's enum and the level history CHECK list.
// The calling modules import the value they send.
export const ABSENCE_REASONS = {
  RECORD: 'RECORD',
  DECISION: 'DECISION',
  CORRECTION: 'CORRECTION',
  ISSUE_REPORT: 'ISSUE_REPORT',
  ROSTER: 'ROSTER',
  EXEMPT: 'EXEMPT',
  RATE: 'RATE',
  SCHEDULE: 'SCHEDULE',
  HELD: 'HELD',
  SESSION_CLOSED: 'SESSION_CLOSED',
  LOCK: 'LOCK',
  CONSISTENCY: 'CONSISTENCY',
  RULE: 'RULE',
} as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[keyof typeof ABSENCE_REASONS];
export const ABSENCE_REASON_CODES = nonEmpty(Object.values(ABSENCE_REASONS));

// What triggered a calculation; a term id travels only with RECORD and ROSTER_ROW.
export const ABSENCE_TRIGGER_KINDS = [
  'RECORD',
  'CORRECTION',
  'ISSUE_REPORT',
  'ROSTER_ROW',
  'SESSION',
  'COURSE',
] as const;
export type AbsenceTriggerKind = (typeof ABSENCE_TRIGGER_KINDS)[number];

// How the nightly consistency check classifies a stored value that differs from a fresh calculation.
export const ABSENCE_DIFF_KINDS = [
  'HOURS',
  'ALLOWANCE_DECISION',
  'SESSION_FINAL_STATUS',
  'COMPUTED_LEVEL',
  'OPEN_FLAG',
  'MISSING_ROW',
  'EXTRA_ROW',
] as const;
export type AbsenceDiffKind = (typeof ABSENCE_DIFF_KINDS)[number];

// A session's final status in the absence module (core's AbsenceFinalStatus): the
// corrections module's statuses and letters, plus EXEMPT (letter M) for an exempt student.
export type { AbsenceFinalStatus };
export {
  ABSENCE_FINAL_STATUS_CODES,
  ABSENCE_FINAL_STATUSES,
  DECISION_PENDING_REASONS,
  OPEN_FLAG_KINDS,
};

// Error catalog. These codes reach only staff routes, so the student text repeats the
// staff text.

export const ABSENCE_ERROR_CODES = defineErrorCodes('absence', {
  ABSENCE_NOT_FOUND: {
    http: 404,
    ...sameText(
      'Kayıt bulunamadı ya da bu işlem için yetkiniz yok.',
      'The record was not found or you have no access to it.',
    ),
  },
  ABSENCE_ROW_INACTIVE: {
    http: 409,
    ...sameText(
      'Öğrenci listede pasif; önce listeye geri alın.',
      'The student is inactive on the roster; bring the student back first.',
    ),
  },
  ABSENCE_TERM_LOCKED: {
    http: 409,
    ...sameText(
      'Bu birimin dönemi kilitlendi; değişiklik yapılamaz.',
      "This unit's term is locked; it can no longer be changed.",
    ),
  },
  ABSENCE_COURSE_ARCHIVED: {
    http: 409,
    ...sameText('Ders arşivde; değiştirilemez.', 'The course is archived; it cannot be changed.'),
  },
});

export type AbsenceErrorCode = keyof typeof ABSENCE_ERROR_CODES;

// A route's error list, checked against the catalog when it compiles.
const errors = (...codes: AbsenceErrorCode[]) => codes;

const courseParams = z.object({ courseId: courseIdSchema });

// Both rate routes share one handler and differ only in who may call them. Two zeros mean
// no attendance requirement; any write confirms the rates.
const ratesBody = z.object({ theoryPercent: percentSchema, practicePercent: percentSchema });
const ratesAnswer = z.object({
  courseId: courseIdSchema,
  theoryPercent: percentSchema,
  practicePercent: percentSchema,
  ratesConfirmedAt: instantSchema,
  changed: z.boolean(),
  calculationQueued: z.boolean(),
});
const rateErrors = errors('ABSENCE_NOT_FOUND', 'ABSENCE_TERM_LOCKED', 'ABSENCE_COURSE_ARCHIVED');

export const ABSENCE_ROUTES = {
  listPendingDecisions: defineRoute({
    module: 'absence',
    name: 'listPendingDecisions',
    method: 'GET',
    path: '/v1/absence/courses/{courseId}/pending-decisions',
    // Calculates every section of the course live.
    ...sessionAccess('lecturer', 'heavy'),
    request: { params: courseParams },
    response: {
      statuses: [200],
      schema: z.object({
        courseId: courseIdSchema,
        computedAt: instantSchema,
        lastClassDay: dateSchema.nullable(),
        started: z.boolean(),
        lastDay: dateSchema.nullable(),
        locked: z.boolean(),
        // Empty until the last class day.
        students: fullListSchema(
          z.object({
            rowId: rosterRowIdSchema,
            sectionId: sectionIdSchema,
            studentNumber: z.string(),
            fullName: z.string(),
            reasons: z.array(extensibleEnum(DECISION_PENDING_REASONS)),
            result: extensibleEnum(['MET', 'NOT_MET'] as const satisfies readonly CourseResult[]),
            lastContactAt: instantSchema.nullable(),
            // Some phone of the person reported unsent records at its last contact.
            unsentAtLastContact: z.boolean(),
            singleRecordSessions: z.array(
              z.object({
                sessionId: sessionIdSchema,
                date: dateSchema,
                theoryHours: z.number().int(),
                practiceHours: z.number().int(),
              }),
            ),
            openFlags: z.array(
              z.object({
                sessionId: sessionIdSchema,
                kind: extensibleEnum(OPEN_FLAG_KINDS),
              }),
            ),
          }),
        ),
      }),
    },
    errors: errors('ABSENCE_NOT_FOUND'),
    summary: "Students whose course result is not final yet, after the course's last class day.",
  }),
  setExempt: defineRoute({
    module: 'absence',
    name: 'setExempt',
    method: 'PUT',
    path: '/v1/absence/courses/{courseId}/students/{rowId}/exempt',
    ...sessionAccess('lecturer'),
    request: {
      params: z.object({ courseId: courseIdSchema, rowId: rosterRowIdSchema }),
      body: z.object({ exempt: z.boolean() }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        rowId: rosterRowIdSchema,
        exempt: z.boolean(),
        changed: z.boolean(),
        calculationQueued: z.boolean(),
      }),
    },
    errors: errors(
      'ABSENCE_NOT_FOUND',
      'ABSENCE_ROW_INACTIVE',
      'ABSENCE_TERM_LOCKED',
      'ABSENCE_COURSE_ARCHIVED',
    ),
    summary: 'Marks a student exempt from attendance in the course, or clears it.',
  }),
  setRates: defineRoute({
    module: 'absence',
    name: 'setRates',
    method: 'PUT',
    path: '/v1/absence/courses/{courseId}/rates',
    ...sessionAccess('lecturer'),
    request: { params: courseParams, body: ratesBody },
    response: { statuses: [200], schema: ratesAnswer },
    errors: rateErrors,
    summary: "The course lecturer confirms or changes the course's attendance rates.",
  }),
  adminSetRates: defineRoute({
    module: 'absence',
    name: 'adminSetRates',
    method: 'PUT',
    path: '/v1/absence/admin/courses/{courseId}/rates',
    ...sessionAccess('admin'),
    request: { params: courseParams, body: ratesBody },
    response: { statuses: [200], schema: ratesAnswer },
    errors: rateErrors,
    summary: "An admin whose scope covers the course's unit sets its attendance rates.",
  }),
};

// Audit events: the detail objects are empty. The envelope carries the rest: the values
// before and after (described by ABSENCE_AUDIT_CHANGES), the acting role (lecturer or
// admin), termId, unitId and courseId, and for an exemption the rosterRowId too.
export const ABSENCE_AUDIT_EVENTS = {
  'absence.exempt_changed': z.strictObject({}),
  'absence.rates_changed': z.strictObject({}),
} as const satisfies Readonly<Record<string, z.ZodObject>>;

const exemptState = z.strictObject({ exempt: z.boolean() });
const ratesState = z.strictObject({
  theoryPercent: percentSchema,
  practicePercent: percentSchema,
  confirmed: z.boolean(),
});

export const ABSENCE_AUDIT_CHANGES = {
  'absence.exempt_changed': { before: exemptState, after: exemptState },
  'absence.rates_changed': { before: ratesState, after: ratesState },
} as const satisfies Record<
  keyof typeof ABSENCE_AUDIT_EVENTS,
  { before: z.ZodType; after: z.ZodType }
>;

// The final status of a session as answers carry it.
export const absenceFinalStatusSchema = extensibleEnum(ABSENCE_FINAL_STATUS_CODES);
