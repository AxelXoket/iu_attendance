import type { z } from 'zod';
import { MODULES, type ModuleName, routePathPrefix } from './modules.ts';
import type { RateClassName } from './rate.ts';

// The six allowed auth combinations of a route; any other stops startup.
// [anonymous, projection] is only the pairing code endpoint of projection.
export type AuthCombination =
  | readonly ['anonymous']
  | readonly ['anonymous', 'session']
  | readonly ['session']
  | readonly ['deviceSignature', 'session']
  | readonly ['projection']
  | readonly ['anonymous', 'projection'];

export const AUTH_COMBINATIONS: readonly AuthCombination[] = [
  ['anonymous'],
  ['anonymous', 'session'],
  ['session'],
  ['deviceSignature', 'session'],
  ['projection'],
  ['anonymous', 'projection'],
];

export const ROUTE_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export const ROUTE_ROLES = ['student', 'staff', 'lecturer', 'admin'] as const;
// 202 answers work that is accepted but not done in the request (identity's code and
// application requests); 204 has no body.
export const SUCCESS_STATUSES = [200, 201, 202, 204] as const;
export type SuccessStatus = (typeof SUCCESS_STATUSES)[number];

// Paths outside the /v1/<module> prefix.
export const ROOT_PATHS = ['/health/live', '/health/ready', '/v1/status', '/v1/version'] as const;

// A route without a bodyLimit takes at most 64 KiB; a declared limit is at most 2 MiB.
export const BODY_LIMIT_DEFAULT_BYTES = 64 * 1024;
export const BODY_LIMIT_MAX_BYTES = 2 * 1024 * 1024;

// The access of most routes: a signed-in caller of one role, at a rate class (the session
// rate unless named). Route files spread it into defineRoute.
export function sessionAccess<
  const Role extends (typeof ROUTE_ROLES)[number],
  const Rate extends RateClassName = 'session',
>(role: Role, rate: Rate = 'session' as Rate) {
  return { auth: ['session'], roles: [role], rate } as const;
}

// The access of a route anyone may call, at the anonymous rate.
export const ANONYMOUS_ACCESS = { auth: ['anonymous'], rate: 'anonymous' } as const;

// One row of the route table. Every module writes its routes in its own contract
// file in this form; the same object goes to route registration on the server and
// to the client's call helper, so method, path and schemas come from one source.
export interface RouteDefinition {
  module: ModuleName;
  name: string;
  method: (typeof ROUTE_METHODS)[number];
  path: string;
  auth: AuthCombination;
  roles?: readonly (typeof ROUTE_ROLES)[number][];
  acceptsChangePending?: true;
  authSources?: readonly ('bearer' | 'cookie')[];
  // Whose error text an anonymous caller reads (D13-B03): 'student' on the student
  // routes; 'lecturer', like no audience, is the staff text.
  audience?: 'student' | 'lecturer';
  rate: RateClassName | { unauthenticated: 'anonymous'; authenticated: RateClassName };
  bodyLimit?: number;
  request: { params?: z.ZodObject; query?: z.ZodObject; body?: z.ZodType; headers?: z.ZodObject };
  response: { statuses: readonly [SuccessStatus, ...SuccessStatus[]]; schema: z.ZodType | null };
  errors: readonly string[];
  writesOnRead?: true;
  clockAttestation?: boolean;
  clientResponseCheck?: boolean;
  pressureExempt?: boolean;
  summary: string;
}

// The request parts a route declares, as the client passes them.
export type RouteInput<R extends RouteDefinition> = {
  [P in keyof R['request']]: z.input<NonNullable<R['request'][P]>>;
};

// T with every key that Shape lacks typed never, so an unknown key does not compile.
type OnlyKnownKeys<T, Shape> = T & Record<Exclude<keyof T, keyof Shape>, never>;

type SplitRate = Exclude<RouteDefinition['rate'], string>;

// A rate class name as it is, a split rate without keys outside SplitRate.
type KnownRateKeys<T> = T extends string ? T : OnlyKnownKeys<T, SplitRate>;

