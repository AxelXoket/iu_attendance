// Reports contract (D10): the five report routes (course report, student report, AKSIS
// summary, its output record, and the admin's term-end report), the REPORTS_ error
// catalog, the AKSIS snapshot the corrections module reads, the end-of-day snapshot job's
// data and the empty audit event map. The cell codes, provisional reasons and output
// states live in core (reports/codes.ts, reports/output-state.ts); this file re-exports
// them. Answers carry codes, never letters or texts: the panel writes the AKSIS summary in
// Turkish only, whatever the request's language.

import { DECISION_PENDING_REASONS } from '@iu-attendance/core/absence/decision-pending';
import { COUNT_BASES, COURSE_RESULTS, TYPE_DECISIONS } from '@iu-attendance/core/absence/types';
import {
  CELL_CODES,
  LOCK_SURVIVING_REASONS,
  PROVISIONAL_REASONS,
} from '@iu-attendance/core/reports/codes';
import { OUTPUT_BLOCKS, OUTPUT_STATES } from '@iu-attendance/core/reports/output-state';
import { RECORD_DECISIONS } from '@iu-attendance/core/verification/codes';
import { z } from 'zod';
import {
  courseIdSchema,
  HELD_STATUSES,
  SESSION_KINDS,
  sectionIdSchema,
  sessionIdSchema,
  termIdSchema,
} from './courses.ts';
import { ROW_SOURCES } from './rosters.ts';
import {
  clientIdSchema,
  countSchema,
  dateSchema,
  defineErrorCodes,
  defineRoute,
  extensibleEnum,
  FULL_LIST_DEFAULT_MAX,
  fullListSchema,
  type Id,
  instantSchema,
  isUnique,
  localTimeSchema,
  percentSchema,
  perMilleSchema,
  rosterRowIdSchema,
  sessionAccess,
  studentNumberSchema,
  unitIdSchema,
  v7IdSchema,
} from './shared/index.ts';

export {
  CELL_CODES,
  type CellCode,
  LOCK_SURVIVING_REASONS,
  PROVISIONAL_REASONS,
  type ProvisionalReason,
} from '@iu-attendance/core/reports/codes';
export {
  OUTPUT_BLOCKS,
  OUTPUT_STATES,
  type OutputBlock,
  type OutputState,
} from '@iu-attendance/core/reports/output-state';

// Value lists.

// Where a snapshot came from: the end-of-day job after the lock, or a lecturer's output.
export const SNAPSHOT_SOURCES = ['END_OF_DAY', 'LECTURER_OUTPUT'] as const;
export type SnapshotSource = (typeof SNAPSHOT_SOURCES)[number];

// What the lecturer did with the summary: an Excel file, a printout, the summary seen on
// screen at term end, or the confirmation of having entered it in AKSIS (D10-A07).
export const OUTPUT_KINDS = ['EXCEL', 'PRINT', 'SCREEN', 'CONFIRMATION'] as const;
export type OutputKind = (typeof OUTPUT_KINDS)[number];

// Which of a section's snapshots the corrections module asks for: the end-of-day one, the
// latest lecturer output, or the baseline (the latest lecturer output between the last
// session's end and the lock, else the end-of-day one).
export const SNAPSHOT_LOOKUPS = ['END_OF_DAY', 'LAST_LECTURER_OUTPUT', 'BASELINE'] as const;
export type SnapshotLookup = (typeof SNAPSHOT_LOOKUPS)[number];

// Why a date range is refused: its end before its start, or no day left once it is cut to
// the term's days up to today.
export const DATE_RANGE_PROBLEMS = ['REVERSED', 'OUTSIDE_TERM'] as const;

// Identifiers and shared shapes.

export type SnapshotId = Id<'AksisSnapshot'>;
export const snapshotIdSchema = v7IdSchema('AksisSnapshot');

