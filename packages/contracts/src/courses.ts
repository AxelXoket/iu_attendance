// Courses contract (D02): the 31 routes with their request and answer schemas, the
// COURSES_ error catalog, the value lists the other modules import, the session
// generation event, the audit event schemas and the two jsonb column schemas. It
// imports only the shared contract parts. Request and answer objects drop unknown keys
// (D13-B24); requests use closed enums, answers carry values that may grow as
// extensible enums. Only the audit schemas are strict: the audit writer rejects an
// unknown field.
import { normalizeCourseCode } from '@iu-attendance/core/courses/normalize';
import { collapseWhitespace } from '@iu-attendance/core/shared/text';
import { z } from 'zod';
import {
  clientIdSchema,
  countSchema,
  dateSchema,
  defineErrorCodes,
  defineRoute,
  expectedVersionSchema,
  extensibleEnum,
  fullListSchema,
  type Id,
  instantSchema,
  isUnique,
  itemResultsSchema,
  localTimeSchema,
  pageQuerySchema,
  pageSchema,
  percentSchema,
  personIdSchema,
  REQUEST_ITEMS_MAX,
  rosterRowIdSchema,
  sameText,
  unitIdSchema,
  v7IdSchema,
} from './shared/index.ts';

// Value lists. Other modules import these and keep no copy of their own.

export const SESSION_KINDS = ['regular', 'makeup', 'trial'] as const;
export const SESSION_STATUSES = ['planned', 'cancelled'] as const;
// Telafi debt (absence) and the reports read the cancel reason.
export const CANCEL_REASONS = [
  'lecturer',
  'moved',
  'holiday',
  'exam_week',
  'calendar',
  'schedule',
  'archive',
] as const;
// "Was the class held?": the panel answer's held.status.
export const HELD_STATUSES = ['unanswered', 'held', 'not_held', 'conflicting'] as const;

export const UNIT_KINDS = [
  'faculty',
  'institute',
  'school',
  'vocational_school',
  'conservatory',
] as const;
export const SEMESTERS = ['fall', 'spring', 'summer'] as const;
export const EXAM_KINDS = ['midterm', 'final', 'resit'] as const;
// Why a unit's last day moves after its lock (D02-A05).
export const LAST_DAY_REASONS = ['unit_decision', 'wrong_entry'] as const;
export const TRANSFER_REASONS = ['lecturer_left', 'account_deleted', 'duty_change'] as const;
export const LECTURER_ACCOUNT_STATUSES = ['active', 'inactive', 'deleted'] as const;
export const SESSION_GENERATION_REASONS = [
  'generation',
  'schedule',
  'makeup',
  'session',
  'cancel',
  'cancel_undo',
  'calendar',
  'duration',
  'archive',
  'trial',
  'time_zone',
] as const;

const COURSE_STATUSES = ['active', 'archived'] as const;
const ARCHIVE_REASONS = ['lecturer', 'lock', 'lecturer_deleted'] as const;
const SECTION_STATUSES = ['active', 'inactive'] as const;
const HELD_SOURCES = ['head_count', 'lecturer_answer'] as const;
const SCHEDULE_WARNINGS = [
  'STARTED_SESSIONS_UNCHANGED',
  'TODAYS_SESSION_KEPT',
  'HOLIDAYS_SKIPPED',
  'EXAM_WEEKS_SKIPPED',
] as const;
// SAME_DAY and PAST: phones that downloaded the schedule earlier may not show the
// session; the panel suggests the corrections code for marking those students.
const MAKEUP_WARNINGS = ['SAME_DAY', 'PAST', 'HOLIDAY', 'EXAM_WEEK'] as const;
const HELD_BATCH_RESULTS = [
  'written',
  'unchanged',
  'not_found',
  'not_started',
  'cancelled',
  'locked',
] as const;
const REGENERATION_REASONS = ['calendar', 'unit_term', 'time_zone'] as const;

export type SessionKind = (typeof SESSION_KINDS)[number];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export type CancelReason = (typeof CANCEL_REASONS)[number];
export type HeldStatus = (typeof HELD_STATUSES)[number];
export type SessionGenerationReason = (typeof SESSION_GENERATION_REASONS)[number];

// Identifiers. A brand keeps course, section and session ids apart.

export type CourseId = Id<'Course'>;
export type SectionId = Id<'Section'>;
export type SessionId = Id<'Session'>;
export type TermId = Id<'Term'>;
export type CalendarId = Id<'Calendar'>;
export type DepartmentId = Id<'Department'>;
export type ScheduleSlotId = Id<'ScheduleSlot'>;

// Every row of this module gets a UUIDv7 (client-made or uuidv7() in the database).
export const courseIdSchema = v7IdSchema('Course');
export const sectionIdSchema = v7IdSchema('Section');
export const sessionIdSchema = v7IdSchema('Session');
export const termIdSchema = v7IdSchema('Term');
export const calendarIdSchema = v7IdSchema('Calendar');
export const departmentIdSchema = v7IdSchema('Department');
export const scheduleSlotIdSchema = v7IdSchema('ScheduleSlot');

// The session generation event (oturumUretimDinleyicisiKaydet). Instants are UTC ISO
// 8601 with milliseconds and Z; `at` equals the change instant of this write's
// session_changes rows. An item is a superset of the clock module's session plan. The
// event carries no version callback: listeners stamp their rows through sync (I092).
export type SessionGenerationItem = {
  sessionId: SessionId;
  termId: TermId;
  courseId: CourseId;
  startAt: string;
  endAt: string;
  windowMinutes: number | null;
  status: SessionStatus;
  created: boolean;
  sectionIds: readonly SectionId[];
  previous: {
    startAt: string;
    endAt: string;
    status: SessionStatus;
    windowMinutes: number | null;
  } | null;
};

export type SessionGenerationEvent = {
  reason: SessionGenerationReason;
  at: string;
  sessions: ReadonlyArray<SessionGenerationItem>;
};

// Error catalog. Courses codes reach only staff routes, so the student text repeats
// the staff text.

