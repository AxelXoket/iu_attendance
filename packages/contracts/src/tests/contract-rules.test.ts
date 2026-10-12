import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { API_ERRORS } from '../api.ts';
import { CLOCK_ERROR_CODES } from '../clock.ts';
import { CORRECTIONS_ROUTES } from '../corrections.ts';
import { DATABASE_ERROR_CODES, DATABASE_TRANSIENT_CODES } from '../database.ts';
import * as shared from '../shared/index.ts';
import {
  type ErrorDefinition,
  extensibleEnum,
  idSchema,
  type RouteDefinition,
} from '../shared/index.ts';
import { id } from './helpers.ts';
import {
  closedEnumsIn,
  extensibleEnumsIn,
  objectsIn,
  stringsIn,
  unknownKeys,
} from './schema-walk.ts';

// The D13 rules every module contract follows, checked across all of them at every depth.
// The contracts are found, not listed: every contract file is loaded and its route map,
// error catalog, audit schemas, item types and exported schemas are picked out by shape
// and name, so a module or route added later is checked without a change here.

// Vite, which runs these tests, fills import.meta.glob in when it loads the file; its
// type is in vite/client, which this package does not load.
declare global {
  interface ImportMeta {
    glob<T>(patterns: readonly string[], options: { eager: true }): Record<string, T>;
  }
}

type RouteMap = Readonly<Record<string, RouteDefinition>>;
type Catalog = Readonly<Record<string, ErrorDefinition>>;
type AuditChange = { before: z.ZodObject | null; after: z.ZodObject | null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isSchema = (value: unknown): value is z.ZodType => value instanceof z.ZodType;
const everyEntryHas = (value: unknown, keys: readonly string[]) =>
  isRecord(value) &&
  !isSchema(value) &&
  Object.keys(value).length > 0 &&
  Object.values(value).every((entry) => isRecord(entry) && keys.every((key) => key in entry));
const isRouteMap = (value: unknown): value is RouteMap =>
  everyEntryHas(value, ['method', 'path', 'errors']);
const isCatalog = (value: unknown): value is Catalog =>
  everyEntryHas(value, ['http', 'lecturer', 'student']);
const isItemType = (value: unknown): value is { type: string; body: z.ZodType } =>
  isRecord(value) && typeof value.type === 'string' && isSchema(value.body) && 'module' in value;

// The shared part, and every module contract file (the package root only re-exports the
// shared part).
const moduleFiles = import.meta.glob<Record<string, unknown>>(['../*.ts', '!../index.ts'], {
  eager: true,
});
const contracts: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
  ['shared', shared],
  ...Object.entries(moduleFiles).map(
    ([file, contract]) => [file.slice('../'.length, -'.ts'.length), contract] as const,
  ),
];
const exportsOf = (contract: Record<string, unknown>, suffix: string) =>
  Object.entries(contract).filter(([name]) => name.endsWith(suffix));

const modules = contracts.flatMap(([module, contract]) => {
  const routeMaps = Object.values(contract).filter(isRouteMap);
  const catalogs = Object.values(contract).filter(isCatalog);
  return routeMaps.map((routeMap) => ({ module, routeMap, catalogs }));
});
const routes = modules.flatMap(({ routeMap }) => Object.values(routeMap));

const requestParts = (route: RouteDefinition) =>
  Object.entries(route.request).filter(
    (entry): entry is [string, z.ZodType] => entry[1] !== undefined,
  );

const auditSchemas: ReadonlyArray<readonly [string, z.ZodType]> = contracts.flatMap(
  ([module, contract]) => [
    ...exportsOf(contract, '_AUDIT_EVENTS').flatMap(([, events]) =>
      Object.entries(events as Record<string, z.ZodType>).map(
        ([event, schema]) => [`${module}:${event}`, schema] as const,
      ),
    ),
    ...exportsOf(contract, '_AUDIT_CHANGES').flatMap(([, changes]) =>
      Object.entries(changes as Record<string, AuditChange>).flatMap(([change, states]) =>
        (['before', 'after'] as const).flatMap((side) => {
          const state = states[side];
          return state === null ? [] : [[`${module}:${change}.${side}`, state] as const];
        }),
      ),
    ),
  ],
);

