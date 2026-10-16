import { isAbsolute, resolve } from 'node:path';
import { httpsUrlSchema } from '@iu-attendance/contracts/api';
import { studentNumberSchema } from '@iu-attendance/contracts/shared';
import type { CountBase } from '@iu-attendance/core/absence/types';
import { CORRECTIONS_BATCH_SIZE } from '@iu-attendance/core/corrections/batch';
import { z } from 'zod';

// The settings schema (D15): 47 environment variables read once at start-up. Values are
// text in the environment; each given one is checked here, and a broken one keeps the
// process from starting. Any variable may be absent: then its default applies, or REQUIRED
// says which process cannot start without it in which environment. A problem names the
// variable only, never its value. Thresholds and lists are code in the operations
// contract, not settings.

export const PROCESSES = ['api', 'worker', 'migration', 'cli'] as const;
export type Process = (typeof PROCESSES)[number];

const ENVIRONMENTS = ['development', 'test', 'staging', 'production'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

/** The clock sync settings' defaults; the clock module's tests import them (I018). */
export const CLOCK_SYNC_DEFAULTS = {
  thresholdMs: 100,
  fileAgeMs: 120_000,
  checkIntervalMs: 5_000,
  closeThresholdMs: 15_000,
} as const;

/** The sync outage closes only after at least this many check intervals. */
export const CLOCK_SYNC_CLOSE_INTERVALS = 3;

/** The API's memory pressure threshold where the container has no memory limit: 2 GiB. */
export const PRESSURE_MEMORY_DEFAULT_BYTES = 2 * 1024 ** 3;

// Under a memory limit the threshold defaults to this share of it, in per mille.
const PRESSURE_MEMORY_DEFAULT_PER_MILLE = 850;

/** The defaults that do not depend on the process or the environment. */
export const SETTING_DEFAULTS = {
  statusDir: '/status',
  secretsDir: '/run/secrets',
  apiPort: 3000,
  apiListenAddress: '0.0.0.0',
  releaseInfoPath: '/app/release-info.json',
  eventLoopDelayMs: 1000,
  eventLoopUtilizationPerMille: 980,
  shutdownGraceMs: 6000,
  databaseHost: 'postgres',
  databasePort: 5432,
  databaseName: 'attendance',
  smtpPort: 587,
  smtpSecurity: 'starttls',
  revocationListUrl: 'https://android.googleapis.com/attestation/status',
  countBase: 'HELD',
  correctionsBatchSize: CORRECTIONS_BATCH_SIZE,
  certificateKind: 'acme',
  caddyAddress: 'caddy:443',
  // The Let's Encrypt staging roots the image carries (D15-P10) for staging's certificate.
  stagingRootsFile: '/app/src/infra/monitoring/le-staging-roots.pem',
} as const;

export const POOL_SIZE_BY_PROCESS = {
  api: 20,
  worker: 3,
  migration: 2,
  cli: 1,
} as const satisfies Record<Process, number>;
// The API and the command line connect as yoklama_api (D15-B06), whose pool wait D12 caps
// at 2000 ms: it is part of the API's 20 s request budget (D12-B07).
const API_ROLE_POOL_WAIT_MAX_MS = 2_000;
const API_ROLE_PROCESSES: readonly Process[] = ['api', 'cli'];
export const POOL_WAIT_MS_BY_PROCESS = {
  api: API_ROLE_POOL_WAIT_MAX_MS,
  worker: 30_000,
  migration: 30_000,
  cli: API_ROLE_POOL_WAIT_MAX_MS,
} as const satisfies Record<Process, number>;

// Value shapes. Environment values are text; numbers are plain digits, whole and bounded.
const whole = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,16}$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
const port = whole(1, 65_535);
const inPortRange = (text: string) => {
  const digits = /:(\d+)$/.exec(text)?.[1];
  return digits === undefined || (Number(digits) >= 1 && Number(digits) <= 65_535);
};
const path = z.string().refine(isAbsolute, { message: 'an absolute path' });
const LOWER_HOST = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
// A host name is read in any case and kept in lower case; the domain name is written so.
const hostName = z
  .string()
  .max(253)
  .transform((host) => host.toLowerCase())
  .pipe(z.string().regex(LOWER_HOST));