export const COURSES_ERROR_CODES = defineErrorCodes('courses', {
  COURSES_NOT_FOUND: {
    http: 404,
    ...sameText(
      'Kayıt bulunamadı ya da bu işlem için yetkiniz yok.',
      'The record was not found or you have no access to it.',
    ),
  },
  COURSES_REVIEW_ACCOUNT: {
    http: 403,
    ...sameText(
      'İnceleme hesabıyla bu değişiklik yapılamaz.',
      'This change is not available to a review account.',
    ),
  },
  COURSES_ID_CONFLICT: {
    http: 409,
    ...sameText(
      'Bu kayıt başka bilgilerle zaten oluşturulmuş. Sayfayı yenileyip yeniden deneyin.',
      'This record was already created with other details. Refresh the page and try again.',
    ),
  },
  COURSES_VERSION_CHANGED: {
    http: 409,
    ...sameText(
      'Kayıt siz düzenlerken değişti. Sayfayı yenileyip değişikliğinizi yeniden yapın.',
      'The record changed while you were editing. Refresh the page and make your change again.',
    ),
    details: z.object({ currentVersion: expectedVersionSchema }),
  },
  COURSES_NO_CALENDAR: {
    http: 409,
    ...sameText(
      'Bu birim ve dönem için akademik takvim henüz bağlanmadı.',
      'No academic calendar is set for this unit and term yet.',
    ),
  },
  COURSES_TERM_LOCKED: {
    http: 409,
    ...sameText(
      'Bu birimin dönemi kilitlendi; değişiklik yapılamaz.',
      "This unit's term is locked; it can no longer be changed.",
    ),
  },
  COURSES_COURSE_ARCHIVED: {
    http: 409,
    ...sameText('Ders arşivde; değiştirilemez.', 'The course is archived; it cannot be changed.'),
  },
  COURSES_COURSE_STARTED: {
    http: 409,
    ...sameText(
      'Başlamış oturumu olan ders arşivlenemez.',
      'A course with a session that has started cannot be archived.',
    ),
  },
  COURSES_TRIAL_COURSE_READ_ONLY: {
    http: 409,
    ...sameText('Deneme dersi değiştirilemez.', 'The trial course cannot be changed.'),
  },
  COURSES_QR_SETTING_OFF: {
    http: 409,
    ...sameText(
      'QR ile yoklama şu anda açılamaz.',
      'QR attendance cannot be turned on at the moment.',
    ),
  },
  COURSES_UNIT_INACTIVE: {
    http: 409,
    ...sameText('Seçilen birim kullanımda değil.', 'The selected unit is not active.'),
  },
  COURSES_CODE_IN_USE: {
    http: 409,
    ...sameText(
      'Bu dönemde aynı kodlu etkin bir ders var.',
      'An active course with this code already exists in this term.',
    ),
  },
  COURSES_SECTION_LABEL_IN_USE: {
    http: 409,
    ...sameText(
      'Bu derste aynı adlı bir şube var.',
      'This course already has a section with this label.',
    ),
  },
  COURSES_SECTION_LIMIT: {
    http: 409,
    ...sameText(
      'Bu derse daha fazla şube eklenemez; şube sınırına ulaşıldı.',
      'No more sections can be added to this course; the section limit is reached.',
    ),
  },
  COURSES_SECTION_HAS_STUDENTS: {
    http: 409,
    ...sameText(
      'Şubenin listesinde öğrenci var; şube pasif yapılamaz.',
      'The section still has students on its roster, so it cannot be deactivated.',
    ),
  },
  COURSES_LAST_ACTIVE_SECTION: {
    http: 409,
    ...sameText(
      'Dersin son etkin şubesi pasif yapılamaz.',
      'The last active section of a course cannot be deactivated.',
    ),
  },
  COURSES_SCHEDULE_INVALID: {
    http: 409,
    ...sameText(
      'Program geçersiz: tarihleri ve şubeleri denetleyin.',
      'The schedule is not valid: check its dates and sections.',
    ),
  },
  COURSES_SCHEDULE_OVERLAP: {
    http: 400,
    ...sameText(
      'Örtüşen iki program saati aynı şubeyi içeriyor.',
      'Two overlapping schedule slots include the same section.',
    ),
  },
  COURSES_SCHEDULE_TOO_LARGE: {
    http: 409,
    ...sameText(
      'Bu program dönem boyunca oturum sınırını aşıyor.',
      'This schedule exceeds the session limit for the term.',
    ),
  },
  COURSES_SESSION_STARTED: {
    http: 409,
    ...sameText(
      'Başlamış ya da geçmiş bir oturum değiştirilemez.',
      'A session that has started or passed cannot be changed.',
    ),
  },
  COURSES_SESSION_NOT_STARTED: {
    http: 409,
    ...sameText(
      'Oturum henüz başlamadı; dersin yapılıp yapılmadığı sonra girilebilir.',
      'The session has not started yet; whether it was held can be recorded later.',
    ),
  },
  COURSES_SESSION_CANCELLED: {
    http: 409,
    ...sameText(
      'Oturum iptal edilmiş; bu işlem yapılamaz.',
      'The session is cancelled; this action is not possible.',
    ),
  },
  COURSES_CANCEL_NOT_REVERSIBLE: {
    http: 409,
    ...sameText(
      'Yalnız sizin iptal ettiğiniz ve başlamamış bir oturumun iptali geri alınabilir.',
      'Only a session you cancelled that has not started can be restored.',
    ),
  },
  COURSES_SESSION_OVERLAP: {
    http: 409,
    ...sameText(
      'Bu saat, ortak şubeli başka bir oturumla çakışıyor.',
      'This time overlaps another session that shares a section.',
    ),
  },
  COURSES_DATE_OUTSIDE_TERM: {
    http: 409,
    ...sameText(
      'Tarih, dönemin ders başlangıcı ile son günü arasında olmalı.',
      'The date must fall between the start of classes and the last day of the term.',
    ),
  },
  COURSES_MAKEUP_LIMIT: {
    http: 409,
    ...sameText(
      'Bu ders bu dönemin telafi oturumu sınırına ulaştı.',
      'This course has reached its make-up session limit for the term.',
    ),
  },
  COURSES_RANGE_TOO_WIDE: {
    http: 400,
    ...sameText(
      'Tarih aralığı çok geniş; daha kısa bir aralık seçin.',
      'The date range is too wide; choose a shorter range.',
    ),
  },
  COURSES_UNIT_NAME_IN_USE: {
    http: 409,
    ...sameText('Aynı adlı bir birim var.', 'A unit with this name already exists.'),
  },
  COURSES_DEPARTMENT_NAME_IN_USE: {
    http: 409,
    ...sameText(
      'Bu birimde aynı adlı bir bölüm var.',
      'This unit already has a department with this name.',
    ),
  },
  COURSES_TERM_EXISTS: {
    http: 409,
    ...sameText(
      'Bu akademik yıl ve yarıyıl zaten var.',
      'This academic year and semester already exist.',
    ),
  },
  COURSES_CALENDAR_NAME_IN_USE: {
    http: 409,
    ...sameText(
      'Bu dönemde aynı adlı bir takvim var.',
      'This term already has a calendar with this name.',
    ),
  },
  COURSES_CALENDAR_DATES_INVALID: {
    http: 400,
    ...sameText(
      'Takvim tarihlerinin sırası hatalı.',
      'The calendar dates are not in a valid order.',
    ),
  },
  COURSES_CALENDAR_TERM_MISMATCH: {
    http: 409,
    ...sameText(
      'Seçilen takvim başka bir döneme ait.',
      'The selected calendar belongs to another term.',
    ),
  },
  COURSES_LOCKS_IMMEDIATELY: {
    http: 409,
    ...sameText(
      'Bu değişiklik birimi hemen kilitler; onaylayıp yeniden gönderin.',
      'This change locks the unit immediately; confirm it and send it again.',
    ),
  },
  COURSES_LAST_DAY_CANNOT_MOVE_BACK: {
    http: 409,
    ...sameText(
      'Kilitlenmiş birimin son günü öne alınamaz.',
      'The last day of a locked unit cannot be moved earlier.',
    ),
  },
  COURSES_REASON_REQUIRED: {
    http: 409,
    ...sameText(
      'Kilitten sonra son günü ileri almak için bir gerekçe seçin.',
      'Choose a reason to move the last day later after the lock.',
    ),
  },
  COURSES_TRANSFER_TARGET_INVALID: {
    http: 409,
    ...sameText(
      'Ders yalnız etkin bir hocaya devredilebilir.',
      'The course can be transferred only to an active lecturer.',
    ),
  },
});

export type CoursesErrorCode = keyof typeof COURSES_ERROR_CODES;

// A route's error list, checked against the catalog when it compiles.
const errors = (...codes: CoursesErrorCode[]) => codes;

// Field schemas.

// A name-like request text: up to max characters with at least one visible one. The
// module normalises it (NFC, collapsed spaces) before storing it.
const nameTextSchema = (max: number) => z.string().min(1).max(max).regex(/\S/);
// A course code: the database bounds its normal form (normalizeCourseCode) to 1 to 20
// characters. The raw text may be longer by what normalization removes (spaces,
// decomposed letters), and a letter that upper-cases to two (ß to SS) counts twice.
const COURSE_CODE_MAX = 20;
const courseCodeSchema = z
  .string()
  .max(4 * COURSE_CODE_MAX)
  .refine(
    (code) => {
      const length = normalizeCourseCode(code).length;
      return length >= 1 && length <= COURSE_CODE_MAX;
    },
    { message: 'A course code has 1 to 20 characters once normalized' },
  );
const hoursSchema = z.number().int().min(0).max(12);
const windowMinutesSchema = z.number().int().min(1).max(240);
const weekdaySchema = z.number().int().min(1).max(7);
const academicYearSchema = z
  .string()
  .max(9)
  .regex(/^\d{4}-\d{4}$/)
  .refine((year) => Number(year.slice(5)) === Number(year.slice(0, 4)) + 1, {
    message: 'The second year follows the first',
  });

// A UUID names the same row in upper and lower case.
const uniqueIdList = (ids: readonly string[]) => isUnique(ids.map((id) => id.toLowerCase()));
const uniqueIds = (items: readonly { id: string }[]) => uniqueIdList(items.map((item) => item.id));
const UNIQUE = { message: 'Values must not repeat' };

