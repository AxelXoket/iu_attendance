import { rosterBucketKey } from '@iu-attendance/core/rosters/bucket';
import { describe, expect, it } from 'vitest';
import { API_ERRORS } from '../api.ts';
import { attendancePairKey } from '../attendance.ts';
import {
  ADVISORY_LAYERS,
  advisoryLayerOf,
  BACKUP_JOBS,
  backupJobStatusSchema,
  DATABASE_ERROR_CODES,
  DATABASE_ROUTES,
  DATABASE_TRANSIENT_CODES,
  MIGRATION_TOKENS,
  RETENTION_DATA_CLASSES,
  TABLE_MARKER_FORM,
  TABLE_MARKER_KINDS,
  TABLE_MARKERS,
} from '../database.ts';
import { defineRoute, MODULES, type RouteDefinition } from '../shared/index.ts';
import { id, ok } from './helpers.ts';

const at = '2026-10-12T08:00:00.000Z';

describe('the database route', () => {
  it('lists the restores to every admin, a page at a time', () => {
    const route = DATABASE_ROUTES.listRestores as RouteDefinition;
    expect(defineRoute(route)).toBe(route);
    expect(`${route.method} ${route.path}`).toBe('GET /v1/database/admin/restores');
    expect([route.auth, route.roles, route.rate]).toEqual([['session'], ['admin'], 'session']);
    expect(route.errors).toEqual(['DATABASE_CURSOR_INVALID']);
    const restore = {
      id: id(1),
      method: 'pitr',
      reasonCode: 'hardware_failure',
      targetAt: at,
      lossWindowEndAt: at,
      performedAt: at,
      previousGeneration: '7.1',
      newGeneration: '7.2',
      durationMs: 420_000,
    };
    const answer = DATABASE_ROUTES.listRestores.response.schema;
    expect(ok(answer, { items: [restore], nextCursor: null })).toBe(true);
    expect(ok(answer, { items: [{ ...restore, method: 'NEW_METHOD' }], nextCursor: 'abc' })).toBe(
      true,
    );
    expect(ok(answer, { items: [{ ...restore, durationMs: -1 }], nextCursor: null })).toBe(false);
  });
});

describe('the database error catalog', () => {
  const codes = Object.entries(DATABASE_ERROR_CODES);

  it('shows six codes to clients and keeps the operation, CI and test codes without text', () => {
    expect(codes).toHaveLength(42);
    const visible = codes.filter(([, definition]) => definition.http !== null);
    expect(visible.map(([code, definition]) => [code, definition.http])).toEqual([
      ['DATABASE_CURSOR_INVALID', 400],
      ['DATABASE_CONTENTION', 503],
      ['DATABASE_POOL_FULL', 503],
      ['DATABASE_UNAVAILABLE', 503],
      ['DATABASE_TIMEOUT', 503],
      ['DATABASE_GENERATION_UNCERTAIN', 503],
    ]);
    // The transient codes are the 503s, and each gives the api module's busy answer.
    expect(visible.slice(1).map(([code]) => code)).toEqual(DATABASE_TRANSIENT_CODES);
    const { http, lecturer, student, retry } = API_ERRORS.API_SERVER_BUSY;
    for (const code of DATABASE_TRANSIENT_CODES) {
      expect(DATABASE_ERROR_CODES[code], code).toEqual({ http, lecturer, student, retry });
    }
    expect(retry).toEqual({ range: [15, 45] });
    for (const [code, definition] of codes.filter(([, d]) => d.http === null)) {
      expect([definition.lecturer, definition.student], code).toEqual([null, null]);
    }
  });

  it('writes texts without digits or placeholders', () => {
    const texts = codes
      .flatMap(([, d]) => [d.lecturer, d.student])
      .flatMap((text) => (text === null ? [] : Object.values(text)));
    expect(texts).toHaveLength(6 * 4);
    for (const text of texts) expect(text).not.toMatch(/[0-9{}]/);
  });
});

describe('advisory lock layers', () => {
  it('give each module rule a layer from one to five', () => {
    for (const layer of Object.values(ADVISORY_LAYERS)) expect([1, 2, 3, 4, 5]).toContain(layer);
    for (const prefix of Object.keys(ADVISORY_LAYERS)) {
      const [module] = prefix.split(':');
      expect(MODULES as readonly string[], prefix).toContain(module);
    }
  });

  it('find the layer of the keys the modules make, wildcards included', () => {
    expect(advisoryLayerOf(attendancePairKey(id(1), id(2)))).toBe(3);
    expect(advisoryLayerOf(rosterBucketKey(17))).toBe(2);
    expect(advisoryLayerOf(`corrections:chain:${id(1)}:${id(2)}`)).toBe(3);
    expect(advisoryLayerOf(`projection:display:${id(1)}`)).toBe(3);
    expect(advisoryLayerOf('operations:anything:1')).toBe(1);
    expect(advisoryLayerOf('verification:flag:x')).toBe(5);
    for (const unknown of ['attendance:other:1', 'unknown:pair:1', 'attendance', '']) {
      expect(advisoryLayerOf(unknown), unknown).toBeNull();
    }
  });
});