const text = (max: number) => z.string().min(1).max(max).regex(/\S/);
const list = (item: z.ZodType<string, string>, max: number) =>
  z
    .string()
    .transform((value) => value.split(',').map((part) => part.trim()))
    .pipe(
      z
        .array(item)
        .min(1)
        .max(max)
        .refine((items) => new Set(items).size === items.length, { message: 'each item once' }),
    );

const SETTINGS_SCHEMA = z.object({
  APP_ENVIRONMENT: z.enum(ENVIRONMENTS),
  INSTANCE_NAME: z.string().regex(/^[a-z0-9-]{1,32}$/),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
  SECRETS_DIR: path,
  STATUS_DIR: path,
  DOMAIN_NAME: z.string().max(253).regex(LOWER_HOST),
  // An origin, no path; http only in development.
  PANEL_ORIGIN: z
    .string()
    .regex(/^https?:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?$/)
    .refine(inPortRange),
  API_PORT: port,
  API_LISTEN_ADDRESS: z.ipv4(),
  TRUSTED_PROXY_ADDRESS: z.ipv4(),
  RELEASE_INFO_PATH: path,
  PRESSURE_EVENT_LOOP_DELAY_MS: whole(10, 10_000),
  PRESSURE_EVENT_LOOP_UTILIZATION_PER_MILLE: whole(1, 1000),
  PRESSURE_MEMORY_BYTES: whole(1, Number.MAX_SAFE_INTEGER),
  SHUTDOWN_GRACE_MS: whole(0, 20_000),
  DATABASE_HOST: hostName,
  DATABASE_PORT: port,
  // A plain identifier: it goes into the connection address as it is.
  DATABASE_NAME: z.string().regex(/^[a-z_][a-z0-9_]{0,62}$/),
  DATABASE_POOL_SIZE: whole(1, 50),
  DATABASE_POOL_WAIT_MS: whole(100, 60_000),
  EMAIL_SMTP_HOST: hostName,
  EMAIL_SMTP_PORT: port,
  EMAIL_SMTP_SECURITY: z.enum(['tls', 'starttls', 'none']),
  EMAIL_SMTP_USER: text(254),
  EMAIL_FROM_ADDRESS: z.email(),
  EMAIL_FROM_NAME: text(80),
  EMAIL_PRODUCT_NAME: text(40),
  EMAIL_DAILY_LIMIT: whole(1, 100_000),
  REVIEW_LECTURER_EMAIL: z.email(),
  REVIEW_LECTURER_NAME: text(80),
  REVIEW_STUDENT_NUMBER: studentNumberSchema,
  REVIEW_STUDENT_NAME: text(80),
  CLOCK_SYNC_THRESHOLD_MS: whole(1, 5_000),
  CLOCK_SYNC_FILE_AGE_MS: whole(30_000, 600_000),
  CLOCK_SYNC_CHECK_INTERVAL_MS: whole(1_000, 60_000),
  CLOCK_SYNC_CLOSE_THRESHOLD_MS: whole(3_000, 600_000),
  ANDROID_PACKAGE_NAME: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/),
  // The app signing certificates' SHA-256 digests, 64 hex digits each, kept in lower case.
  ANDROID_SIGNING_DIGESTS: list(
    z
      .string()
      .regex(/^[0-9A-Fa-f]{64}$/)
      .transform((digest) => digest.toLowerCase()),
    10,
  ),
  APP_ATTEST_APP_ID: z.string().regex(/^[A-Z0-9]{10}[.][A-Za-z0-9.-]+$/),
  REVOCATION_LIST_URL: httpsUrlSchema,
  // The first release counts on held sessions only; PLANNED waits for the plan's decision.
  ABSENCE_COUNT_BASE: z.enum(['HELD'] as const satisfies readonly CountBase[]),
  CORRECTIONS_BATCH_SIZE: whole(1, 200),
  STAGE2_QR_ENABLED: z.enum(['true', 'false']).transform((value) => value === 'true'),
  OPERATIONS_ALERT_RECIPIENTS: list(z.email(), 5),
  OPERATIONS_CERTIFICATE_KIND: z.enum(['acme', 'manual']),
  OPERATIONS_CADDY_ADDRESS: z
    .string()
    .regex(/^[a-z0-9.-]+:\d{1,5}$/)
    .refine(inPortRange),
  OPERATIONS_CERTIFICATE_ROOTS_FILE: path,
});