// The SHA-256 of a summary's canonical content, as 64 lower-case hex digits.
export const SUMMARY_DIGEST_LENGTH = 64;
export const summaryDigestSchema = z
  .string()
  .length(SUMMARY_DIGEST_LENGTH)
  .regex(/^[0-9a-f]+$/);

// A course as every report names it.
const courseHead = { courseId: courseIdSchema, code: z.string(), name: z.string() };
const courseSchema = z.object({
  ...courseHead,
  termId: termIdSchema,
  unitId: unitIdSchema,
  archived: z.boolean(),
  trackingStart: dateSchema.nullable(),
});
const sectionSchema = z.object({ sectionId: sectionIdSchema, label: z.string() });
const rangeSchema = z.object({ from: dateSchema, to: dateSchema });

// Each reason with what it touches: cells, sessions or students, by the answer.
const provisionalReasonsSchema = z.array(
  z.object({ code: extensibleEnum(PROVISIONAL_REASONS), count: countSchema }),
);

// One hour type of a cell: the absence module's four hours, together the session's hours
// of the type, all 0 when the student has no row for the session.
const typeCellSchema = z.object({
  status: extensibleEnum(CELL_CODES),
  presentHours: countSchema,
  absentHours: countSchema,
  excusedHours: countSchema,
  openHours: countSchema,
});
const cellSchema = z.object({
  theory: typeCellSchema.nullable(),
  practice: typeCellSchema.nullable(),
});

// A student's place on a roster, as the reports show it; number and name are null once
// the retention time has made the row anonymous.
const rosterPlace = {
  rosterRowId: rosterRowIdSchema,
  studentNumber: studentNumberSchema.nullable(),
  fullName: z.string().nullable(),
  retentionExpired: z.boolean(),
  order: countSchema,
  source: extensibleEnum(ROW_SOURCES),
  exempt: z.boolean(),
};

// The ended sessions that are not cancelled, by class day and start.
const reportSessionSchema = z.object({
  sessionId: sessionIdSchema,
  classDay: dateSchema,
  startTime: localTimeSchema,
  theoryHours: countSchema,
  practiceHours: countSchema,
  kind: extensibleEnum(SESSION_KINDS),
  heldStatus: extensibleEnum(HELD_STATUSES),
  // The exclusive end of the session's sending time.
  sendingEndsAt: instantSchema,
  // An unreviewed head count flag raised after class.
  headCountFlag: z.boolean(),
});

// A session whose held question is unanswered, as the summary and the 409 list it.
const unansweredSessionSchema = reportSessionSchema.pick({
  sessionId: true,
  classDay: true,
  startTime: true,
});

const courseReportRowSchema = z.object({
  ...rosterPlace,
  addedAt: instantSchema,
  inactiveAt: instantSchema.nullable(),
  // The course's other sections where the same number has a row; the cells are this
  // section's sessions only.
  otherSections: z.array(sectionSchema),
  // In the order of the section's sessions, so bounded by them: not a full list of its own,
  // whose rows would count with the students' (D13-B13).
  cells: z.array(cellSchema).max(FULL_LIST_DEFAULT_MAX),
});

// The lecturer's view of a student's record in a session; labels and reasons stay out.
const studentSessionSchema = reportSessionSchema
  .pick({
    sessionId: true,
    classDay: true,
    startTime: true,
    theoryHours: true,
    practiceHours: true,
    heldStatus: true,
  })
  .extend({
    ...cellSchema.shape,
    record: z
      .object({ decision: extensibleEnum(RECORD_DECISIONS), awaitingApproval: z.boolean() })
      .nullable(),
  });

// One hour type in the AKSIS summary, from the absence module's live result.
const typeSummarySchema = z.object({
  heldHours: countSchema,
  absentHours: countSchema,
  excusedHours: countSchema,
  attendedHours: countSchema,
  // null while no hours are held.
  attendedPerMille: perMilleSchema.nullable(),
  decision: extensibleEnum(TYPE_DECISIONS),
});

