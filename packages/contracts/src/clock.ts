// Clock contract (D04): the code lists the neighbours import (first and second anchor,
// clock status and source, window result, close reason, change kind), the CLOCK_ error
// catalog, the audit event detail schemas, the two routes and the two phone queue item
// bodies. Request and answer objects drop unknown keys (D13-B24); the audit schemas are
// strict. The document layout and its constants live in core (clock/document.ts).

import { CHANGE_KINDS, type ChangeKind } from '@iu-attendance/core/clock/codes';
import { DOCUMENT_BYTES, VALUE_BYTES } from '@iu-attendance/core/clock/constants';
import { z } from 'zod';
import { courseIdSchema, sessionIdSchema, termIdSchema } from './courses.ts';
import {
  base64UrlBytesSchema,
  defineErrorCodes,
  defineItemType,
  defineRoute,
  extensibleEnum,
  idSchema,
  instantSchema,
  OPERATIONAL_CODE,
  personIdSchema,
  sameText,
  sessionAccess,
  unitIdSchema,
  v7IdSchema,
} from './shared/index.ts';

// Code lists. The CHECK constraints of the window change and record tables are made from
// these; the neighbours import them and keep no copy. The anchor, clock and window lists
// live in core, next to the rules that use them.
export {
  CHANGE_KINDS,
  type ChangeKind,
  CLOCK_SOURCES,
  CLOCK_STATUSES,
  type ClockSource,
  type ClockStatus,
  FIRST_ANCHOR_PHONE_REPORTS,
  FIRST_ANCHOR_STATUSES,
  type FirstAnchorPhoneReport,
  type FirstAnchorStatus,
  SECOND_ANCHOR_ABSENT_REASONS,
  SECOND_ANCHOR_STATUSES,
  type SecondAnchorAbsentReason,
  type SecondAnchorStatus,
  WINDOW_RESULTS,
  type WindowResult,
} from '@iu-attendance/core/clock/codes';
export const CLOSE_REASONS = ['TIME_UP', 'EARLY_CLOSE', 'WINDOW_LENGTH'] as const;
// Where the press instant of a window change comes from; ARRIVAL: no anchor could be set.
export const PRESSED_AT_SOURCES = [
  'BOTH_ANCHORS',
  'FIRST_ANCHOR',
  'SECOND_ANCHOR',
  'ARRIVAL',
] as const;
// LAST_DAY_PASSED: the lock instant was at or before the arrival; TERM_LOCKED: the lock
// was applied before its instant.
export const NOT_APPLIED_REASONS = ['LAST_DAY_PASSED', 'TERM_LOCKED'] as const;
// COURSE: the window length comes from the course setting; SESSION: a window change set it.
export const WINDOW_SOURCES = ['COURSE', 'SESSION'] as const;

export type CloseReason = (typeof CLOSE_REASONS)[number];

// Phone queue items. The sync module parses the text body with these schemas; the window
// length's upper bound is the class length, checked by the handler (CLOCK_DURATION_INVALID).
export const WINDOW_LENGTH_ITEM = defineItemType(
  'window_length',
  z.object({
    sessionId: sessionIdSchema,
    // null: the window stays open for the whole class.
    newWindowMinutes: z.number().int().min(1).max(1440).nullable(),
  }),
  { module: 'clock' },
);
export const EARLY_CLOSE_ITEM = defineItemType(
  'early_close',
  z.object({ sessionId: sessionIdSchema }),
  {
    module: 'clock',
  },
);
// The one mapping from item type names to change kinds.
export const ITEM_TYPE_CHANGE_KIND = {
  [WINDOW_LENGTH_ITEM.type]: 'WINDOW_LENGTH',
  [EARLY_CLOSE_ITEM.type]: 'EARLY_CLOSE',
} as const satisfies Record<string, ChangeKind>;

// Error catalog. Item codes and start-up codes have no HTTP status; item codes keep a text
// because the lecturer's phone shows why a change was not applied.

export const CLOCK_ERROR_CODES = defineErrorCodes('clock', {
  CLOCK_SYNC_BROKEN: {
    http: 503,
    ...sameText(
      'Sunucu saati şu anda doğrulanamıyor; biraz sonra yeniden denenecek.',
      'The server clock cannot be confirmed right now; it will be retried shortly.',
    ),
    retry: { fixed: 60 },
  },
  CLOCK_NOT_FOUND: {
    http: 404,
    ...sameText(
      'Oturum bulunamadı ya da bu işlem için yetkiniz yok.',
      'The session was not found or you have no access to it.',
    ),
  },
  CLOCK_ITEM_INVALID: {
    http: null,
    ...sameText('Pencere değişikliği okunamadı.', 'The window change could not be read.'),
  },
  CLOCK_ITEM_ID_CONFLICT: {
    http: null,
    ...sameText(
      'Bu değişiklik başka bir içerikle zaten gönderilmiş.',
      'This change was already sent with other content.',
    ),
  },
  CLOCK_SESSION_NOT_FOUND: {
    http: null,
    ...sameText('Değişikliğin oturumu bulunamadı.', 'The session of the change was not found.'),
  },
  CLOCK_NOT_AUTHORIZED: {
    http: null,
    ...sameText(
      'Bu oturumun penceresini yalnız dersin hocası değiştirebilir.',
      "Only the course's lecturer can change this session's window.",
    ),
  },
  CLOCK_DURATION_INVALID: {
    http: null,
    ...sameText(
      'Pencere süresi ders süresi içinde tam dakika olmalı.',
      'The window length must be whole minutes within the class length.',
    ),
  },
  CLOCK_CHANGE_STORED: {
    http: null,
    ...sameText(
      'Değişiklik dönem kilitlendikten sonra ulaştı; yalnız kaydedildi, pencere değişmedi.',
      'The change arrived after the term lock; it was stored but the window did not change.',
    ),
  },
  CLOCK_KID_INVALID: OPERATIONAL_CODE,
  CLOCK_SYNC_SETTING_INVALID: OPERATIONAL_CODE,
  CLOCK_PROCESS_WRONG: OPERATIONAL_CODE,
});

