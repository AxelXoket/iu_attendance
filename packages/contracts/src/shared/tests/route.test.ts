import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  BODY_LIMIT_MAX_BYTES,
  defineRoute,
  type RouteDefinition,
  SUCCESS_STATUSES,
} from '../route.ts';

const base = {
  module: 'identity',
  name: 'changePassword',
  method: 'POST',
  path: '/v1/identity/me/password',
  auth: ['session'],
  rate: 'session',
  request: { body: z.object({ password: z.string() }) },
  response: { statuses: [204], schema: null },
  errors: [],
  summary: 'Changes the password of the signed-in person.',
} as const satisfies RouteDefinition;

const answer = z.object({ validForSeconds: z.number().int() });
const personParams = z.object({ personId: z.uuid() });

const define = (overrides: Partial<RouteDefinition>) =>
  defineRoute({ ...base, ...overrides } as RouteDefinition);

describe('Change-pending declaration is accepted at definition time only in the identity module', () => {
  it('returns an identity route that accepts change-pending sessions unchanged', () => {
    const route = { ...base, acceptsChangePending: true } as const;
    expect(defineRoute(route)).toBe(route);
  });

  it('throws for the same declaration on a courses route and names the module and route', () => {
    expect(() =>
      define({
        module: 'courses',
        name: 'closeSession',
        path: '/v1/courses/sessions',
        acceptsChangePending: true,
      }),
    ).toThrow(/courses\.closeSession.*\n.*acceptsChangePending/);
  });

  it('accepts the courses route without the declaration', () => {
    expect(() =>
      define({ module: 'courses', name: 'closeSession', path: '/v1/courses/sessions' }),
    ).not.toThrow();
  });
});

