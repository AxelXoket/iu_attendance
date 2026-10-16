// Database contract (D12): the DATABASE_ error catalog, the restore list route, the
// advisory lock layers, the retention data classes, the table markers, the migration folder
// tokens and the backup job status file. The single source of the module's constants and
// CHECK lists; the server's database infrastructure imports them.
import { nonEmpty } from '@iu-attendance/core/shared/list';
import { z } from 'zod';
import { API_ERRORS } from './api.ts';
import {
  countSchema,
  defineErrorCodes,
  defineRoute,
  durationMsSchema,
  extensibleEnum,
  instantSchema,
  MODULES,
  type ModuleName,
  OPERATIONAL_CODE,
  pageQuerySchema,
  pageSchema,
  v7IdSchema,
} from './shared/index.ts';

// Error catalog. Six codes reach a client: the restore list's cursor (400) and the five
// transient codes a transaction turns its database errors into (503, retried after 15 to
// 45 seconds, the api module's busy text; no route lists them). The rest are operation,
// CI and test codes: http null and no text.

export const DATABASE_TRANSIENT_CODES = [
  'DATABASE_CONTENTION',
  'DATABASE_POOL_FULL',
  'DATABASE_UNAVAILABLE',
  'DATABASE_TIMEOUT',
  'DATABASE_GENERATION_UNCERTAIN',
] as const;
export type DatabaseTransientCode = (typeof DATABASE_TRANSIENT_CODES)[number];

const transient = {
  http: 503,
  lecturer: API_ERRORS.API_SERVER_BUSY.lecturer,
  student: API_ERRORS.API_SERVER_BUSY.student,
  retry: API_ERRORS.API_SERVER_BUSY.retry,
} as const;

export const DATABASE_ERROR_CODES = defineErrorCodes('database', {
  DATABASE_CURSOR_INVALID: {
    http: 400,
    lecturer: {
      tr: 'Liste sayfası açılamadı. Sayfayı yenileyip yeniden deneyin.',
      en: 'The list page could not be opened. Refresh the page and try again.',
    },
    student: { tr: 'Bu sayfa açılamadı.', en: 'This page could not be opened.' },
  },
  DATABASE_CONTENTION: transient,
  DATABASE_POOL_FULL: transient,
  DATABASE_UNAVAILABLE: transient,
  DATABASE_TIMEOUT: transient,
  DATABASE_GENERATION_UNCERTAIN: transient,
  DATABASE_MIGRATION_LOCK_TIMEOUT: OPERATIONAL_CODE,
  DATABASE_MIGRATION_INVALID_INDEX: OPERATIONAL_CODE,
  DATABASE_MIGRATION_NAME: OPERATIONAL_CODE,
  DATABASE_MIGRATION_OUTSIDE_MODULE: OPERATIONAL_CODE,
  DATABASE_MIGRATION_CHANGED: OPERATIONAL_CODE,
  DATABASE_MIGRATION_DML: OPERATIONAL_CODE,
  DATABASE_MIGRATION_TIMEOUT_SETTING: OPERATIONAL_CODE,
  DATABASE_MIGRATION_ORDER: OPERATIONAL_CODE,
  DATABASE_MIGRATION_NOT_GENERATED: OPERATIONAL_CODE,
  DATABASE_MIGRATION_CHAIN: OPERATIONAL_CODE,
  DATABASE_VERSION_MISMATCH: OPERATIONAL_CODE,
  DATABASE_SETUP_SECRET_MISSING: OPERATIONAL_CODE,
  DATABASE_GENERATION_UNCHANGED: OPERATIONAL_CODE,
  DATABASE_CLUSTER_NOT_NEW: OPERATIONAL_CODE,
  DATABASE_RESTORE_LOCK: OPERATIONAL_CODE,
  DATABASE_CANCEL_NOT_APPLIED: OPERATIONAL_CODE,
  DATABASE_BACKUP_DISK_LOW: OPERATIONAL_CODE,
  DATABASE_BACKUP_LOCK_TIMEOUT: OPERATIONAL_CODE,
  DATABASE_BACKUP_RESTORE_RUNNING: OPERATIONAL_CODE,
  DATABASE_BACKUP_FAILED: OPERATIONAL_CODE,
  DATABASE_BACKUP_VERIFY_FAILED: OPERATIONAL_CODE,
  DATABASE_TRIAL_MISMATCH: OPERATIONAL_CODE,
  DATABASE_TRIAL_STAGING_REQUIRED: OPERATIONAL_CODE,
  DATABASE_TRIAL_DISK_THRESHOLD: OPERATIONAL_CODE,
  DATABASE_TRIAL_KEY_MISSING: OPERATIONAL_CODE,
  DATABASE_RETENTION_HANDLER_MISSING: OPERATIONAL_CODE,
  DATABASE_RETENTION_ORDER: OPERATIONAL_CODE,
  DATABASE_RETENTION_CYCLE: OPERATIONAL_CODE,
  DATABASE_RETENTION_CLASS_UNKNOWN: OPERATIONAL_CODE,
  DATABASE_RETENTION_CLASS_OTHER_MODULE: OPERATIONAL_CODE,
  DATABASE_RETENTION_CLASS_TWICE: OPERATIONAL_CODE,
  DATABASE_PARTITION_DEFAULT_NOT_EMPTY: OPERATIONAL_CODE,
  DATABASE_ADVISORY_PREFIX_UNKNOWN: OPERATIONAL_CODE,
  DATABASE_ADVISORY_ORDER: OPERATIONAL_CODE,
  DATABASE_TRANSACTION_UNKNOWN: OPERATIONAL_CODE,
  DATABASE_TEST_UNREACHABLE: OPERATIONAL_CODE,
});