// Times and dates are fixed-width text, so text order is time order.
const endsAfterStart = (value: { startTime?: string; endTime?: string }) =>
  value.startTime === undefined || value.endTime === undefined || value.endTime > value.startTime;
const hoursTotalValid = (value: { theoryHours?: number; practiceHours?: number }) => {
  if (value.theoryHours === undefined || value.practiceHours === undefined) return true;
  const total = value.theoryHours + value.practiceHours;
  return total >= 1 && total <= 12;
};
const END_AFTER_START = { message: 'endTime is after startTime', path: ['endTime'] };
const HOURS_TOTAL = {
  message: 'theoryHours and practiceHours add up to 1 to 12',
  path: ['practiceHours'],
};

const sectionIdListSchema = z.array(sectionIdSchema).min(1).max(20).refine(uniqueIdList, UNIQUE);

// A schedule slot as the panel sends it. An existing slot keeps its id; a new one gets
// a client-made UUIDv7, so a repeated request is the same body. Two slots on the same
// weekday with intersecting times and validity overlap and need disjoint sections;
// that check answers COURSES_SCHEDULE_OVERLAP, while form and reversed ranges are 400.
const scheduleSlotInputSchema = z
  .object({
    id: clientIdSchema,
    weekday: weekdaySchema,
    startTime: localTimeSchema,
    endTime: localTimeSchema,
    theoryHours: hoursSchema,
    practiceHours: hoursSchema,
    room: nameTextSchema(40).nullable(),
    validFrom: dateSchema.optional(),
    validTo: dateSchema.optional(),
    sectionIds: sectionIdListSchema,
  })
  .refine(endsAfterStart, END_AFTER_START)
  .refine(hoursTotalValid, HOURS_TOTAL)
  .refine(
    (slot) =>
      slot.validFrom === undefined || slot.validTo === undefined || slot.validFrom <= slot.validTo,
    { message: 'validFrom is not after validTo', path: ['validTo'] },
  );
const scheduleSlotsInputSchema = z.array(scheduleSlotInputSchema).max(20).refine(uniqueIds, UNIQUE);

const holidayInputSchema = z.object({
  id: clientIdSchema,
  name: nameTextSchema(120),
  start: dateSchema,
  end: dateSchema,
  // The column allows only a time after midnight.
  halfDayStart: localTimeSchema
    .refine((time) => time !== '00:00', { message: 'halfDayStart is after 00:00' })
    .nullable(),
});
// Replacing a calendar sends every value; a new calendar's exam week holds no classes
// unless said otherwise (D02-A01).
const examWeekInputSchema = z.object({
  id: clientIdSchema,
  kind: z.enum(EXAM_KINDS),
  start: dateSchema,
  end: dateSchema,
  classesHeld: z.boolean(),
});
const newExamWeekInputSchema = examWeekInputSchema.extend({
  classesHeld: z.boolean().default(false),
});
// Date order (classes, add-drop, last day, holidays, exam weeks) answers
// COURSES_CALENDAR_DATES_INVALID, so the schema checks only the form.
const calendarInputShape = {
  name: nameTextSchema(120),
  classesStart: dateSchema,
  classesEnd: dateSchema,
  addDropEnd: dateSchema,
  lastDay: dateSchema,
  holidays: z.array(holidayInputSchema).max(60).refine(uniqueIds, UNIQUE),
  examWeeks: z.array(examWeekInputSchema).max(10).refine(uniqueIds, UNIQUE),
};

// Answer schemas.

const sectionSchema = z.object({
  id: sectionIdSchema,
  label: z.string(),
  status: extensibleEnum(SECTION_STATUSES),
});

// DersOzeti. ratesConfirmedAt null: the lecturer has not confirmed the rates, so no
// absence warning reaches students yet.
export const courseSummarySchema = z.object({
  id: courseIdSchema,
  termId: termIdSchema,
  unitId: unitIdSchema.nullable(),
  departmentId: departmentIdSchema.nullable(),
  code: z.string(),
  name: z.string(),
  theoryPercent: percentSchema,
  practicePercent: percentSchema,
  ratesConfirmedAt: instantSchema.nullable(),
  windowMinutes: z.number().int().nullable(),
  qrAttendance: z.boolean(),
  trial: z.boolean(),
  trackingStart: dateSchema.nullable(),
  status: extensibleEnum(COURSE_STATUSES),
  archiveReason: extensibleEnum(ARCHIVE_REASONS).nullable(),
  editVersion: z.number().int(),
  sections: z.array(sectionSchema),
  lock: z.object({
    lastDay: dateSchema.nullable(),
    lockAt: instantSchema.nullable(),
    locked: z.boolean(),
  }),
});

const scheduleSlotSchema = z.object({
  id: scheduleSlotIdSchema,
  weekday: weekdaySchema,
  startTime: localTimeSchema,
  endTime: localTimeSchema,
  theoryHours: z.number().int(),
  practiceHours: z.number().int(),
  room: z.string().nullable(),
  validFrom: dateSchema.nullable(),
  validTo: dateSchema.nullable(),
  sectionIds: z.array(sectionIdSchema),
});

export const sessionEffectSchema = z.object({
  added: countSchema,
  updated: countSchema,
  cancelled: countSchema,
  restored: countSchema,
});

const heldSchema = z.object({
  status: extensibleEnum(HELD_STATUSES),
  source: extensibleEnum(HELD_SOURCES).nullable(),
  headCount: z.number().int().nullable(),
});

// OturumPanel: a session as the panel shows it. Only a trial session ends at 24:00.
export const panelSessionSchema = z.object({
  id: sessionIdSchema,
  courseId: courseIdSchema,
  kind: extensibleEnum(SESSION_KINDS),
  date: dateSchema,
  startTime: localTimeSchema,
  endTime: z.union([localTimeSchema, z.literal('24:00')]),
  startAt: instantSchema,
  endAt: instantSchema,
  theoryHours: z.number().int(),
  practiceHours: z.number().int(),
  room: z.string().nullable(),
  windowMinutes: z.number().int().nullable(),
  qrAttendance: z.boolean(),
  status: extensibleEnum(SESSION_STATUSES),
  cancelReason: extensibleEnum(CANCEL_REASONS).nullable(),
  shortCode: z.string().regex(/^\d{10}$/),
  sectionIds: z.array(sectionIdSchema),
  manuallyEdited: z.boolean(),
  makeupForSessionId: sessionIdSchema.nullable(),
  held: heldSchema,
});

const holidaySchema = z.object({
  id: v7IdSchema('Holiday'),
  name: z.string(),
  start: dateSchema,
  end: dateSchema,
  halfDayStart: localTimeSchema.nullable(),
});
const examWeekSchema = z.object({
  id: v7IdSchema('ExamWeek'),
  kind: extensibleEnum(EXAM_KINDS),
  start: dateSchema,
  end: dateSchema,
  classesHeld: z.boolean(),
});
const calendarSchema = z.object({
  id: calendarIdSchema,
  name: z.string(),
  classesStart: dateSchema,
  classesEnd: dateSchema,
  addDropEnd: dateSchema,
  lastDay: dateSchema,
  version: z.number().int(),
  holidays: z.array(holidaySchema),
  examWeeks: z.array(examWeekSchema),
});
const termCalendarSchema = calendarSchema.extend({ termId: termIdSchema });

const adminUnitSchema = z.object({
  id: unitIdSchema,
  name: z.string(),
  kind: extensibleEnum(UNIT_KINDS),
  active: z.boolean(),
  departments: z.array(z.object({ id: departmentIdSchema, name: z.string(), active: z.boolean() })),
});

const unitTermSchema = z.object({
  unitId: unitIdSchema,
  termId: termIdSchema,
  calendarId: calendarIdSchema,
  lastDay: dateSchema,
  lockAt: instantSchema,
  locked: z.boolean(),
});

// Shared request parts.

const lecturer = { auth: ['session'], roles: ['lecturer'], rate: 'session' } as const;
const admin = { auth: ['session'], roles: ['admin'], rate: 'session' } as const;
const courseParams = z.object({ courseId: courseIdSchema });
const sessionParams = z.object({ sessionId: sessionIdSchema });
const lastDayReasonSchema = z.enum(LAST_DAY_REASONS);

// Routes. The key is the route name.

