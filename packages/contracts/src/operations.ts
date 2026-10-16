// Operations contract (D15): the health, status and screen time routes, the OPERATIONS_
// catalog and the phone countSchema item's reasons, the phone countSchema body, the status files
// the machine jobs write, the secret file forms, and the operations catalogs: screen
// kinds, countSchema names, alert kinds, check inputs, thresholds, the screen time cap, the
// secret log fields, the counted log events and the secret matrix. Files our own jobs
// write are strict; request and item bodies drop unknown fields.

import { BASE64_32_BYTES, KEY_ID } from '@iu-attendance/core/shared/formats';
import { idKey } from '@iu-attendance/core/shared/uuid';
import { z } from 'zod';
import { httpsUrlSchema, PLATFORMS } from './api.ts';
import { BACKUP_JOBS } from './database.ts';
import {
  ANONYMOUS_ACCESS,
  clientIdSchema,
  countSchema,
  dateSchema,
  defineErrorCodes,
  defineRoute,
  durationMsSchema,
  idSchema,
  instantSchema,
  OPERATIONAL_CODE,
  runtimeVersionSchema,
  sameText,
  sessionAccess,
  UUID_LENGTH,
  versionSchema,
} from './shared/index.ts';

// Error catalog. Five codes answer HTTP; the process codes have no status and no text.

// A shutting down or not ready copy: the proxy takes it out and asks again soon.
const SOON = { fixed: 5 } as const;
const notReady = {
  http: 503,
  ...sameText(
    'Sunucu henüz hazır değil; birazdan yeniden denenecek.',
    'The server is not ready yet; it will be retried shortly.',
  ),
  retry: SOON,
} as const;

export const OPERATIONS_ERROR_CODES = defineErrorCodes('operations', {
  OPERATIONS_SHUTTING_DOWN: {
    http: 503,
    ...sameText(
      'Sunucu yeniden başlıyor; birazdan yeniden denenecek.',
      'The server is restarting; it will be retried shortly.',
    ),
    retry: SOON,
  },
  OPERATIONS_NOT_READY_DATABASE: notReady,
  OPERATIONS_NOT_READY_SCHEMA: notReady,
  OPERATIONS_DAY_OUT_OF_RANGE: {
    http: 400,
    ...sameText(
      'Ekran süreleri bugün ya da son iki hafta için gönderilebilir.',
      'Screen times can be sent for today or the last two weeks.',
    ),
  },
  OPERATIONS_DURATION_INVALID: {
    http: 400,
    ...sameText(
      'Ekran süreleri geçersiz ya da o günün sınırını aşıyor.',
      "The screen times are not valid or exceed the day's limit.",
    ),
  },
  OPERATIONS_SETTINGS_INVALID: OPERATIONAL_CODE,
  OPERATIONS_SETTINGS_NOT_LOADED: OPERATIONAL_CODE,
  OPERATIONS_SETTINGS_ALREADY_LOADED: OPERATIONAL_CODE,
  OPERATIONS_TIME_ZONE: OPERATIONAL_CODE,
  OPERATIONS_PRESSURE_MEMORY_LIMIT: OPERATIONAL_CODE,
  OPERATIONS_SECRET_KEY_MISSING: OPERATIONAL_CODE,
  OPERATIONS_ALERT_INVALID: OPERATIONAL_CODE,
  OPERATIONS_LOAD_SEED_FORBIDDEN: OPERATIONAL_CODE,
  OPERATIONS_SCHEMA_BEHIND: OPERATIONAL_CODE,
});

export type OperationsErrorCode = keyof typeof OPERATIONS_ERROR_CODES;
// A route's error list, checked against the catalog when it compiles.
const errors = (...codes: OperationsErrorCode[]) => codes;

// The reasons a phone countSchema item is refused; item results, outside the HTTP catalog.
export const OPERATIONS_ITEM_REASONS = [
  'OPERATIONS_COUNTER_BODY_INVALID',
  'OPERATIONS_COUNTER_DAY_INVALID',
  'OPERATIONS_COUNTER_ROLE_INVALID',
] as const;

// Screen times. A value is the day's running total per session and screen; the panel
// sends at most every five minutes and once more when the page hides, under the UUIDv7
// it made at its first start and keeps in local storage.

