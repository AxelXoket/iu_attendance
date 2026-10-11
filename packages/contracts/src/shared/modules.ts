// The fifteen module names in one list. ModuleName derives from it, and both the
// error code prefix (errorCodePrefix) and the route path prefix (/v1/<module>) do too.
export const MODULES = [
  'identity',
  'courses',
  'rosters',
  'clock',
  'attendance',
  'sync',
  'verification',
  'absence',
  'corrections',
  'reports',
  'projection',
  'database',
  'api',
  'jobs',
  'operations',
] as const;

export type ModuleName = (typeof MODULES)[number];

// Error codes of a module start with its name in upper case, dashes as underscores.
export function errorCodePrefix(module: ModuleName): string {
  return `${module.toUpperCase().replaceAll('-', '_')}_`;
}

// Every route path of a module starts with this prefix.
export function routePathPrefix(module: ModuleName): string {
  return `/v1/${module}/`;
}
