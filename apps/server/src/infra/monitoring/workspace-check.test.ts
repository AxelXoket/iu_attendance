import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ALLOWED_BUILDS,
  findViolations,
  pnpmCommand,
  REQUIRED_MINIMUM_RELEASE_AGE,
} from './workspace-check.ts';

const SCRIPT = fileURLToPath(new URL('./workspace-check.ts', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));

const BASE_SETTINGS = [
  'packages: []',
  `minimumReleaseAge: ${REQUIRED_MINIMUM_RELEASE_AGE}`,
  'trustPolicy: no-downgrade',
  'pmOnFail: ignore',
  'ignorePnpmfile: true',
  'allowBuilds:',
  '  esbuild: false',
].join('\n');

const tempRoots: string[] = [];

async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

// pnpm reads its global config from $XDG_CONFIG_HOME/pnpm/config.yaml when the
// variable is set, on every platform. Each run gets its own directory, empty
// unless the case writes a global config on purpose, so the developer's global
// pnpm settings never reach a fixture.
async function globalConfigHome(globalSettings?: string): Promise<string> {
  const home = await tempDir('workspace-check-global-');
  if (globalSettings !== undefined) {
    await mkdir(path.join(home, 'pnpm'), { recursive: true });
    await writeFile(path.join(home, 'pnpm', 'config.yaml'), `${globalSettings}\n`);
  }
  return home;
}

// pnpm passes some npm_config_* and pnpm_config_* variables to scripts; the fixtures
// must see only their own workspace file, plus what a case adds on purpose.
function cleanEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!/^p?npm_config_/i.test(key)) env[key] = value;
  }
  return { ...env, ...extra };
}

async function workspace(settings: string): Promise<string> {
  const root = await tempDir('workspace-check-');
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', private: true }),
  );
  await writeFile(path.join(root, 'pnpm-workspace.yaml'), `${settings}\n`);
  return root;
}

interface RunOptions {
  env?: Record<string, string>;
  globalSettings?: string;
}

async function runCheck(dir: string, options: RunOptions = {}) {
  const home = await globalConfigHome(options.globalSettings);
  const result = spawnSync(process.execPath, [SCRIPT, dir], {
    encoding: 'utf8',
    env: cleanEnv({ XDG_CONFIG_HOME: home, ...options.env }),
    windowsHide: true,
  });
  const output = `${result.stdout}${result.stderr}`;
  return { status: result.status, output, reported: output.match(/^ {2}\S+: /gm) ?? [] };
}

