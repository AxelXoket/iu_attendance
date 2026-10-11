import { describe, expect, it } from 'vitest';
import { type Identity, identitySchema } from '../identity.ts';

const PERSON = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e';
const SESSION = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0f';
const DEVICE = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d10';
const PROJECTION = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d11';
const UNIT = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d12';

// A student session on the phone, bound to its device as every student session is.
const student = {
  personId: PERSON,
  authSessionId: SESSION,
  sessionScope: 'full',
  source: 'bearer',
  roles: [{ role: 'student', scopeUnitId: null }],
  reviewAccount: false,
  kind: 'student',
  deviceId: DEVICE,
  projectionId: null,
  client: 'phone',
};

const staff = {
  ...student,
  source: 'cookie',
  client: 'panel',
  kind: 'staff',
  deviceId: null,
  roles: [
    { role: 'admin', scopeUnitId: null },
    { role: 'lecturer', scopeUnitId: UNIT },
  ],
};

const device = { ...student, source: 'signature', kind: 'device', deviceId: DEVICE };

const deviceWithoutSession = { ...device, authSessionId: null, sessionScope: null };

const projection = {
  personId: null,
  authSessionId: null,
  sessionScope: null,
  source: 'projection',
  roles: [],
  reviewAccount: false,
  kind: 'projection',
  deviceId: null,
  projectionId: PROJECTION,
  client: 'lectern',
};

// Every field rule message, as the schema reports it.
const client = (expected: string, source: string) =>
  `client must be ${expected} for source ${source}`;
const SESSION_PAIR = 'authSessionId and sessionScope are both set or both null';
const ONE_STUDENT_ROLE =
  'a student or device identity has exactly one role { role: student, scopeUnitId: null }';
const STAFF_ROLES = 'a staff identity has at least one role and only lecturer or admin roles';
const PROJECTION_FIELDS =
  'a projection identity has no roles, no person, no session and a projectionId';
const PROJECTION_SOURCE = 'kind projection goes with source projection';
const SIGNATURE_SOURCE = 'kind device goes with source signature';
const BEARER_SOURCE = 'a student identity comes from a bearer token';
const HAS_DEVICE = 'a student or device identity has a deviceId';
const NO_DEVICE = 'a staff or projection identity has no deviceId';
const PROJECTION_ID = 'only a projection identity has a projectionId';
const PERSON_ID = 'a person identity has a personId';
const AUTH_SESSION = 'a student or staff identity comes with an auth session';
const CHANGE_PENDING = 'only a student identity has sessionScope change_pending';

// The messages of the field rules that reject a value, sorted; empty when accepted.
const problems = (value: unknown) => {
  const result = identitySchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message).sort();
};

// The path and code of each issue the object shape reports.
const shapeIssues = (value: unknown) => {
  const result = identitySchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((issue) => [issue.path.join('.'), issue.code]);
};

