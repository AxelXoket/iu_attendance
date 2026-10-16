import { describe, expect, it } from 'vitest';
import { advisoryLayerOf, BACKUP_JOBS } from '../database.ts';
import {
  ALERT_KINDS,
  apiMeasurementFileSchema,
  BACKUP_THRESHOLDS,
  COUNTER_NAMES,
  chronyStatusSchema,
  heartbeatSecretSchema,
  MAINTENANCE_MAX_MS,
  machineStatusSchema,
  maintenanceFileSchema,
  OPERATIONS_ERROR_CODES,
  OPERATIONS_INPUTS,
  OPERATIONS_ITEM_REASONS,
  OPERATIONS_ROUTES,
  OPERATIONS_SECRET_FIELDS,
  OPERATIONS_THRESHOLDS,
  phoneCounterBodySchema,
  SCREEN_KINDS,
  SCREEN_TIME_CAP,
  SECRET_KEY_PURPOSES,
  SECRET_MATRIX,
  SERVICES,
  SUBMISSION_BUCKET_BOUNDS_MS,
  screenCapKey,
  screenTimesAnswerSchema,
  screenTimesRequestSchema,
  secretKeyFileSchema,
} from '../operations.ts';
import type { RouteDefinition } from '../shared/index.ts';
import { id, ok } from './helpers.ts';
import { objectsIn, unknownKeys } from './schema-walk.ts';

const at = '2026-10-12T08:00:00.000Z';

describe('the operations error catalog', () => {
  it('answers five codes over HTTP, nine process codes without status, three item reasons apart', () => {
    const codes = Object.entries(OPERATIONS_ERROR_CODES);
    expect(codes).toHaveLength(14);
    const http = Object.fromEntries(
      codes.flatMap(([code, d]) =>
        d.http === null ? [] : [[code, [d.http, 'retry' in d ? d.retry : null]]],
      ),
    );
    expect(http).toEqual({
      OPERATIONS_SHUTTING_DOWN: [503, { fixed: 5 }],
      OPERATIONS_NOT_READY_DATABASE: [503, { fixed: 5 }],
      OPERATIONS_NOT_READY_SCHEMA: [503, { fixed: 5 }],
      OPERATIONS_DAY_OUT_OF_RANGE: [400, null],
      OPERATIONS_DURATION_INVALID: [400, null],
    });
    for (const [code, definition] of codes) {
      for (const text of [definition.lecturer, definition.student]) {
        if (definition.http === null) expect(text, code).toBeNull();
        else
          for (const value of Object.values(text ?? {})) expect(value, code).not.toMatch(/[0-9{}]/);
      }
    }
    expect(OPERATIONS_ITEM_REASONS).toHaveLength(3);
    for (const reason of OPERATIONS_ITEM_REASONS)
      expect(Object.keys(OPERATIONS_ERROR_CODES)).not.toContain(reason);
  });
});