const aksisRowSchema = z.object({
  ...rosterPlace,
  theory: typeSummarySchema.nullable(),
  practice: typeSummarySchema.nullable(),
  result: extensibleEnum(COURSE_RESULTS),
  // Empty when the result is final; both reasons may hold.
  decisionPendingReasons: z.array(extensibleEnum(DECISION_PENDING_REASONS)),
});

const outputSchema = z.object({
  state: extensibleEnum(OUTPUT_STATES),
  block: extensibleEnum(OUTPUT_BLOCKS).nullable(),
  snapshotAllowed: z.boolean(),
});

const snapshotSummarySchema = z.object({
  snapshotId: snapshotIdSchema,
  source: extensibleEnum(SNAPSHOT_SOURCES),
  outputKind: extensibleEnum(OUTPUT_KINDS).nullable(),
  takenAt: instantSchema,
});

// The term-end report's counts, by section and in total; no name or number.
const termEndCounts = {
  absentAtBaseline: countSchema,
  // Unjustly absent: absent at the baseline, met now through a late record or a
  // correction counted as unjust.
  unjustifiedAbsent: countSchema,
  // Within unjustifiedAbsent: those with a correction for a makeup that never reached the
  // phone; shown apart, never added twice.
  unjustifiedMakeup: countSchema,
  excusedReturns: countSchema,
  decisionPendingLeft: countSchema,
  otherChanges: countSchema,
};

// Error catalog. A resource the caller may not see answers as one that does not exist.

const STUDENT_TEXT = {
  tr: 'Bu bilgi öğrenci hesabıyla görüntülenemez.',
  en: 'This information cannot be viewed with a student account.',
};
const lecturerText = (tr: string, en: string) => ({ lecturer: { tr, en }, student: STUDENT_TEXT });

export const REPORTS_ERROR_CODES = defineErrorCodes('reports', {
  REPORTS_NOT_FOUND: {
    http: 404,
    ...lecturerText(
      'Aradığınız kayıt bulunamadı ya da size açık değil.',
      'The record was not found or is not open to you.',
    ),
  },
  REPORTS_DATE_RANGE_INVALID: {
    http: 400,
    ...lecturerText(
      'Tarih aralığı geçersiz: bitiş başlangıçtan önce ya da aralıkta dönem içinde bugüne kadar gün yok.',
      'The date range is invalid: the end is before the start, or the range has no day of the term up to today.',
    ),
    details: z.object({ reason: extensibleEnum(DATE_RANGE_PROBLEMS) }),
  },
  REPORTS_UNANSWERED_SESSIONS: {
    http: 409,
    ...lecturerText(
      '"Ders yapıldı mı?" sorusu cevaplanmamış oturum var; önce o oturumları cevaplayın.',
      'Some sessions have no answer to "Was the class held?"; answer them first.',
    ),
    details: z.object({ sessions: z.array(unansweredSessionSchema).max(FULL_LIST_DEFAULT_MAX) }),
  },
  REPORTS_SUMMARY_CHANGED: {
    http: 409,
    ...lecturerText(
      'Özet siz bakarken değişti; yenilenen özeti kontrol edip yeniden deneyin.',
      'The summary changed while you were looking; check the refreshed summary and try again.',
    ),
    // The digest the server holds now; the panel refreshes the summary.
    details: z.object({ summaryDigest: summaryDigestSchema }),
  },
  REPORTS_ID_CONFLICT: {
    http: 409,
    ...lecturerText(
      'Bu çıktı isteği başka bir özet ya da çıktı türüyle zaten kaydedilmiş; sayfayı yenileyip yeniden deneyin.',
      'This output request was already recorded with another summary or output kind; refresh and try again.',
    ),
  },
  REPORTS_TERM_NOT_LOCKED: {
    http: 409,
    ...lecturerText(
      'Dönem sonu raporu kilitten sonra açılır.',
      'The term-end report opens after the lock.',
    ),
  },
});

