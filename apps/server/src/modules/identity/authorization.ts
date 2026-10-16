import type { StaffRole } from '@iu-attendance/contracts/identity';
import type { Identity, UnitId } from '@iu-attendance/contracts/shared';
import { idKey } from '@iu-attendance/core/shared/uuid';

// The admin scope check modules run inside their services (D01). The route declaration
// already refused a caller without the route's role (401 API_AUTH_REQUIRED, 403
// API_ROLE_FORBIDDEN); this answers whether the identity holds a role and, for an admin,
// whether its scope covers a unit. A false turns into the caller module's own 404
// <MODULE>_NOT_FOUND, so a resource outside the scope looks missing. Whether the caller
// teaches a given course is the courses module's question, not this one.

/**
 * True when the identity holds the role. For the admin role a given scope must also be
 * covered: a grant scoped to null covers every unit, a unit grant only its unit (in either
 * case of the UUID), and a target with no unit (unitId null) only a university-wide
 * grant. A lecturer grant has no scope, so a scope given with that role is not checked.
 */
export function isAuthorized(
  identity: Identity,
  role: StaffRole,
  scope?: { unitId: UnitId | null },
): boolean {
  return identity.roles.some(
    (grant) =>
      grant.role === role &&
      (role !== 'admin' ||
        scope === undefined ||
        grant.scopeUnitId === null ||
        (typeof scope.unitId === 'string' && idKey(grant.scopeUnitId) === idKey(scope.unitId))),
  );
}