export const SCREEN_KINDS = [
  'HEAD_COUNT',
  'SESSION_HELD',
  'SELF_DECLARED_APPROVAL',
  'CONFIRMATION_APPROVAL',
  'REVIEW',
  'ISSUE_REPORT',
] as const;
export type ScreenKind = (typeof SCREEN_KINDS)[number];
const isScreenKind = (kind: string): kind is ScreenKind =>
  (SCREEN_KINDS as readonly string[]).includes(kind);
// Per person and day: rows, and distinct sources (browsers and phone installations).
export const SCREEN_TIME_CAP = { rows: 500, sources: 5 } as const;
const SECONDS_IN_DAY = 86_400;
const secondsSchema = z.number().int().min(1).max(SECONDS_IN_DAY);
// The panel and the phone name a session the same way. D15 types it with D13's
// kimlikSemasi, which the spec leaves to either form; this takes every version, as D15's
// row does, so one odd id cannot cost the phone its whole counter body. The courses
// contract's own session ids are UUIDv7 only.
const sessionIdSchema = idSchema('Session');

// A repeated (session, screen) pair, a total over a day and the cap are the handler's
// OPERATIONS_DURATION_INVALID, so they are not schema rules here.
export const screenTimesRequestSchema = z.object({
  clientId: clientIdSchema,
  // An Istanbul day, from today back to fourteen days ago.
  day: dateSchema,
  durations: z
    .array(
      z.object({
        sessionId: sessionIdSchema,
        screenKind: z.enum(SCREEN_KINDS),
        seconds: secondsSchema,
      }),
    )
    .min(1)
    .max(200),
});
export type ScreenTimesRequest = z.infer<typeof screenTimesRequestSchema>;
export const screenTimesAnswerSchema = z.object({
  // Rows added or raised; an equal or smaller value changes nothing.
  saved: countSchema,
});

/** The advisory lock key of a person's screen time cap on a day, layer 1. */
export function screenCapKey(personId: string, day: string): string {
  return `operations:screen_cap:${idKey(personId)}:${day}`;
}

// The phone countSchema item body, format 1. The phone sends a day unless isDaySkippable says
// it may skip it, yet at least one package a week; on a screen with several sessions the
// time splits evenly; a screen untouched for sixty seconds stops counting.

export const COUNTER_NAMES = [
  'unsentRecords',
  'failedAttempts',
  'nativeModuleCrashes',
  'internalCounterReadErrors',
  'unknownResults',
  'notificationPermission',
] as const;
const COUNT_MAX = 1_000_000;
const phoneCountSchema = z.number().int().min(0).max(COUNT_MAX);
const positiveCountSchema = z.number().int().min(1).max(COUNT_MAX);

export const phoneCounterBodySchema = z.object({
  format: z.literal(1),
  // The Istanbul day the numbers belong to.
  day: dateSchema,
  platform: z.enum(PLATFORMS),
  appVersion: versionSchema,
  runtimeVersion: runtimeVersionSchema.nullable(),
  updateId: z.uuid().max(UUID_LENGTH).nullable(),
  // An unknown countSchema name is dropped; the handler counts the drop.
  counters: z.object({
    unsentRecords: phoneCountSchema.optional(),
    failedAttempts: phoneCountSchema.optional(),
    nativeModuleCrashes: phoneCountSchema.optional(),
    internalCounterReadErrors: phoneCountSchema.optional(),
    unknownResults: phoneCountSchema.optional(),
    notificationPermission: z.boolean().optional(),
  }),
  screenErrors: z
    .array(
      z.object({
        kind: z.enum(['ERROR_BOUNDARY', 'GENERAL']),
        screen: z
          .string()
          .max(48)
          .regex(/^[a-z][a-z0-9_]*$/),
        count: positiveCountSchema,
      }),
    )
    .max(100),
  rejections: z
    .array(
      z.object({
        http: z.number().int().min(400).max(599),
        code: z
          .string()
          .max(64)
          .regex(/^[A-Z][A-Z0-9_]*$/)
          .nullable(),
        count: positiveCountSchema,
      }),
    )
    .max(50),
  // Staff only. A screen kind this server does not know is dropped, the rest kept.
  screenTimes: z
    .array(
      z.object({
        sessionId: sessionIdSchema,
        screenKind: z.string().max(32),
        seconds: secondsSchema,
      }),
    )
    .max(200)
    .transform((entries) =>
      entries.flatMap(({ screenKind, ...entry }) =>
        isScreenKind(screenKind) ? [{ ...entry, screenKind }] : [],
      ),
    ),
});
export type PhoneCounterBody = z.infer<typeof phoneCounterBodySchema>;

