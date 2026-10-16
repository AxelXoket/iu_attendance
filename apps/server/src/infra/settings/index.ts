import { isDeepStrictEqual } from 'node:util';
import type { OperationsErrorCode } from '@iu-attendance/contracts/operations';
import { projectionSettingsSchema } from '@iu-attendance/contracts/projection';
import { AppError } from '@iu-attendance/contracts/shared';
import { log } from '../monitoring/index.ts';
import { readMemoryLimit } from './cgroup.ts';
import { checkEnvironment, type Process, settingValues } from './schema.ts';
import {
  keySetDigest,
  type LoadedSecrets,
  readSecrets,
  type SecretKey,
  type SecretKeyPurpose,
  type SecretKeySet,
} from './secret-files.ts';
import { SecretValue } from './secret-value.ts';

// The process's settings (D15): loaded once at start-up by the composition roots and the
// test world, from the environment and the secret files, then frozen. Domain modules get
// their settings as parameters from the composition root; settings() is for commands,
// jobs and the test world. A new key set takes effect only with a restart.

export { CLOCK_SYNC_DEFAULTS, PROCESSES, type Process } from './schema.ts';
export type { SecretKey, SecretKeyPurpose, SecretKeySet } from './secret-files.ts';
export { SecretValue } from './secret-value.ts';

/**
 * A settings problem. Unlike other app errors its message lists the names at fault after
 * the code, never a value: the start-up writes the message to stderr and exits with 78.
 */
export class SettingsError extends AppError {
  readonly names: readonly string[];

  constructor(code: OperationsErrorCode, names: readonly string[] = [], cause?: unknown) {
    super(code, { cause });
    this.name = 'SettingsError';
    this.names = names;
    this.message = names.length === 0 ? code : `${code}: ${names.join(', ')}`;
  }
}

export type LoadOptions = Readonly<{
  process: Process;
  /** The environment variables; process.env when not given. */
  env?: Readonly<Record<string, string | undefined>>;
  /** SECRETS_DIR, else its default, when not given. */
  secretsDir?: string;
  /** cgroup v2 memory.max; tests point it at a fake file. */
  memoryMaxPath?: string;
}>;

// The process runs in UTC by name: a zone that only happens to be at offset 0 is refused.
const UTC_ZONES = ['UTC', 'Etc/UTC'];

// The two logins with a derived connection address; it carries the password, so it is
// secret.
const DATABASE_LOGINS = {
  worker: { role: 'attendance_worker', secret: 'attendance_worker_password' },
  migration: { role: 'attendance_migration', secret: 'attendance_migration_password' },
} as const;

type DeepReadonly<T> = T extends SecretValue
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

// Freezes the settings all the way down, the secret wrappers included.
function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value === 'object' && value !== null) {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

function memoryLimitOf(path: string | undefined): number | null {
  try {
    return readMemoryLimit(path);
  } catch (cause) {
    throw new SettingsError('OPERATIONS_SETTINGS_INVALID', ['memory.max'], cause);
  }
}

function build(options: LoadOptions) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!UTC_ZONES.includes(zone)) throw new SettingsError('OPERATIONS_TIME_ZONE');
  const kind = options.process;
  const check = checkEnvironment(kind, options.env ?? process.env);
  if (!check.ok) throw new SettingsError('OPERATIONS_SETTINGS_INVALID', check.names);
  const memoryLimit = kind === 'api' ? memoryLimitOf(options.memoryMaxPath) : null;
  const values = settingValues(kind, check.environment, check.values, memoryLimit);
  if (memoryLimit !== null && values.api.pressure.memoryBytes >= memoryLimit) {
    throw new SettingsError('OPERATIONS_PRESSURE_MEMORY_LIMIT', ['PRESSURE_MEMORY_BYTES']);
  }
  const secretsDir = options.secretsDir ?? values.general.secretsDir;
  const read = readSecrets(secretsDir, kind, values.email.smtpUser !== null);
  if (read.problems.length > 0) {
    throw new SettingsError('OPERATIONS_SETTINGS_INVALID', [...read.problems].sort());
  }
  const { secrets } = read;
  const connectionUrl = (login: keyof typeof DATABASE_LOGINS) => {
    const password = secrets.values[DATABASE_LOGINS[login].secret];
    if (password === undefined) return null;
    const { host, port, name } = values.database;
    const user = DATABASE_LOGINS[login].role;
    return new SecretValue(
      `postgres://${user}:${encodeURIComponent(password.reveal())}@${host}:${port}/${name}`,
    );
  };
  const settings = deepFreeze({
    ...values,
    general: { ...values.general, secretsDir },
    database: {
      ...values.database,
      workerConnectionUrl: connectionUrl('worker'),
      migrationConnectionUrl: connectionUrl('migration'),
      // The other logins' passwords this process reads.
      passwords: {
        api: secrets.values.attendance_api_password ?? null,
        retention: secrets.values.attendance_retention_password ?? null,
        postgres: secrets.values.postgres_password ?? null,
        xprem: secrets.values.xprem_password ?? null,
      },
    },
    email: { ...values.email, smtpPassword: secrets.values.smtp_password ?? null },
    identity: {
      ...values.identity,
      // The API reads the value; the worker only learns whether the file is there.
      reviewFixedCode: secrets.values.review_fixed_code ?? null,
      reviewFixedCodePresent: secrets.reviewFixedCodePresent,
    },
    operations: { ...values.operations, heartbeat: secrets.heartbeat },
    projection: projectionSettingsSchema.parse({}),
  });
  return { settings, secrets };
}