// A route literal with no key outside RouteDefinition, also inside request, response
// and a split rate: a misspelled optional key (authSource for authSources) would
// otherwise compile and silently keep its default.
export type KnownRouteKeys<R extends RouteDefinition> = OnlyKnownKeys<R, RouteDefinition> & {
  request: OnlyKnownKeys<R['request'], RouteDefinition['request']>;
  response: OnlyKnownKeys<R['response'], RouteDefinition['response']>;
  rate: KnownRateKeys<R['rate']>;
};

// The same key lists at runtime, for definitions built without a literal type.
const ROUTE_KEYS: Record<keyof RouteDefinition, true> = {
  module: true,
  name: true,
  method: true,
  path: true,
  auth: true,
  roles: true,
  acceptsChangePending: true,
  authSources: true,
  audience: true,
  rate: true,
  bodyLimit: true,
  request: true,
  response: true,
  errors: true,
  writesOnRead: true,
  clockAttestation: true,
  clientResponseCheck: true,
  pressureExempt: true,
  summary: true,
};
const REQUEST_KEYS: Record<keyof RouteDefinition['request'], true> = {
  params: true,
  query: true,
  body: true,
  headers: true,
};
const RESPONSE_KEYS: Record<keyof RouteDefinition['response'], true> = {
  statuses: true,
  schema: true,
};
const SPLIT_RATE_KEYS: Record<keyof SplitRate, true> = {
  unauthenticated: true,
  authenticated: true,
};

const LITERAL_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PARAM_SEGMENT = /^\{([a-z][A-Za-z0-9]*)\}$/;

const sameCombination = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((part, index) => part === b[index]);

function unknownKeyProblems(route: RouteDefinition): string[] {
  const parts: Array<[string, object, object]> = [
    ['', route, ROUTE_KEYS],
    ['request.', route.request, REQUEST_KEYS],
    ['response.', route.response, RESPONSE_KEYS],
  ];
  if (typeof route.rate === 'object') parts.push(['rate.', route.rate, SPLIT_RATE_KEYS]);
  return parts.flatMap(([prefix, value, known]) =>
    Object.keys(value)
      .filter((key) => !Object.hasOwn(known, key))
      .map((key) => `unknown key ${prefix}${key}`),
  );
}

function pathProblems(route: RouteDefinition): string[] {
  const { path, module } = route;
  if ((ROOT_PATHS as readonly string[]).includes(path)) return [];
  const problems: string[] = [];
  const prefix = routePathPrefix(module);
  if (path !== prefix.slice(0, -1) && !path.startsWith(prefix)) {
    problems.push(`path must start with ${prefix} or be one of ${ROOT_PATHS.join(', ')}`);
  }
  const segments = path.split('/').slice(1);
  if (
    !path.startsWith('/') ||
    segments.some((segment) => !LITERAL_SEGMENT.test(segment) && !PARAM_SEGMENT.test(segment))
  ) {
    problems.push('path segments are lower case ASCII words with dashes or {camelCase} parameters');
  }
  if (segments.includes('admin')) {
    if (!(route.roles?.length === 1 && route.roles[0] === 'admin')) {
      problems.push('an /admin/ path requires exactly the admin role');
    }
    // Only a signed-in session holds the admin role: anonymous and projection callers
    // hold none, and a device identity (which wins when a signature validates too)
    // holds only the student role.
    if (!sameCombination(route.auth, ['session'])) {
      problems.push('an /admin/ path needs auth exactly [session]');
    }
  }
  return problems;
}

// The {param} names of the path and the keys of request.params are the same set.
function paramProblems(route: RouteDefinition): string[] {
  const names = route.path.split('/').flatMap((segment) => {
    const name = PARAM_SEGMENT.exec(segment)?.[1];
    return name === undefined ? [] : [name];
  });
  const params = route.request.params;
  if (params === undefined) {
    return names.length === 0 ? [] : ['a path with {param} segments needs a request.params schema'];
  }
  const shape: unknown = (params as { shape?: unknown }).shape;
  if (typeof shape !== 'object' || shape === null) return ['request.params must be a z.object'];
  const problems: string[] = [];
  if (new Set(names).size !== names.length) problems.push('path parameter names are unique');
  const keys = Object.keys(shape);
  if (keys.length !== new Set(names).size || keys.some((key) => !names.includes(key))) {
    problems.push(
      `path parameters {${names.join(', ')}} and request.params keys {${keys.join(', ')}} differ`,
    );
  }
  return problems;
}