describe('route definition rules', () => {
  it.each([
    ['the module root path', { module: 'courses', path: '/v1/courses' }],
    [
      'a nested path whose parameter matches request.params',
      {
        path: '/v1/identity/people/{personId}/roles',
        request: { params: personParams, body: base.request.body },
      },
    ],
    ['a root path outside the prefix', { module: 'operations', path: '/health/live' }],
    ['a session route without roles', {}],
    ['a session route with one role', { roles: ['lecturer'] }],
    [
      'an admin path with only the admin role on a session route',
      { path: '/v1/identity/admin/people', roles: ['admin'] },
    ],
    ['auth sources on a session route', { authSources: ['bearer'] }],
    ['writesOnRead on GET', { method: 'GET', writesOnRead: true }],
    [
      'an audience on an anonymous route',
      { auth: ['anonymous'], audience: 'student', rate: 'anonymous' },
    ],
    [
      'a split rate on [anonymous, session]',
      {
        auth: ['anonymous', 'session'],
        rate: { unauthenticated: 'anonymous', authenticated: 'session' },
      },
    ],
    ['a body limit of exactly 2 MiB', { bodyLimit: BODY_LIMIT_MAX_BYTES }],
    ['a body limit of one byte', { bodyLimit: 1 }],
    ['two success statuses with a schema', { response: { statuses: [200, 201], schema: answer } }],
    ['202 with a schema', { response: { statuses: [202], schema: answer } }],
    [
      'every success status but 204 together',
      { response: { statuses: [200, 201, 202], schema: answer } },
    ],
  ] as Array<[string, Partial<RouteDefinition>]>)('accepts %s', (_name, overrides) => {
    expect(() => define(overrides)).not.toThrow();
  });

  it.each([
    ['another module prefix', { path: '/v1/courses/x' }, 'path must start with /v1/identity/'],
    ['a prefix look-alike', { path: '/v1/identityx/me' }, 'path must start with /v1/identity/'],
    ['upper case in a segment', { path: '/v1/identity/Me' }, 'path segments'],
    ['a snake_case segment', { path: '/v1/identity/my_password' }, 'path segments'],
    ['a trailing slash', { path: '/v1/identity/me/' }, 'path segments'],
    ['a non-ASCII segment', { path: '/v1/identity/şifre' }, 'path segments'],
    ['a parameter in PascalCase', { path: '/v1/identity/people/{PersonId}' }, 'path segments'],
    ['a parameter in snake_case', { path: '/v1/identity/people/{person_id}' }, 'path segments'],
    ['an empty parameter', { path: '/v1/identity/people/{}' }, 'path segments'],
    [
      'an admin path for lecturers',
      { path: '/v1/identity/admin/people', roles: ['admin', 'lecturer'] },
      'an /admin/ path requires exactly the admin role',
    ],
    [
      'an admin path open to anonymous callers',
      {
        path: '/v1/identity/admin/people',
        roles: ['admin'],
        auth: ['anonymous'],
        rate: 'anonymous',
      },
      'an /admin/ path needs auth exactly [session]',
    ],
    [
      'an admin path on [anonymous, session]',
      { path: '/v1/identity/admin/people', roles: ['admin'], auth: ['anonymous', 'session'] },
      'an /admin/ path needs auth exactly [session]',
    ],
    [
      'an admin path on a device-signed route, where a device identity wins and has no admin role',
      { path: '/v1/identity/admin/people', roles: ['admin'], auth: ['deviceSignature', 'session'] },
      'an /admin/ path needs auth exactly [session]',
    ],
    [
      'an admin path on [anonymous, projection]',
      {
        path: '/v1/identity/admin/people',
        roles: ['admin'],
        auth: ['anonymous', 'projection'],
        rate: 'anonymous',
      },
      'an /admin/ path needs auth exactly [session]',
    ],
    [
      'an admin path on a projection route',
      {
        path: '/v1/identity/admin/people',
        roles: ['admin'],
        auth: ['projection'],
        rate: 'projection',
      },
      'an /admin/ path needs auth exactly [session]',
    ],
    [
      'an auth combination outside the six',
      { auth: ['session', 'anonymous'] },
      'not an allowed combination',
    ],
    ['a method outside the list', { method: 'HEAD' }, 'method HEAD is not allowed'],
    [
      'auth sources without session',
      { auth: ['anonymous'], rate: 'anonymous', authSources: ['cookie'] },
      'authSources',
    ],
    ['writesOnRead on POST', { writesOnRead: true }, 'writesOnRead'],
    ['an audience on a session route', { audience: 'lecturer' }, 'audience'],
    ...(
      [
        ['session'],
        ['anonymous'],
        ['deviceSignature', 'session'],
        ['projection'],
        ['anonymous', 'projection'],
      ] as const
    ).map((auth): [string, Partial<RouteDefinition>, string] => [
      `a split rate on ${JSON.stringify(auth)}`,
      { auth, rate: { unauthenticated: 'anonymous', authenticated: 'session' } },
      'a split rate is allowed only for auth [anonymous, session]',
    ]),
    [
      '204 with another status',
      { response: { statuses: [204, 200], schema: null } },
      '204 stands alone',
    ],
    ['204 with a schema', { response: { statuses: [204], schema: answer } }, '204 stands alone'],
    ['a repeated status', { response: { statuses: [200, 200], schema: answer } }, 'unique'],
    [
      'a status outside the success list',
      { response: { statuses: [203], schema: answer } },
      `response statuses are ${SUCCESS_STATUSES.join(', ')}`,
    ],
    [
      '200 without a response schema',
      { response: { statuses: [200], schema: null } },
      'a status other than 204 needs a response schema',
    ],
    [
      '201 without a response schema',
      { response: { statuses: [201], schema: null } },
      'a status other than 204 needs a response schema',
    ],
    [
      '202 without a response schema',
      { response: { statuses: [202], schema: null } },
      'a status other than 204 needs a response schema',
    ],
    ['a body limit above 2 MiB', { bodyLimit: BODY_LIMIT_MAX_BYTES + 1 }, 'bodyLimit'],
    ['a fractional body limit', { bodyLimit: 1.5 }, 'bodyLimit'],
    ['a body limit of zero', { bodyLimit: 0 }, 'bodyLimit'],
    ['a negative body limit', { bodyLimit: -1 }, 'bodyLimit'],
    ['an empty summary', { summary: ' ' }, 'name and summary'],
    ['a blank name', { name: ' ' }, 'name and summary are required'],
    ['an empty name', { name: '' }, 'name and summary are required'],
    ['an empty roles list', { roles: [] }, 'roles must not be empty'],
    ['an empty authSources list', { authSources: [] }, 'authSources must not be empty'],
    [
      'an empty status list',
      { response: { statuses: [], schema: null } } as unknown as Partial<RouteDefinition>,
      'response.statuses must not be empty',
    ],
    [
      'a path parameter without a request.params schema',
      { path: '/v1/identity/people/{personId}' },
      'a path with {param} segments needs a request.params schema',
    ],
    [
      'request.params keys that differ from the path parameter',
      {
        path: '/v1/identity/people/{personId}',
        request: { params: z.object({ id: z.uuid() }), body: base.request.body },
      },
      'path parameters {personId} and request.params keys {id} differ',
    ],
    [
      'request.params on a path without parameters',
      { request: { params: personParams, body: base.request.body } },
      'path parameters {} and request.params keys {personId} differ',
    ],
    [
      'the same parameter twice in the path',
      {
        path: '/v1/identity/people/{personId}/links/{personId}',
        request: { params: personParams, body: base.request.body },
      },
      'path parameter names are unique',
    ],
    [
      'a misspelled top-level key',
      { authSource: ['bearer'] } as Partial<RouteDefinition>,
      'unknown key authSource',
    ],
    [
      'a misspelled request key',
      { request: { parms: personParams } } as unknown as Partial<RouteDefinition>,
      'unknown key request.parms',
    ],
    [
      'an extra response key',
      { response: { statuses: [204], schema: null, headers: {} } } as Partial<RouteDefinition>,
      'unknown key response.headers',
    ],
    [
      'an extra split-rate key',
      {
        auth: ['anonymous', 'session'],
        rate: { unauthenticated: 'anonymous', authenticated: 'session', burst: 5 },
      } as Partial<RouteDefinition>,
      'unknown key rate.burst',
    ],
  ] as Array<[string, Partial<RouteDefinition>, string]>)(
    'rejects %s',
    (_name, overrides, reason) => {
      expect(() => define(overrides)).toThrow(reason);
    },
  );

  it('rejects an unknown module', () => {
    expect(() => define({ module: 'guests' as RouteDefinition['module'] })).toThrow(
      'unknown module guests',
    );
  });
});

