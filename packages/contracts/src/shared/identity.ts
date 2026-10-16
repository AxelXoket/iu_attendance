import { STUDENT_NUMBER, STUDENT_NUMBER_MAX_LENGTH } from '@iu-attendance/core/rosters/number';
import { z } from 'zod';

// Branded ids: an auth session id cannot be passed where a person id is expected.
export type Id<Name extends string> = string & { readonly __id: Name };
export type PersonId = Id<'Person'>;
export type AuthSessionId = Id<'AuthSession'>;
export type DeviceId = Id<'Device'>;
// The projection's id is its browser's (D11 projeksiyon_tarayicilari).
export type ProjectionId = Id<'ProjectionBrowser'>;
export type DeviceKeyId = Id<'DeviceKey'>;
export type UnitId = Id<'Unit'>;
export type RosterRowId = Id<'RosterRow'>;

// The length of a UUID in text form (8-4-4-4-12 hex digits and four dashes). The
// bound goes into the OpenAPI document: every request text has a maxLength (D13-B24).
export const UUID_LENGTH = 36;

// A branded UUID schema of any version, for an id whose version this system does not
// fix; the brand matches the Id types above, so ids of two kinds never mix.
export function idSchema<const Name extends string>(_name: Name): z.ZodType<Id<Name>, string> {
  return z.uuid().max(UUID_LENGTH) as unknown as z.ZodType<Id<Name>, string>;
}

// The same for a row id that is always a UUIDv7 (made by the client or by uuidv7() in the
// database): a reference of another version is a malformed request (400), not an unknown
// row (404).
export function v7IdSchema<const Name extends string>(_name: Name): z.ZodType<Id<Name>, string> {
  return z.uuidv7().max(UUID_LENGTH) as unknown as z.ZodType<Id<Name>, string>;
}

// The identity and projection rows other modules refer to. Every row id is a UUIDv7 made
// by the database (D12's table helper), whichever module names it.
export const authSessionIdSchema = v7IdSchema('AuthSession');
export const deviceIdSchema = v7IdSchema('Device');
export const deviceKeyIdSchema = v7IdSchema('DeviceKey');
export const projectionIdSchema = v7IdSchema('ProjectionBrowser');

// The rows several modules refer to: a person (the identity module), a unit (the courses
// module; roles are scoped to it) and a roster row (the rosters module).
export const personIdSchema = v7IdSchema('Person');
export const unitIdSchema = v7IdSchema('Unit');
export const rosterRowIdSchema = v7IdSchema('RosterRow');

// The replay key of a create operation (D13-B12): a UUIDv7 the client generates once
// per form or queue item, so a retried create finds its first write. It is neither an
// OAuth client id nor Identity.client.
export const clientIdSchema = z.uuidv7().max(UUID_LENGTH);

// A student number: 9 or 10 ASCII digits as text. It never goes into a path or query.
export const studentNumberSchema = z.string().max(STUDENT_NUMBER_MAX_LENGTH).regex(STUDENT_NUMBER);

export const PERSON_ROLES = ['student', 'lecturer', 'admin'] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];

export type RoleGrant = { role: PersonRole; scopeUnitId: UnitId | null };

// A session waiting for a device change reaches only the change pending routes.
export const SESSION_SCOPES = ['full', 'change_pending'] as const;

// The one identity type every module uses. identity's session check fills the first
// six fields. kind, deviceId, projectionId and client are D13's extra fields, written
// by identity for a session (a student session always with the deviceId it is bound
// to), by sync for a device signature and by projection for a projection browser;
// client follows from source.
export type Identity = {
  personId: PersonId | null;
  authSessionId: AuthSessionId | null;
  sessionScope: (typeof SESSION_SCOPES)[number] | null;
  source: 'bearer' | 'cookie' | 'signature' | 'projection';
  roles: readonly RoleGrant[];
  reviewAccount: boolean;
  kind: 'student' | 'staff' | 'device' | 'projection';
  deviceId: DeviceId | null;
  projectionId: ProjectionId | null;
  client: 'phone' | 'panel' | 'lectern';
};

const CLIENT_BY_SOURCE = {
  bearer: 'phone',
  signature: 'phone',
  cookie: 'panel',
  projection: 'lectern',
} as const satisfies Record<Identity['source'], Identity['client']>;

const roleGrantSchema = z.strictObject({
  role: z.enum(PERSON_ROLES),
  scopeUnitId: unitIdSchema.nullable(),
});

