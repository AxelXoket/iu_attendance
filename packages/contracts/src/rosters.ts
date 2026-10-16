// Rosters contract (D03): the six routes with their request and answer schemas, the
// ROSTERS_ error catalog, the audit event detail schemas, the field names the log
// formatter hides, the value lists the database CHECK constraints repeat, and the
// RosterUploadId brand (RosterRowId is shared: other modules refer to roster rows).
// Request and answer objects drop unknown keys
// (D13-B24); requests use closed enums, answers carry growing codes as extensible
// enums. Only the audit detail schemas are strict.
import { LATE_CHOICES, type LateChoice } from '@iu-attendance/core/rosters/late-choice';
import { checkName, FINDING_CODES, FINDING_LEVELS } from '@iu-attendance/core/rosters/row-check';
import { ROW_STATUSES } from '@iu-attendance/core/rosters/row-status';
import { z } from 'zod';
import { courseIdSchema, sectionIdSchema } from './courses.ts';
import {
  BODY_LIMIT_MAX_BYTES,
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
  pageQuerySchema,
  pageSchema,
  personIdSchema,
  rosterRowIdSchema,
  sameText,
  sessionAccess,
  sha256DigestSchema,
  studentNumberSchema,
  v7IdSchema,
} from './shared/index.ts';

// Value lists. The CHECK constraints of the roster tables use these same values; the
// schema test imports them.
export const ROW_SOURCES = ['FILE', 'MANUAL', 'SYSTEM'] as const;
// How a late-enrolled student's earlier sessions count (D03-B12), from core.
export { FINDING_CODES, FINDING_LEVELS, LATE_CHOICES, type LateChoice, ROW_STATUSES };
export const FILE_TYPES = ['XLSX', 'XLS', 'HTML_XML', 'CSV'] as const;
export const ENCODINGS = ['UTF_8', 'UTF_16LE', 'UTF_16BE', 'WINDOWS_1254'] as const;
export const SEPARATORS = ['COMMA', 'SEMICOLON', 'TAB'] as const;

const LOCK_REASONS = ['TERM_LOCK', 'COURSE_ARCHIVED', 'SECTION_INACTIVE', 'TRIAL_COURSE'] as const;
const APPLY_RESULTS = ['APPLIED', 'ALREADY_APPLIED'] as const;
const ADD_RESULTS = ['ADDED', 'REACTIVATED', 'ALREADY_LISTED'] as const;
const ROW_CHANGE_REASONS = ['FILE', 'MANUAL', 'SECTION_CHANGE', 'SYSTEM'] as const;

// Keys whose values the log formatter writes as '[gizli]' at any depth: a student
// number or name never reaches a log.
export const ROSTERS_SECRET_FIELDS = ['studentNumber', 'fullName', 'oldName', 'newName'] as const;

export type RowSource = (typeof ROW_SOURCES)[number];

export type RosterUploadId = Id<'RosterUpload'>;
export const rosterUploadIdSchema = v7IdSchema('RosterUpload');

// Error catalog. Roster routes are lecturer routes, so the student text repeats the
// staff text.