describe('the operations routes', () => {
  const routes = OPERATIONS_ROUTES as Record<string, RouteDefinition>;

  it('declare the health, status and screen time routes', () => {
    expect(
      Object.values(routes).map((route) => [route.method, route.path, route.pressureExempt]),
    ).toEqual([
      ['GET', '/health/live', true],
      ['GET', '/health/ready', false],
      ['GET', '/v1/status', true],
      ['POST', '/v1/operations/screen-times', false],
    ]);
    for (const name of ['live', 'ready', 'status']) {
      expect([routes[name]?.auth, routes[name]?.rate, routes[name]?.response]).toEqual([
        ['anonymous'],
        'anonymous',
        { statuses: [204], schema: null },
      ]);
    }
    expect(routes.saveScreenTimes).toMatchObject({
      auth: ['session'],
      roles: ['staff'],
      rate: 'session',
      bodyLimit: 32_768,
    });
    expect(Object.fromEntries(Object.entries(routes).map(([name, r]) => [name, r.errors]))).toEqual(
      {
        live: ['OPERATIONS_SHUTTING_DOWN'],
        ready: [
          'OPERATIONS_SHUTTING_DOWN',
          'OPERATIONS_NOT_READY_DATABASE',
          'OPERATIONS_NOT_READY_SCHEMA',
        ],
        status: ['OPERATIONS_SHUTTING_DOWN'],
        saveScreenTimes: ['OPERATIONS_DAY_OUT_OF_RANGE', 'OPERATIONS_DURATION_INVALID'],
      },
    );
  });

  it('take a screen time body up to its largest valid size', () => {
    const largest = {
      clientId: id(1),
      day: '2026-10-12',
      durations: Array.from({ length: 200 }, (_, n) => ({
        sessionId: id(n + 100),
        screenKind: 'SELF_DECLARED_APPROVAL',
        seconds: 86_400,
      })),
    };
    expect(screenTimesRequestSchema.parse({ ...largest, later: 1 })).toEqual(largest);
    expect(JSON.stringify(largest).length).toBeLessThanOrEqual(
      routes.saveScreenTimes?.bodyLimit ?? 0,
    );
    const one = { ...largest, durations: largest.durations.slice(0, 1) };
    for (const bad of [
      { ...largest, durations: [...largest.durations, largest.durations[0]] },
      { ...one, durations: [] },
      { ...one, durations: [{ ...one.durations[0], seconds: 0 }] },
      { ...one, durations: [{ ...one.durations[0], seconds: 86_401 }] },
      { ...one, durations: [{ ...one.durations[0], screenKind: 'OTHER' }] },
      { ...one, clientId: '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e' },
      { ...one, day: '2026-10-12T08:00:00.000Z' },
    ]) {
      expect(ok(screenTimesRequestSchema, bad)).toBe(false);
    }
    expect(screenTimesAnswerSchema.parse({ saved: 3, later: 1 })).toEqual({ saved: 3 });
  });

  it('lock the screen time cap per person and day in layer 1', () => {
    expect(screenCapKey(id(5), '2026-10-12')).toBe(`operations:screen_cap:${id(5)}:2026-10-12`);
    expect(advisoryLayerOf(screenCapKey(id(5), '2026-10-12'))).toBe(1);
    // An id in upper case takes the same lock.
    expect(screenCapKey(id(5).toUpperCase(), '2026-10-12')).toBe(screenCapKey(id(5), '2026-10-12'));
    expect(SCREEN_TIME_CAP).toEqual({ rows: 500, sources: 5 });
    expect(SCREEN_KINDS).toHaveLength(6);
  });
});

