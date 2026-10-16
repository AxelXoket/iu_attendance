import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { SECRET_MATRIX } from '@iu-attendance/contracts/operations';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BYTE_ORDER_MARK,
  DATABASE_HOST,
  envFor,
  memoryMaxFile,
  removeDir,
  secretsDirFor,
} from '../../../test/support/settings.ts';
import { readMemoryLimit } from './cgroup.ts';
import {
  type LoadOptions,
  loadSettings,
  type Process,
  SettingsError,
  secretKey,
  settings,
  unloadSettings,
} from './index.ts';
import {
  CLOCK_SYNC_CLOSE_INTERVALS,
  CLOCK_SYNC_DEFAULTS,
  checkEnvironment,
  POOL_SIZE_BY_PROCESS,
  POOL_WAIT_MS_BY_PROCESS,
  PRESSURE_MEMORY_DEFAULT_BYTES,
  SETTING_DEFAULTS,
  settingValues,
} from './schema.ts';
import { requiredSecretsOf, type SecretName } from './secret-files.ts';

const dirs: string[] = [];
afterEach(() => {
  unloadSettings();
  for (const dir of dirs.splice(0)) removeDir(dir);
});
const kept = (dir: string) => {
  dirs.push(dir);
  return dir;
};

function memoryAt(text: string): string {
  const file = memoryMaxFile(text);
  kept(file.dir);
  return file.path;
}

function load(
  kind: Process,
  patch: Record<string, string | undefined> = {},
  skip: SecretName[] = [],
) {
  return loadSettings({
    process: kind,
    env: envFor(patch),
    secretsDir: kept(secretsDirFor(kind, skip)),
    memoryMaxPath: memoryAt('max'),
  });
}

function failure(run: () => unknown): SettingsError {
  try {
    run();
  } catch (error) {
    if (error instanceof SettingsError) return error;
    throw error;
  }
  throw new Error('expected a settings error');
}