export const ROSTERS_ERROR_CODES = defineErrorCodes('rosters', {
  ROSTERS_NOT_FOUND: {
    http: 404,
    ...sameText(
      'Liste bulunamadı ya da bu işlem için yetkiniz yok.',
      'The roster was not found or you have no access to it.',
    ),
  },
  ROSTERS_LOCKED: {
    http: 409,
    ...sameText(
      'Bu liste değiştirilemez: dönem kilitli, ders arşivde, şube pasif ya da ders deneme dersi.',
      'This roster cannot be changed: the term is locked, the course is archived, the section is inactive or the course is the trial course.',
    ),
  },
  ROSTERS_VERSION_CHANGED: {
    http: 409,
    ...sameText(
      'Liste siz bakarken değişti. Listeyi yenileyip yeniden deneyin.',
      'The roster changed while you were looking at it. Refresh it and try again.',
    ),
    details: z.object({ currentVersion: expectedVersionSchema }),
  },
  ROSTERS_CONFIRMATION_REQUIRED: {
    http: 409,
    ...sameText(
      'Uyarıları, büyük değişikliği ve şube değişikliğini onaylayıp yeniden gönderin.',
      'Confirm the warnings, the large change and the section change, then send again.',
    ),
  },
  ROSTERS_ROW_LIMIT: {
    http: 409,
    ...sameText(
      'Şubenin etkin öğrenci sınırı aşılıyor.',
      'The section would exceed its active student limit.',
    ),
  },
  ROSTERS_ROW_EXISTS: {
    http: 409,
    ...sameText(
      'Bu numara şubede başka bir adla kayıtlı.',
      'This number is already on the section roster under another name.',
    ),
  },
  ROSTERS_IN_OTHER_SECTION: {
    http: 409,
    ...sameText(
      'Öğrenci bu dersin başka bir şubesinde; taşımayı onaylayıp yeniden gönderin.',
      'The student is in another section of this course; confirm the move and send again.',
    ),
  },
  ROSTERS_NOT_LATE_ENROLMENT: {
    http: 409,
    ...sameText(
      'Bu öğrenci ilk dersten sonra eklenmedi; geç kayıt seçimi yapılamaz.',
      'This student was not added after the first class, so no late enrolment choice applies.',
    ),
  },
  ROSTERS_INVALID_ROWS: {
    http: 400,
    ...sameText(
      'Dosyada hatalı satırlar var; önizlemedeki hataları düzeltin.',
      'The file has invalid rows; fix the errors shown in the preview.',
    ),
    // Row numbers only: no value of the rows is echoed.
    details: z.object({ fileRowNumbers: z.array(z.number().int().positive()).max(2000) }),
  },
  ROSTERS_BUSY: {
    http: 503,
    ...sameText(
      'Liste şu anda başka bir işlemle güncelleniyor. Biraz sonra yeniden deneyin.',
      'The roster is being updated by another request. Try again shortly.',
    ),
    retry: { fixed: 2 },
  },
});

export type RostersErrorCode = keyof typeof ROSTERS_ERROR_CODES;

// A route's error list, checked against the catalog when it compiles.
const errors = (...codes: RostersErrorCode[]) => codes;

// Field schemas.

// The file the panel read: encoding and separator are set for CSV and null otherwise.
const fileSchema = z
  .object({
    type: z.enum(FILE_TYPES),
    encoding: z.enum(ENCODINGS).nullable(),
    separator: z.enum(SEPARATORS).nullable(),
  })
  .refine(
    (file) =>
      file.type === 'CSV'
        ? file.encoding !== null && file.separator !== null
        : file.encoding === null && file.separator === null,
    { message: 'encoding and separator are set for CSV and null otherwise' },
  );

// Rows as read from the file, raw: the server applies the number and name rules and
// reports findings. A file with a section column arrives filtered to the section.
// A name cell as read: the name rule (checkName) runs on it after collapsing.
const NAME_CELL_MAX_LENGTH = 300;
const fileRowsSchema = z
  .array(
    z.object({
      fileRowNumber: z.number().int().positive(),
      studentNumber: z.string().max(32),
      fullName: z.string().max(NAME_CELL_MAX_LENGTH),
      sectionLabel: z.string().max(40).nullable(),
      numberCell: z.boolean(),
    }),
  )
  .min(1)
  .max(2000)
  .refine((rows) => isUnique(rows.map((row) => row.fileRowNumber)), {
    message: 'fileRowNumber must not repeat',
  });

// base64url SHA-256 of the canonical diff.
const diffDigestSchema = sha256DigestSchema;

const rowSchema = z.object({
  rowId: rosterRowIdSchema,
  studentNumber: z.string(),
  fullName: z.string(),
  order: z.number().int(),
  source: extensibleEnum(ROW_SOURCES),
  addedAt: instantSchema,
  inactiveAt: instantSchema.nullable(),
  lateChoice: extensibleEnum(LATE_CHOICES),
  lateAdded: z.boolean(),
  exempt: z.boolean(),
  changedAt: instantSchema,
});