export type ReportsErrorCode = keyof typeof REPORTS_ERROR_CODES;
const errors = (...codes: ReportsErrorCode[]) => codes;

// Routes. The key is the route name. Every route is heavy (D13): each answer reads a whole
// course, section or unit.

const heavyLecturer = sessionAccess('lecturer', 'heavy');
const rangeQuery = { from: dateSchema.optional(), to: dateSchema.optional() };

export const REPORTS_ROUTES = {
  getCourseReport: defineRoute({
    module: 'reports',
    name: 'getCourseReport',
    method: 'GET',
    path: '/v1/reports/courses/{courseId}',
    ...heavyLecturer,
    request: {
      params: z.object({ courseId: courseIdSchema }),
      // Without a section, every section of the course; the range is cut to the term.
      query: z.object({ sectionId: sectionIdSchema.optional(), ...rangeQuery }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        course: courseSchema,
        range: rangeSchema,
        preparedAt: instantSchema,
        provisional: z.boolean(),
        provisionalReasons: provisionalReasonsSchema,
        lock: z.object({
          lockAt: instantSchema.nullable(),
          lastDay: dateSchema.nullable(),
          applied: z.boolean(),
          // Records that arrived after the lock and count nowhere.
          uncountedAfterLock: countSchema,
        }),
        sections: z.array(
          sectionSchema.extend({
            // Not a full list either: the 2000 rows of D13-B13 count students, and the
            // module answers 422 itself past 2000 sessions in all.
            sessions: z.array(reportSessionSchema).max(FULL_LIST_DEFAULT_MAX),
            // Active rows in roster order, then the removed ones.
            students: fullListSchema(courseReportRowSchema),
          }),
        ),
      }),
    },
    errors: errors('REPORTS_NOT_FOUND', 'REPORTS_DATE_RANGE_INVALID'),
    summary: "A course's sessions and every student's cells, section by section.",
  }),
  getStudentReport: defineRoute({
    module: 'reports',
    name: 'getStudentReport',
    method: 'GET',
    path: '/v1/reports/students/{rosterRowId}',
    ...heavyLecturer,
    request: {
      // A roster row of the student in one of the caller's courses; the number stays
      // out of the address.
      params: z.object({ rosterRowId: rosterRowIdSchema }),
      query: z.object(rangeQuery),
    },
    response: {
      statuses: [200],
      schema: z.object({
        student: z.object({ studentNumber: studentNumberSchema, fullName: z.string() }),
        termId: termIdSchema,
        range: rangeSchema,
        preparedAt: instantSchema,
        provisional: z.boolean(),
        provisionalReasons: provisionalReasonsSchema,
        // The caller's courses in the term where the number has a row.
        courses: z.array(
          z.object({
            ...courseHead,
            sectionId: sectionIdSchema,
            sectionLabel: z.string(),
            rosterRowId: rosterRowIdSchema,
            exempt: z.boolean(),
            inactiveAt: instantSchema.nullable(),
            sessions: fullListSchema(studentSessionSchema),
          }),
        ),
      }),
    },
    errors: errors('REPORTS_NOT_FOUND', 'REPORTS_DATE_RANGE_INVALID'),
    summary: "One student's sessions in the caller's courses of the term.",
  }),
  getAksisSummary: defineRoute({
    module: 'reports',
    name: 'getAksisSummary',
    method: 'GET',
    path: '/v1/reports/sections/{sectionId}/aksis-summary',
    ...heavyLecturer,
    request: { params: z.object({ sectionId: sectionIdSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        course: courseSchema,
        section: sectionSchema,
        countBase: extensibleEnum(COUNT_BASES),
        rates: z.object({ theoryPercent: percentSchema, practicePercent: percentSchema }),
        // While false the student sees no warning and the panel asks to confirm the rates.
        ratesConfirmed: z.boolean(),
        // Whether the schedule has hours of each type.
        types: z.object({ theory: z.boolean(), practice: z.boolean() }),
        lastHeldClassDay: dateSchema.nullable(),
        lastSessionEndAt: instantSchema.nullable(),
        lastDay: dateSchema.nullable(),
        lockAt: instantSchema.nullable(),
        lockApplied: z.boolean(),
        preparedAt: instantSchema,
        computedAt: instantSchema,
        provisional: z.boolean(),
        provisionalReasons: provisionalReasonsSchema,
        // Sessions whose sending time runs, whatever the state: at term end the panel says
        // records may still arrive until the last day.
        sendingTimeRunningSessions: countSchema,
        courseMarks: z.object({
          missingMakeupHours: z.object({ theory: countSchema, practice: countSchema }),
          unansweredSessions: z.array(unansweredSessionSchema),
        }),
        output: outputSchema,
        // Only once locked: the snapshot changes are measured against.
        baseline: snapshotSummarySchema.nullable(),
        uncountedAfterLock: countSchema,
        // Active rows only, in roster order.
        rows: fullListSchema(aksisRowSchema),
        summaryDigest: summaryDigestSchema,
      }),
    },
    errors: errors('REPORTS_NOT_FOUND'),
    summary: "A section's AKSIS summary: each student's hours, decisions and result.",
  }),
  recordAksisOutput: defineRoute({
    module: 'reports',
    name: 'recordAksisOutput',
    method: 'POST',
    path: '/v1/reports/sections/{sectionId}/aksis-summary/outputs',
    ...heavyLecturer,
    request: {
      params: z.object({ sectionId: sectionIdSchema }),
      body: z.object({
        // Made by the panel per press; the same id answers the same snapshot.
        outputId: clientIdSchema,
        summaryDigest: summaryDigestSchema,
        kind: z.enum(OUTPUT_KINDS),
      }),
    },
    response: {
      // 201 a new snapshot; 200 the same one again, or none needed outside term end.
      statuses: [201, 200],
      schema: z.object({
        // Only a lecturer's output, so always with its kind.
        snapshot: snapshotSummarySchema
          .extend({
            source: z.literal('LECTURER_OUTPUT'),
            outputKind: extensibleEnum(OUTPUT_KINDS),
          })
          .nullable(),
        // A blocked output is refused with 409 instead (D10 cikti.engel null).
        output: outputSchema.extend({ block: z.null() }),
      }),
    },
    errors: errors(
      'REPORTS_NOT_FOUND',
      'REPORTS_ID_CONFLICT',
      'REPORTS_UNANSWERED_SESSIONS',
      'REPORTS_SUMMARY_CHANGED',
    ),
    summary: "Records the lecturer's AKSIS output; at term end it keeps a snapshot.",
  }),
  getTermEndReport: defineRoute({
    module: 'reports',
    name: 'getTermEndReport',
    method: 'GET',
    path: '/v1/reports/admin/term-end',
    ...sessionAccess('admin', 'heavy'),
    request: { query: z.object({ termId: termIdSchema, unitId: unitIdSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        termId: termIdSchema,
        unitId: unitIdSchema,
        lockAt: instantSchema,
        preparedAt: instantSchema,
        // The oldest stored course result read; the calculation after the lock is done
        // once it is no earlier than the lock's application.
        oldestResultComputedAt: instantSchema.nullable(),
        resultsCurrent: z.boolean(),
        totals: z.object({
          sectionCount: countSchema,
          sectionsWithoutSnapshot: countSchema,
          ...termEndCounts,
          // excusedReturns per mille of absentAtBaseline; null when nobody was absent.
          excusedReturnsPerMille: perMilleSchema.nullable(),
        }),
        courses: z.array(
          z.object({
            ...courseHead,
            sections: z.array(
              sectionSchema.extend({
                baseline: snapshotSummarySchema.omit({ snapshotId: true }).nullable(),
                ...termEndCounts,
              }),
            ),
          }),
        ),
      }),
    },
    errors: errors('REPORTS_NOT_FOUND', 'REPORTS_TERM_NOT_LOCKED'),
    summary: "A unit's term-end counts after the lock: unjustly absent, excused returns.",
  }),
};