describe('the phone counter body', () => {
  const body = {
    format: 1,
    day: '2026-10-12',
    platform: 'ios',
    appVersion: '1.4.0',
    runtimeVersion: '1.4',
    updateId: null,
    counters: { unsentRecords: 2, notificationPermission: true },
    screenErrors: [{ kind: 'GENERAL', screen: 'head_count', count: 1 }],
    rejections: [{ http: 400, code: 'ATTENDANCE_TEXT_INVALID', count: 3 }],
    screenTimes: [{ sessionId: id(7), screenKind: 'HEAD_COUNT', seconds: 60 }],
  };

  it('drops an unknown counter and an unknown screen kind, keeping the rest', () => {
    const later = { sessionId: id(8), screenKind: 'later_screen-2', seconds: 5 };
    const parsed = phoneCounterBodySchema.parse({
      ...body,
      counters: { ...body.counters, laterCounter: 5 },
      screenTimes: [...body.screenTimes, later],
    });
    expect(parsed).toEqual(body);
    expect(COUNTER_NAMES).toEqual([...Object.keys(phoneCounterBodySchema.shape.counters.shape)]);
    // A session id of any UUID version, on the phone as on the panel.
    const v4 = '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e';
    const phone = { ...body, screenTimes: [{ ...body.screenTimes[0], sessionId: v4 }] };
    expect(ok(phoneCounterBodySchema, phone)).toBe(true);
    const panel = {
      clientId: id(1),
      day: '2026-10-12',
      durations: [{ sessionId: v4, screenKind: 'HEAD_COUNT', seconds: 5 }],
    };
    expect(ok(screenTimesRequestSchema, panel)).toBe(true);
  });

  it('refuses values outside their bounds', () => {
    for (const bad of [
      { ...body, format: 2 },
      { ...body, platform: 'web' },
      { ...body, appVersion: '1.4' },
      { ...body, counters: { unsentRecords: -1 } },
      { ...body, counters: { unsentRecords: 1_000_001 } },
      { ...body, screenErrors: [{ kind: 'GENERAL', screen: 'Head', count: 1 }] },
      { ...body, screenErrors: [{ kind: 'GENERAL', screen: 'x', count: 0 }] },
      { ...body, rejections: [{ http: 399, code: null, count: 1 }] },
      { ...body, rejections: [{ http: 400, code: 'lower', count: 1 }] },
      { ...body, screenTimes: [{ sessionId: id(7), screenKind: 'HEAD_COUNT', seconds: 86_401 }] },
      { ...body, screenTimes: [{ sessionId: id(7), screenKind: 'A'.repeat(33), seconds: 1 }] },
      { ...body, screenErrors: [{ kind: 'GENERAL', screen: 'a'.repeat(49), count: 1 }] },
      { ...body, runtimeVersion: 'x'.repeat(33) },
      { ...body, rejections: Array.from({ length: 51 }, () => body.rejections[0]) },
      { ...body, screenErrors: Array.from({ length: 101 }, () => body.screenErrors[0]) },
      { ...body, screenTimes: Array.from({ length: 201 }, () => body.screenTimes[0]) },
    ]) {
      expect(ok(phoneCounterBodySchema, bad), JSON.stringify(bad).slice(0, 80)).toBe(false);
    }
  });
});