function declarationProblems(route: RouteDefinition): string[] {
  const problems: string[] = [];
  const auth = route.auth as readonly string[];
  if (!AUTH_COMBINATIONS.some((combination) => sameCombination(combination, auth))) {
    problems.push(`auth ${JSON.stringify(auth)} is not an allowed combination`);
  }
  if (!(ROUTE_METHODS as readonly string[]).includes(route.method))
    problems.push(`method ${route.method} is not allowed`);
  if (route.name.trim() === '' || route.summary.trim() === '')
    problems.push('name and summary are required');
  // An empty list is never meant: roles or authSources would close the route to every
  // caller, statuses would leave it no answer.
  for (const [name, list] of [
    ['roles', route.roles],
    ['authSources', route.authSources],
    ['response.statuses', route.response.statuses],
  ] as const) {
    if (list !== undefined && list.length === 0) problems.push(`${name} must not be empty`);
  }
  if (route.acceptsChangePending === true && route.module !== 'identity') {
    problems.push('acceptsChangePending is allowed only on identity routes');
  }
  if (route.authSources !== undefined && !auth.includes('session')) {
    problems.push('authSources is allowed only on routes whose auth includes session');
  }
  if (route.writesOnRead === true && route.method !== 'GET')
    problems.push('writesOnRead is allowed only on GET');
  if (route.audience !== undefined && !auth.includes('anonymous')) {
    problems.push('audience is allowed only on routes whose auth includes anonymous');
  }
  if (typeof route.rate === 'object' && !sameCombination(auth, ['anonymous', 'session'])) {
    problems.push('a split rate is allowed only for auth [anonymous, session]');
  }
  const { statuses, schema } = route.response;
  if (new Set(statuses).size !== statuses.length) problems.push('response statuses must be unique');
  if (statuses.some((status) => !(SUCCESS_STATUSES as readonly number[]).includes(status))) {
    problems.push(`response statuses are ${SUCCESS_STATUSES.join(', ')}`);
  }
  if (statuses.includes(204) && (statuses.length !== 1 || schema !== null)) {
    problems.push('204 stands alone and has no response schema');
  }
  // The answer root is always an object, and the schema filters it (D13-B14, B25).
  if (statuses.some((status) => status !== 204) && schema === null) {
    problems.push('a status other than 204 needs a response schema');
  }
  if (
    route.bodyLimit !== undefined &&
    (!Number.isInteger(route.bodyLimit) ||
      route.bodyLimit <= 0 ||
      route.bodyLimit > BODY_LIMIT_MAX_BYTES)
  ) {
    problems.push(`bodyLimit must be a positive integer of at most ${BODY_LIMIT_MAX_BYTES} bytes`);
  }
  return problems;
}

// Every module defines its routes with this. Unknown keys, the path form, the prefix
// rule, the path parameters and the declaration rules are checked when the route is
// defined; a broken rule throws with the module and the route name. The complete set
// of change-pending routes is compared later, on the full route table, not here.
export function defineRoute<const R extends RouteDefinition>(definition: R & KnownRouteKeys<R>): R {
  if (!(MODULES as readonly string[]).includes(definition.module)) {
    throw new Error(`Route ${definition.name}: unknown module ${String(definition.module)}`);
  }
  const problems = [
    ...unknownKeyProblems(definition),
    ...pathProblems(definition),
    ...paramProblems(definition),
    ...declarationProblems(definition),
  ];
  if (problems.length > 0) {
    throw new Error(
      `Route ${definition.module}.${definition.name} (${definition.method} ${definition.path}) is invalid:\n  ${problems.join('\n  ')}`,
    );
  }
  return definition;
}