const lockSchema = extensibleEnum(LOCK_REASONS).nullable();

const summarySchema = z.object({
  toAdd: countSchema,
  toDeactivate: countSchema,
  toReactivate: countSchema,
  toTrim: countSchema,
  nameChanges: countSchema,
  spellingFixes: countSchema,
  sectionChanges: countSchema,
  orderChanges: countSchema,
  unchanged: countSchema,
  leftOut: countSchema,
});

const lecturer = sessionAccess('lecturer');
const sectionParams = z.object({ sectionId: sectionIdSchema });
const FILE_BODY_LIMIT = BODY_LIMIT_MAX_BYTES;
const ROW_BODY_LIMIT = 64 * 1024;

export const ROSTERS_ROUTES = {
  getSection: defineRoute({
    module: 'rosters',
    name: 'getSection',
    method: 'GET',
    path: '/v1/rosters/sections/{sectionId}',
    ...lecturer,
    request: {
      params: sectionParams,
      // cursor and limit page the inactive part; the active part comes whole.
      query: z.object({
        part: z.enum(ROW_STATUSES).default('ACTIVE'),
        ...pageQuerySchema.shape,
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        sectionId: sectionIdSchema,
        courseId: courseIdSchema,
        // 0 when the roster was never written; sent back as expectedListVersion.
        listVersion: countSchema,
        lock: lockSchema,
        firstHeldAt: instantSchema.nullable(),
        addDropEnd: dateSchema.nullable(),
        // A section holds at most 2,000 active rows.
        activeCount: countSchema.max(2000),
        inactiveCount: countSchema,
        items: fullListSchema(rowSchema),
        nextCursor: z.string().nullable(),
      }),
    },
    errors: errors('ROSTERS_NOT_FOUND'),
    summary: "A section's active rows in roster order, or a page of its inactive rows.",
  }),
  previewUpload: defineRoute({
    module: 'rosters',
    name: 'previewUpload',
    method: 'POST',
    path: '/v1/rosters/sections/{sectionId}/preview',
    ...lecturer,
    bodyLimit: FILE_BODY_LIMIT,
    request: {
      params: sectionParams,
      body: z.object({ file: fileSchema, rows: fileRowsSchema }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        listVersion: countSchema,
        // Sent back as expectedDiffDigest when applying.
        diffDigest: diffDigestSchema,
        applicable: z.boolean(),
        rowLimitExceeded: z.boolean(),
        lock: lockSchema,
        largeChange: z.boolean(),
        sectionChangeRequired: z.boolean(),
        summary: summarySchema,
        toAdd: z.array(
          z.object({
            fileRowNumber: z.number().int(),
            studentNumber: z.string(),
            fullName: z.string(),
            lateAdded: z.boolean(),
          }),
        ),
        toReactivate: z.array(
          z.object({
            rowId: rosterRowIdSchema,
            fileRowNumber: z.number().int(),
            studentNumber: z.string(),
            fullName: z.string(),
            addedAt: instantSchema,
            inactiveAt: instantSchema,
          }),
        ),
        // Inactive rows of the course whose span a reactivation cuts (D03-A04).
        toTrim: z.array(
          z.object({
            rowId: rosterRowIdSchema,
            sectionId: sectionIdSchema,
            sectionLabel: z.string(),
            studentNumber: z.string(),
            addedAt: instantSchema,
            inactiveAt: instantSchema,
            newInactiveAt: instantSchema,
          }),
        ),
        toDeactivate: z.array(
          z.object({
            rowId: rosterRowIdSchema,
            studentNumber: z.string(),
            fullName: z.string(),
            source: extensibleEnum(ROW_SOURCES),
          }),
        ),
        nameChanges: z.array(
          z.object({
            rowId: rosterRowIdSchema,
            fileRowNumber: z.number().int(),
            oldName: z.string(),
            newName: z.string(),
          }),
        ),
        // targetRowId: an inactive row of this section that comes back; null opens a row.
        sectionChanges: z.array(
          z.object({
            fileRowNumber: z.number().int(),
            studentNumber: z.string(),
            fullName: z.string(),
            oldRowId: rosterRowIdSchema,
            oldSectionId: sectionIdSchema,
            oldSectionLabel: z.string(),
            targetRowId: rosterRowIdSchema.nullable(),
          }),
        ),
        findings: z.array(
          z.object({
            fileRowNumber: z.number().int(),
            level: extensibleEnum(FINDING_LEVELS),
            code: extensibleEnum(FINDING_CODES),
          }),
        ),
        firstHeldAt: instantSchema.nullable(),
        addDropEnd: dateSchema.nullable(),
      }),
    },
    errors: errors('ROSTERS_NOT_FOUND'),
    summary: 'The changes a roster file would make; writes nothing.',
  }),
  applyUpload: defineRoute({
    module: 'rosters',
    name: 'applyUpload',
    method: 'POST',
    path: '/v1/rosters/sections/{sectionId}/apply',
    ...lecturer,
    bodyLimit: FILE_BODY_LIMIT,
    request: {
      params: sectionParams,
      body: z.object({
        file: fileSchema,
        rows: fileRowsSchema,
        expectedDiffDigest: diffDigestSchema,
        warningsConfirmed: z.boolean(),
        largeChangeConfirmed: z.boolean(),
        sectionChangeConfirmed: z.boolean(),
        // Only for numbers new to the course and added late; a number left out gets
        // PREVIOUS_NOT_COUNTED.
        lateChoices: z
          .array(z.object({ studentNumber: studentNumberSchema, choice: z.enum(LATE_CHOICES) }))
          .max(2000)
          .refine((choices) => isUnique(choices.map((choice) => choice.studentNumber)), {
            message: 'studentNumber must not repeat',
          })
          .default([]),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        result: extensibleEnum(APPLY_RESULTS),
        uploadId: rosterUploadIdSchema.nullable(),
        listVersion: countSchema,
        summary: summarySchema,
      }),
    },
    errors: errors(
      'ROSTERS_NOT_FOUND',
      'ROSTERS_LOCKED',
      'ROSTERS_VERSION_CHANGED',
      'ROSTERS_CONFIRMATION_REQUIRED',
      'ROSTERS_ROW_LIMIT',
      'ROSTERS_INVALID_ROWS',
      'ROSTERS_BUSY',
    ),
    summary: 'Applies a roster file when its diff still matches the preview.',
  }),
  addRow: defineRoute({
    module: 'rosters',
    name: 'addRow',
    method: 'POST',
    path: '/v1/rosters/sections/{sectionId}/rows',
    ...lecturer,
    bodyLimit: ROW_BODY_LIMIT,
    request: {
      params: sectionParams,
      body: z.object({
        studentNumber: studentNumberSchema,
        // The same name rule as a file row (D03-B17); the handler stores rosterName.
        fullName: z
          .string()
          .max(NAME_CELL_MAX_LENGTH)
          .refine((name) => checkName(name).length === 0, {
            message: 'fullName breaks the roster name rule',
          }),
        expectedListVersion: expectedVersionSchema,
        lateChoice: z.enum(LATE_CHOICES).nullable(),
        sectionChangeConfirmed: z.boolean().default(false),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        result: extensibleEnum(ADD_RESULTS),
        row: rowSchema,
        listVersion: countSchema,
      }),
    },
    errors: errors(
      'ROSTERS_NOT_FOUND',
      'ROSTERS_LOCKED',
      'ROSTERS_VERSION_CHANGED',
      'ROSTERS_ROW_EXISTS',
      'ROSTERS_IN_OTHER_SECTION',
      'ROSTERS_ROW_LIMIT',
      'ROSTERS_BUSY',
    ),
    summary: 'Adds one student by hand, or brings an inactive row back.',
  }),
  updateRow: defineRoute({
    module: 'rosters',
    name: 'updateRow',
    method: 'PATCH',
    path: '/v1/rosters/rows/{rowId}',
    ...lecturer,
    bodyLimit: ROW_BODY_LIMIT,
    request: {
      params: z.object({ rowId: rosterRowIdSchema }),
      // Exemption is not set here: it belongs to the absence module.
      body: z
        .object({
          expectedListVersion: expectedVersionSchema,
          inactive: z.boolean().optional(),
          lateChoice: z.enum(LATE_CHOICES).optional(),
          sectionChangeConfirmed: z.boolean().optional(),
        })
        .refine((body) => body.inactive !== undefined || body.lateChoice !== undefined, {
          message: 'inactive or lateChoice is required',
        }),
    },
    response: {
      statuses: [200],
      schema: z.object({ row: rowSchema, listVersion: countSchema, changed: z.boolean() }),
    },
    errors: errors(
      'ROSTERS_NOT_FOUND',
      'ROSTERS_LOCKED',
      'ROSTERS_VERSION_CHANGED',
      'ROSTERS_NOT_LATE_ENROLMENT',
      'ROSTERS_IN_OTHER_SECTION',
      'ROSTERS_ROW_LIMIT',
      'ROSTERS_BUSY',
    ),
    summary: 'Takes a row off the roster, brings it back, or sets the late enrolment choice.',
  }),
  listUploads: defineRoute({
    module: 'rosters',
    name: 'listUploads',
    method: 'GET',
    path: '/v1/rosters/sections/{sectionId}/uploads',
    ...lecturer,
    request: { params: sectionParams, query: z.object({ ...pageQuerySchema.shape }) },
    response: {
      statuses: [200],
      // Newest first; counts and confirmations only, no file, number or name.
      schema: pageSchema(
        z.object({
          uploadId: rosterUploadIdSchema,
          uploaderPersonId: personIdSchema,
          mine: z.boolean(),
          appliedAt: instantSchema,
          fileType: extensibleEnum(FILE_TYPES),
          encoding: extensibleEnum(ENCODINGS).nullable(),
          separator: extensibleEnum(SEPARATORS).nullable(),
          rowCount: countSchema,
          leftOut: countSchema,
          added: countSchema,
          deactivated: countSchema,
          reactivated: countSchema,
          trimmed: countSchema,
          nameChanged: countSchema,
          sectionChanged: countSchema,
          orderChanged: countSchema,
          warningCount: countSchema,
          largeChangeConfirmed: z.boolean(),
          sectionChangeConfirmed: z.boolean(),
          newListVersion: countSchema,
        }),
      ),
    },
    errors: errors('ROSTERS_NOT_FOUND'),
    summary: "A section's applied uploads, newest first.",
  }),
};