// Every schema of every contract, named by where it sits: route parts, audit schemas,
// item type bodies and the schemas a contract exports.
const namedSchemas: ReadonlyArray<readonly [string, z.ZodType]> = [
  ...modules.flatMap(({ module, routeMap }) =>
    Object.entries(routeMap).flatMap(([name, route]) => [
      ...requestParts(route).map(
        ([part, schema]) => [`${module}.${name}.${part}`, schema] as const,
      ),
      ...(route.response.schema === null
        ? []
        : [[`${module}.${name}.response`, route.response.schema] as const]),
    ]),
  ),
  ...auditSchemas,
  ...contracts.flatMap(([module, contract]) =>
    Object.entries(contract).flatMap(([name, value]) =>
      isSchema(value)
        ? [[`${module}.${name}`, value] as const]
        : isItemType(value)
          ? [[`${module}.${name}.body`, value.body] as const]
          : [],
    ),
  ),
];

// Any route can answer the api module's codes and the transient database codes, so no
// route lists them.
const anyRoute = (catalog: Catalog, code: string) =>
  catalog === API_ERRORS || (DATABASE_TRANSIENT_CODES as readonly string[]).includes(code);

// A field is an id when it takes a UUIDv7 and refuses a word. Row ids are UUIDv7 only
// (v7IdSchema); these take every version, each for its own reason: ids another system
// makes (a device and its key, an app update), ids whose version the spec leaves open
// (an audit event and its target, a flag, an auth session, a projection), and the screen
// time session id D15 types with D13's idSchema.
const V4 = '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e';
const ANY_VERSION_IDS: readonly string[] = [
  // An app update (the update service makes it).
  'api.getVersion.headers.x-update-id',
  'api.releaseInfoSchema.faultyVersions[].updateId',
  'attendance.recordTextSchema.updateId',
  'operations.phoneCounterBodySchema.updateId',
  // A device and its key.
  'attendance.recordTextSchema.device',
  'attendance.recordTextSchema.key',
  'attendance:attendance.id_conflict.deviceId',
  'attendance:attendance.sender_mismatch.deviceId',
  'attendance:attendance.student_device_mismatch.deviceId',
  'shared.identitySchema.deviceId',
  // An audit event and the target of one.
  'corrections.auditEventSchema.id',
  'corrections.listAuditEvents.response.items[].id',
  'corrections.auditEventInputSchema.target.id',
  // A flag of a session.
  'corrections.listFlaggedSessions.response.items[].flagId',
  'corrections.markFlaggedSessionReviewed.response.flagId',
  // An auth session and a projection.
  'projection:projection.attempt_limit.authSessionId',
  'projection:projection.second_use.firstAuthSessionId',
  'projection:projection.second_use.secondAuthSessionId',
  'projection:projection.slot_assigned.authSessionId',
  'projection:projection.slot_transferred.newAuthSessionId',
  'projection:projection.slot_transferred.oldAuthSessionId',
  'shared.identitySchema.authSessionId',
  'shared.identitySchema.projectionId',
  // The screen time session id.
  'operations.phoneCounterBodySchema.screenTimes[].sessionId',
  'operations.saveScreenTimes.body.durations[].sessionId',
  'operations.screenTimesRequestSchema.durations[].sessionId',
];

function idPaths(named: ReadonlyArray<readonly [string, z.ZodType]>) {
  const ids = new Set<string>();
  const anyVersion = new Set<string>();
  for (const [name, schema] of named) {
    for (const [path, node] of stringsIn(schema, name)) {
      if (!node.safeParse(id(1)).success || node.safeParse('not-an-id').success) continue;
      ids.add(path);
      if (node.safeParse(V4).success) anyVersion.add(path);
    }
  }
  return { ids, anyVersion: [...anyVersion].sort() };
}

