import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Checks the pnpm settings as pnpm itself sees them (workspace file, environment
// variables and global config together), using `pnpm config list --json`.
// Usage: node workspace-check.ts [dir]

export const REQUIRED_MINIMUM_RELEASE_AGE = 1440;

// Packages whose install scripts may run, each with its reason (the same reason as
// its allowBuilds entry in pnpm-workspace.yaml). Any other allowBuilds entry that
// is not false fails the check, whether it comes from the workspace file, an
// environment variable or the global config.
export const ALLOWED_BUILDS: Readonly<Record<string, string>> = {};

// name@x.y.z with an optional scope and an optional prerelease or build suffix.
const EXACT_PACKAGE_VERSION = /^(?:@[^/@\s]+\/)?[^/@\s]+@\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export interface Violation {
  setting: string;
  detail: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const listEntries = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

export function findViolations(
  config: Record<string, unknown>,
  allowedBuilds: Readonly<Record<string, string>> = ALLOWED_BUILDS,
): Violation[] {
  const violations: Violation[] = [];

  if (config.dangerouslyAllowAllBuilds === true) {
    violations.push({
      setting: 'dangerouslyAllowAllBuilds',
      detail: 'install scripts are allowed for every package',
    });
  }

  const allowBuilds = config.allowBuilds;
  if (allowBuilds !== undefined && !isRecord(allowBuilds)) {
    violations.push({
      setting: 'allowBuilds',
      detail: `must map package names to true or false, found ${JSON.stringify(allowBuilds)}`,
    });
  } else if (allowBuilds !== undefined) {
    for (const [name, allowed] of Object.entries(allowBuilds)) {
      // Anything but false is read as a grant, so an odd value fails closed.
      if (allowed === false) continue;
      if (Object.hasOwn(allowedBuilds, name) && allowedBuilds[name]?.trim()) continue;
      violations.push({
        setting: `allowBuilds.${name}`,
        detail: 'install scripts need a reviewed reason in ALLOWED_BUILDS (workspace-check.ts)',
      });
    }
  }

  // Hooks rewrite settings at install time, after `pnpm config list` has run.
  if (config.ignorePnpmfile !== true) {
    violations.push({
      setting: 'ignorePnpmfile',
      detail: `must be true so no pnpmfile hook can change settings, found ${JSON.stringify(config.ignorePnpmfile ?? null)}`,
    });
  }
  for (const setting of ['pnpmfile', 'globalPnpmfile']) {
    if (config[setting] !== undefined) {
      violations.push({ setting, detail: 'pnpmfile hooks are not used' });
    }
  }

  const permissions = config.permissions;
  if (isRecord(permissions)) {
    for (const [name, entry] of Object.entries(permissions)) {
      if (!isRecord(entry)) continue;
      if ('build' in entry) {
        violations.push({
          setting: `permissions.${name}.build`,
          detail: 'build permission belongs in allowBuilds with a reason',
        });
      }
      // Any value but false is read as a grant, as for allowBuilds.
      if (entry.skills !== undefined && entry.skills !== false) {
        violations.push({
          setting: `permissions.${name}.skills`,
          detail: 'dependencies may not provide agent skills',
        });
      }
    }
  }

  if (config.trustPolicy !== 'no-downgrade') {
    violations.push({
      setting: 'trustPolicy',
      detail: `must be no-downgrade, found ${JSON.stringify(config.trustPolicy ?? null)}`,
    });
  }

  const excluded = config.trustPolicyExclude;
  if (excluded !== undefined) {
    for (const entry of listEntries(excluded)) {
      if (typeof entry !== 'string' || !EXACT_PACKAGE_VERSION.test(entry)) {
        violations.push({
          setting: 'trustPolicyExclude',
          detail: `entry must name an exact version (name@x.y.z): ${JSON.stringify(entry)}`,
        });
      }
    }
  }

  if (config.trustPolicyIgnoreAfter !== undefined) {
    violations.push({
      setting: 'trustPolicyIgnoreAfter',
      detail: 'not used; exclude exact versions instead',
    });
  }

  const configDependencies = config.configDependencies;
  if (
    configDependencies !== undefined &&
    (!isRecord(configDependencies) || Object.keys(configDependencies).length > 0)
  ) {
    violations.push({
      setting: 'configDependencies',
      detail: 'writes a second document into the lock file (dependabot-core #15904)',
    });
  }

  if (
    typeof config.minimumReleaseAge !== 'number' ||
    config.minimumReleaseAge < REQUIRED_MINIMUM_RELEASE_AGE
  ) {
    violations.push({
      setting: 'minimumReleaseAge',
      detail: `must be at least ${REQUIRED_MINIMUM_RELEASE_AGE}, found ${JSON.stringify(config.minimumReleaseAge ?? null)}`,
    });
  }

  // Either setting lets a younger version in, so the gate would no longer be strict.
  if (config.minimumReleaseAgeStrict !== undefined && config.minimumReleaseAgeStrict !== true) {
    violations.push({
      setting: 'minimumReleaseAgeStrict',
      detail: `must stay unset or true, found ${JSON.stringify(config.minimumReleaseAgeStrict)}`,
    });
  }
  const ageExcluded = config.minimumReleaseAgeExclude;
  if (ageExcluded !== undefined) {
    for (const entry of listEntries(ageExcluded)) {
      violations.push({
        setting: 'minimumReleaseAgeExclude',
        detail: `no package may skip the release-age gate: ${JSON.stringify(entry)}`,
      });
    }
  }
  // A trusted lock file lets locked versions skip the release-age and trust checks.
  if (config.trustLockfile !== undefined && config.trustLockfile !== false) {
    violations.push({
      setting: 'trustLockfile',
      detail: `must stay unset or false, found ${JSON.stringify(config.trustLockfile)}`,
    });
  }

  if (config.pmOnFail !== 'ignore') {
    violations.push({
      setting: 'pmOnFail',
      detail: `must be ignore (dependabot-core #15904), found ${JSON.stringify(config.pmOnFail ?? null)}`,
    });
  }

  return violations;
}

interface Command {
  command: string;
  args: string[];
  shell: boolean;
}

// Under `pnpm run`, npm_execpath points at the running pnpm. Elsewhere pnpm comes
// from PATH; on Windows it is a .cmd shim, which only a shell can start.
export function pnpmCommand(env: NodeJS.ProcessEnv = process.env): Command {
  const execPath = env.npm_execpath;
  if (execPath !== undefined && /^pnpm(?:\.exe|\.c?js|\.mjs)?$/i.test(path.basename(execPath))) {
    return /\.(?:c|m)?js$/i.test(execPath)
      ? { command: process.execPath, args: [execPath], shell: false }
      : { command: execPath, args: [], shell: false };
  }
  return { command: 'pnpm', args: [], shell: process.platform === 'win32' };
}

export function readPnpmConfig(
  dir: string,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, unknown> {
  const pnpm = pnpmCommand(env);
  const args = [...pnpm.args, 'config', 'list', '--json'];
  const options = { cwd: dir, env, encoding: 'utf8', windowsHide: true } as const;
  // A shell gets one fixed command line (no caller input), never an argument list.
  const result = pnpm.shell
    ? spawnSync([pnpm.command, ...args].join(' '), { ...options, shell: true })
    : spawnSync(pnpm.command, args, options);
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pnpm config list failed with exit code ${result.status}: ${result.stderr}`);
  }
  const parsed: unknown = JSON.parse(result.stdout);
  if (!isRecord(parsed)) throw new Error('pnpm config list --json did not return an object');
  return parsed;
}

if (import.meta.main) {
  const dir = path.resolve(process.argv[2] ?? '.');
  const violations = findViolations(readPnpmConfig(dir));
  if (violations.length === 0) {
    console.log(`pnpm settings in ${dir} pass the workspace check.`);
  } else {
    console.error(
      [
        `pnpm settings in ${dir} break the workspace rules:`,
        ...violations.map((v) => `  ${v.setting}: ${v.detail}`),
      ].join('\n'),
    );
  }
  process.exitCode = violations.length === 0 ? 0 : 1;
}