export type DatabaseErrorCode = keyof typeof DATABASE_ERROR_CODES;
const errors = (...codes: DatabaseErrorCode[]) => codes;

// Restores. A restore writes one row: how and why, the lost window (panel work between
// the target instant and its end is lost and redone), and the generations before and after.

export const RESTORE_METHODS = ['pitr', 'dump', 'version_upgrade'] as const;
export const RESTORE_REASONS = [
  'hardware_failure',
  'data_corruption',
  'wrong_operation',
  'security_incident',
  'version_upgrade',
  'other',
] as const;

export const restoreSchema = z.object({
  id: v7IdSchema('Restore'),
  method: extensibleEnum(RESTORE_METHODS),
  reasonCode: extensibleEnum(RESTORE_REASONS),
  targetAt: instantSchema,
  lossWindowEndAt: instantSchema,
  performedAt: instantSchema,
  previousGeneration: z.string(),
  newGeneration: z.string(),
  // From closing the traffic to writing the row.
  durationMs: durationMsSchema,
});

export const DATABASE_ROUTES = {
  listRestores: defineRoute({
    module: 'database',
    name: 'listRestores',
    method: 'GET',
    path: '/v1/database/admin/restores',
    auth: ['session'],
    roles: ['admin'],
    rate: 'session',
    request: { query: pageQuerySchema },
    // Newest first, ties by id descending; read in a read-only transaction.
    response: { statuses: [200], schema: pageSchema(restoreSchema) },
    errors: errors('DATABASE_CURSOR_INVALID'),
    summary: 'The restores made on the database, for every admin whatever the scope.',
  }),
};

// Advisory locks. A key is '<module>:<rule>:<internal ids>' with no student number or
// name; its prefix gives its layer, and a transaction takes keys in (layer, key) order.
// A module whose rules all share a layer is written '<module>:*'.

export type AdvisoryLayer = 1 | 2 | 3 | 4 | 5;
export type AdvisoryKey = string | { readonly key: string; readonly mode: 'shared' };

export const ADVISORY_LAYERS = {
  'verification:roster': 1,
  'absence:calculation': 1,
  'jobs:email': 1,
  'operations:*': 1,
  'rosters:bucket': 2,
  'verification:confirmation': 2,
  'attendance:pair': 3,
  'projection:*': 3,
  'sync:installation_limit': 3,
  'corrections:chain': 3,
  'verification:counter': 4,
  'verification:flag': 5,
} as const satisfies Readonly<Record<string, AdvisoryLayer>>;

/** The layer of an advisory key, or null when its prefix is in no layer. */
export function advisoryLayerOf(key: string): AdvisoryLayer | null {
  const [module, rule] = key.split(':');
  if (module === undefined || rule === undefined) return null;
  const layers: Readonly<Record<string, AdvisoryLayer>> = ADVISORY_LAYERS;
  return layers[`${module}:${rule}`] ?? layers[`${module}:*`] ?? null;
}

// Retention. Each data class is '<token>.<class>' of one module. A class whose rows refer
// to another class's rows is handled before it and lists it in `before`; the referred
// class never lists its referrers. Every class starts at its unit term's lock, the
// identity link at the person's last one. A class keeping a copy of numbers or names
// names the class it copies (D12-B22).

export const RETENTION_OPERATIONS = ['delete', 'anonymize'] as const;
export type RetentionDataClass =
  | 'sync.term_data'
  | 'verification.term_data'
  | 'projection.term_data'
  | 'absence.term_data'
  | 'corrections.term_data'
  | 'reports.term_data'
  | 'clock.term_data'
  | 'attendance.term_data'
  | 'rosters.term_data'
  | 'identity.person_link';

type RetentionClass = {
  readonly dataClass: RetentionDataClass;
  readonly module: MigrationToken;
  readonly start: 'unit_term_lock' | 'last_unit_term_lock';
  readonly before: readonly RetentionDataClass[];
  readonly copySource?: RetentionDataClass;
};