afterAll(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

// Each case starts node and pnpm; the timeout leaves room for a loaded machine.
describe('Install scripts and trust settings are checked as pnpm sees them', {
  timeout: 60_000,
}, () => {
  it('passes a workspace whose only trust exclusion names an exact version', async () => {
    const dir = await workspace(`${BASE_SETTINGS}\ntrustPolicyExclude:\n  - cssnano@9.3.2`);
    expect(await runCheck(dir)).toMatchObject({ status: 0, reported: [] });
  });

  it("passes the repository's own root", async () => {
    expect(await runCheck(REPO_ROOT)).toMatchObject({ status: 0, reported: [] });
  });

  const cases: Array<[name: string, settings: string, reported: string]> = [
    [
      'dangerouslyAllowAllBuilds',
      `${BASE_SETTINGS}\ndangerouslyAllowAllBuilds: true`,
      'dangerouslyAllowAllBuilds',
    ],
    [
      'a build entry under permissions',
      `${BASE_SETTINGS}\npermissions:\n  esbuild:\n    build: true`,
      'permissions.esbuild.build',
    ],
    [
      'a trust exclusion without a version',
      `${BASE_SETTINGS}\ntrustPolicyExclude:\n  - cssnano`,
      'trustPolicyExclude',
    ],
    [
      'trustPolicyIgnoreAfter',
      `${BASE_SETTINGS}\ntrustPolicyIgnoreAfter: 10080`,
      'trustPolicyIgnoreAfter',
    ],
    [
      'trustPolicy off',
      BASE_SETTINGS.replace('trustPolicy: no-downgrade', 'trustPolicy: off'),
      'trustPolicy',
    ],
    [
      'a config dependency',
      `${BASE_SETTINGS}\nconfigDependencies:\n  shared-settings: "1.0.0+sha512-${'A'.repeat(86)}=="`,
      'configDependencies',
    ],
    [
      'agent skills from a dependency',
      `${BASE_SETTINGS}\npermissions:\n  drizzle-kit:\n    skills: true`,
      'permissions.drizzle-kit.skills',
    ],
    [
      'a shorter release age',
      BASE_SETTINGS.replace(
        `minimumReleaseAge: ${REQUIRED_MINIMUM_RELEASE_AGE}`,
        `minimumReleaseAge: ${REQUIRED_MINIMUM_RELEASE_AGE - 1}`,
      ),
      'minimumReleaseAge',
    ],
    [
      'a release age that is not strict',
      `${BASE_SETTINGS}\nminimumReleaseAgeStrict: false`,
      'minimumReleaseAgeStrict',
    ],
    [
      'a release-age exclusion, even with an exact version',
      `${BASE_SETTINGS}\nminimumReleaseAgeExclude:\n  - cssnano@9.3.2`,
      'minimumReleaseAgeExclude',
    ],
    [
      'pmOnFail other than ignore',
      BASE_SETTINGS.replace('pmOnFail: ignore', 'pmOnFail: download'),
      'pmOnFail',
    ],
    [
      'a build permission without a reviewed reason',
      BASE_SETTINGS.replace('esbuild: false', 'esbuild: true'),
      'allowBuilds.esbuild',
    ],
    [
      'pnpmfile hooks left enabled',
      BASE_SETTINGS.replace('ignorePnpmfile: true\n', ''),
      'ignorePnpmfile',
    ],
    ['a pnpmfile', `${BASE_SETTINGS}\npnpmfile: hooks.mjs`, 'pnpmfile'],
    ['a trusted lock file', `${BASE_SETTINGS}\ntrustLockfile: true`, 'trustLockfile'],
  ];

  it.each(cases)('rejects %s on its own', async (_name, settings, reported) => {
    const { status, output, reported: lines } = await runCheck(await workspace(settings));
    expect(status).toBe(1);
    expect(output).toContain(`${reported}:`);
    expect(lines).toHaveLength(1);
  });

  const envCases: Array<[variable: string, value: string, reported: string]> = [
    ['PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS', 'true', 'dangerouslyAllowAllBuilds'],
    ['PNPM_CONFIG_ALLOW_BUILDS', '{"esbuild":true}', 'allowBuilds.esbuild'],
    ['PNPM_CONFIG_MINIMUM_RELEASE_AGE_STRICT', 'false', 'minimumReleaseAgeStrict'],
    ['PNPM_CONFIG_MINIMUM_RELEASE_AGE_EXCLUDE', '["esbuild"]', 'minimumReleaseAgeExclude'],
    ['PNPM_CONFIG_IGNORE_PNPMFILE', 'false', 'ignorePnpmfile'],
    ['PNPM_CONFIG_GLOBAL_PNPMFILE', 'hooks.mjs', 'globalPnpmfile'],
    ['PNPM_CONFIG_TRUST_LOCKFILE', 'true', 'trustLockfile'],
  ];

  it.each(envCases)('rejects %s=%s from the environment', async (variable, value, reported) => {
    const dir = await workspace(BASE_SETTINGS);
    const { status, output, reported: lines } = await runCheck(dir, { env: { [variable]: value } });
    expect(status).toBe(1);
    expect(output).toContain(`${reported}:`);
    expect(lines).toHaveLength(1);
  });

  const globalCases: Array<[name: string, settings: string, reported: string]> = [
    ['dangerouslyAllowAllBuilds', 'dangerouslyAllowAllBuilds: true', 'dangerouslyAllowAllBuilds'],
    ['a global pnpmfile', 'globalPnpmfile: hooks.mjs', 'globalPnpmfile'],
    [
      'a release age that is not strict',
      'minimumReleaseAgeStrict: false',
      'minimumReleaseAgeStrict',
    ],
    ['a trusted lock file', 'trustLockfile: true', 'trustLockfile'],
  ];

  it.each(globalCases)('rejects %s from the global config', async (_name, settings, reported) => {
    const dir = await workspace(BASE_SETTINGS);
    const { status, output, reported: lines } = await runCheck(dir, { globalSettings: settings });
    expect(status).toBe(1);
    expect(output).toContain(`${reported}:`);
    expect(lines).toHaveLength(1);
  });

  it('passes with a global config that sets nothing banned (ground for the global cases)', async () => {
    const dir = await workspace(BASE_SETTINGS);
    const result = await runCheck(dir, { globalSettings: 'minimumReleaseAgeStrict: true' });
    expect(result).toMatchObject({ status: 0, reported: [] });
  });
});

describe('workspace check rules', () => {
  const passing = {
    minimumReleaseAge: REQUIRED_MINIMUM_RELEASE_AGE,
    trustPolicy: 'no-downgrade',
    pmOnFail: 'ignore',
    ignorePnpmfile: true,
    allowBuilds: { esbuild: false },
    permissions: { 'drizzle-kit': { skills: false } },
  };
  const settings = (violations: Array<{ setting: string }>) => violations.map((v) => v.setting);

  it('accepts the passing settings (ground for every rule below)', () => {
    expect(findViolations(passing)).toEqual([]);
  });

  it('accepts exact scoped and prerelease versions as trust exclusions', () => {
    expect(
      findViolations({ ...passing, trustPolicyExclude: ['@scope/pkg@1.2.3', 'pkg@1.0.0-rc.4'] }),
    ).toEqual([]);
  });

  it('rejects ranges and tags as trust exclusions', () => {
    const violations = findViolations({
      ...passing,
      trustPolicyExclude: ['pkg@^1.2.3', 'pkg@latest'],
    });
    expect(settings(violations)).toEqual(['trustPolicyExclude', 'trustPolicyExclude']);
  });

  it('treats an empty configDependencies map as absent', () => {
    expect(findViolations({ ...passing, configDependencies: {} })).toEqual([]);
  });

  it('accepts trustLockfile false and rejects any other value', () => {
    expect(findViolations({ ...passing, trustLockfile: false })).toEqual([]);
    expect(settings(findViolations({ ...passing, trustLockfile: 'true' }))).toEqual([
      'trustLockfile',
    ]);
  });

  it('reads any skills value other than false as a grant', () => {
    const withSkills = (value: unknown) => ({
      ...passing,
      permissions: { 'drizzle-kit': { skills: value } },
    });
    expect(findViolations(withSkills(false))).toEqual([]);
    for (const value of [true, 'true', 'install', 'prompt']) {
      expect(settings(findViolations(withSkills(value)))).toEqual([
        'permissions.drizzle-kit.skills',
      ]);
    }
  });

  it('accepts minimumReleaseAgeStrict true and an empty exclusion list', () => {
    expect(
      findViolations({ ...passing, minimumReleaseAgeStrict: true, minimumReleaseAgeExclude: [] }),
    ).toEqual([]);
  });

  it('reports every release-age exclusion, a single string included', () => {
    expect(
      settings(findViolations({ ...passing, minimumReleaseAgeExclude: ['a', 'b@1.0.0'] })),
    ).toEqual(['minimumReleaseAgeExclude', 'minimumReleaseAgeExclude']);
    expect(settings(findViolations({ ...passing, minimumReleaseAgeExclude: '*' }))).toEqual([
      'minimumReleaseAgeExclude',
    ]);
  });

  it('accepts a build permission only when the allowlist gives a reason', () => {
    const config = { ...passing, allowBuilds: { esbuild: true } };
    expect(findViolations(config, { esbuild: 'Downloads its platform binary.' })).toEqual([]);
    expect(settings(findViolations(config, { esbuild: '  ' }))).toEqual(['allowBuilds.esbuild']);
    expect(settings(findViolations(config, { other: 'Reason.' }))).toEqual(['allowBuilds.esbuild']);
    // The default allowlist is the shipped one.
    expect(findViolations(config)).toEqual(findViolations(config, ALLOWED_BUILDS));
  });

  it('reads any allowBuilds value other than false as a grant', () => {
    const config = { ...passing, allowBuilds: { esbuild: 'yes', '*': true, sharp: false } };
    expect(settings(findViolations(config))).toEqual(['allowBuilds.esbuild', 'allowBuilds.*']);
    expect(settings(findViolations({ ...passing, allowBuilds: 'esbuild' }))).toEqual([
      'allowBuilds',
    ]);
  });

  it('requires pnpmfile hooks to be ignored and names any pnpmfile setting', () => {
    const { ignorePnpmfile: _ignored, ...withoutIgnore } = passing;
    expect(settings(findViolations(withoutIgnore))).toEqual(['ignorePnpmfile']);
    expect(settings(findViolations({ ...passing, ignorePnpmfile: 'true' }))).toEqual([
      'ignorePnpmfile',
    ]);
    expect(
      settings(findViolations({ ...passing, pnpmfile: 'a.mjs', globalPnpmfile: '/b.mjs' })),
    ).toEqual(['pnpmfile', 'globalPnpmfile']);
  });
});

describe('pnpm command lookup', () => {
  it('uses the pnpm that runs the script when npm_execpath points at it', () => {
    expect(pnpmCommand({ npm_execpath: '/opt/pnpm/pnpm' })).toEqual({
      command: '/opt/pnpm/pnpm',
      args: [],
      shell: false,
    });
    expect(pnpmCommand({ npm_execpath: '/opt/pnpm/bin/pnpm.cjs' })).toEqual({
      command: process.execPath,
      args: ['/opt/pnpm/bin/pnpm.cjs'],
      shell: false,
    });
  });

  it('falls back to pnpm from PATH when another tool runs the script', () => {
    expect(pnpmCommand({ npm_execpath: '/usr/lib/npm/bin/npm-cli.js' }).command).toBe('pnpm');
    expect(pnpmCommand({}).command).toBe('pnpm');
  });
});