describe('settings schema', () => {
  it('refuses a missing and a broken setting by name, never by value', () => {
    const error = failure(() => load('api', { PANEL_ORIGIN: undefined, EMAIL_SMTP_PORT: 'abc' }));
    expect(error.code).toBe('OPERATIONS_SETTINGS_INVALID');
    expect(error.names).toEqual(['EMAIL_SMTP_PORT', 'PANEL_ORIGIN']);
    expect(error.message).toBe('OPERATIONS_SETTINGS_INVALID: EMAIL_SMTP_PORT, PANEL_ORIGIN');
    // Ground control: the values were there to leak.
    expect(envFor()).toMatchObject({ DATABASE_HOST });
    for (const value of [DATABASE_HOST, 'abc', 'https://panel.example.edu']) {
      expect(error.message).not.toContain(value);
      expect(JSON.stringify(error)).not.toContain(value);
    }
  });

  it('opens with every default and freezes the settings all the way down', () => {
    const loaded = load('api');
    expect(loaded.general).toMatchObject({ environment: 'test', instanceName: 'api' });
    expect(loaded.api).toMatchObject({ port: SETTING_DEFAULTS.apiPort, shutdownGraceMs: 0 });
    expect(loaded.api.pressure.memoryBytes).toBe(PRESSURE_MEMORY_DEFAULT_BYTES);
    expect(loaded.database).toMatchObject({
      host: DATABASE_HOST,
      poolSize: POOL_SIZE_BY_PROCESS.api,
      poolWaitMs: POOL_WAIT_MS_BY_PROCESS.api,
    });
    expect(loaded.clock).toEqual({
      syncThresholdMs: CLOCK_SYNC_DEFAULTS.thresholdMs,
      syncFileAgeMs: CLOCK_SYNC_DEFAULTS.fileAgeMs,
      syncCheckIntervalMs: CLOCK_SYNC_DEFAULTS.checkIntervalMs,
      syncCloseThresholdMs: CLOCK_SYNC_DEFAULTS.closeThresholdMs,
    });
    expect(loaded.general.statusDir).toBe(SETTING_DEFAULTS.statusDir);
    expect(loaded.projection).toBeDefined();
    expect(settings()).toBe(loaded);
    // Frozen at run time, and read-only for the compiler.
    expect(() => {
      (loaded.api.pressure as { memoryBytes: number }).memoryBytes = 1;
    }).toThrow(TypeError);
    expect(() => (loaded.verification.androidSigningDigests as string[]).push('x')).toThrow(
      TypeError,
    );
    const typeOnly = () => {
      // @ts-expect-error: the settings are read-only
      loaded.api.port = 1;
    };
    expect(typeOnly).toBeTypeOf('function');
    // An empty value counts as absent, so the default applies.
    unloadSettings();
    expect(load('api', { LOG_LEVEL: '' }).general.logLevel).toBe('info');
    unloadSettings();
    expect(load('worker').database).toMatchObject({
      poolSize: POOL_SIZE_BY_PROCESS.worker,
      poolWaitMs: POOL_WAIT_MS_BY_PROCESS.worker,
    });
  });

  it("holds the spec's defaults, the paths the containers and the scripts share among them", () => {
    // The spec's default column (D15), under the English names of the name map.
    expect(SETTING_DEFAULTS).toEqual({
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
      correctionsBatchSize: 20,
      certificateKind: 'acme',
      caddyAddress: 'caddy:443',
      stagingRootsFile: '/app/src/infra/monitoring/le-staging-roots.pem',
    });
    expect(POOL_SIZE_BY_PROCESS).toEqual({ api: 20, worker: 3, migration: 2, cli: 1 });
  });

  it('reads numbers as plain digits, lists split on commas and host names in any case', () => {
    for (const port of ['0x50', '8e1', ' 80', '-1', '65536']) {
      expect(checkEnvironment('api', envFor({ API_PORT: port })), port).toEqual({
        ok: false,
        names: ['API_PORT'],
      });
    }
    // Ground control: plain digits pass.
    expect(checkEnvironment('api', envFor({ API_PORT: '8080' })).ok).toBe(true);
    const loaded = load('api', {
      ANDROID_SIGNING_DIGESTS: `${'A'.repeat(64)}, ${'b'.repeat(64)}`,
      DATABASE_HOST: 'DB.Example.EDU',
    });
    expect(loaded.verification.androidSigningDigests).toEqual(['a'.repeat(64), 'b'.repeat(64)]);
    expect(loaded.database.host).toBe('db.example.edu');
    // The domain name is written in lower case, and a port in an address stays a port.
    const refused = {
      DOMAIN_NAME: 'Yoklama.Example.edu',
      PANEL_ORIGIN: 'https://panel.example.edu:70000',
      OPERATIONS_CADDY_ADDRESS: 'caddy:0',
    };
    for (const [name, value] of Object.entries(refused)) {
      expect(checkEnvironment('api', envFor({ [name]: value })), name).toEqual({
        ok: false,
        names: [name],
      });
    }
    const accepted = {
      PANEL_ORIGIN: 'https://panel.example.edu:8443',
      OPERATIONS_CADDY_ADDRESS: 'caddy:443',
    };
    expect(checkEnvironment('api', envFor(accepted)).ok).toBe(true);
  });

  it('caps the pool wait of the yoklama_api processes, the API and the command line, at 2000', () => {
    // The spec's defaults (D15, with D12's cap for the yoklama_api role).
    expect(POOL_WAIT_MS_BY_PROCESS).toEqual({
      api: 2_000,
      worker: 30_000,
      migration: 30_000,
      cli: 2_000,
    });
    const over = { DATABASE_POOL_WAIT_MS: '2001' };
    const at = { DATABASE_POOL_WAIT_MS: '2000' };
    for (const kind of ['api', 'cli'] as const) {
      expect(checkEnvironment(kind, envFor(over)), kind).toEqual({
        ok: false,
        names: ['DATABASE_POOL_WAIT_MS'],
      });
      expect(checkEnvironment(kind, envFor(at)).ok, kind).toBe(true);
    }
    // Ground control: the processes with their own logins take a longer wait.
    expect(checkEnvironment('worker', envFor(over)).ok).toBe(true);
    expect(checkEnvironment('migration', envFor({ DATABASE_POOL_WAIT_MS: '60000' })).ok).toBe(true);
  });

  it('refuses relative paths, blank texts, a repeated recipient and a database name that is not plain', () => {
    const refused = {
      SECRETS_DIR: 'relative/dir',
      STATUS_DIR: 'relative/dir',
      RELEASE_INFO_PATH: 'release-info.json',
      OPERATIONS_CERTIFICATE_ROOTS_FILE: 'roots.pem',
      REVIEW_LECTURER_NAME: '   ',
      DATABASE_NAME: 'attendance?host=evil.example',
      OPERATIONS_ALERT_RECIPIENTS: 'ops@example.edu, ops@example.edu',
      APP_ENVIRONMENT: 'prod',
      REVIEW_STUDENT_NUMBER: '12345678',
    };
    for (const [name, value] of Object.entries(refused)) {
      expect(checkEnvironment('api', envFor({ [name]: value })), name).toEqual({
        ok: false,
        names: [name],
      });
    }
    // Ground control: the same variables written well pass.
    const written = {
      STATUS_DIR: resolve('status'),
      DATABASE_NAME: 'attendance_test',
      OPERATIONS_ALERT_RECIPIENTS: 'ops@example.edu, it@example.edu',
      REVIEW_LECTURER_NAME: ' Ada ',
    };
    expect(checkEnvironment('api', envFor(written)).ok).toBe(true);
  });

  it("refuses a variable under the spec's Turkish name instead of dropping it", () => {
    const turkish = { EPOSTA_SMTP_KULLANICI: 'mailer', DURUM_DIZINI: '/durum' };
    expect(checkEnvironment('api', envFor(turkish))).toEqual({
      ok: false,
      names: ['DURUM_DIZINI', 'EPOSTA_SMTP_KULLANICI'],
    });
    // API_PORT is the same in both, and an empty variable is unset.
    expect(checkEnvironment('api', envFor({ API_PORT: '3000', LOG_DUZEYI: '' })).ok).toBe(true);
  });

  it('reads the secrets from SECRETS_DIR, and from .secrets in development', () => {
    const secretsDir = kept(secretsDirFor('cli'));
    const loaded = loadSettings({ process: 'cli', env: envFor({ SECRETS_DIR: secretsDir }) });
    expect(loaded.general.secretsDir).toBe(secretsDir);
    expect(settingValues('cli', 'development', {}, null).general.secretsDir).toBe(
      resolve('.secrets'),
    );
    expect(settingValues('cli', 'test', {}, null).general.secretsDir).toBe(
      SETTING_DEFAULTS.secretsDir,
    );
  });

  it('loads once: the same options give the same object, other options are refused', () => {
    unloadSettings();
    expect(failure(() => settings()).code).toBe('OPERATIONS_SETTINGS_NOT_LOADED');
    const secretsDir = kept(secretsDirFor('cli'));
    // An environment record without the plain object prototype, as process.env is.
    const bare = () => Object.assign(Object.create(null), envFor()) as Record<string, string>;
    const options: LoadOptions = { process: 'cli', env: bare(), secretsDir };
    const first = loadSettings(options);
    expect(loadSettings({ ...options, env: bare() })).toBe(first);
    // An unset variable is no variable.
    expect(loadSettings({ ...options, env: { ...bare(), UNSET: undefined } })).toBe(first);
    const others: Partial<LoadOptions>[] = [
      { process: 'migration' },
      { secretsDir: kept(secretsDirFor('cli')) },
      { env: envFor({ LOG_LEVEL: 'warn' }) },
      { memoryMaxPath: memoryAt('max') },
    ];
    for (const other of others) {
      expect(failure(() => loadSettings({ ...options, ...other })).code).toBe(
        'OPERATIONS_SETTINGS_ALREADY_LOADED',
      );
    }
  });

  it('never forgets the settings outside the test environment', async () => {
    vi.resetModules();
    const fresh: typeof import('./index.ts') = await import('./index.ts');
    fresh.loadSettings({
      process: 'cli',
      env: envFor({ APP_ENVIRONMENT: 'development' }),
      secretsDir: kept(secretsDirFor('cli')),
    });
    expect(() => fresh.unloadSettings()).toThrow(fresh.SettingsError);
    expect(fresh.settings().general.environment).toBe('development');
  });

  it('asks more of a live environment', () => {
    const live = { APP_ENVIRONMENT: 'production' };
    expect(checkEnvironment('api', envFor(live))).toEqual({
      ok: false,
      names: ['INSTANCE_NAME', 'TRUSTED_PROXY_ADDRESS'],
    });
    expect(checkEnvironment('worker', envFor(live))).toEqual({
      ok: false,
      names: ['OPERATIONS_ALERT_RECIPIENTS'],
    });
    // Staging is live too, and serves the panel over https only.
    const staging = { APP_ENVIRONMENT: 'staging', PANEL_ORIGIN: 'http://panel.example.edu' };
    expect(checkEnvironment('api', envFor(staging))).toEqual({
      ok: false,
      names: ['INSTANCE_NAME', 'PANEL_ORIGIN', 'TRUSTED_PROXY_ADDRESS'],
    });
    // http, no SMTP security and private roots only where they are safe.
    const loose = {
      PANEL_ORIGIN: 'http://localhost:5173',
      EMAIL_SMTP_SECURITY: 'none',
      OPERATIONS_CERTIFICATE_ROOTS_FILE: '/app/roots.pem',
    };
    expect(checkEnvironment('api', envFor({ ...loose, APP_ENVIRONMENT: 'development' })).ok).toBe(
      true,
    );
    expect(checkEnvironment('api', envFor({ EMAIL_SMTP_SECURITY: 'none' })).ok).toBe(true);
    expect(checkEnvironment('api', envFor({ ...live, ...loose }))).toMatchObject({
      names: expect.arrayContaining([
        'EMAIL_SMTP_SECURITY',
        'OPERATIONS_CERTIFICATE_ROOTS_FILE',
        'PANEL_ORIGIN',
      ]),
    });
    expect(checkEnvironment('api', envFor({ APP_ENVIRONMENT: undefined }))).toEqual({
      ok: false,
      names: ['APP_ENVIRONMENT'],
    });
  });

  it('keeps the sync outage open for at least three check intervals', () => {
    const at = (interval: number, close: number) => () =>
      load('api', {
        CLOCK_SYNC_CHECK_INTERVAL_MS: String(interval),
        CLOCK_SYNC_CLOSE_THRESHOLD_MS: String(close),
      });
    const interval = CLOCK_SYNC_DEFAULTS.checkIntervalMs;
    const least = CLOCK_SYNC_CLOSE_INTERVALS * interval;
    const error = failure(at(interval, least - 1));
    expect(error.code).toBe('OPERATIONS_SETTINGS_INVALID');
    expect(error.message).toBe(
      'OPERATIONS_SETTINGS_INVALID: CLOCK_SYNC_CHECK_INTERVAL_MS, CLOCK_SYNC_CLOSE_THRESHOLD_MS',
    );
    expect(at(interval, least)().clock.syncCloseThresholdMs).toBe(least);
    unloadSettings();
    expect(failure(at(interval + 1000, least)).code).toBe('OPERATIONS_SETTINGS_INVALID');
    // One side given, the other from its default.
    const both = ['CLOCK_SYNC_CHECK_INTERVAL_MS', 'CLOCK_SYNC_CLOSE_THRESHOLD_MS'];
    const alone = (name: string, value: number) =>
      failure(() => load('api', { [name]: String(value) }));
    expect(alone('CLOCK_SYNC_CHECK_INTERVAL_MS', interval + 1000).names).toEqual(both);
    expect(alone('CLOCK_SYNC_CLOSE_THRESHOLD_MS', least - 1).names).toEqual(both);
  });
});