export type ClockErrorCode = keyof typeof CLOCK_ERROR_CODES;

// A route's error list, checked against the catalog when it compiles.
const errors = (...codes: ClockErrorCode[]) => codes;

// Routes.

const documentValueSchema = base64UrlBytesSchema(VALUE_BYTES);

const changeSchema = z.object({
  id: v7IdSchema('WindowChange'),
  kind: extensibleEnum(CHANGE_KINDS),
  newWindowMinutes: z.number().int().nullable(),
  personId: personIdSchema,
  pressedAtLow: instantSchema,
  pressedAtHigh: instantSchema,
  effectivePressedAt: instantSchema,
  pressedAtSource: extensibleEnum(PRESSED_AT_SOURCES),
  arrivedAt: instantSchema,
  applied: z.boolean(),
  notAppliedReason: extensibleEnum(NOT_APPLIED_REASONS).nullable(),
  lateArrival: z.boolean(),
  // null for a change that takes no effect (pressed before the session moved, or out of bounds).
  previousCloseAt: instantSchema.nullable(),
  nextCloseAt: instantSchema.nullable(),
  effective: z.boolean(),
});

export const CLOCK_ROUTES = {
  clockDocument: defineRoute({
    module: 'clock',
    name: 'clockDocument',
    method: 'POST',
    path: '/v1/clock/document',
    auth: ['session'],
    authSources: ['bearer'],
    roles: ['student', 'staff'],
    rate: 'clock',
    // The document is in the body, so this answer carries no clock document header.
    clockAttestation: false,
    request: { body: z.object({ value: documentValueSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        document: base64UrlBytesSchema(DOCUMENT_BYTES),
      }),
    },
    errors: errors('CLOCK_SYNC_BROKEN'),
    summary: "A signed clock document for the caller's device or person; stateless.",
  }),
  getWindow: defineRoute({
    module: 'clock',
    name: 'getWindow',
    method: 'GET',
    path: '/v1/clock/windows/{sessionId}',
    ...sessionAccess('staff'),
    request: { params: z.object({ sessionId: sessionIdSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        sessionId: sessionIdSchema,
        termId: termIdSchema,
        courseId: courseIdSchema,
        openAt: instantSchema,
        plannedCloseAt: instantSchema,
        closeAt: instantSchema,
        latestCloseAt: instantSchema,
        classEndAt: instantSchema,
        movedAt: instantSchema.nullable(),
        plannedWindowMinutes: z.number().int().nullable(),
        // null: open for the whole class.
        windowMinutes: z.number().int().nullable(),
        windowChosen: z.boolean(),
        windowSource: extensibleEnum(WINDOW_SOURCES),
        open: z.boolean(),
        closedAt: instantSchema.nullable(),
        // In effective press order.
        changes: z.array(changeSchema),
      }),
    },
    errors: errors('CLOCK_NOT_FOUND'),
    summary: "A session's attendance window and its in-class changes.",
  }),
};

// Audit event types and their detail schemas, strict: the audit writer rejects an
// unknown field. unitId is null for the trial course, which has no unit.

const sessionContext = {
  sessionId: sessionIdSchema,
  courseId: courseIdSchema,
  unitId: unitIdSchema.nullable(),
};
const appliedChange = {
  ...sessionContext,
  changeId: v7IdSchema('WindowChange'),
  previousCloseAt: instantSchema,
  nextCloseAt: instantSchema,
  pressedAtSource: z.enum(PRESSED_AT_SOURCES),
  lateArrival: z.boolean(),
};

export const CLOCK_AUDIT_EVENTS = {
  'clock.window_length_changed': z.strictObject({
    ...appliedChange,
    newWindowMinutes: z.number().int().min(1).nullable(),
  }),
  'clock.closed_early': z.strictObject(appliedChange),
  'clock.window_change_stored': z.strictObject({
    ...sessionContext,
    changeId: v7IdSchema('WindowChange'),
    kind: z.enum(CHANGE_KINDS),
    notAppliedReason: z.enum(NOT_APPLIED_REASONS),
  }),
  'clock.item_id_conflict': z.strictObject({
    ...sessionContext,
    changeId: v7IdSchema('WindowChange'),
    installId: idSchema('Installation'),
  }),
  'clock.unauthorized_window_change': z.strictObject({
    ...sessionContext,
    kind: z.enum(CHANGE_KINDS),
    installId: idSchema('Installation'),
  }),
} as const satisfies Readonly<Record<string, z.ZodObject>>;
