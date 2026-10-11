import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pnpmCommand } from './workspace-check.ts';

// Runs the real root "dev" script through pnpm in a fixture workspace. The fixture
// server package resolves one of its own exports from each Node process the chain
// starts (db:migrate and dev), so the log shows whether that process got the
// "source" condition and whether the developer's own NODE_OPTIONS survived.
// The docker step starts no Node process and is left out: no stand-in executable is
// put on PATH (security software may treat that as a hijacked command).

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const SERVER_NAME = '@iu-attendance/server';
// A harmless flag standing for the developer's own NODE_OPTIONS.
const OWN_FLAG = '--trace-warnings';

const PROBE = [
  "import { appendFileSync } from 'node:fs';",
  `const target = import.meta.resolve('${SERVER_NAME}/probe-target');`,
  "const condition = target.endsWith('target-source.js') ? 'source' : 'default';",
  `const own = (process.env.NODE_OPTIONS ?? '').includes('${OWN_FLAG}') ? ' +own' : '';`,
  // biome-ignore lint/suspicious/noTemplateCurlyInString: fixture source with a template literal
  'appendFileSync(process.env.PROBE_LOG, `${process.argv[2]} ${condition}${own}\\n`);',
].join('\n');

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

// The command of a chain step, without its leading NAME=value assignments.
const commandOf = (step: string) =>
  step.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|\S*)\s+)*/, '');
const isDocker = (step: string) => commandOf(step).startsWith('docker ');

let fixture = '';
let steps: string[] = [];
let env: NodeJS.ProcessEnv = {};

beforeAll(async () => {
  fixture = await mkdtemp(path.join(os.tmpdir(), 'dev-script-'));
  const rootManifest = JSON.parse(await readFile(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  steps = String(rootManifest.scripts.dev).split(' && ');
  const files: Record<string, string> = {
    'package.json': json({
      name: 'fixture',
      private: true,
      scripts: { dev: steps.filter((step) => !isDocker(step)).join(' && ') },
    }),
    'pnpm-workspace.yaml': 'packages:\n  - apps/*\nshellEmulator: true\n',
    'apps/server/package.json': json({
      name: SERVER_NAME,
      private: true,
      type: 'module',
      exports: {
        './probe-target': { source: './target-source.js', default: './target-default.js' },
      },
      scripts: { 'db:migrate': 'node probe.mjs migrate', dev: 'node probe.mjs dev' },
    }),
    'apps/server/probe.mjs': PROBE,
    'apps/server/target-source.js': 'export {};',
    'apps/server/target-default.js': 'export {};',
  };
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(fixture, file)), { recursive: true });
    await writeFile(path.join(fixture, file), content);
  }
  await mkdir(path.join(fixture, 'xdg'));

  // No npm_* or pnpm_config_* variables and no NODE_OPTIONS from the process running
  // this test (PNPM_HOME stays, so pnpm finds its own home), and an empty global
  // pnpm config.
  env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!/^npm_|^pnpm_config_|^NODE_OPTIONS$/i.test(key)) env[key] = value;
  }
  env.XDG_CONFIG_HOME = path.join(fixture, 'xdg');
}, 60_000);

afterAll(async () => {
  if (fixture !== '') await rm(fixture, { recursive: true, force: true });
});

async function logLines(file: string): Promise<string[]> {
  return (await readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean);
}

async function runDev(name: string, nodeOptions?: string) {
  const log = path.join(fixture, `${name}.log`);
  await writeFile(log, '');
  // Under `pnpm run`, pnpm is started directly, so a timeout stops pnpm itself.
  const pnpm = pnpmCommand();
  const args = [...pnpm.args, 'run', 'dev'];
  const options = {
    cwd: fixture,
    env: {
      ...env,
      PROBE_LOG: log,
      ...(nodeOptions === undefined ? {} : { NODE_OPTIONS: nodeOptions }),
    },
    encoding: 'utf8',
    timeout: 60_000,
    windowsHide: true,
  } as const;
  // A shell gets one fixed command line (no caller input), never an argument list.
  const result = pnpm.shell
    ? spawnSync([pnpm.command, ...args].join(' '), { ...options, shell: true })
    : spawnSync(pnpm.command, args, options);
  return {
    status: result.status,
    output: `${result.error ?? ''}${result.stdout}${result.stderr}`,
    lines: await logLines(log),
  };
}

describe('The root dev script', { timeout: 120_000 }, () => {
  it('leaves out exactly one docker step and keeps the rest (ground for the fixture)', () => {
    expect(steps.filter(isDocker).map(commandOf)).toEqual([
      expect.stringMatching(/^docker compose /),
    ]);
    expect(steps.filter((step) => !isDocker(step)).length).toBeGreaterThan(0);
  });

  it('the probe tells the conditions and the own flag apart (control)', async () => {
    const controlLog = path.join(fixture, 'control.log');
    const probe = (nodeArgs: string[], label: string, nodeOptions = '') =>
      spawnSync(process.execPath, [...nodeArgs, 'probe.mjs', label], {
        cwd: path.join(fixture, 'apps/server'),
        env: { ...env, PROBE_LOG: controlLog, NODE_OPTIONS: nodeOptions },
        windowsHide: true,
      }).status;
    expect([
      probe([], 'plain'),
      probe(['--conditions=source'], 'flag'),
      probe([], 'own', OWN_FLAG),
    ]).toEqual([0, 0, 0]);
    expect(await logLines(controlLog)).toEqual([
      'plain default',
      'flag source',
      'own default +own',
    ]);
  });

  it('starts every Node process with the source condition', async () => {
    const { status, output, lines } = await runDev('unset');
    expect(status, output).toBe(0);
    expect(lines).toEqual(['migrate source', 'dev source']);
  });

  it("adds the condition to the developer's own NODE_OPTIONS instead of replacing it", async () => {
    const { status, output, lines } = await runDev('own', OWN_FLAG);
    expect(status, output).toBe(0);
    expect(lines).toEqual(['migrate source +own', 'dev source +own']);
  });
});