/**
 * True when the phone may skip the day: every countSchema is zero and no screen error,
 * rejection or screen time came. The notification permission does not count.
 */
export function isDaySkippable(body: PhoneCounterBody): boolean {
  const { notificationPermission: _permission, ...counts } = body.counters;
  return (
    Object.values(counts).every((count) => count === undefined || count === 0) &&
    body.screenErrors.length === 0 &&
    body.rejections.length === 0 &&
    body.screenTimes.length === 0
  );
}

// Routes. The health routes and the status route are outside the /v1/<module> prefix and
// read nothing but the process and, for readiness, the database.

export const OPERATIONS_ROUTES = {
  live: defineRoute({
    module: 'operations',
    name: 'live',
    method: 'GET',
    path: '/health/live',
    ...ANONYMOUS_ACCESS,
    pressureExempt: true,
    clockAttestation: false,
    request: {},
    response: { statuses: [204], schema: null },
    errors: errors('OPERATIONS_SHUTTING_DOWN'),
    summary: 'The process is alive and not shutting down.',
  }),
  ready: defineRoute({
    module: 'operations',
    name: 'ready',
    method: 'GET',
    path: '/health/ready',
    ...ANONYMOUS_ACCESS,
    pressureExempt: false,
    request: {},
    response: { statuses: [204], schema: null },
    errors: errors(
      'OPERATIONS_SHUTTING_DOWN',
      'OPERATIONS_NOT_READY_DATABASE',
      'OPERATIONS_NOT_READY_SCHEMA',
    ),
    summary: 'The database answers, holds the newest migration and its generation is certain.',
  }),
  status: defineRoute({
    module: 'operations',
    name: 'status',
    method: 'GET',
    path: '/v1/status',
    ...ANONYMOUS_ACCESS,
    pressureExempt: true,
    clockAttestation: false,
    request: {},
    response: { statuses: [204], schema: null },
    errors: errors('OPERATIONS_SHUTTING_DOWN'),
    summary: 'The public status check: name, certificate, proxy and process in one call.',
  }),
  saveScreenTimes: defineRoute({
    module: 'operations',
    name: 'saveScreenTimes',
    method: 'POST',
    path: '/v1/operations/screen-times',
    ...sessionAccess('staff'),
    // The largest valid body is about 20 KB.
    bodyLimit: 32_768,
    pressureExempt: false,
    clockAttestation: false,
    request: { body: screenTimesRequestSchema },
    response: { statuses: [200], schema: screenTimesAnswerSchema },
    errors: errors('OPERATIONS_DAY_OUT_OF_RANGE', 'OPERATIONS_DURATION_INVALID'),
    summary: "Saves the panel's running screen times of a day.",
  }),
};

// Status files: the only way between the machine and the containers, each written to a
// temporary file and renamed.

// /status/clock/chrony.json, every thirty seconds.
export const chronyStatusSchema = z.strictObject({
  format: z.literal(1),
  measuredAt: instantSchema,
  synced: z.boolean(),
  offsetMs: durationMsSchema,
  stratum: z.number().int().min(1).max(16).nullable(),
  source: z.string().max(64).nullable(),
  lastBrokenAt: instantSchema.nullable(),
});

// /status/machine/machine.json, format 2.
export const machineStatusSchema = z.strictObject({
  format: z.literal(2),
  measuredAt: instantSchema,
  eventWindow: z.strictObject({ start: instantSchema, end: instantSchema }),
  disks: z
    .array(
      z.strictObject({
        mount: z.string().min(1).max(512),
        totalBytes: countSchema,
        usedBytes: countSchema,
      }),
    )
    .max(64),
  memory: z.strictObject({ totalBytes: countSchema, availableBytes: countSchema }),
  containers: z
    .array(
      z.strictObject({
        service: z.string().min(1).max(64),
        containerId: z.string().min(1).max(128),
        state: z.string().min(1).max(32),
        health: z.string().max(32).nullable(),
        restartCount: countSchema,
        // Within the same container id.
        restartIncrease: countSchema,
        // docker events oom in the window, each event counted once.
        oomIncrease: countSchema,
        startedAt: instantSchema,
      }),
    )
    .max(64),
});