describe('retention data classes', () => {
  const classes = RETENTION_DATA_CLASSES.map((entry) => entry.dataClass);

  it('are unique, each named after its module, and refer only to classes of the catalog', () => {
    expect(new Set(classes).size).toBe(classes.length);
    for (const entry of RETENTION_DATA_CLASSES) {
      expect(entry.dataClass.startsWith(`${entry.module}.`), entry.dataClass).toBe(true);
      for (const before of entry.before) expect(classes, entry.dataClass).toContain(before);
      if (entry.copySource !== undefined) expect(classes).toContain(entry.copySource);
    }
  });

  it('can be handled in an order where every class comes before the ones it lists', () => {
    // A class is ready once every class that lists it in `before` is done.
    const referrersOf = (dataClass: string) =>
      RETENTION_DATA_CLASSES.filter((entry) => entry.before.includes(dataClass as never));
    const order: string[] = [];
    let progress = true;
    while (progress) {
      progress = false;
      for (const { dataClass } of RETENTION_DATA_CLASSES) {
        const ready = referrersOf(dataClass).every((entry) => order.includes(entry.dataClass));
        if (!order.includes(dataClass) && ready) {
          order.push(dataClass);
          progress = true;
        }
      }
    }
    expect(order).toHaveLength(classes.length);
    for (const entry of RETENTION_DATA_CLASSES) {
      for (const before of entry.before) {
        expect(order.indexOf(entry.dataClass), `${entry.dataClass} ${before}`).toBeLessThan(
          order.indexOf(before),
        );
      }
    }
    // The sync rows refer to the records, so they go first.
    expect(order.indexOf('sync.term_data')).toBeLessThan(order.indexOf('attendance.term_data'));
  });

  it('start at the unit term lock, the identity link at the last one, with the spec order', () => {
    const byClass = Object.fromEntries(RETENTION_DATA_CLASSES.map((e) => [e.dataClass, e]));
    expect(byClass['identity.person_link']?.start).toBe('last_unit_term_lock');
    expect(RETENTION_DATA_CLASSES.filter((e) => e.start === 'unit_term_lock')).toHaveLength(9);
    expect(byClass['sync.term_data']?.before).toEqual(['attendance.term_data']);
    expect(byClass['absence.term_data']).toMatchObject({
      before: ['attendance.term_data', 'rosters.term_data'],
      copySource: 'rosters.term_data',
    });
    expect(byClass['reports.term_data']).toMatchObject({
      before: ['rosters.term_data'],
      copySource: 'rosters.term_data',
    });
    expect(byClass['corrections.term_data']?.copySource).toBeUndefined();
  });
});

describe('migration tokens, table markers and the backup status file', () => {
  it('give every module its token and mark tables with markers of the known forms', () => {
    expect(Object.keys(MIGRATION_TOKENS)).toEqual([...MODULES]);
    for (const token of Object.values(MIGRATION_TOKENS)) expect(token).toMatch(/^[a-z_]+$/);
    for (const markers of Object.values(TABLE_MARKERS)) {
      for (const marker of markers) {
        expect(marker).toMatch(TABLE_MARKER_FORM);
        expect(TABLE_MARKER_KINDS).toContain(marker.split(':')[0]);
      }
    }
    expect(TABLE_MARKERS.restore_records).toEqual(['append_only']);
    for (const marker of [
      'client_id:id',
      'append_only',
      'append_only:current',
      'append_only:status,closed_by_id,closed_at',
      'term_partitionable',
      'single_row',
      'unindexed_ok:records_session_fk',
    ]) {
      expect(marker, marker).toMatch(TABLE_MARKER_FORM);
    }
    for (const marker of [
      'client_id',
      'append_only:',
      'append_only:a,',
      'single_row:id',
      'unindexed_ok',
      'client_id:Id',
      'unknown',
    ]) {
      expect(marker, marker).not.toMatch(TABLE_MARKER_FORM);
    }
  });

  it('read a backup job status file for each result, and refuse what a job never writes', () => {
    const base = { format: 1, job: 'nightly_pg_dump', lastRunAt: at };
    const succeeded = {
      ...base,
      lastResult: 'succeeded',
      lastSuccessAt: at,
      consecutiveSkipped: 0,
      errorCode: null,
    };
    const failed = {
      ...base,
      lastResult: 'failed',
      lastSuccessAt: null,
      consecutiveSkipped: 0,
      errorCode: 'DATABASE_BACKUP_FAILED',
    };
    const skipped = {
      ...base,
      lastResult: 'skipped',
      lastSuccessAt: '2026-10-10T08:00:00.000Z',
      consecutiveSkipped: 2,
      errorCode: 'DATABASE_BACKUP_DISK_LOW',
    };
    for (const status of [succeeded, failed, skipped]) {
      expect(ok(backupJobStatusSchema, status), status.lastResult).toBe(true);
    }
    expect(BACKUP_JOBS).toHaveLength(6);
    for (const bad of [
      { ...skipped, format: 2 },
      { ...skipped, extra: true },
      { ...skipped, errorCode: 'API_SERVER_ERROR' },
      { ...skipped, errorCode: 'DATABASE_BACKUP_DISKLOW' },
      { ...skipped, consecutiveSkipped: -1 },
      { ...skipped, consecutiveSkipped: 0 },
      { ...skipped, lastResult: 'partial' },
      { ...succeeded, lastSuccessAt: null },
      { ...succeeded, consecutiveSkipped: 3 },
      { ...succeeded, errorCode: 'DATABASE_BACKUP_FAILED' },
      { ...failed, errorCode: null },
    ]) {
      expect(ok(backupJobStatusSchema, bad), JSON.stringify(bad)).toBe(false);
    }
  });
});