describe('the memory pressure threshold', () => {
  const withLimit = (limit: string, memory?: string) =>
    loadSettings({
      process: 'api',
      env: envFor({ PRESSURE_MEMORY_BYTES: memory }),
      secretsDir: kept(secretsDirFor('api')),
      memoryMaxPath: memoryAt(limit),
    });

  it('stays below the container limit, at 85 percent of it by default', () => {
    const error = failure(() => withLimit('1073741824', '1073741824'));
    expect([error.code, error.names]).toEqual([
      'OPERATIONS_PRESSURE_MEMORY_LIMIT',
      ['PRESSURE_MEMORY_BYTES'],
    ]);
    expect(withLimit('1073741824', '912680550').api.pressure.memoryBytes).toBe(912_680_550);
    unloadSettings();
    expect(withLimit('1073741824').api.pressure.memoryBytes).toBe(912_680_550);
    unloadSettings();
    expect(withLimit('max').api.pressure.memoryBytes).toBe(PRESSURE_MEMORY_DEFAULT_BYTES);
  });

  it('reads no limit from a missing file, and refuses one it cannot read', () => {
    const dir = kept(mkdtempSync(join(tmpdir(), 'iu-cgroup-')));
    expect(readMemoryLimit(join(dir, 'absent'))).toBeNull();
    // A directory where the file should be cannot be read.
    expect(() => readMemoryLimit(dir)).toThrow();
    const path = memoryAt('12x');
    expect(() => readMemoryLimit(path)).toThrow('cgroup memory limit unreadable');
    expect(() => readMemoryLimit(memoryAt('maximum'))).toThrow('cgroup memory limit unreadable');
    const error = failure(() => withLimit('12x'));
    expect([error.code, error.names]).toEqual(['OPERATIONS_SETTINGS_INVALID', ['memory.max']]);
    writeFileSync(path, '1073741824\n');
    expect(readMemoryLimit(path)).toBe(1_073_741_824);
  });
});