describe('Unknown route keys are compile errors as well as runtime errors', () => {
  it('rejects a misspelled optional key that would silently keep its default', () => {
    const typo = { ...base, authSource: ['bearer'] } as const;
    // @ts-expect-error authSource is not a route key (authSources is)
    expect(() => defineRoute(typo)).toThrow('unknown key authSource');
    // Ground control: the right spelling compiles and is kept.
    expect(defineRoute({ ...base, authSources: ['bearer'] }).authSources).toEqual(['bearer']);
  });

  it('rejects unknown keys inside request and response', () => {
    const request = { ...base, request: { ...base.request, parms: personParams } } as const;
    // @ts-expect-error parms is not a request key (params is)
    expect(() => defineRoute(request)).toThrow('unknown key request.parms');
    const response = { ...base, response: { ...base.response, headers: {} } } as const;
    // @ts-expect-error headers is not a response key
    expect(() => defineRoute(response)).toThrow('unknown key response.headers');
  });

  it('rejects an unknown key inside a split rate', () => {
    const split = { unauthenticated: 'anonymous', authenticated: 'session' } as const;
    const auth = ['anonymous', 'session'] as const;
    const burst = { ...base, auth, rate: { ...split, burst: 5 } } as const;
    // @ts-expect-error burst is not a split-rate key
    expect(() => defineRoute(burst)).toThrow('unknown key rate.burst');
    // Ground control: the split rate itself compiles and is kept.
    expect(defineRoute({ ...base, auth, rate: split }).rate).toBe(split);
  });
});