type SettingName = keyof typeof SETTINGS_SCHEMA.shape;

// The spec's names of the variables (D15, in Turkish). The documents use them until they
// are translated; a process given one of them refuses to start and names it, so a setting
// written as the documents say is never dropped in silence.
const SPEC_NAMES = {
  APP_ENVIRONMENT: 'ISLETIM_ORTAM',
  INSTANCE_NAME: 'ISLETIM_KOPYA_ADI',
  LOG_LEVEL: 'LOG_DUZEYI',
  SECRETS_DIR: 'GIZLI_DIZIN',
  STATUS_DIR: 'DURUM_DIZINI',
  DOMAIN_NAME: 'ALAN_ADI',
  PANEL_ORIGIN: 'PANEL_ADRESI',
  API_PORT: 'API_PORT',
  API_LISTEN_ADDRESS: 'API_DINLEME_ADRESI',
  TRUSTED_PROXY_ADDRESS: 'GUVENILEN_VEKIL_ADRESI',
  RELEASE_INFO_PATH: 'YAYIN_BILGISI_YOLU',
  PRESSURE_EVENT_LOOP_DELAY_MS: 'BASKI_OLAY_DONGUSU_GECIKMESI_MS',
  PRESSURE_EVENT_LOOP_UTILIZATION_PER_MILLE: 'BASKI_OLAY_DONGUSU_KULLANIMI_BINDE',
  PRESSURE_MEMORY_BYTES: 'BASKI_BELLEK_BAYT',
  SHUTDOWN_GRACE_MS: 'KAPANIS_ONCESI_BEKLEME_MS',
  DATABASE_HOST: 'VERITABANI_SUNUCU',
  DATABASE_PORT: 'VERITABANI_PORT',
  DATABASE_NAME: 'VERITABANI_ADI',
  DATABASE_POOL_SIZE: 'VERITABANI_HAVUZ_BOYUTU',
  DATABASE_POOL_WAIT_MS: 'VERITABANI_HAVUZ_BEKLEME_MS',
  EMAIL_SMTP_HOST: 'EPOSTA_SMTP_SUNUCU',
  EMAIL_SMTP_PORT: 'EPOSTA_SMTP_PORT',
  EMAIL_SMTP_SECURITY: 'EPOSTA_SMTP_GUVENLIK',
  EMAIL_SMTP_USER: 'EPOSTA_SMTP_KULLANICI',
  EMAIL_FROM_ADDRESS: 'EPOSTA_GONDEREN_ADRES',
  EMAIL_FROM_NAME: 'EPOSTA_GONDEREN_AD',
  EMAIL_PRODUCT_NAME: 'EPOSTA_URUN_ADI',
  EMAIL_DAILY_LIMIT: 'EPOSTA_GUNLUK_SINIR',
  REVIEW_LECTURER_EMAIL: 'INCELEME_HOCA_ADRESI',
  REVIEW_LECTURER_NAME: 'INCELEME_HOCA_ADI',
  REVIEW_STUDENT_NUMBER: 'INCELEME_OGRENCI_NO',
  REVIEW_STUDENT_NAME: 'INCELEME_OGRENCI_ADI',
  CLOCK_SYNC_THRESHOLD_MS: 'SAAT_ESITLEME_ESIK_MS',
  CLOCK_SYNC_FILE_AGE_MS: 'SAAT_ESITLEME_DOSYA_YASI_MS',
  CLOCK_SYNC_CHECK_INTERVAL_MS: 'SAAT_ESITLEME_DENETIM_ARALIGI_MS',
  CLOCK_SYNC_CLOSE_THRESHOLD_MS: 'SAAT_ESITLEME_KAPANIS_ESIGI_MS',
  ANDROID_PACKAGE_NAME: 'ANDROID_PAKET_ADI',
  ANDROID_SIGNING_DIGESTS: 'ANDROID_IMZA_OZETLERI',
  APP_ATTEST_APP_ID: 'APP_ATTEST_UYGULAMA_KIMLIGI',
  REVOCATION_LIST_URL: 'IPTAL_LISTESI_ADRESI',
  ABSENCE_COUNT_BASE: 'DEVAM_SAYIM_TABANI',
  CORRECTIONS_BATCH_SIZE: 'DUZELTMELER_PARTI_BOYU',
  STAGE2_QR_ENABLED: 'ASAMA2_QR_ACIK',
  OPERATIONS_ALERT_RECIPIENTS: 'ISLETIM_UYARI_ALICILARI',
  OPERATIONS_CERTIFICATE_KIND: 'ISLETIM_SERTIFIKA_TURU',
  OPERATIONS_CADDY_ADDRESS: 'ISLETIM_CADDY_ADRESI',
  OPERATIONS_CERTIFICATE_ROOTS_FILE: 'ISLETIM_SERTIFIKA_KOK_DOSYASI',
} as const satisfies Record<SettingName, string>;
const SPEC_ONLY_NAMES = Object.values(SPEC_NAMES).filter(
  (name) => !(name in SETTINGS_SCHEMA.shape),
);
type ParsedEnvironment = Partial<z.infer<typeof SETTINGS_SCHEMA>>;