describe('the status and secret files', () => {
  it('read the clock, machine and maintenance files strictly', () => {
    const chrony = {
      format: 1,
      measuredAt: at,
      synced: true,
      offsetMs: 3,
      stratum: 2,
      source: 'ntp.example',
      lastBrokenAt: null,
    };
    expect(ok(chronyStatusSchema, chrony)).toBe(true);
    for (const bad of [
      { ...chrony, extra: 1 },
      { ...chrony, stratum: 17 },
      { ...chrony, offsetMs: -1 },
    ]) {
      expect(ok(chronyStatusSchema, bad)).toBe(false);
    }
    const machine = {
      format: 2,
      measuredAt: at,
      eventWindow: { start: at, end: at },
      disks: [{ mount: '/', totalBytes: 100, usedBytes: 50 }],
      memory: { totalBytes: 100, availableBytes: 20 },
      containers: [
        {
          service: 'api-1',
          containerId: 'abc',
          state: 'running',
          health: 'healthy',
          restartCount: 0,
          restartIncrease: 0,
          oomIncrease: 0,
          startedAt: at,
        },
      ],
    };
    expect(ok(machineStatusSchema, machine)).toBe(true);
    expect(ok(machineStatusSchema, { ...machine, format: 1 })).toBe(false);
    const start = Date.parse(at);
    const maintenance = (minutes: number) => ({
      format: 1,
      version: '1.4.0',
      startedAt: at,
      validUntil: new Date(start + minutes * 60_000).toISOString(),
    });
    // D15: a maintenance window lasts at most 45 minutes, to the millisecond.
    expect(ok(maintenanceFileSchema, maintenance(45))).toBe(true);
    expect(ok(maintenanceFileSchema, maintenance(45 + 1 / 60_000))).toBe(false);
    expect(MAINTENANCE_MAX_MS).toBe(45 * 60_000);
    expect(ok(maintenanceFileSchema, maintenance(0))).toBe(false);
  });

  it('keep every status and secret file strict, and the bodies dropping unknown keys', () => {
    const files = [
      chronyStatusSchema,
      machineStatusSchema,
      maintenanceFileSchema,
      apiMeasurementFileSchema,
      secretKeyFileSchema,
      heartbeatSecretSchema,
    ];
    const strict = files.flatMap(objectsIn);
    expect(strict.length).toBeGreaterThan(files.length);
    for (const object of strict) expect(unknownKeys(object)).toBe('strict');
    const bodies = [phoneCounterBodySchema, screenTimesRequestSchema, screenTimesAnswerSchema];
    const stripping = bodies.flatMap(objectsIn);
    expect(stripping.length).toBeGreaterThan(bodies.length);
    for (const object of stripping) expect(unknownKeys(object)).toBe('strip');
  });

  it('read the API measurement file with its fifteen buckets', () => {
    expect(SUBMISSION_BUCKET_BOUNDS_MS).toHaveLength(14);
    const minute = {
      minute: at,
      total: 10,
      serverErrors: 0,
      unavailable: 1,
      rateLimited: 0,
      submissions: { count: 4, buckets: Array.from({ length: 15 }, () => 0) },
      logEvents: [
        {
          event: 'verification.evidence_rejected',
          platform: 'ios',
          purpose: null,
          reason: 'X',
          count: 2,
        },
      ],
    };
    const file = { format: 1, copy: 'api-1', writtenAt: at, minutes: [minute] };
    expect(ok(apiMeasurementFileSchema, file)).toBe(true);
    const fourteen = {
      ...minute,
      submissions: { count: 4, buckets: Array.from({ length: 14 }, () => 0) },
    };
    expect(ok(apiMeasurementFileSchema, { ...file, minutes: [fourteen] })).toBe(false);
    const sixteen = {
      ...minute,
      submissions: { count: 4, buckets: Array.from({ length: 16 }, () => 0) },
    };
    expect(ok(apiMeasurementFileSchema, { ...file, minutes: [sixteen] })).toBe(false);
    expect(
      ok(apiMeasurementFileSchema, { ...file, minutes: Array.from({ length: 16 }, () => minute) }),
    ).toBe(false);
  });

  it('read a key set with exactly one active key and at most one ready', () => {
    const key = (kid: string, status: string, extra = {}) => ({
      kid,
      value: `${'A'.repeat(43)}=`,
      status,
      createdAt: at,
      ...extra,
    });
    const file = {
      format: 1,
      purpose: 'clock_document',
      activeKid: 'k2',
      keys: [key('k1', 'VERIFY_ONLY'), key('k2', 'ACTIVE')],
    };
    expect(ok(secretKeyFileSchema, file)).toBe(true);
    for (const bad of [
      { ...file, activeKid: 'k1' },
      // Two active keys, the first named by activeKid.
      { ...file, keys: [key('k2', 'ACTIVE'), key('k3', 'ACTIVE')] },
      { ...file, keys: [key('k2', 'ACTIVE'), key('k3', 'READY'), key('k4', 'READY')] },
      { ...file, keys: [key('k2', 'ACTIVE'), key('k2', 'VERIFY_ONLY')] },
      { ...file, keys: [key('k2', 'ACTIVE'), key('k5', 'COMPROMISED')] },
      { ...file, keys: [key('k2', 'ACTIVE', { compromisedAt: at })] },
      { ...file, keys: [{ ...key('k2', 'ACTIVE'), value: 'short=' }] },
      // The same 32 bytes as A...A=, but not the canonical text.
      { ...file, keys: [{ ...key('k2', 'ACTIVE'), value: `${'A'.repeat(42)}B=` }] },
      { ...file, keys: [key('k2', 'ACTIVE', { retiredAt: at })] },
      { ...file, keys: [key('K2', 'ACTIVE')], activeKid: 'K2' },
      {
        ...file,
        keys: Array.from({ length: 5 }, (_, n) => key(`k${n}`, n === 0 ? 'ACTIVE' : 'VERIFY_ONLY')),
        activeKid: 'k0',
      },
    ]) {
      expect(ok(secretKeyFileSchema, bad), JSON.stringify(bad.keys.map((k) => k.status))).toBe(
        false,
      );
    }
    // A file in the middle of a rotation: four keys, one of each status.
    const rotating = {
      ...file,
      keys: [
        key('k1', 'VERIFY_ONLY', { retiredAt: at }),
        key('k2', 'ACTIVE'),
        key('k3', 'READY'),
        key('k5', 'COMPROMISED', { compromisedAt: at }),
      ],
    };
    expect(ok(secretKeyFileSchema, rotating)).toBe(true);
    expect(ok(heartbeatSecretSchema, { normalUrl: 'https://hc.example/1', problemUrl: null })).toBe(
      true,
    );
    expect(ok(heartbeatSecretSchema, { normalUrl: 'http://hc.example/1', problemUrl: null })).toBe(
      false,
    );
  });
});