describe('the secrets a process needs', () => {
  it('follow the secret matrix: every required file is needed, one by one', () => {
    // A command runs with the migration service's secrets.
    const service = { api: 'api', worker: 'worker', migration: 'migration', cli: 'migration' };
    for (const kind of ['api', 'worker', 'migration', 'cli'] as const) {
      const fromMatrix = Object.entries(SECRET_MATRIX)
        .filter(([, services]) => (services as readonly string[]).includes(service[kind]))
        .map(([name]) => name as SecretName)
        .filter((name) => name !== 'smtp_password')
        .filter((name) => !(kind === 'worker' && name === 'review_fixed_code'));
      expect(requiredSecretsOf(kind, false), kind).toEqual(fromMatrix);
      for (const name of fromMatrix) {
        unloadSettings();
        const error = failure(() => load(kind, {}, [name]));
        expect([error.code, error.names], `${kind} ${name}`).toEqual([
          'OPERATIONS_SETTINGS_INVALID',
          [name],
        ]);
      }
      // Ground control: with every file the process starts.
      unloadSettings();
      expect(load(kind).general.process).toBe(kind);
    }
    expect(requiredSecretsOf('api', false)).toEqual([
      'clock_document',
      'qr_key_source',
      'sign_in_code_digest',
      'email_digest',
      'arrival_receipt',
      'review_fixed_code',
      'attendance_api_password',
    ]);
    expect(requiredSecretsOf('api', true)).toContain('smtp_password');
  });

  it('give the worker no sign-in or receipt key, and no review code value', () => {
    const loaded = load('worker');
    for (const purpose of ['sign_in_code_digest', 'arrival_receipt'] as const) {
      expect(failure(() => secretKey(purpose)).code, purpose).toBe('OPERATIONS_SECRET_KEY_MISSING');
    }
    expect(secretKey('clock_document').kid).toBe('k1');
    expect(loaded.identity.reviewFixedCodePresent).toBe(true);
    expect(loaded.identity.reviewFixedCode).toBeNull();
    expect(JSON.stringify(loaded)).not.toContain('review_fixed_code-value');
    unloadSettings();
    expect(load('worker', {}, ['review_fixed_code']).identity.reviewFixedCodePresent).toBe(false);
    // The API reads the value, behind its wrapper.
    unloadSettings();
    const api = load('api');
    expect(api.identity.reviewFixedCode?.reveal()).toBe('review_fixed_code-value');
    expect(JSON.stringify(api)).not.toContain('review_fixed_code-value');
  });

  it('keep both the API and the worker closed without the SMTP server', () => {
    for (const kind of ['api', 'worker'] as const) {
      unloadSettings();
      const error = failure(() => load(kind, { EMAIL_SMTP_HOST: undefined }));
      expect([error.code, error.names], kind).toEqual([
        'OPERATIONS_SETTINGS_INVALID',
        ['EMAIL_SMTP_HOST'],
      ]);
    }
  });

  it('need the SMTP password only with an SMTP user, though Compose always binds its file', () => {
    for (const kind of ['api', 'worker'] as const) {
      unloadSettings();
      const secretsDir = kept(secretsDirFor(kind));
      writeFileSync(join(secretsDir, 'smtp_password'), '\n');
      const open = { process: kind, env: envFor(), secretsDir } as const;
      expect(loadSettings(open).email.smtpPassword, kind).toBeNull();
      unloadSettings();
      const withUser = { ...open, env: envFor({ EMAIL_SMTP_USER: 'mailer' }) };
      expect(failure(() => loadSettings(withUser)).names, kind).toEqual(['smtp_password']);
    }
    // Ground control: a written password is read for a user.
    unloadSettings();
    expect(load('api', { EMAIL_SMTP_USER: 'mailer' }).email.smtpPassword?.reveal()).toBe(
      'smtp_password-value',
    );
  });

  it('build the worker and migration connection addresses behind the secret wrapper', () => {
    const worker = load('worker');
    expect(worker.database.workerConnectionUrl?.reveal()).toBe(
      `postgres://attendance_worker:attendance_worker_password-value@${DATABASE_HOST}:5432/attendance`,
    );
    expect(worker.database.migrationConnectionUrl).toBeNull();
    expect(JSON.stringify(worker)).not.toContain('attendance_worker_password-value');
    // The wrappers are frozen with the rest: none can be made to print its value.
    const heartbeat = worker.operations.heartbeat;
    expect(heartbeat).not.toBeNull();
    expect(Object.isFrozen(heartbeat?.normalUrl)).toBe(true);
    expect(Object.isFrozen(worker.database.workerConnectionUrl)).toBe(true);
  });

  it('encode a password that holds address characters, and drop a byte order mark', () => {
    const secretsDir = kept(secretsDirFor('migration'));
    const password = `${BYTE_ORDER_MARK}p@ss/w:rd?\r\n`;
    writeFileSync(join(secretsDir, 'attendance_migration_password'), password);
    const loaded = loadSettings({ process: 'migration', env: envFor(), secretsDir });
    expect(loaded.database.migrationConnectionUrl?.reveal()).toBe(
      `postgres://attendance_migration:p%40ss%2Fw%3Ard%3F@${DATABASE_HOST}:5432/attendance`,
    );
  });

  it('refuse an empty required secret file', () => {
    const secretsDir = kept(secretsDirFor('worker'));
    writeFileSync(join(secretsDir, 'attendance_worker_password'), '\r\n');
    const error = failure(() => loadSettings({ process: 'worker', env: envFor(), secretsDir }));
    expect(error.names).toEqual(['attendance_worker_password']);
  });
});