// /status/machine/maintenance.json: written while a release runs, removed on every exit.
export const MAINTENANCE_MAX_MS = 45 * 60_000;
export const maintenanceFileSchema = z
  .strictObject({
    format: z.literal(1),
    version: versionSchema,
    startedAt: instantSchema,
    validUntil: instantSchema,
  })
  .refine(
    ({ startedAt, validUntil }) => {
      const length = Date.parse(validUntil) - Date.parse(startedAt);
      return length > 0 && length <= MAINTENANCE_MAX_MS;
    },
    { message: 'Valid for at most forty-five minutes from its start', path: ['validUntil'] },
  );

// /status/api/<copy>.json, every minute: the last fifteen minutes. Health and status
// calls are not counted.
export const MEASURED_LOG_EVENTS = ['verification.evidence_rejected'] as const;
// Submission time buckets: up to each bound, and one more above the last.
export const SUBMISSION_BUCKET_BOUNDS_MS = [
  25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 10_000, 20_000,
] as const;
export const apiMeasurementFileSchema = z.strictObject({
  format: z.literal(1),
  copy: z.string().min(1).max(64),
  writtenAt: instantSchema,
  minutes: z
    .array(
      z.strictObject({
        minute: instantSchema,
        total: countSchema,
        // 5xx answers other than 503.
        serverErrors: countSchema,
        unavailable: countSchema,
        rateLimited: countSchema,
        submissions: z.strictObject({
          count: countSchema,
          buckets: z.array(countSchema).length(SUBMISSION_BUCKET_BOUNDS_MS.length + 1),
        }),
        logEvents: z
          .array(
            z.strictObject({
              event: z.enum(MEASURED_LOG_EVENTS),
              platform: z.string().max(32).nullable(),
              purpose: z.string().max(64).nullable(),
              reason: z.string().max(64).nullable(),
              count: countSchema,
            }),
          )
          .max(200),
      }),
    )
    .max(15),
});

// Secrets. A key set file keeps one to four keys of a purpose: exactly one active, the
// active kid named, at most one ready for the next rotation.
export const SECRET_KEY_PURPOSES = [
  'clock_document',
  'qr_key_source',
  'sign_in_code_digest',
  'email_digest',
  'arrival_receipt',
] as const;
export const SECRET_KEY_STATUSES = ['READY', 'ACTIVE', 'VERIFY_ONLY', 'COMPROMISED'] as const;

export const secretKeyFileSchema = z
  .strictObject({
    format: z.literal(1),
    purpose: z.enum(SECRET_KEY_PURPOSES),
    activeKid: z.string().max(8).regex(KEY_ID),
    keys: z
      .array(
        z
          .strictObject({
            kid: z.string().max(8).regex(KEY_ID),
            value: z.string().max(44).regex(BASE64_32_BYTES),
            status: z.enum(SECRET_KEY_STATUSES),
            createdAt: instantSchema,
            retiredAt: instantSchema.optional(),
            compromisedAt: instantSchema.optional(),
          })
          .refine((key) => (key.status === 'COMPROMISED') === (key.compromisedAt !== undefined), {
            message: 'A compromised key, and only it, has compromisedAt',
            path: ['compromisedAt'],
          })
          // A key in use or about to be is not retired.
          .refine(
            (key) => key.retiredAt === undefined || !['ACTIVE', 'READY'].includes(key.status),
            { message: 'An active or ready key has no retiredAt', path: ['retiredAt'] },
          ),
      )
      .min(1)
      .max(4),
  })
  .refine(
    ({ activeKid, keys }) => {
      const active = keys.filter((key) => key.status === 'ACTIVE');
      return active.length === 1 && active[0]?.kid === activeKid;
    },
    { message: 'Exactly one active key, named by activeKid', path: ['activeKid'] },
  )
  .refine(({ keys }) => keys.filter((key) => key.status === 'READY').length <= 1, {
    message: 'At most one ready key',
    path: ['keys'],
  })
  .refine(({ keys }) => new Set(keys.map((key) => key.kid)).size === keys.length, {
    message: 'Each kid once',
    path: ['keys'],
  });