describe('the operations catalogs', () => {
  it('bind every secret only to known services', () => {
    expect(Object.keys(SECRET_MATRIX)).toHaveLength(15);
    for (const services of Object.values(SECRET_MATRIX)) {
      for (const service of services) expect(SERVICES).toContain(service);
    }
    expect(SECRET_MATRIX.heartbeat).toEqual(['worker']);
    // Every key set purpose is a secret, and the heartbeat's addresses never reach a log.
    for (const purpose of SECRET_KEY_PURPOSES)
      expect(Object.keys(SECRET_MATRIX)).toContain(purpose);
    for (const field of Object.keys(heartbeatSecretSchema.shape)) {
      expect(OPERATIONS_SECRET_FIELDS).toContain(field);
    }
  });

  it('give every alert kind its levels, closing, evaluator and inputs', () => {
    const kinds = Object.entries(ALERT_KINDS);
    expect(kinds.filter(([name]) => name.startsWith('operations.'))).toHaveLength(31);
    for (const [name, alert] of kinds) {
      expect(alert.levels.length, name).toBeGreaterThan(0);
      for (const input of alert.inputs) {
        expect(
          (OPERATIONS_INPUTS as readonly string[]).includes(input) ||
            ['backup:*', 'alert_call', '*'].includes(input),
          `${name} ${input}`,
        ).toBe(true);
      }
      // Another module's kind: the caller's level, closed by silence.
      if (!name.startsWith('operations.')) {
        expect([alert.closes, alert.levels], name).toEqual(['SILENCE', ['WARNING', 'CRITICAL']]);
      }
    }
  });

  it('give the thresholds of the alert rules and the backups', () => {
    expect(OPERATIONS_THRESHOLDS.diskWarningPercent).toBeLessThan(
      OPERATIONS_THRESHOLDS.diskCriticalPercent,
    );
    expect(OPERATIONS_THRESHOLDS.connectionWarning).toBeLessThan(
      OPERATIONS_THRESHOLDS.connectionCritical,
    );
    for (const job of Object.keys(BACKUP_THRESHOLDS)) {
      expect([...BACKUP_JOBS, 'pgbackrest']).toContain(job);
    }
    // Every backup job has an age threshold; the differential one through the newest of
    // the pgBackRest backups.
    for (const job of BACKUP_JOBS) {
      const covered = job in BACKUP_THRESHOLDS || job === 'pgbackrest_diff_backup';
      expect(covered, job).toBe(true);
    }
    expect(BACKUP_THRESHOLDS.restore_trial).toEqual({ warningDays: 36 });
    expect(OPERATIONS_THRESHOLDS.backupConsecutiveSkips).toBe(2);
  });
});