const live = (environment: Environment) =>
  environment === 'production' || environment === 'staging';
const apiOrWorker = (kind: Process) => kind === 'api' || kind === 'worker';

// Who cannot start without a variable that has no default.
const REQUIRED: Readonly<
  Partial<Record<SettingName, (kind: Process, environment: Environment) => boolean>>
> = {
  INSTANCE_NAME: (kind, environment) => kind === 'api' && live(environment),
  DOMAIN_NAME: (kind) => kind === 'worker',
  PANEL_ORIGIN: (kind) => kind === 'api',
  TRUSTED_PROXY_ADDRESS: (kind, environment) => kind === 'api' && live(environment),
  EMAIL_SMTP_HOST: apiOrWorker,
  EMAIL_FROM_ADDRESS: apiOrWorker,
  EMAIL_FROM_NAME: apiOrWorker,
  EMAIL_PRODUCT_NAME: apiOrWorker,
  REVIEW_LECTURER_EMAIL: apiOrWorker,
  REVIEW_LECTURER_NAME: apiOrWorker,
  REVIEW_STUDENT_NUMBER: apiOrWorker,
  REVIEW_STUDENT_NAME: apiOrWorker,
  ANDROID_PACKAGE_NAME: apiOrWorker,
  ANDROID_SIGNING_DIGESTS: apiOrWorker,
  APP_ATTEST_APP_ID: apiOrWorker,
  OPERATIONS_ALERT_RECIPIENTS: (kind, environment) => kind === 'worker' && live(environment),
};

export type EnvironmentCheck =
  | { readonly ok: true; readonly environment: Environment; readonly values: ParsedEnvironment }
  | { readonly ok: false; readonly names: readonly string[] };

/**
 * Checks the environment variables for a process: every given variable against its shape,
 * every variable the process needs, and the rules between variables. An empty value counts
 * as absent. On failure, the names of the variables at fault, sorted.
 */