export type Settings = ReturnType<typeof build>['settings'];

// The options as compared: plain values only, the environment as a plain copy without
// unset variables, so that passing process.env twice is the same load.
const comparable = ({ process: kind, env, secretsDir, memoryMaxPath }: LoadOptions) => ({
  kind,
  env:
    env === undefined
      ? null
      : Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined)),
  secretsDir: secretsDir ?? null,
  memoryMaxPath: memoryMaxPath ?? null,
});

let loaded: {
  readonly key: ReturnType<typeof comparable>;
  readonly settings: Settings;
  readonly secrets: LoadedSecrets;
} | null = null;

/**
 * Loads, checks and freezes the settings once. A second call with the same options gives
 * the same object; with other options it throws OPERATIONS_SETTINGS_ALREADY_LOADED.
 */
export function loadSettings(options: LoadOptions): Settings {
  const key = comparable(options);
  if (loaded !== null) {
    if (isDeepStrictEqual(loaded.key, key)) return loaded.settings;
    throw new SettingsError('OPERATIONS_SETTINGS_ALREADY_LOADED');
  }
  const { settings, secrets } = build(options);
  loaded = { key, settings, secrets };
  for (const [purpose, set] of secrets.keySets) {
    log.info({ event: 'operations.keys_loaded', purpose, setDigest: keySetDigest(set) });
  }
  return settings;
}

/** The loaded settings; throws OPERATIONS_SETTINGS_NOT_LOADED before loadSettings. */
export function settings(): Settings {
  if (loaded === null) throw new SettingsError('OPERATIONS_SETTINGS_NOT_LOADED');
  return loaded.settings;
}

/** Forgets the loaded settings, in the test environment only: a running process never does. */
export function unloadSettings(): void {
  if (loaded !== null && loaded.settings.general.environment !== 'test') {
    throw new SettingsError('OPERATIONS_SETTINGS_ALREADY_LOADED');
  }
  loaded = null;
}

function keySetOf(purpose: SecretKeyPurpose): SecretKeySet {
  const set = loaded?.secrets.keySets.get(purpose);
  if (set === undefined) throw new SettingsError('OPERATIONS_SECRET_KEY_MISSING', [purpose]);
  return set;
}

const copyOf = (key: SecretKey): SecretKey =>
  Object.freeze({
    ...key,
    value: key.value.slice(),
    compromisedAt: key.compromisedAt === null ? null : new Date(key.compromisedAt),
  });

/**
 * Without a kid, the purpose's one active key, never a ready one; with a kid, that key
 * whatever its status, or null. Each call gives a copy. A purpose this process did not
 * load throws OPERATIONS_SECRET_KEY_MISSING.
 */
export function secretKey(purpose: SecretKeyPurpose): SecretKey;
export function secretKey(purpose: SecretKeyPurpose, kid: string): SecretKey | null;
export function secretKey(purpose: SecretKeyPurpose, kid?: string): SecretKey | null {
  const set = keySetOf(purpose);
  const key = set.keys.find((candidate) => candidate.kid === (kid ?? set.activeKid));
  if (key !== undefined) return copyOf(key);
  // The key file schema keeps the active kid among the keys, so this is a broken load.
  if (kid === undefined) throw new SettingsError('OPERATIONS_SECRET_KEY_MISSING', [purpose]);
  return null;
}

/** Every key of a purpose, as copies, with the active kid. */
export function secretKeySet(purpose: SecretKeyPurpose): SecretKeySet {
  const set = keySetOf(purpose);
  return Object.freeze({ activeKid: set.activeKid, keys: Object.freeze(set.keys.map(copyOf)) });
}