export const COURSES_ROUTES = {
  listCourses: defineRoute({
    module: 'courses',
    name: 'listCourses',
    method: 'GET',
    path: '/v1/courses',
    ...lecturer,
    request: {
      query: z.object({
        termId: termIdSchema.optional(),
        status: z.enum(COURSE_STATUSES).optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({ courses: fullListSchema(courseSummarySchema, 500) }),
    },
    errors: errors(),
    summary: "The caller's courses in code order; a review account sees only the trial course.",
  }),
  createCourse: defineRoute({
    module: 'courses',
    name: 'createCourse',
    method: 'POST',
    path: '/v1/courses',
    ...lecturer,
    request: {
      body: z.object({
        id: clientIdSchema,
        termId: termIdSchema,
        unitId: unitIdSchema,
        departmentId: departmentIdSchema.nullable(),
        code: courseCodeSchema,
        name: nameTextSchema(120),
        windowMinutes: windowMinutesSchema.nullable(),
        sections: z
          .array(z.object({ id: clientIdSchema, label: nameTextSchema(20) }))
          .min(1)
          .max(20)
          .refine(uniqueIds, UNIQUE)
          // Section labels are stored with their white space collapsed, so two labels
          // that differ only there collide.
          .refine(
            (sections) => isUnique(sections.map((section) => collapseWhitespace(section.label))),
            UNIQUE,
          ),
        // Given: the lecturer confirms the rates at opening (both 0: no attendance
        // requirement). Left out: the course opens with 70 and 80, unconfirmed.
        rates: z
          .object({ theoryPercent: percentSchema, practicePercent: percentSchema })
          .nullable()
          .optional(),
      }),
    },
    response: { statuses: [201, 200], schema: z.object({ course: courseSummarySchema }) },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_UNIT_INACTIVE',
      'COURSES_NO_CALENDAR',
      'COURSES_TERM_LOCKED',
      'COURSES_CODE_IN_USE',
      'COURSES_ID_CONFLICT',
    ),
    summary:
      'Opens a course with its sections; 201 when new, 200 when the same id and content repeat.',
  }),
  getCourse: defineRoute({
    module: 'courses',
    name: 'getCourse',
    method: 'GET',
    path: '/v1/courses/{courseId}',
    ...lecturer,
    request: { params: courseParams },
    response: {
      statuses: [200],
      schema: z.object({
        course: courseSummarySchema,
        scheduleSlots: z.array(scheduleSlotSchema),
        // Null for the trial course.
        calendar: z
          .object({
            calendarId: calendarIdSchema,
            name: z.string(),
            classesStart: dateSchema,
            classesEnd: dateSchema,
            addDropEnd: dateSchema,
            lastDay: dateSchema,
            lastWeekStart: dateSchema,
          })
          .nullable(),
        counts: z.object({
          planned: countSchema,
          held: countSchema,
          notHeld: countSchema,
          unanswered: countSchema,
          cancelled: countSchema,
        }),
      }),
    },
    errors: errors('COURSES_NOT_FOUND'),
    summary: 'One course with its schedule, calendar and session counts.',
  }),
  updateCourse: defineRoute({
    module: 'courses',
    name: 'updateCourse',
    method: 'PATCH',
    path: '/v1/courses/{courseId}',
    ...lecturer,
    request: {
      params: courseParams,
      body: z.object({
        expectedVersion: expectedVersionSchema,
        code: courseCodeSchema.optional(),
        name: nameTextSchema(120).optional(),
        unitId: unitIdSchema.optional(),
        departmentId: departmentIdSchema.nullable().optional(),
        windowMinutes: windowMinutesSchema.nullable().optional(),
        qrAttendance: z.boolean().optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({ course: courseSummarySchema, sessionEffect: sessionEffectSchema }),
    },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_VERSION_CHANGED',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_CODE_IN_USE',
      'COURSES_UNIT_INACTIVE',
      'COURSES_NO_CALENDAR',
      'COURSES_TRIAL_COURSE_READ_ONLY',
      'COURSES_QR_SETTING_OFF',
    ),
    summary: 'Changes course fields; sessions that have not started follow the change.',
  }),
  archiveCourse: defineRoute({
    module: 'courses',
    name: 'archiveCourse',
    method: 'POST',
    path: '/v1/courses/{courseId}/archive',
    ...lecturer,
    request: { params: courseParams },
    response: {
      statuses: [200],
      schema: z.object({
        course: courseSummarySchema,
        cancelledSessions: countSchema,
        // Active roster rows after the lock: students whose phones drop the course.
        activeRosterRows: countSchema,
      }),
    },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_COURSE_STARTED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
    ),
    summary: 'Archives a course and cancels its future planned sessions.',
  }),
  addSection: defineRoute({
    module: 'courses',
    name: 'addSection',
    method: 'POST',
    path: '/v1/courses/{courseId}/sections',
    ...lecturer,
    request: {
      params: courseParams,
      body: z.object({
        id: clientIdSchema,
        label: nameTextSchema(20),
        // Joins slots that have no other slot overlapping on the same day; parallel
        // slots are skipped and listed in the answer.
        joinSchedule: z.boolean().default(true),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        section: sectionSchema,
        sessionEffect: sessionEffectSchema,
        skippedSlotIds: z.array(scheduleSlotIdSchema),
      }),
    },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_SECTION_LABEL_IN_USE',
      'COURSES_SECTION_LIMIT',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
      'COURSES_ID_CONFLICT',
    ),
    summary: 'Adds a section and joins it to the non-parallel schedule slots.',
  }),
  updateSection: defineRoute({
    module: 'courses',
    name: 'updateSection',
    method: 'PATCH',
    path: '/v1/courses/{courseId}/sections/{sectionId}',
    ...lecturer,
    request: {
      params: z.object({ courseId: courseIdSchema, sectionId: sectionIdSchema }),
      body: z.object({
        label: nameTextSchema(20).optional(),
        status: z.enum(SECTION_STATUSES).optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({ section: sectionSchema, sessionEffect: sessionEffectSchema }),
    },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_SECTION_LABEL_IN_USE',
      'COURSES_SECTION_HAS_STUDENTS',
      'COURSES_LAST_ACTIVE_SECTION',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
    ),
    summary: 'Renames a section or makes it inactive.',
  }),
  getSchedule: defineRoute({
    module: 'courses',
    name: 'getSchedule',
    method: 'GET',
    path: '/v1/courses/{courseId}/schedule',
    ...lecturer,
    request: { params: courseParams },
    response: {
      statuses: [200],
      schema: z.object({
        editVersion: z.number().int(),
        scheduleSlots: z.array(scheduleSlotSchema),
      }),
    },
    errors: errors('COURSES_NOT_FOUND'),
    summary: 'The weekly schedule in weekday and time order.',
  }),
  previewSchedule: defineRoute({
    module: 'courses',
    name: 'previewSchedule',
    method: 'POST',
    path: '/v1/courses/{courseId}/schedule/preview',
    ...lecturer,
    rate: 'heavy',
    request: {
      params: courseParams,
      body: z.object({ scheduleSlots: scheduleSlotsInputSchema }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        toAdd: countSchema,
        toUpdate: z.array(
          z.object({ sessionId: sessionIdSchema, date: dateSchema, fields: z.array(z.string()) }),
        ),
        toCancel: z.array(
          z.object({
            sessionId: sessionIdSchema,
            date: dateSchema,
            startTime: localTimeSchema,
            reason: extensibleEnum(CANCEL_REASONS),
          }),
        ),
        toRestore: z.array(z.object({ sessionId: sessionIdSchema, date: dateSchema })),
        termTotal: z.object({
          planned: countSchema,
          theoryHours: countSchema,
          practiceHours: countSchema,
        }),
        warnings: z.array(extensibleEnum(SCHEDULE_WARNINGS)),
      }),
    },
    errors: errors(
      'COURSES_NOT_FOUND',
      'COURSES_NO_CALENDAR',
      'COURSES_SCHEDULE_INVALID',
      'COURSES_SCHEDULE_OVERLAP',
      'COURSES_SCHEDULE_TOO_LARGE',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
    ),
    summary: 'The session changes a schedule would make; writes nothing.',
  }),
  putSchedule: defineRoute({
    module: 'courses',
    name: 'putSchedule',
    method: 'PUT',
    path: '/v1/courses/{courseId}/schedule',
    ...lecturer,
    request: {
      params: courseParams,
      body: z.object({
        expectedVersion: expectedVersionSchema,
        scheduleSlots: scheduleSlotsInputSchema,
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        editVersion: z.number().int(),
        scheduleSlots: z.array(scheduleSlotSchema),
        sessionEffect: sessionEffectSchema,
        warnings: z.array(extensibleEnum(SCHEDULE_WARNINGS)),
      }),
    },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_VERSION_CHANGED',
      'COURSES_NO_CALENDAR',
      'COURSES_SCHEDULE_INVALID',
      'COURSES_SCHEDULE_OVERLAP',
      'COURSES_SCHEDULE_TOO_LARGE',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
    ),
    summary: 'Replaces the weekly schedule and regenerates the sessions that have not started.',
  }),
  listSessions: defineRoute({
    module: 'courses',
    name: 'listSessions',
    method: 'GET',
    path: '/v1/courses/{courseId}/sessions',
    ...lecturer,
    request: {
      params: courseParams,
      query: z.object({
        from: dateSchema.optional(),
        to: dateSchema.optional(),
        status: z.enum(SESSION_STATUSES).optional(),
        sectionId: sectionIdSchema.optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({ sessions: fullListSchema(panelSessionSchema, 1000) }),
    },
    errors: errors('COURSES_NOT_FOUND', 'COURSES_RANGE_TOO_WIDE'),
    summary: 'Sessions of a course in start order, at most 200 days at a time.',
  }),
  addMakeup: defineRoute({
    module: 'courses',
    name: 'addMakeup',
    method: 'POST',
    path: '/v1/courses/{courseId}/makeup',
    ...lecturer,
    request: {
      params: courseParams,
      body: z
        .object({
          id: clientIdSchema,
          date: dateSchema,
          startTime: localTimeSchema,
          endTime: localTimeSchema,
          theoryHours: hoursSchema,
          practiceHours: hoursSchema,
          room: nameTextSchema(40).nullable(),
          // Left out: every active section of the course.
          sectionIds: sectionIdListSchema.optional(),
          // Given: the session keeps this length when the course setting changes.
          windowMinutes: windowMinutesSchema.nullable().optional(),
          makeupForSessionId: sessionIdSchema.optional(),
          // Moves the session: the one it makes up for is cancelled as moved.
          cancelOld: z.boolean().default(false),
        })
        .refine(endsAfterStart, END_AFTER_START)
        .refine(hoursTotalValid, HOURS_TOTAL)
        .refine((body) => !body.cancelOld || body.makeupForSessionId !== undefined, {
          message: 'cancelOld needs makeupForSessionId',
          path: ['makeupForSessionId'],
        }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        session: panelSessionSchema,
        cancelled: panelSessionSchema.nullable(),
        warnings: z.array(extensibleEnum(MAKEUP_WARNINGS)),
      }),
    },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_DATE_OUTSIDE_TERM',
      'COURSES_MAKEUP_LIMIT',
      'COURSES_SESSION_STARTED',
      'COURSES_SESSION_CANCELLED',
      'COURSES_SESSION_OVERLAP',
      'COURSES_TRIAL_COURSE_READ_ONLY',
      'COURSES_ID_CONFLICT',
    ),
    summary: 'Adds a make-up session, optionally moving an old one.',
  }),
  listConflicts: defineRoute({
    module: 'courses',
    name: 'listConflicts',
    method: 'GET',
    path: '/v1/courses/{courseId}/conflicts',
    ...lecturer,
    rate: 'heavy',
    request: {
      params: courseParams,
      query: z.object({ from: dateSchema.optional(), to: dateSchema.optional() }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        // The course's roster rows only: no student number or name, the panel matches
        // them to its roster.
        conflicts: fullListSchema(
          z.object({
            rosterRowId: rosterRowIdSchema,
            sectionId: sectionIdSchema,
            sessionId: sessionIdSchema,
            date: dateSchema,
            startTime: localTimeSchema,
            endTime: localTimeSchema,
            otherCourse: z.object({ code: z.string(), name: z.string() }),
            otherSession: z.object({
              date: dateSchema,
              startTime: localTimeSchema,
              endTime: localTimeSchema,
            }),
          }),
        ),
        studentCount: countSchema,
      }),
    },
    errors: errors('COURSES_NOT_FOUND', 'COURSES_RANGE_TOO_WIDE'),
    summary: "Sessions where the course's students have another course at the same time.",
  }),
  updateSession: defineRoute({
    module: 'courses',
    name: 'updateSession',
    method: 'PATCH',
    path: '/v1/courses/sessions/{sessionId}',
    ...lecturer,
    request: {
      params: sessionParams,
      body: z
        .object({
          startTime: localTimeSchema.optional(),
          endTime: localTimeSchema.optional(),
          room: nameTextSchema(40).nullable().optional(),
          theoryHours: hoursSchema.optional(),
          practiceHours: hoursSchema.optional(),
          // Only for a session the lecturer cancelled that has not started.
          undoCancel: z.literal(true).optional(),
        })
        .refine(endsAfterStart, END_AFTER_START)
        .refine(hoursTotalValid, HOURS_TOTAL)
        .refine((body) => body.undoCancel === undefined || Object.keys(body).length === 1, {
          message: 'undoCancel comes alone',
          path: ['undoCancel'],
        }),
    },
    response: { statuses: [200], schema: z.object({ session: panelSessionSchema }) },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_SESSION_STARTED',
      'COURSES_SESSION_CANCELLED',
      'COURSES_CANCEL_NOT_REVERSIBLE',
      'COURSES_SESSION_OVERLAP',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
    ),
    summary: 'Edits one session on its day, or undoes its cancellation.',
  }),
  cancelSession: defineRoute({
    module: 'courses',
    name: 'cancelSession',
    method: 'POST',
    path: '/v1/courses/sessions/{sessionId}/cancel',
    ...lecturer,
    request: { params: sessionParams },
    response: { statuses: [200], schema: z.object({ session: panelSessionSchema }) },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_SESSION_STARTED',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
    ),
    summary: 'Cancels one session; the reason is always the lecturer.',
  }),
  listUnconfirmedSessions: defineRoute({
    module: 'courses',
    name: 'listUnconfirmedSessions',
    method: 'GET',
    path: '/v1/courses/sessions/unconfirmed',
    ...lecturer,
    request: { query: z.object({ courseId: courseIdSchema.optional() }) },
    response: {
      statuses: [200],
      schema: z.object({
        // Ended planned sessions without an answer, and sessions whose head count
        // conflicts (cancelled ones too); no trial course.
        sessions: fullListSchema(
          z.object({
            sessionId: sessionIdSchema,
            courseId: courseIdSchema,
            courseCode: z.string(),
            courseName: z.string(),
            date: dateSchema,
            startTime: localTimeSchema,
            endTime: localTimeSchema,
            theoryHours: z.number().int(),
            practiceHours: z.number().int(),
            status: extensibleEnum(SESSION_STATUSES),
            conflicting: z.boolean(),
            headCount: z.number().int().nullable(),
          }),
        ),
        total: countSchema,
      }),
    },
    errors: errors('COURSES_NOT_FOUND'),
    summary: 'Sessions that wait for a "was the class held?" answer, in date order.',
  }),
  answerHeld: defineRoute({
    module: 'courses',
    name: 'answerHeld',
    method: 'POST',
    path: '/v1/courses/sessions/{sessionId}/held',
    ...lecturer,
    request: { params: sessionParams, body: z.object({ held: z.boolean() }) },
    response: {
      statuses: [200],
      schema: z.object({
        session: z.object({
          sessionId: sessionIdSchema,
          status: extensibleEnum(SESSION_STATUSES),
          held: heldSchema,
        }),
      }),
    },
    errors: errors(
      'COURSES_REVIEW_ACCOUNT',
      'COURSES_NOT_FOUND',
      'COURSES_SESSION_NOT_STARTED',
      'COURSES_SESSION_CANCELLED',
      'COURSES_TERM_LOCKED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
    ),
    summary: 'Records whether one session was held.',
  }),
  answerHeldBatch: defineRoute({
    module: 'courses',
    name: 'answerHeldBatch',
    method: 'POST',
    path: '/v1/courses/sessions/held',
    ...lecturer,
    request: {
      body: z.object({
        // The batch field is items in every module (D13), so an over-long batch reports
        // the path items with too_big.
        items: z.array(sessionIdSchema).min(1).max(REQUEST_ITEMS_MAX).refine(uniqueIdList, UNIQUE),
        held: z.boolean(),
      }),
    },
    response: { statuses: [200], schema: itemResultsSchema(HELD_BATCH_RESULTS) },
    errors: errors('COURSES_REVIEW_ACCOUNT'),
    summary: 'One "was the class held?" answer for many sessions; one result per session.',
  }),
  listUnits: defineRoute({
    module: 'courses',
    name: 'listUnits',
    method: 'GET',
    path: '/v1/courses/units',
    auth: ['anonymous'],
    rate: 'anonymous',
    request: {},
    response: {
      statuses: [200],
      schema: z.object({
        units: fullListSchema(
          z.object({
            id: unitIdSchema,
            name: z.string(),
            kind: extensibleEnum(UNIT_KINDS),
            departments: z.array(z.object({ id: departmentIdSchema, name: z.string() })),
          }),
        ),
      }),
    },
    errors: errors(),
    summary: 'Active units and departments in name order, for the lecturer application form.',
  }),
  adminListUnits: defineRoute({
    module: 'courses',
    name: 'adminListUnits',
    method: 'GET',
    path: '/v1/courses/admin/units',
    ...admin,
    request: {},
    response: { statuses: [200], schema: z.object({ units: fullListSchema(adminUnitSchema) }) },
    errors: errors(),
    summary: "Units in the admin's scope with their departments, inactive ones included.",
  }),
  adminCreateUnit: defineRoute({
    module: 'courses',
    name: 'adminCreateUnit',
    method: 'POST',
    path: '/v1/courses/admin/units',
    ...admin,
    request: {
      body: z.object({
        id: clientIdSchema,
        name: nameTextSchema(120),
        kind: z.enum(UNIT_KINDS),
      }),
    },
    response: { statuses: [200], schema: z.object({ unit: adminUnitSchema }) },
    // NOT_FOUND: a repeated id whose unit lies outside the admin's scope.
    errors: errors('COURSES_NOT_FOUND', 'COURSES_UNIT_NAME_IN_USE', 'COURSES_ID_CONFLICT'),
    summary: 'Adds a unit; only a general admin.',
  }),
  adminUpdateUnit: defineRoute({
    module: 'courses',
    name: 'adminUpdateUnit',
    method: 'PATCH',
    path: '/v1/courses/admin/units/{unitId}',
    ...admin,
    request: {
      params: z.object({ unitId: unitIdSchema }),
      body: z.object({
        name: nameTextSchema(120).optional(),
        kind: z.enum(UNIT_KINDS).optional(),
        active: z.boolean().optional(),
        departments: z
          .array(
            z.object({
              id: departmentIdSchema,
              name: nameTextSchema(120).optional(),
              active: z.boolean().optional(),
            }),
          )
          .min(1)
          .max(200)
          .refine(uniqueIds, UNIQUE)
          .optional(),
      }),
    },
    response: { statuses: [200], schema: z.object({ unit: adminUnitSchema }) },
    errors: errors(
      'COURSES_NOT_FOUND',
      'COURSES_UNIT_NAME_IN_USE',
      'COURSES_DEPARTMENT_NAME_IN_USE',
    ),
    summary: 'Changes a unit and its departments; name, kind and activity only by a general admin.',
  }),
  adminCreateDepartment: defineRoute({
    module: 'courses',
    name: 'adminCreateDepartment',
    method: 'POST',
    path: '/v1/courses/admin/units/{unitId}/departments',
    ...admin,
    request: {
      params: z.object({ unitId: unitIdSchema }),
      body: z.object({ id: clientIdSchema, name: nameTextSchema(120) }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        department: z.object({
          id: departmentIdSchema,
          unitId: unitIdSchema,
          name: z.string(),
          active: z.boolean(),
        }),
      }),
    },
    errors: errors('COURSES_NOT_FOUND', 'COURSES_DEPARTMENT_NAME_IN_USE', 'COURSES_ID_CONFLICT'),
    summary: 'Adds a department to a unit.',
  }),
  adminListTerms: defineRoute({
    module: 'courses',
    name: 'adminListTerms',
    method: 'GET',
    path: '/v1/courses/admin/terms',
    ...admin,
    request: {},
    response: {
      statuses: [200],
      schema: z.object({
        // Newest first, without the review term; units follow the admin's scope.
        terms: fullListSchema(
          z.object({
            id: termIdSchema,
            academicYear: z.string(),
            semester: extensibleEnum(SEMESTERS),
            calendars: z.array(calendarSchema),
            units: z.array(
              z.object({
                unitId: unitIdSchema,
                calendarId: calendarIdSchema,
                lockAt: instantSchema,
                locked: z.boolean(),
              }),
            ),
          }),
        ),
      }),
    },
    errors: errors(),
    summary: 'Terms with their calendars and the units bound to them.',
  }),
  adminCreateTerm: defineRoute({
    module: 'courses',
    name: 'adminCreateTerm',
    method: 'POST',
    path: '/v1/courses/admin/terms',
    ...admin,
    request: {
      body: z.object({
        id: clientIdSchema,
        academicYear: academicYearSchema,
        semester: z.enum(SEMESTERS),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        term: z.object({
          id: termIdSchema,
          academicYear: z.string(),
          semester: extensibleEnum(SEMESTERS),
        }),
      }),
    },
    // NOT_FOUND: a repeated id whose term lies outside the admin's scope.
    errors: errors('COURSES_NOT_FOUND', 'COURSES_TERM_EXISTS', 'COURSES_ID_CONFLICT'),
    summary: 'Opens a term; only a general admin.',
  }),
  adminCreateCalendar: defineRoute({
    module: 'courses',
    name: 'adminCreateCalendar',
    method: 'POST',
    path: '/v1/courses/admin/calendars',
    ...admin,
    request: {
      body: z.object({
        id: clientIdSchema,
        termId: termIdSchema,
        ...calendarInputShape,
        examWeeks: z.array(newExamWeekInputSchema).max(10).refine(uniqueIds, UNIQUE),
      }),
    },
    response: { statuses: [200], schema: z.object({ calendar: termCalendarSchema }) },
    errors: errors(
      'COURSES_NOT_FOUND',
      'COURSES_CALENDAR_NAME_IN_USE',
      'COURSES_CALENDAR_DATES_INVALID',
      'COURSES_ID_CONFLICT',
    ),
    summary: 'Adds an academic calendar to a term; only a general admin.',
  }),
  adminPutCalendar: defineRoute({
    module: 'courses',
    name: 'adminPutCalendar',
    method: 'PUT',
    path: '/v1/courses/admin/calendars/{calendarId}',
    ...admin,
    request: {
      params: z.object({ calendarId: calendarIdSchema }),
      body: z.object({
        expectedVersion: expectedVersionSchema,
        ...calendarInputShape,
        // Must be true when the new last day locks a bound unit now.
        lockNow: z.boolean().default(false),
        // Required when the last day of a unit past its lock moves later.
        lastDayReason: lastDayReasonSchema.optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        calendar: termCalendarSchema,
        affectedUnitTerms: countSchema,
        reopenedCourses: countSchema,
        regenerated: z.boolean(),
      }),
    },
    errors: errors(
      'COURSES_NOT_FOUND',
      'COURSES_VERSION_CHANGED',
      'COURSES_CALENDAR_DATES_INVALID',
      'COURSES_LOCKS_IMMEDIATELY',
      'COURSES_LAST_DAY_CANNOT_MOVE_BACK',
      'COURSES_REASON_REQUIRED',
      'COURSES_CALENDAR_NAME_IN_USE',
    ),
    summary: 'Replaces a calendar; bound units and their sessions follow.',
  }),
  adminPutUnitTerm: defineRoute({
    module: 'courses',
    name: 'adminPutUnitTerm',
    method: 'PUT',
    path: '/v1/courses/admin/units/{unitId}/terms/{termId}',
    ...admin,
    request: {
      params: z.object({ unitId: unitIdSchema, termId: termIdSchema }),
      body: z.object({
        calendarId: calendarIdSchema,
        lockNow: z.boolean().default(false),
        lastDayReason: lastDayReasonSchema.optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        unitTerm: unitTermSchema,
        reopenedCourses: countSchema,
        regenerated: z.boolean(),
      }),
    },
    errors: errors(
      'COURSES_NOT_FOUND',
      'COURSES_CALENDAR_TERM_MISMATCH',
      'COURSES_TERM_LOCKED',
      'COURSES_LOCKS_IMMEDIATELY',
      'COURSES_LAST_DAY_CANNOT_MOVE_BACK',
      'COURSES_REASON_REQUIRED',
    ),
    summary: "Binds a unit's term to a calendar of the same term.",
  }),
  adminListLocks: defineRoute({
    module: 'courses',
    name: 'adminListLocks',
    method: 'GET',
    path: '/v1/courses/admin/locks',
    ...admin,
    request: { query: z.object({ termId: termIdSchema.optional() }) },
    response: {
      statuses: [200],
      schema: z.object({
        termBreak: z.boolean(),
        unitTerms: fullListSchema(
          z.object({
            unitId: unitIdSchema,
            unitName: z.string(),
            termId: termIdSchema,
            academicYear: z.string(),
            semester: extensibleEnum(SEMESTERS),
            calendarId: calendarIdSchema,
            lastDay: dateSchema,
            lockAt: instantSchema,
            locked: z.boolean(),
            lockAppliedAt: instantSchema.nullable(),
            unansweredSessions: countSchema,
          }),
        ),
      }),
    },
    errors: errors(),
    summary: 'Lock state of the unit terms in scope.',
  }),
  adminListCourses: defineRoute({
    module: 'courses',
    name: 'adminListCourses',
    method: 'GET',
    path: '/v1/courses/admin/courses',
    ...admin,
    request: {
      query: z.object({
        ...pageQuerySchema.shape,
        termId: termIdSchema.optional(),
        unitId: unitIdSchema.optional(),
        lecturerStatus: z.enum(LECTURER_ACCOUNT_STATUSES).optional(),
      }),
    },
    response: {
      statuses: [200],
      // No roster, attendance or head count (D02-A08); no trial course.
      schema: pageSchema(
        z.object({
          id: courseIdSchema,
          code: z.string(),
          name: z.string(),
          termId: termIdSchema,
          unitId: unitIdSchema,
          unitName: z.string(),
          lecturer: z.object({
            personId: personIdSchema,
            fullName: z.string(),
            accountStatus: extensibleEnum(LECTURER_ACCOUNT_STATUSES),
          }),
          theoryPercent: percentSchema,
          practicePercent: percentSchema,
          ratesConfirmedAt: instantSchema.nullable(),
          windowMinutes: z.number().int().nullable(),
          status: extensibleEnum(COURSE_STATUSES),
          archiveReason: extensibleEnum(ARCHIVE_REASONS).nullable(),
        }),
      ),
    },
    errors: errors(),
    summary: 'Courses of the units in scope, by code and id.',
  }),
  adminTransferCourse: defineRoute({
    module: 'courses',
    name: 'adminTransferCourse',
    method: 'POST',
    path: '/v1/courses/admin/courses/{courseId}/transfer',
    ...admin,
    request: {
      params: courseParams,
      // Person rows get uuidv7() ids, so another version is a malformed request.
      body: z.object({ targetPersonId: personIdSchema, reason: z.enum(TRANSFER_REASONS) }),
    },
    response: { statuses: [200], schema: z.object({ course: courseSummarySchema }) },
    errors: errors(
      'COURSES_NOT_FOUND',
      'COURSES_TRANSFER_TARGET_INVALID',
      'COURSES_CODE_IN_USE',
      'COURSES_TERM_LOCKED',
      'COURSES_COURSE_ARCHIVED',
      'COURSES_TRIAL_COURSE_READ_ONLY',
    ),
    summary: 'Hands a course to another lecturer.',
  }),
};

