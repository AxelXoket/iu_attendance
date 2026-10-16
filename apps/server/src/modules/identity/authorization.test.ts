import { CHANGE_PENDING_ROUTES } from '@iu-attendance/contracts/api';
import { IDENTITY_ROUTES } from '@iu-attendance/contracts/identity';
import type { Identity, RoleGrant, RouteDefinition, UnitId } from '@iu-attendance/contracts/shared';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isAuthorized } from './authorization.ts';

const UNIT_A = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0a' as UnitId;
const UNIT_B = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0b' as UnitId;

const staff = (...roles: RoleGrant[]): Identity => ({
  personId: null,
  authSessionId: null,
  sessionScope: null,
  source: 'cookie',
  roles,
  reviewAccount: false,
  kind: 'staff',
  deviceId: null,
  projectionId: null,
  client: 'panel',
});
const lecturer: RoleGrant = { role: 'lecturer', scopeUnitId: null };
const adminOf = (scopeUnitId: UnitId | null): RoleGrant => ({ role: 'admin', scopeUnitId });

describe('the admin scope rule (isAuthorized)', () => {
  it('answers whether the identity holds the role', () => {
    expect(isAuthorized(staff(lecturer), 'lecturer')).toBe(true);
    expect(isAuthorized(staff(adminOf(null)), 'lecturer')).toBe(false);
    expect(isAuthorized(staff(lecturer), 'admin')).toBe(false);
    expect(isAuthorized(staff(adminOf(UNIT_A)), 'admin')).toBe(true);
    expect(isAuthorized(staff(), 'admin', { unitId: null })).toBe(false);
  });

  it('lets a university-wide admin cover every unit and a target with no unit', () => {
    const wide = staff(adminOf(null));
    expect(isAuthorized(wide, 'admin', { unitId: UNIT_A })).toBe(true);
    expect(isAuthorized(wide, 'admin', { unitId: null })).toBe(true);
  });

  it('lets a unit admin cover its own unit only, in either case', () => {
    const unitAdmin = staff(lecturer, adminOf(UNIT_A));
    expect(isAuthorized(unitAdmin, 'admin', { unitId: UNIT_A })).toBe(true);
    expect(isAuthorized(unitAdmin, 'admin', { unitId: UNIT_A.toUpperCase() as UnitId })).toBe(true);
    const upperGrant = staff(adminOf(UNIT_A.toUpperCase() as UnitId));
    expect(isAuthorized(upperGrant, 'admin', { unitId: UNIT_A })).toBe(true);
    expect(isAuthorized(unitAdmin, 'admin', { unitId: UNIT_B })).toBe(false);
    // A target with no unit (or an all-scope admin target) is beyond a unit admin.
    expect(isAuthorized(unitAdmin, 'admin', { unitId: null })).toBe(false);
    // A missing unit, as plain JavaScript could pass it, is covered by no unit grant.
    expect(isAuthorized(unitAdmin, 'admin', { unitId: undefined as unknown as null })).toBe(false);
    // Two unit grants cover both units.
    expect(isAuthorized(staff(adminOf(UNIT_A), adminOf(UNIT_B)), 'admin', { unitId: UNIT_B })).toBe(
      true,
    );
  });

  it('checks no scope for the lecturer role, which has none', () => {
    expect(isAuthorized(staff(lecturer), 'lecturer', { unitId: UNIT_A })).toBe(true);
    // Even a lecturer grant that names a unit is not filtered by it.
    const unitLecturer = staff({ role: 'lecturer', scopeUnitId: UNIT_B });
    expect(isAuthorized(unitLecturer, 'lecturer', { unitId: UNIT_A })).toBe(true);
    expect(isAuthorized(staff(adminOf(UNIT_B)), 'lecturer', { unitId: UNIT_A })).toBe(false);
  });

  it('never lets a lecturer grant stand in for an admin grant, whatever the scope', () => {
    const unitId = fc.constantFrom<UnitId | null>(UNIT_A, UNIT_B, null);
    fc.assert(
      fc.property(fc.array(unitId, { maxLength: 3 }), unitId, (scopes, target) => {
        const grants = scopes.map((scope): RoleGrant => ({ role: 'lecturer', scopeUnitId: scope }));
        expect(isAuthorized(staff(...grants), 'admin', { unitId: target })).toBe(false);
        // Ground control: a university-wide admin grant next to them covers the target.
        expect(isAuthorized(staff(...grants, adminOf(null)), 'admin', { unitId: target })).toBe(
          true,
        );
      }),
    );
  });
});

// The identity route table as the spec lists it (29 routes).
const SPEC_ROUTES = [
  'POST /v1/identity/code',
  'POST /v1/identity/login',
  'POST /v1/identity/logout',
  'GET /v1/identity/sessions',
  'DELETE /v1/identity/sessions/{authSessionId}',
  'GET /v1/identity/me',
  'PUT /v1/identity/me/language',
  'POST /v1/identity/application',
  'POST /v1/identity/application/verify',
  'POST /v1/identity/application/deletion',
  'POST /v1/identity/student/registration',
  'POST /v1/identity/device/app-attest-renewal',
  'POST /v1/identity/device-change',
  'GET /v1/identity/device-change/{requestId}',
  'POST /v1/identity/device-change/{requestId}/approve',
  'POST /v1/identity/device-change/{requestId}/reject',
  'POST /v1/identity/account-deletion',
  'DELETE /v1/identity/account-deletion',
  'POST /v1/identity/students/{personId}/account-deletion',
  'POST /v1/identity/registration-codes',
  'GET /v1/identity/admin/applications',
  'POST /v1/identity/admin/applications/{personId}/approve',
  'POST /v1/identity/admin/applications/{personId}/reject',
  'GET /v1/identity/admin/accounts',
  'POST /v1/identity/admin/accounts/{personId}/close-sessions',
  'POST /v1/identity/admin/accounts/{personId}/deactivate',
  'POST /v1/identity/admin/accounts/{personId}/activate',
  'POST /v1/identity/admin/admins',
  'DELETE /v1/identity/admin/admins/{personId}',
];