describe('contract rules across the module contracts', () => {
  it('find one route map and one error catalog in every contract with routes', () => {
    for (const { module, catalogs } of modules) expect(catalogs, module).toHaveLength(1);
    expect(new Set(modules.map(({ module }) => module)).size).toBe(modules.length);
    // Every contract file is named after its module.
    const files = contracts.slice(1).map(([name]) => name);
    expect(shared.MODULES).toEqual(expect.arrayContaining(files));
    // Ground controls: the search loads the same module instances the imports above see,
    // and finds the contracts written so far.
    expect(modules.find(({ module }) => module === 'corrections')?.routeMap).toBe(
      CORRECTIONS_ROUTES,
    );
    expect(files.length).toBeGreaterThanOrEqual(11);
    expect(modules.length).toBeGreaterThanOrEqual(10);
    expect(auditSchemas.length).toBeGreaterThan(50);
  });

  it('drop an unknown key in every answer object too, so a field added later breaks no client', () => {
    const objects = routes.flatMap((route) =>
      route.response.schema === null ? [] : objectsIn(route.response.schema),
    );
    // Ground control: nested answer objects are reached.
    expect(objects.length).toBeGreaterThan(routes.length);
    for (const object of objects) expect(unknownKeys(object)).toBe('strip');
  });

  it('drop an unknown key in every request object, at every depth (D13-B24)', () => {
    const objects = routes.flatMap((route) =>
      requestParts(route).flatMap(([, part]) => objectsIn(part)),
    );
    // Ground control: the walk reaches an object inside the items of a body.
    const reviewItem = CORRECTIONS_ROUTES.decideReviews.request.body.shape.items.element;
    expect(objects).toContain(reviewItem.shape.record);
    for (const object of objects) expect(unknownKeys(object)).toBe('strip');
    // Positive controls: the classifier tells the three kinds apart.
    expect(unknownKeys(z.object({}))).toBe('strip');
    expect(unknownKeys(z.strictObject({}))).toBe('strict');
    expect(unknownKeys(z.looseObject({}))).toBe('keep');
  });

  it('close every value list of a request and keep every value list of an answer extensible', () => {
    let closed = 0;
    let extensible = 0;
    for (const route of routes) {
      for (const [, part] of requestParts(route)) {
        expect(extensibleEnumsIn(part).length, `${route.name} request`).toBe(0);
        closed += closedEnumsIn(part).length;
      }
      const answer = route.response.schema;
      if (answer === null) continue;
      expect(closedEnumsIn(answer).length, `${route.name} answer`).toBe(0);
      extensible += extensibleEnumsIn(answer).length;
    }
    // Ground controls: both kinds occur, and the finders see each kind.
    expect(closed).toBeGreaterThan(10);
    expect(extensible).toBeGreaterThan(10);
    expect(closedEnumsIn(z.object({ a: z.enum(['A']).optional() }))).toHaveLength(1);
    expect(extensibleEnumsIn(z.object({ a: z.array(extensibleEnum(['A'])) }))).toHaveLength(1);
  });

  it("list on the routes exactly the module's catalog codes with an HTTP status that not any route can answer", () => {
    for (const { module, routeMap, catalogs } of modules) {
      const [catalog = {}] = catalogs;
      const listed = new Set(Object.values(routeMap).flatMap((route) => route.errors));
      const routeCodes = Object.entries(catalog)
        .filter(([code, definition]) => definition.http !== null && !anyRoute(catalog, code))
        .map(([code]) => code);
      expect([...listed].sort(), module).toEqual(routeCodes.sort());
    }
    // Ground controls: the api codes and a transient database code are answered on any
    // route; a listed code and a 503 of a module's own are not.
    expect(anyRoute(API_ERRORS, 'API_RATE_LIMIT')).toBe(true);
    expect(anyRoute(DATABASE_ERROR_CODES, 'DATABASE_UNAVAILABLE')).toBe(true);
    expect(anyRoute(DATABASE_ERROR_CODES, 'DATABASE_CURSOR_INVALID')).toBe(false);
    expect(CLOCK_ERROR_CODES.CLOCK_SYNC_BROKEN.http).toBe(503);
    expect(anyRoute(CLOCK_ERROR_CODES, 'CLOCK_SYNC_BROKEN')).toBe(false);
  });

  it('take only a UUIDv7 in every id field but the listed any-version ids', () => {
    const { ids, anyVersion } = idPaths(namedSchemas);
    expect(anyVersion).toEqual([...ANY_VERSION_IDS].sort());
    // Ground controls: the walk finds the id fields, and it reports a person id written
    // with idSchema at its path.
    expect(ids.size).toBeGreaterThan(150);
    const planted = z.object({ a: z.array(z.object({ personId: idSchema('Person') })) });
    expect(idPaths([['x', planted]]).anyVersion).toEqual(['x.a[].personId']);
  });

  it('keep every audit detail and state object strict, at every depth', () => {
    const objects = auditSchemas.flatMap(([, schema]) => objectsIn(schema));
    expect(objects.length).toBeGreaterThanOrEqual(auditSchemas.length);
    for (const object of objects) expect(unknownKeys(object)).toBe('strict');
  });
});