describe('Identity object fits one schema', () => {
  it.each([
    ['a student bound to its device', student],
    [
      'a student session waiting for a device change',
      { ...student, sessionScope: 'change_pending' },
    ],
    ['a student review account', { ...student, reviewAccount: true }],
    ['staff with an all-units admin role and a unit-scoped lecturer role', staff],
    ['staff on the phone', { ...staff, source: 'bearer', client: 'phone' }],
    ['a device with a session', device],
    ['a device without a session', deviceWithoutSession],
    ['a projection with no roles', projection],
  ])('accepts %s', (_name, value) => {
    expect(problems(value)).toEqual([]);
  });

  // The shape rejects these before any field rule runs; each names its one issue as
  // [path, code].
  it.each([
    ['a field named sessionId', { ...student, sessionId: SESSION }, ['', 'unrecognized_keys']],
    ['roles as a list of strings', { ...staff, roles: ['lecturer'] }, ['roles.0', 'invalid_type']],
    [
      'a role without scopeUnitId',
      { ...staff, roles: [{ role: 'lecturer' }] },
      ['roles.0.scopeUnitId', 'invalid_type'],
    ],
    [
      'an unknown role',
      { ...staff, roles: [{ role: 'guest', scopeUnitId: null }] },
      ['roles.0.role', 'invalid_value'],
    ],
    [
      'a role with a key besides role and scopeUnitId',
      { ...staff, roles: [{ role: 'lecturer', scopeUnitId: null, extra: 1 }] },
      ['roles.0', 'unrecognized_keys'],
    ],
    [
      'an identity without reviewAccount',
      Object.fromEntries(Object.entries(student).filter(([key]) => key !== 'reviewAccount')),
      ['reviewAccount', 'invalid_type'],
    ],
  ] as Array<[string, Record<string, unknown>, [string, string]]>)(
    'rejects %s',
    (_name, value, issue) => {
      expect(shapeIssues(value)).toEqual([issue]);
    },
  );

  // Each value lists every field rule it breaks. Every rule has a value for each kind
  // (or source) it constrains, most breaking that rule alone, so a rule that loses a
  // kind turns its row red.
  it.each([
    ['a student on the panel client', { ...student, client: 'panel' }, [client('phone', 'bearer')]],
    [
      'staff on the cookie with the phone client',
      { ...staff, client: 'phone' },
      [client('panel', 'cookie')],
    ],
    [
      'a device on the lectern client',
      { ...device, client: 'lectern' },
      [client('phone', 'signature')],
    ],
    [
      'a projection on the panel client',
      { ...projection, client: 'panel' },
      [client('lectern', 'projection')],
    ],

    ['a student session id without a scope', { ...student, sessionScope: null }, [SESSION_PAIR]],
    ['a staff session id without a scope', { ...staff, sessionScope: null }, [SESSION_PAIR]],
    [
      'a device scope without a session id',
      { ...deviceWithoutSession, sessionScope: 'full' },
      [SESSION_PAIR],
    ],
    [
      'a projection scope without a session id',
      { ...projection, sessionScope: 'full' },
      [SESSION_PAIR],
    ],

    [
      'a student with a lecturer role',
      { ...student, roles: [{ role: 'lecturer', scopeUnitId: null }] },
      [ONE_STUDENT_ROLE],
    ],
    [
      'a student with two roles',
      { ...student, roles: [...student.roles, { role: 'student', scopeUnitId: null }] },
      [ONE_STUDENT_ROLE],
    ],
    ['a student without roles', { ...student, roles: [] }, [ONE_STUDENT_ROLE]],
    [
      'a student role scoped to a unit',
      { ...student, roles: [{ role: 'student', scopeUnitId: UNIT }] },
      [ONE_STUDENT_ROLE],
    ],
    ['a device without roles', { ...device, roles: [] }, [ONE_STUDENT_ROLE]],
    [
      'a device with a lecturer role',
      { ...device, roles: [{ role: 'lecturer', scopeUnitId: null }] },
      [ONE_STUDENT_ROLE],
    ],
    [
      'a device student role scoped to a unit',
      { ...device, roles: [{ role: 'student', scopeUnitId: UNIT }] },
      [ONE_STUDENT_ROLE],
    ],

    ['staff without roles', { ...staff, roles: [] }, [STAFF_ROLES]],
    [
      'staff with only a student role',
      { ...staff, roles: [{ role: 'student', scopeUnitId: null }] },
      [STAFF_ROLES],
    ],
    [
      'staff with a student role next to admin',
      { ...staff, roles: [...staff.roles, { role: 'student', scopeUnitId: null }] },
      [STAFF_ROLES],
    ],

    ['a projection with a person', { ...projection, personId: PERSON }, [PROJECTION_FIELDS]],
    [
      'a projection with roles',
      { ...projection, roles: [{ role: 'admin', scopeUnitId: null }] },
      [PROJECTION_FIELDS],
    ],
    [
      'a projection with an auth session',
      { ...projection, authSessionId: SESSION, sessionScope: 'full' },
      [PROJECTION_FIELDS],
    ],
    [
      'a projection without its id',
      { ...projection, projectionId: null },
      [PROJECTION_FIELDS, PROJECTION_ID],
    ],

    [
      'a projection kind from a bearer source',
      { ...projection, source: 'bearer', client: 'phone' },
      [PROJECTION_SOURCE],
    ],
    [
      'a staff kind from a projection source',
      { ...staff, source: 'projection', client: 'lectern' },
      [PROJECTION_SOURCE],
    ],
    [
      'a student kind from a projection source',
      { ...student, source: 'projection', client: 'lectern' },
      [PROJECTION_SOURCE, BEARER_SOURCE],
    ],
    [
      'a device kind from a projection source',
      { ...device, source: 'projection', client: 'lectern' },
      [PROJECTION_SOURCE, SIGNATURE_SOURCE],
    ],

    ['a device kind from a bearer source', { ...device, source: 'bearer' }, [SIGNATURE_SOURCE]],
    [
      'a staff kind from a signature source',
      { ...staff, source: 'signature', client: 'phone' },
      [SIGNATURE_SOURCE],
    ],
    [
      'a student kind from a signature source',
      { ...student, source: 'signature' },
      [SIGNATURE_SOURCE, BEARER_SOURCE],
    ],
    [
      'a projection kind from a signature source',
      { ...projection, source: 'signature', client: 'phone' },
      [PROJECTION_SOURCE, SIGNATURE_SOURCE],
    ],

    [
      'a student on the panel cookie',
      { ...student, source: 'cookie', client: 'panel' },
      [BEARER_SOURCE],
    ],

    ['a student session without its device id', { ...student, deviceId: null }, [HAS_DEVICE]],
    ['a device signed without a device id', { ...device, deviceId: null }, [HAS_DEVICE]],
    ['a device id on a staff identity', { ...staff, deviceId: DEVICE }, [NO_DEVICE]],
    ['a device id on a projection identity', { ...projection, deviceId: DEVICE }, [NO_DEVICE]],

    [
      'a projection id on a student identity',
      { ...student, projectionId: PROJECTION },
      [PROJECTION_ID],
    ],
    [
      'a projection id on a staff identity',
      { ...staff, projectionId: PROJECTION },
      [PROJECTION_ID],
    ],
    [
      'a projection id on a device identity',
      { ...device, projectionId: PROJECTION },
      [PROJECTION_ID],
    ],

    ['a student without a person id', { ...student, personId: null }, [PERSON_ID]],
    ['staff without a person id', { ...staff, personId: null }, [PERSON_ID]],
    ['a device without a person id', { ...device, personId: null }, [PERSON_ID]],

    [
      'a student session without a session id',
      { ...student, authSessionId: null, sessionScope: null },
      [AUTH_SESSION],
    ],
    [
      'a staff session without a session id',
      { ...staff, authSessionId: null, sessionScope: null },
      [AUTH_SESSION],
    ],

    [
      'a staff session waiting for a device change',
      { ...staff, sessionScope: 'change_pending' },
      [CHANGE_PENDING],
    ],
    [
      'a device carrying a session that waits for a device change',
      { ...device, sessionScope: 'change_pending' },
      [CHANGE_PENDING],
    ],
    [
      'a projection carrying a session that waits for a device change',
      { ...projection, authSessionId: SESSION, sessionScope: 'change_pending' },
      [PROJECTION_FIELDS, CHANGE_PENDING],
    ],
  ] as Array<[string, Record<string, unknown>, string[]]>)(
    'rejects %s',
    (_name, value, expected) => {
      expect(problems(value)).toEqual([...expected].sort());
    },
  );

  it('returns the parsed identity unchanged for a valid input', () => {
    const parsed: Identity = identitySchema.parse(staff);
    expect(parsed).toEqual(staff);
  });
});