// The two jsonb columns of the module, checked before they are written.

// dersler.hoca_atama_gecmisi: every lecturer of the course in order, at most 100; the
// current one is last and still open, and a transfer closes the previous one at the
// instant the next starts (I027). Instants are fixed-width text, so text order is time order.
export const lecturerHistorySchema = z
  .array(
    z.object({ personId: personIdSchema, startAt: instantSchema, endAt: instantSchema.nullable() }),
  )
  .min(1)
  .max(100)
  .refine(
    (history) =>
      history.every((entry, index) => {
        const next = history[index + 1];
        if (next === undefined) return entry.endAt === null;
        return entry.endAt === next.startAt && entry.startAt <= entry.endAt;
      }),
    { message: 'Each lecturer ends where the next starts; only the last is still open' },
  );

const sessionFieldsSchema = z.strictObject({
  room: z.string().max(40).nullable(),
  theoryHours: hoursSchema,
  practiceHours: hoursSchema,
  windowMinutes: windowMinutesSchema.nullable(),
  cancelReason: z.enum(CANCEL_REASONS).nullable(),
  sectionIds: z.array(sectionIdSchema).max(20),
  held: z.boolean().nullable(),
});

// oturum_degisiklikleri.diger_alanlar: the session's other fields before and after one
// change; the earlier window length is read from here (I018).
export const sessionChangeFieldsSchema = z.strictObject({
  before: sessionFieldsSchema,
  after: sessionFieldsSchema,
});