// Audit event types and their detail schemas, strict: the audit writer rejects an
// unknown field. The row id travels in the envelope; no event carries a student number
// or name. uploadId names the upload a change came from: always for FILE, never for a
// change made by hand or by the system.
const optionalUploadId = { uploadId: rosterUploadIdSchema.optional() };
const rowChangeSchema = z
  .strictObject({ reason: z.enum(ROW_CHANGE_REASONS), ...optionalUploadId })
  .refine(
    (change) =>
      change.reason === 'FILE'
        ? change.uploadId !== undefined
        : change.reason === 'SECTION_CHANGE' || change.uploadId === undefined,
    { message: 'uploadId comes with FILE, may come with SECTION_CHANGE, and never otherwise' },
  );

export const ROSTERS_AUDIT_EVENTS = {
  'rosters.upload_applied': z.strictObject({ uploadId: rosterUploadIdSchema }),
  'rosters.row_added': z.strictObject({ reason: z.enum(['MANUAL', 'SYSTEM']) }),
  'rosters.row_deactivated': rowChangeSchema,
  'rosters.row_reactivated': rowChangeSchema,
  // A reactivation cut the span of an inactive row of the same course.
  'rosters.row_trimmed': z.strictObject({ reason: z.literal('REACTIVATION'), ...optionalUploadId }),
  'rosters.name_changed': z.strictObject({ ...optionalUploadId }),
  'rosters.late_choice_changed': z.strictObject({}),
} as const satisfies Readonly<Record<string, z.ZodObject>>;