const identityShape = z.strictObject({
  personId: personIdSchema.nullable(),
  authSessionId: authSessionIdSchema.nullable(),
  sessionScope: z.enum(SESSION_SCOPES).nullable(),
  source: z.enum(['bearer', 'cookie', 'signature', 'projection']),
  roles: z.array(roleGrantSchema).readonly(),
  reviewAccount: z.boolean(),
  kind: z.enum(['student', 'staff', 'device', 'projection']),
  deviceId: deviceIdSchema.nullable(),
  projectionId: projectionIdSchema.nullable(),
  client: z.enum(['phone', 'panel', 'lectern']),
});

type IdentityShape = z.output<typeof identityShape>;

// The rules between fields; each returns a problem or null. The session rules follow
// identity's session table (D01 giris_oturumlari): a student session is phone only,
// is always bound to a device, and is the only session that may wait for a device
// change.
const IDENTITY_RULES: ReadonlyArray<(identity: IdentityShape) => string | null> = [
  (i) =>
    i.client === CLIENT_BY_SOURCE[i.source]
      ? null
      : `client must be ${CLIENT_BY_SOURCE[i.source]} for source ${i.source}`,
  (i) =>
    (i.authSessionId === null) === (i.sessionScope === null)
      ? null
      : 'authSessionId and sessionScope are both set or both null',
  (i) => {
    const singleStudentRole =
      i.roles.length === 1 && i.roles[0]?.role === 'student' && i.roles[0].scopeUnitId === null;
    return (i.kind === 'student' || i.kind === 'device') && !singleStudentRole
      ? 'a student or device identity has exactly one role { role: student, scopeUnitId: null }'
      : null;
  },
  (i) =>
    i.kind === 'staff' &&
    (i.roles.length === 0 || i.roles.some((grant) => grant.role === 'student'))
      ? 'a staff identity has at least one role and only lecturer or admin roles'
      : null,
  (i) =>
    i.kind === 'projection' &&
    (i.roles.length > 0 ||
      i.personId !== null ||
      i.projectionId === null ||
      i.authSessionId !== null)
      ? 'a projection identity has no roles, no person, no session and a projectionId'
      : null,
  (i) =>
    (i.kind === 'projection') === (i.source === 'projection')
      ? null
      : 'kind projection goes with source projection',
  (i) =>
    (i.kind === 'device') === (i.source === 'signature')
      ? null
      : 'kind device goes with source signature',
  // A student session is phone only (giris_oturumlari_istemci_ck), never the panel
  // cookie.
  (i) =>
    i.kind === 'student' && i.source !== 'bearer'
      ? 'a student identity comes from a bearer token'
      : null,
  // The device id: on a device identity the signing device; on a student identity the
  // device its session is bound to, which every student session has
  // (giris_oturumlari_cihaz_id_ck) and which is the clock attestation subject; never
  // on staff or projection.
  (i) =>
    (i.kind === 'student' || i.kind === 'device') && i.deviceId === null
      ? 'a student or device identity has a deviceId'
      : null,
  (i) =>
    (i.kind === 'staff' || i.kind === 'projection') && i.deviceId !== null
      ? 'a staff or projection identity has no deviceId'
      : null,
  (i) =>
    (i.kind === 'projection') === (i.projectionId !== null)
      ? null
      : 'only a projection identity has a projectionId',
  (i) =>
    i.kind !== 'projection' && i.personId === null ? 'a person identity has a personId' : null,
  (i) =>
    (i.kind === 'student' || i.kind === 'staff') && i.authSessionId === null
      ? 'a student or staff identity comes with an auth session'
      : null,
  // Only a student session waits for a device change (giris_oturumlari_kapsam_ck), and
  // the device-signed route never carries such a session into the identity (D13-B06).
  (i) =>
    i.kind !== 'student' && i.sessionScope === 'change_pending'
      ? 'only a student identity has sessionScope change_pending'
      : null,
];

// The runtime schema of Identity. In test mode the root hook checks every identity
// that identity returns against it.
export const identitySchema: z.ZodType<Identity> = identityShape.superRefine((identity, ctx) => {
  for (const rule of IDENTITY_RULES) {
    const problem = rule(identity);
    if (problem !== null) ctx.addIssue({ code: 'custom', message: problem });
  }
}) as unknown as z.ZodType<Identity>;