// The AKSIS snapshot (aksisAnligiGetir's answer): an internal type the job writes and the
// corrections module reads, so its codes are closed lists, an unknown field is refused at
// every depth and the rules between fields hold. Names stay out; the corrections module
// reads them from the roster. No row cap: the job writes a section whatever its size.

const snapshotTypeSchema = z
  .strictObject({
    heldHours: countSchema,
    absentHours: countSchema,
    excusedHours: countSchema,
    attendedPerMille: perMilleSchema.nullable(),
    decision: z.enum(TYPE_DECISIONS),
  })
  .refine((type) => (type.heldHours === 0) === (type.attendedPerMille === null), {
    message: 'attendedPerMille is null exactly while no hours are held',
  });

export const aksisSnapshotSchema = z
  .strictObject({
    snapshotId: snapshotIdSchema,
    source: z.enum(SNAPSHOT_SOURCES),
    // null exactly for an end-of-day snapshot.
    outputKind: z.enum(OUTPUT_KINDS).nullable(),
    termId: termIdSchema,
    unitId: unitIdSchema,
    courseId: courseIdSchema,
    sectionId: sectionIdSchema,
    takenAt: instantSchema,
    lockAt: instantSchema,
    lastSessionEndAt: instantSchema.nullable(),
    // true exactly when a reason is listed.
    provisional: z.boolean(),
    provisionalReasons: z.array(z.enum(PROVISIONAL_REASONS)).refine(isUnique),
    countBase: z.enum(COUNT_BASES),
    theoryPercent: percentSchema,
    practicePercent: percentSchema,
    rows: z.array(
      z.strictObject({
        rosterRowId: rosterRowIdSchema,
        studentNumber: studentNumberSchema,
        exempt: z.boolean(),
        theory: snapshotTypeSchema.nullable(),
        practice: snapshotTypeSchema.nullable(),
        result: z.enum(COURSE_RESULTS),
        decisionPendingReasons: z.array(z.enum(DECISION_PENDING_REASONS)).refine(isUnique),
      }),
    ),
  })
  .superRefine((snapshot, context) => {
    const fail = (message: string) => context.addIssue({ code: 'custom', message });
    if ((snapshot.source === 'END_OF_DAY') !== (snapshot.outputKind === null)) {
      fail('an end-of-day snapshot has no output kind and a lecturer output has one');
    }
    const reasons = snapshot.provisionalReasons;
    if (snapshot.provisional !== reasons.length > 0) {
      fail('provisional exactly when a reason is listed');
    }
    // The end-of-day job runs after the lock, when only these reasons remain.
    const surviving: readonly string[] = LOCK_SURVIVING_REASONS;
    if (
      snapshot.source === 'END_OF_DAY' &&
      !reasons.every((reason) => surviving.includes(reason))
    ) {
      fail('an end-of-day snapshot lists only the reasons that survive the lock');
    }
  });
export type AksisSnapshot = z.infer<typeof aksisSnapshotSchema>;

// The end-of-day snapshot job's data: both ids from the lock step, or none from the nightly
// safety net; internal ids only. The queue definition with the job's name lives in the
// module (D10-B32); this file gives only the data schema.
export const endOfDaySnapshotJobDataSchema = z.union([
  z.strictObject({ unitId: unitIdSchema, termId: termIdSchema }),
  z.strictObject({}),
]);

// Audit events: none. A snapshot is its own insert-only record; an event added later
// that names a course names its unit too.
export const REPORTS_AUDIT_EVENTS = {} as const satisfies Readonly<Record<string, z.ZodObject>>;