const routes: readonly RouteDefinition[] = Object.values(IDENTITY_ROUTES);
const key = (route: { method: string; path: string }) => `${route.method} ${route.path}`;
const byKey = (wanted: string) => routes.find((route) => key(route) === wanted);

type JsonSchema = { properties?: Record<string, JsonSchema>; [key: string]: unknown };
const jsonSchemaOf = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as JsonSchema;

// Every property name at every depth of a JSON Schema, through unions and arrays.
function propertyNames(schema: unknown): string[] {
  if (Array.isArray(schema)) return schema.flatMap(propertyNames);
  if (typeof schema !== 'object' || schema === null) return [];
  const own = Object.keys((schema as JsonSchema).properties ?? {});
  return [...own, ...Object.values(schema).flatMap(propertyNames)];
}

// What never goes into an address line or a log of one.
const BODY_ONLY_FIELDS = ['studentNumber', 'email', 'code', 'fullName'];

describe('the identity route table', () => {
  it('has the 29 routes of the spec under /v1/identity', () => {
    expect(routes.map(key).sort()).toEqual([...SPEC_ROUTES].sort());
    for (const route of routes) {
      expect(route.module).toBe('identity');
      expect(route.path.startsWith('/v1/identity/'), route.name).toBe(true);
    }
  });

  it('declares roles on every route a session can call, and none on an anonymous-only one', () => {
    for (const route of routes) {
      const withSession = (route.auth as readonly string[]).includes('session');
      expect(route.roles !== undefined && route.roles.length > 0, route.name).toBe(withSession);
    }
    // The language route is for both kinds of account and not for a waiting session.
    expect(byKey('PUT /v1/identity/me/language')).toMatchObject({ roles: ['student', 'staff'] });
    expect(byKey('PUT /v1/identity/me/language')?.acceptsChangePending).toBeUndefined();
  });

  it('uses only the anonymous, session and heavy rate classes', () => {
    const used = routes.flatMap((route) =>
      typeof route.rate === 'string'
        ? [route.rate]
        : [route.rate.unauthenticated, route.rate.authenticated],
    );
    expect(new Set(used)).toEqual(new Set(['anonymous', 'session', 'heavy']));
  });

  it('lets login and the phone change request run with or without a session', () => {
    const split = routes.filter((route) => typeof route.rate !== 'string').map(key);
    expect(split.sort()).toEqual(['POST /v1/identity/device-change', 'POST /v1/identity/login']);
    for (const wanted of split) {
      expect(byKey(wanted)).toMatchObject({
        auth: ['anonymous', 'session'],
        rate: { unauthenticated: 'anonymous', authenticated: 'session' },
      });
    }
  });

  it("answers in the student's text on a student's anonymous routes", () => {
    const studentAudience = routes.filter((route) => route.audience === 'student').map(key);
    expect(studentAudience.sort()).toEqual([
      'POST /v1/identity/device-change',
      'POST /v1/identity/student/registration',
    ]);
  });

  it('lets a session waiting for a device change reach exactly the four listed routes', () => {
    const accepting = routes.filter((route) => route.acceptsChangePending === true).map(key);
    expect(accepting.sort()).toEqual(CHANGE_PENDING_ROUTES.map(key).sort());
    expect(accepting).toHaveLength(4);
  });

  it('takes only UUIDs as path parameters', () => {
    let params = 0;
    for (const route of routes) {
      if (route.request.params === undefined) continue;
      for (const [name, property] of Object.entries(
        jsonSchemaOf(route.request.params).properties ?? {},
      )) {
        expect(property.format, `${route.name}.${name}`).toBe('uuid');
        params += 1;
      }
    }
    // Ground control: the routes with a {param} were all seen.
    expect(params).toBe(routes.filter((route) => route.path.includes('{')).length);
  });

  it('keeps student numbers, addresses, codes and names in the body, never in the path or query', () => {
    const seenInBodies = new Set<string>();
    for (const route of routes) {
      const { params, query, headers, body } = route.request;
      for (const part of [params, query, headers]) {
        if (part === undefined) continue;
        const names = propertyNames(jsonSchemaOf(part));
        for (const field of BODY_ONLY_FIELDS) expect(names, route.name).not.toContain(field);
      }
      if (body !== undefined) {
        for (const name of propertyNames(jsonSchemaOf(body))) seenInBodies.add(name);
      }
    }
    // Positive control: the walk finds each of them where it belongs.
    for (const field of BODY_ONLY_FIELDS) expect(seenInBodies).toContain(field);
    expect(
      propertyNames(jsonSchemaOf(z.object({ a: z.array(z.object({ code: z.string() })) }))),
    ).toContain('code');
  });
});