export function checkEnvironment(
  kind: Process,
  env: Readonly<Record<string, string | undefined>>,
): EnvironmentCheck {
  const names = new Set<string>(
    SPEC_ONLY_NAMES.filter((name) => env[name] !== undefined && env[name] !== ''),
  );
  const parsed: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(SETTINGS_SCHEMA.shape)) {
    const value = env[name];
    if (value === undefined || value === '') continue;
    const result = schema.safeParse(value);
    if (result.success) parsed[name] = result.data;
    else names.add(name);
  }
  const values = parsed as ParsedEnvironment;
  const environment = values.APP_ENVIRONMENT;
  if (environment === undefined) {
    names.add('APP_ENVIRONMENT');
    return { ok: false, names: [...names].sort() };
  }
  for (const [name, needs] of Object.entries(REQUIRED)) {
    if (needs(kind, environment) && values[name as SettingName] === undefined) names.add(name);
  }
  const interval = values.CLOCK_SYNC_CHECK_INTERVAL_MS ?? CLOCK_SYNC_DEFAULTS.checkIntervalMs;
  const close = values.CLOCK_SYNC_CLOSE_THRESHOLD_MS ?? CLOCK_SYNC_DEFAULTS.closeThresholdMs;
  if (close < CLOCK_SYNC_CLOSE_INTERVALS * interval) {
    names.add('CLOCK_SYNC_CHECK_INTERVAL_MS').add('CLOCK_SYNC_CLOSE_THRESHOLD_MS');
  }
  if (
    API_ROLE_PROCESSES.includes(kind) &&
    (values.DATABASE_POOL_WAIT_MS ?? 0) > API_ROLE_POOL_WAIT_MAX_MS
  ) {
    names.add('DATABASE_POOL_WAIT_MS');
  }
  if (environment === 'production' && values.OPERATIONS_CERTIFICATE_ROOTS_FILE !== undefined) {
    names.add('OPERATIONS_CERTIFICATE_ROOTS_FILE');
  }
  const testing = environment === 'development' || environment === 'test';
  if (values.EMAIL_SMTP_SECURITY === 'none' && !testing) names.add('EMAIL_SMTP_SECURITY');
  if (values.PANEL_ORIGIN?.startsWith('http:') && environment !== 'development') {
    names.add('PANEL_ORIGIN');
  }
  if (names.size > 0) return { ok: false, names: [...names].sort() };
  return { ok: true, environment, values };
}

const defaultPressureMemoryBytes = (limitBytes: number | null) =>
  limitBytes === null
    ? PRESSURE_MEMORY_DEFAULT_BYTES
    : Math.floor((limitBytes * PRESSURE_MEMORY_DEFAULT_PER_MILLE) / 1000);