// Audit events. The detail schemas are registered once with the corrections module,
// which rejects an unknown detail field; COURSES_AUDIT_CHANGES holds the before and
// after schemas of each type (null: the event has none). Field names avoid the audit
// writer's forbidden names (name, code, studentNumber and the like); no event carries
// a student number or name, every list is bounded, and an event that carries a
// courseId also carries unitId in its envelope.

const unitTermIds = { unitId: unitIdSchema, termId: termIdSchema };
const nothing = z.strictObject({});
// The answer's session effect, strict like every audit object.
const sessionEffectDetailSchema = z.strictObject(sessionEffectSchema.shape);

export const COURSES_AUDIT_EVENTS = {
  'courses.course_opened': nothing,
  'courses.course_changed': z.strictObject({ sessionEffect: sessionEffectDetailSchema }),
  'courses.course_archived': z.strictObject({
    cancelledSessions: countSchema,
    // Only when the lecturer archives.
    activeRosterRows: countSchema.optional(),
  }),
  'courses.course_reopened': z.strictObject({
    ...unitTermIds,
    previousLockAt: instantSchema,
    newLockAt: instantSchema,
    lastDayReason: lastDayReasonSchema,
  }),
  'courses.course_transferred': z.strictObject({
    reason: z.enum([...TRANSFER_REASONS, 'review_account_renewed']),
  }),
  'courses.section_added': z.strictObject({
    joinedSlotIds: z.array(scheduleSlotIdSchema).max(20),
    skippedSlotIds: z.array(scheduleSlotIdSchema).max(20),
    sessionEffect: sessionEffectDetailSchema,
  }),
  'courses.section_changed': z.strictObject({
    deletedSlotIds: z.array(scheduleSlotIdSchema).max(20),
    sessionEffect: sessionEffectDetailSchema,
  }),
  // A summary; every slot writes its own schedule_slot_changed event.
  'courses.schedule_changed': z.strictObject({
    addedSlots: countSchema,
    deletedSlots: countSchema,
    changedSlots: countSchema,
    editVersion: z.number().int(),
    sessionEffect: sessionEffectDetailSchema,
  }),
  'courses.schedule_slot_changed': z.strictObject({ slotId: scheduleSlotIdSchema }),
  'courses.makeup_added': z.strictObject({ oldCancelled: z.boolean() }),
  'courses.session_changed': nothing,
  'courses.session_cancelled': nothing,
  'courses.session_cancel_undone': nothing,
  'courses.held_answered': z.strictObject({ batch: z.boolean() }),
  'courses.sessions_regenerated': z.strictObject({
    reason: z.enum(REGENERATION_REASONS),
    calendarId: calendarIdSchema.optional(),
    ...sessionEffectSchema.shape,
  }),
  'courses.unit_added': nothing,
  'courses.unit_changed': nothing,
  'courses.department_added': nothing,
  'courses.department_changed': z.strictObject({ unitId: unitIdSchema }),
  'courses.term_opened': nothing,
  // Holidays follow in their own holiday_changed events.
  'courses.calendar_opened': z.strictObject({ holidayCount: countSchema }),
  'courses.calendar_changed': z.strictObject({
    lockNow: z.boolean(),
    lastDayReason: lastDayReasonSchema.optional(),
    affectedUnitTerms: countSchema,
    reopenedCourses: countSchema,
  }),
  'courses.holiday_changed': z.strictObject({ calendarId: calendarIdSchema }),
  'courses.unit_term_bound': z.strictObject({
    lockNow: z.boolean(),
    lastDayReason: lastDayReasonSchema.optional(),
  }),
  'courses.term_locked': z.strictObject({
    ...unitTermIds,
    lockAt: instantSchema,
    archivedCourses: countSchema,
    steps: z.array(z.string().max(64)).max(10),
  }),
  'courses.trial_course_created': nothing,
} as const satisfies Readonly<Record<string, z.ZodObject>>;