// The heartbeat secret: where the worker reports that all is well, and where a problem.
export const heartbeatSecretSchema = z.strictObject({
  normalUrl: httpsUrlSchema,
  problemUrl: httpsUrlSchema.nullable(),
});

// Which Compose service each secret is bound to; the settings loader's required list per
// process and the Compose test import it.
export const SERVICES = ['api', 'worker', 'migration', 'xprem'] as const;
export type Service = (typeof SERVICES)[number];
export const SECRET_MATRIX = {
  clock_document: ['api', 'worker'],
  qr_key_source: ['api', 'worker'],
  sign_in_code_digest: ['api'],
  email_digest: ['api', 'worker'],
  arrival_receipt: ['api'],
  review_fixed_code: ['api', 'worker'],
  smtp_password: ['api', 'worker'],
  heartbeat: ['worker'],
  attendance_api_password: ['api', 'migration'],
  attendance_worker_password: ['worker', 'migration'],
  attendance_retention_password: ['worker', 'migration'],
  attendance_migration_password: ['migration'],
  postgres_password: ['migration'],
  xprem_password: ['migration', 'xprem'],
  xprem_master_key: ['xprem'],
} as const satisfies Readonly<Record<string, readonly Service[]>>;

// The key names the log formatter writes as [gizli] at any depth, besides the redact paths
// and the names the composition root adds.
export const OPERATIONS_SECRET_FIELDS = [
  'password',
  'secret',
  'token',
  'normalUrl',
  'problemUrl',
] as const;

// Alerts. Each kind: its levels, how it closes (CONDITION: its evaluator read its input
// and found the condition false; SILENCE: no new event for a while), the job that
// evaluates it and the input it reads. The thresholds are in OPERATIONS_THRESHOLDS.

export const OPERATIONS_INPUTS = [
  'job_health',
  'pg_system',
  'phone_counters',
  'measurement_record_loss',
  'certificate',
  'machine',
  'clock',
  'maintenance',
  'api_measurement',
  ...BACKUP_JOBS.map((job) => `backup:${job}` as const),
] as const;

type AlertLevel = 'WARNING' | 'CRITICAL';
type AlertKind = {
  readonly levels: readonly AlertLevel[];
  readonly closes: 'CONDITION' | 'SILENCE';
  readonly evaluator: 'operations_check' | 'certificate_expiry_check' | 'reading_job';
  readonly inputs: readonly string[];
};
const kind = (
  levels: readonly AlertLevel[],
  closes: AlertKind['closes'],
  inputs: readonly string[],
  evaluator: AlertKind['evaluator'] = 'operations_check',
): AlertKind => ({ levels, closes, evaluator, inputs });
const WARNING = ['WARNING'] as const;
const CRITICAL = ['CRITICAL'] as const;
const BOTH = ['WARNING', 'CRITICAL'] as const;
const BACKUP = ['backup:*'];
// Kinds other modules open through the alert call close by silence.
// The caller gives the level, WARNING when it gives none.
const called = kind(BOTH, 'SILENCE', ['alert_call']);