/** The values a process runs with: the checked environment over the defaults. */
export function settingValues(
  kind: Process,
  environment: Environment,
  values: ParsedEnvironment,
  memoryLimitBytes: number | null,
) {
  const D = SETTING_DEFAULTS;
  const development = environment === 'development';
  return {
    general: {
      environment,
      process: kind,
      instanceName: values.INSTANCE_NAME ?? kind,
      logLevel: values.LOG_LEVEL ?? (development ? 'debug' : 'info'),
      secretsDir: values.SECRETS_DIR ?? (development ? resolve('.secrets') : D.secretsDir),
      statusDir: values.STATUS_DIR ?? D.statusDir,
      domainName: values.DOMAIN_NAME ?? null,
      panelOrigin: values.PANEL_ORIGIN ?? null,
    },
    api: {
      port: values.API_PORT ?? D.apiPort,
      listenAddress: values.API_LISTEN_ADDRESS ?? D.apiListenAddress,
      // Without it, Fastify trusts no proxy.
      trustedProxyAddress: values.TRUSTED_PROXY_ADDRESS ?? null,
      releaseInfoPath: values.RELEASE_INFO_PATH ?? D.releaseInfoPath,
      pressure: {
        eventLoopDelayMs: values.PRESSURE_EVENT_LOOP_DELAY_MS ?? D.eventLoopDelayMs,
        eventLoopUtilizationPerMille:
          values.PRESSURE_EVENT_LOOP_UTILIZATION_PER_MILLE ?? D.eventLoopUtilizationPerMille,
        memoryBytes: values.PRESSURE_MEMORY_BYTES ?? defaultPressureMemoryBytes(memoryLimitBytes),
      },
      shutdownGraceMs: values.SHUTDOWN_GRACE_MS ?? (environment === 'test' ? 0 : D.shutdownGraceMs),
    },
    database: {
      host: values.DATABASE_HOST ?? D.databaseHost,
      port: values.DATABASE_PORT ?? D.databasePort,
      name: values.DATABASE_NAME ?? D.databaseName,
      poolSize: values.DATABASE_POOL_SIZE ?? POOL_SIZE_BY_PROCESS[kind],
      poolWaitMs: values.DATABASE_POOL_WAIT_MS ?? POOL_WAIT_MS_BY_PROCESS[kind],
    },
    email: {
      smtpHost: values.EMAIL_SMTP_HOST ?? null,
      smtpPort: values.EMAIL_SMTP_PORT ?? D.smtpPort,
      smtpSecurity: values.EMAIL_SMTP_SECURITY ?? D.smtpSecurity,
      smtpUser: values.EMAIL_SMTP_USER ?? null,
      fromAddress: values.EMAIL_FROM_ADDRESS ?? null,
      fromName: values.EMAIL_FROM_NAME ?? null,
      productName: values.EMAIL_PRODUCT_NAME ?? null,
      // null: no daily limit.
      dailyLimit: values.EMAIL_DAILY_LIMIT ?? null,
    },
    identity: {
      reviewLecturerEmail: values.REVIEW_LECTURER_EMAIL ?? null,
      reviewLecturerName: values.REVIEW_LECTURER_NAME ?? null,
      reviewStudentNumber: values.REVIEW_STUDENT_NUMBER ?? null,
      reviewStudentName: values.REVIEW_STUDENT_NAME ?? null,
    },
    clock: {
      syncThresholdMs: values.CLOCK_SYNC_THRESHOLD_MS ?? CLOCK_SYNC_DEFAULTS.thresholdMs,
      syncFileAgeMs: values.CLOCK_SYNC_FILE_AGE_MS ?? CLOCK_SYNC_DEFAULTS.fileAgeMs,
      syncCheckIntervalMs:
        values.CLOCK_SYNC_CHECK_INTERVAL_MS ?? CLOCK_SYNC_DEFAULTS.checkIntervalMs,
      syncCloseThresholdMs:
        values.CLOCK_SYNC_CLOSE_THRESHOLD_MS ?? CLOCK_SYNC_DEFAULTS.closeThresholdMs,
    },
    verification: {
      androidPackageName: values.ANDROID_PACKAGE_NAME ?? null,
      androidSigningDigests: values.ANDROID_SIGNING_DIGESTS ?? [],
      appAttestAppId: values.APP_ATTEST_APP_ID ?? null,
      revocationListUrl: values.REVOCATION_LIST_URL ?? D.revocationListUrl,
    },
    absence: { countBase: values.ABSENCE_COUNT_BASE ?? D.countBase },
    corrections: { batchSize: values.CORRECTIONS_BATCH_SIZE ?? D.correctionsBatchSize },
    stage2: { qrEnabled: values.STAGE2_QR_ENABLED ?? false },
    operations: {
      alertRecipients: values.OPERATIONS_ALERT_RECIPIENTS ?? [],
      certificateKind: values.OPERATIONS_CERTIFICATE_KIND ?? D.certificateKind,
      caddyAddress: values.OPERATIONS_CADDY_ADDRESS ?? D.caddyAddress,
      certificateRootsFile:
        values.OPERATIONS_CERTIFICATE_ROOTS_FILE ??
        (environment === 'staging' ? D.stagingRootsFile : null),
    },
  };
}