const termData = (
  module: MigrationToken,
  before: readonly RetentionDataClass[] = [],
  copySource?: RetentionDataClass,
): RetentionClass => ({
  dataClass: `${module}.term_data` as RetentionDataClass,
  module,
  start: 'unit_term_lock',
  before,
  ...(copySource === undefined ? {} : { copySource }),
});

export const RETENTION_DATA_CLASSES: readonly RetentionClass[] = [
  termData('sync', ['attendance.term_data']),
  termData('verification', ['attendance.term_data']),
  termData('projection', ['attendance.term_data']),
  termData('absence', ['attendance.term_data', 'rosters.term_data'], 'rosters.term_data'),
  termData('corrections', ['attendance.term_data', 'rosters.term_data']),
  termData('reports', ['rosters.term_data'], 'rosters.term_data'),
  termData('clock'),
  termData('attendance'),
  termData('rosters'),
  {
    dataClass: 'identity.person_link',
    module: 'identity',
    start: 'last_unit_term_lock',
    before: [],
  },
];

// Table markers, the schema test's list (D12-B11): client_id:<column> (the phone makes the
// UUID, no uuidv7() default), append_only (the application roles may not DELETE or UPDATE
// the table) or append_only:<columns> (UPDATE of those columns only, comma-separated),
// term_partitionable (every unique key carries the term id), single_row (a one-row table
// with smallint id 1), unindexed_ok:<constraint> (a foreign key accepted without an index).
// A table enters the list when its module creates it.
export const TABLE_MARKER_KINDS = [
  'client_id',
  'append_only',
  'term_partitionable',
  'single_row',
  'unindexed_ok',
] as const;
export type TableMarker =
  | 'append_only'
  | 'term_partitionable'
  | 'single_row'
  | `${'client_id' | 'append_only' | 'unindexed_ok'}:${string}`;
// The form of a marker: a kind, with the column, columns or constraint it names.
export const TABLE_MARKER_FORM =
  /^(append_only|term_partitionable|single_row|client_id:[a-z][a-z0-9_]*|append_only:[a-z][a-z0-9_]*(,[a-z][a-z0-9_]*)*|unindexed_ok:[a-z][a-z0-9_]*)$/;
export const TABLE_MARKERS: Readonly<Record<string, readonly TableMarker[]>> = {
  restore_records: ['append_only'],
  retention_runs: ['append_only'],
};

// Migration folders are '<14-digit UTC>_<token>_<description>'; the token of each module
// is its name with dashes as underscores.
type Token<M extends string> = M extends `${infer Head}-${infer Tail}`
  ? `${Head}_${Token<Tail>}`
  : M;
export type MigrationToken = Token<ModuleName>;
export const MIGRATION_TOKENS = Object.fromEntries(
  MODULES.map((module) => [module, module.replaceAll('-', '_')]),
) as { readonly [M in ModuleName]: Token<M> };

// The status file one machine job writes after each run (I083). lastSuccessAt changes only
// on a success and is carried over otherwise; consecutiveSkipped grows by one on a skip
// and is 0 after any other result; a failure or a skip names its code, a success none.
// The file comes from our own job, not from a client, so an unknown field is refused.
export const BACKUP_JOBS = [
  'nightly_pg_dump',
  'xprem_volume_backup',
  'pgbackrest_full_backup',
  'pgbackrest_diff_backup',
  'pgbackrest_verify',
  'restore_trial',
] as const;
export const BACKUP_RESULTS = ['succeeded', 'failed', 'skipped'] as const;

const DATABASE_ERROR_CODE_LIST = nonEmpty(Object.keys(DATABASE_ERROR_CODES) as DatabaseErrorCode[]);
export const backupJobStatusSchema = z
  .strictObject({
    format: z.literal(1),
    job: z.enum(BACKUP_JOBS),
    lastRunAt: instantSchema,
    lastResult: z.enum(BACKUP_RESULTS),
    lastSuccessAt: instantSchema.nullable(),
    consecutiveSkipped: countSchema,
    errorCode: z.enum(DATABASE_ERROR_CODE_LIST).nullable(),
  })
  .refine((status) => status.lastResult !== 'succeeded' || status.lastSuccessAt !== null, {
    message: 'A success sets lastSuccessAt',
    path: ['lastSuccessAt'],
  })
  .refine((status) => (status.lastResult === 'skipped') === status.consecutiveSkipped > 0, {
    message: 'Only a skip counts in consecutiveSkipped',
    path: ['consecutiveSkipped'],
  })
  .refine((status) => (status.lastResult === 'succeeded') === (status.errorCode === null), {
    message: 'A failure or a skip names its code, a success none',
    path: ['errorCode'],
  });
export type BackupJobStatus = z.infer<typeof backupJobStatusSchema>;