export const ALERT_KINDS = {
  'operations.disk_usage': kind(BOTH, 'CONDITION', ['machine']),
  'operations.memory_low': kind(WARNING, 'CONDITION', ['machine']),
  'operations.container_restarted': kind(WARNING, 'SILENCE', ['machine']),
  'operations.container_out_of_memory': kind(CRITICAL, 'SILENCE', ['machine']),
  'operations.container_not_running': kind(CRITICAL, 'CONDITION', ['machine', 'maintenance']),
  'operations.machine_check_silent': kind(WARNING, 'CONDITION', ['machine']),
  'operations.clock_sync': kind(CRITICAL, 'CONDITION', ['clock']),
  'operations.wal_archive': kind(BOTH, 'CONDITION', ['pg_system']),
  'operations.connection_count': kind(BOTH, 'CONDITION', ['pg_system']),
  'operations.backup_failed': kind(CRITICAL, 'CONDITION', BACKUP),
  'operations.backup_stale': kind(BOTH, 'CONDITION', BACKUP),
  'operations.backup_skipped': kind(WARNING, 'CONDITION', BACKUP),
  'operations.backup_status_unreadable': kind(WARNING, 'CONDITION', BACKUP),
  'operations.pgboss_schema': kind(CRITICAL, 'CONDITION', ['job_health']),
  'operations.dead_letter': kind(WARNING, 'CONDITION', ['job_health']),
  'operations.job_silent': kind(BOTH, 'CONDITION', ['job_health']),
  'operations.queue_backlog': kind(WARNING, 'CONDITION', ['job_health']),
  'operations.email_failed': kind(CRITICAL, 'CONDITION', ['job_health']),
  'operations.email_unfinished': kind(WARNING, 'CONDITION', ['job_health']),
  'operations.email_daily_limit': kind(WARNING, 'CONDITION', ['job_health']),
  'operations.absence_consistency_gap': kind(WARNING, 'CONDITION', ['job_health']),
  'operations.api_5xx': kind(WARNING, 'CONDITION', ['api_measurement']),
  'operations.api_503': kind(WARNING, 'CONDITION', ['api_measurement']),
  'operations.submission_slow': kind(WARNING, 'CONDITION', ['api_measurement']),
  'operations.evidence_rejections': kind(WARNING, 'CONDITION', ['api_measurement']),
  'operations.api_measurement_missing': kind(WARNING, 'CONDITION', [
    'api_measurement',
    'maintenance',
  ]),
  'operations.certificate_expiring': kind(
    BOTH,
    'CONDITION',
    ['certificate'],
    'certificate_expiry_check',
  ),
  'operations.certificate_invalid': kind(
    CRITICAL,
    'CONDITION',
    ['certificate'],
    'certificate_expiry_check',
  ),
  // Keyed by the input name; the job that reads the input closes it.
  'operations.check_input': kind(BOTH, 'CONDITION', ['*'], 'reading_job'),
  'operations.new_rejection_code': kind(WARNING, 'SILENCE', ['phone_counters']),
  'operations.receipted_record_returned': kind(WARNING, 'SILENCE', ['measurement_record_loss']),
  'clock.window_not_closed': called,
  // Examples of other modules' kinds.
  'verification.revocation_list_stale': called,
  'verification.app_attest_renewal_frequent': called,
  'verification.faulty_version_loaded_late': called,
  'identity.review_setting_missing': called,
} as const satisfies Readonly<Record<string, AlertKind>>;

export type AlertKindName = keyof typeof ALERT_KINDS;

// Alert thresholds: code, not environment variables; rules and tests import them.
export const OPERATIONS_THRESHOLDS = {
  diskWarningPercent: 80,
  diskCriticalPercent: 90,
  memoryAvailableMinPercent: 10,
  connectionWarning: 80,
  connectionCritical: 90,
  walArchiveStaleMinutes: 60,
  machineFileMaxAgeMinutes: 25,
  clockBrokenRecentMinutes: 10,
  jobSilentFactor: 2,
  jobSilentGraceSeconds: 600,
  jobSilentCriticalIntervalSeconds: 900,
  queueOldestWaitingSeconds: 900,
  emailConsecutiveFailures: 3,
  backupConsecutiveSkips: 2,
  emailDailyLimitShare: 0.8,
  // The API measurement rules count over the last ten minutes.
  apiWindowMinutes: 10,
  api5xxInWindow: 20,
  api503SharePercent: 5,
  api503MinTotal: 200,
  submissionP95Ms: 2000,
  submissionMinCount: 100,
  evidenceRejectionsInWindow: 10,
  apiMeasurementMaxAgeMinutes: 5,
  certificateWarningDaysAcme: 14,
  certificateWarningDaysManual: 30,
  certificateCriticalDays: 7,
  checkInputCriticalRepeat: 3,
  newRejectionCodeLookbackDays: 28,
} as const satisfies Readonly<Record<string, number>>;

// Backup age thresholds by job: critical after hours, a warning after days.
export const BACKUP_THRESHOLDS = {
  nightly_pg_dump: { criticalHours: 26 },
  xprem_volume_backup: { criticalHours: 26 },
  // The newest of the full and the differential backups.
  pgbackrest: { criticalHours: 26 },
  pgbackrest_full_backup: { warningDays: 8 },
  pgbackrest_verify: { warningDays: 8 },
  restore_trial: { warningDays: 36 },
} as const satisfies Readonly<
  Record<string, { readonly criticalHours?: number; readonly warningDays?: number }>
>;