describe('the process time zone', () => {
  const settingsUrl = new URL('./index.ts', import.meta.url).href;
  const run = (zone: string, secretsDir: string) => {
    const script = `
      const { loadSettings } = await import(${JSON.stringify(settingsUrl)});
      try {
        loadSettings({
          process: 'cli',
          env: { APP_ENVIRONMENT: 'test' },
          secretsDir: ${JSON.stringify(secretsDir)},
        });
        console.log('OPEN');
      } catch (error) {
        console.log(error.code);
      }`;
    const child = spawnSync(
      process.execPath,
      ['--conditions=source', '--input-type=module', '--eval', script],
      { env: { ...process.env, TZ: zone }, encoding: 'utf8', windowsHide: true },
    );
    // The child imported and ran: a failed import prints nothing and must not pass.
    expect(child.status, child.stderr).toBe(0);
    return child.stdout.trim().split('\n').at(-1);
  };

  it('is UTC by name: a zone at offset 0 is not enough', () => {
    const secretsDir = kept(secretsDirFor('cli'));
    expect(run('Europe/Istanbul', secretsDir)).toBe('OPERATIONS_TIME_ZONE');
    // London is at offset 0 in January, Abidjan and Reykjavik all year; none is UTC.
    for (const zone of ['Europe/London', 'Africa/Abidjan', 'Atlantic/Reykjavik']) {
      expect(run(zone, secretsDir), zone).toBe('OPERATIONS_TIME_ZONE');
    }
    expect(run('UTC', secretsDir)).toBe('OPEN');
    expect(run('Etc/UTC', secretsDir)).toBe('OPEN');
  }, 60_000);
});