export type CoursesAuditEvent = keyof typeof COURSES_AUDIT_EVENTS;

// The changed-fields events list only the fields that changed, before and after.
const changed = <S extends z.ZodRawShape>(shape: S) => {
  const fields = z.strictObject(shape).partial();
  return { before: fields, after: fields };
};
const slotStateSchema = z.strictObject({
  weekday: weekdaySchema,
  startTime: localTimeSchema,
  endTime: localTimeSchema,
  theoryHours: hoursSchema,
  practiceHours: hoursSchema,
  room: z.string().max(40).nullable(),
  validFrom: dateSchema.nullable(),
  validTo: dateSchema.nullable(),
  sectionIds: z.array(sectionIdSchema).max(20),
});
const holidayStateSchema = z.strictObject({
  holidayName: z.string().max(120),
  start: dateSchema,
  end: dateSchema,
  halfDayStart: localTimeSchema.nullable(),
});
const examWeeksStateSchema = z
  .array(
    z.strictObject({
      kind: z.enum(EXAM_KINDS),
      start: dateSchema,
      end: dateSchema,
      classesHeld: z.boolean(),
    }),
  )
  .max(10);
const archiveReasonStateSchema = z.enum(ARCHIVE_REASONS);
const noChange = { before: null, after: null };

export const COURSES_AUDIT_CHANGES = {
  'courses.course_opened': {
    before: null,
    after: z.strictObject({
      courseCode: z.string().max(20),
      courseName: z.string().max(120),
      termId: termIdSchema,
      unitId: unitIdSchema,
      departmentId: departmentIdSchema.nullable(),
      windowMinutes: windowMinutesSchema.nullable(),
      theoryPercent: percentSchema,
      practicePercent: percentSchema,
      ratesConfirmed: z.boolean(),
      sectionLabels: z.array(z.string().max(20)).max(20),
    }),
  },
  'courses.course_changed': changed({
    courseCode: z.string().max(20),
    courseName: z.string().max(120),
    unitId: unitIdSchema,
    departmentId: departmentIdSchema.nullable(),
    windowMinutes: windowMinutesSchema.nullable(),
    qrAttendance: z.boolean(),
  }),
  'courses.course_archived': {
    before: z.strictObject({ archiveReason: z.null() }),
    after: z.strictObject({ archiveReason: archiveReasonStateSchema }),
  },
  'courses.course_reopened': {
    before: z.strictObject({ archiveReason: z.literal('lock') }),
    after: z.strictObject({ archiveReason: z.null() }),
  },
  'courses.course_transferred': {
    before: z.strictObject({ lecturerPersonId: personIdSchema }),
    after: z.strictObject({ lecturerPersonId: personIdSchema }),
  },
  'courses.section_added': {
    before: null,
    after: z.strictObject({ sectionId: sectionIdSchema, sectionLabel: z.string().max(20) }),
  },
  'courses.section_changed': changed({ sectionLabel: z.string().max(20), inactive: z.boolean() }),
  'courses.schedule_changed': noChange,
  // null before: a new slot; null after: a deleted slot.
  'courses.schedule_slot_changed': {
    before: slotStateSchema.nullable(),
    after: slotStateSchema.nullable(),
  },
  'courses.makeup_added': {
    before: null,
    after: z.strictObject({
      date: dateSchema,
      startTime: localTimeSchema,
      endTime: localTimeSchema,
      theoryHours: hoursSchema,
      practiceHours: hoursSchema,
      room: z.string().max(40).nullable(),
      sectionIds: z.array(sectionIdSchema).max(20),
      windowMinutes: windowMinutesSchema.nullable(),
      makeupForSessionId: sessionIdSchema.nullable(),
    }),
  },
  'courses.session_changed': changed({
    startTime: localTimeSchema,
    endTime: localTimeSchema,
    room: z.string().max(40).nullable(),
    theoryHours: hoursSchema,
    practiceHours: hoursSchema,
  }),
  'courses.session_cancelled': {
    before: z.strictObject({
      status: z.enum(SESSION_STATUSES),
      cancelReason: z.enum(CANCEL_REASONS).nullable(),
    }),
    after: z.strictObject({ status: z.literal('cancelled'), cancelReason: z.enum(CANCEL_REASONS) }),
  },
  'courses.session_cancel_undone': {
    before: z.strictObject({
      status: z.literal('cancelled'),
      cancelReason: z.enum(CANCEL_REASONS),
    }),
    after: z.strictObject({ status: z.literal('planned') }),
  },
  'courses.held_answered': {
    before: z.strictObject({
      held: z.boolean().nullable(),
      conflicting: z.boolean(),
      status: z.enum(SESSION_STATUSES),
    }),
    after: z.strictObject({
      held: z.boolean().nullable(),
      conflicting: z.boolean(),
      status: z.enum(SESSION_STATUSES),
    }),
  },
  'courses.sessions_regenerated': noChange,
  'courses.unit_added': {
    before: null,
    after: z.strictObject({ unitName: z.string().max(120), unitKind: z.enum(UNIT_KINDS) }),
  },
  'courses.unit_changed': changed({
    unitName: z.string().max(120),
    unitKind: z.enum(UNIT_KINDS),
    inactive: z.boolean(),
  }),
  'courses.department_added': {
    before: null,
    after: z.strictObject({ unitId: unitIdSchema, departmentName: z.string().max(120) }),
  },
  'courses.department_changed': changed({
    departmentName: z.string().max(120),
    inactive: z.boolean(),
  }),
  'courses.term_opened': {
    before: null,
    after: z.strictObject({ academicYear: z.string().max(9), semester: z.enum(SEMESTERS) }),
  },
  'courses.calendar_opened': {
    before: null,
    after: z.strictObject({
      calendarName: z.string().max(120),
      termId: termIdSchema,
      classesStart: dateSchema,
      classesEnd: dateSchema,
      addDropEnd: dateSchema,
      lastDay: dateSchema,
      examWeeks: examWeeksStateSchema,
    }),
  },
  'courses.calendar_changed': changed({
    calendarName: z.string().max(120),
    classesStart: dateSchema,
    classesEnd: dateSchema,
    addDropEnd: dateSchema,
    lastDay: dateSchema,
    examWeeks: examWeeksStateSchema,
  }),
  // null before: a new holiday; null after: a removed one.
  'courses.holiday_changed': {
    before: holidayStateSchema.nullable(),
    after: holidayStateSchema.nullable(),
  },
  'courses.unit_term_bound': {
    before: z.strictObject({ calendarId: calendarIdSchema }).nullable(),
    after: z.strictObject({ calendarId: calendarIdSchema, lockAt: instantSchema }),
  },
  'courses.term_locked': noChange,
  'courses.trial_course_created': {
    before: null,
    after: z.strictObject({
      courseId: courseIdSchema,
      sectionId: sectionIdSchema,
      lecturerPersonId: personIdSchema,
    }),
  },
} as const satisfies Readonly<
  Record<CoursesAuditEvent, { before: z.ZodType | null; after: z.ZodType | null }>
>;
