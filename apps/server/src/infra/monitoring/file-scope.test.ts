import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Tool output (Stryker reports and sandboxes, drizzle-kit snapshots) is skipped by
// git and Biome, while source folders that share a name with it (the reports
// module) are still tracked and linted. Uses the real .gitignore and biome.json.

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const BIOME = path.join(REPO_ROOT, 'node_modules/@biomejs/biome/bin/biome');

// The reports module in every place the spec puts a module.
const REPORTS_MODULE = [
  'packages/core/src/reports/percentage.ts',
  'apps/server/src/modules/reports/index.ts',
  'apps/server/src/jobs/reports/index.ts',
  'apps/server/test/features/reports/course-report.feature',
  'apps/server/test/steps/reports/report-steps.ts',
];
const TOOL_OUTPUT = [
  'packages/core/reports/mutation/mutation.json',
  'packages/core/reports/mutation/mutation.html',
  'packages/core/.stryker-tmp/sandbox-1/src/x.ts',
  'packages/core/coverage/index.html',
  'apps/server/coverage/coverage-final.json',
];

const tempRoots: string[] = [];

async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

afterAll(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('git ignores tool output but not the reports module', { timeout: 60_000 }, () => {
  const ignored = new Map<string, boolean>();

  beforeAll(async () => {
    const repo = await tempDir('file-scope-git-');
    const home = await tempDir('file-scope-home-');
    await copyFile(path.join(REPO_ROOT, '.gitignore'), path.join(repo, '.gitignore'));
    // Only the copied .gitignore may decide: no global or system git config and no
    // global excludes file of the developer.
    const emptyConfig = path.join(home, 'gitconfig');
    await writeFile(emptyConfig, '');
    const env = {
      ...process.env,
      GIT_CONFIG_GLOBAL: emptyConfig,
      GIT_CONFIG_NOSYSTEM: '1',
      HOME: home,
      XDG_CONFIG_HOME: home,
    };
    const git = (args: string[]) =>
      spawnSync('git', args, { cwd: repo, encoding: 'utf8', env, windowsHide: true });
    expect(git(['init', '-q']).status).toBe(0);
    const paths = [...REPORTS_MODULE, ...TOOL_OUTPUT, '.env', '.env.example'];
    const result = git(['check-ignore', '--no-index', '--verbose', '--non-matching', ...paths]);
    // Each line is "<source>:<line>:<pattern>\t<path>"; an empty pattern means no
    // rule matched, and a pattern starting with ! re-includes the path.
    for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
      const [rule = '', file = ''] = line.split('\t');
      const pattern = rule.split(':').slice(2).join(':');
      ignored.set(file, pattern !== '' && !pattern.startsWith('!'));
    }
  }, 60_000);

  it('answers for every path asked about (ground)', () => {
    expect(ignored.size).toBe(REPORTS_MODULE.length + TOOL_OUTPUT.length + 2);
  });

  it.each(REPORTS_MODULE)('tracks %s', (file) => {
    expect(ignored.get(file)).toBe(false);
  });

  it.each(TOOL_OUTPUT)('ignores %s (control)', (file) => {
    expect(ignored.get(file)).toBe(true);
  });

  it('ignores .env and tracks .env.example', () => {
    expect(ignored.get('.env')).toBe(true);
    expect(ignored.get('.env.example')).toBe(false);
  });
});

describe('Biome skips tool output but not the reports module', () => {
  const UNFORMATTED_JSON = '{"a":1,\n"b":   [1,2]}';
  type Case = [file: string, content: string, category: string | null];
  // null: the file must get no diagnostic at all.
  const CASES: Case[] = [
    ['packages/core/reports/mutation/mutation.json', UNFORMATTED_JSON, null],
    ['packages/core/.stryker-tmp/sandbox-1/src/x.ts', 'debugger;\n', null],
    ['apps/server/migrations/20261011111007_init/snapshot.json', UNFORMATTED_JSON, null],
    // Controls: the same content one folder over is checked.
    ['packages/core/src/reports/data.json', UNFORMATTED_JSON, 'format'],
    ['packages/core/src/reports/percentage.ts', 'export const value = 10n;\n', 'plugin'],
    ['apps/server/src/modules/reports/index.ts', 'debugger;\n', 'lint/suspicious/noDebugger'],
    ['apps/server/migrations/20261011111007_init/notes.json', UNFORMATTED_JSON, 'format'],
  ];
  const found = new Map<string, string[]>();

  beforeAll(async () => {
    const scratch = await tempDir('file-scope-biome-');
    for (const relative of ['biome.json', 'packages/core/rules/hermes.grit']) {
      await mkdir(path.dirname(path.join(scratch, relative)), { recursive: true });
      await copyFile(path.join(REPO_ROOT, relative), path.join(scratch, relative));
    }
    for (const [file, content] of CASES) {
      await mkdir(path.dirname(path.join(scratch, file)), { recursive: true });
      await writeFile(path.join(scratch, file), content);
    }
    const biome = spawnSync(
      process.execPath,
      [BIOME, 'ci', '--reporter=github', '--max-diagnostics=1000', '.'],
      { cwd: scratch, encoding: 'utf8', windowsHide: true },
    );
    for (const match of biome.stdout.matchAll(/^::\w+ title=([^,]*),file=([^,]+),line=\d+/gm)) {
      const [, category = '', encodedFile] = match;
      const file = path
        .relative(scratch, path.resolve(scratch, decodeURIComponent(encodedFile ?? '')))
        .replaceAll('\\', '/');
      found.set(file, [...(found.get(file) ?? []), category]);
    }
  }, 120_000);

  it.each(CASES.filter(([, , category]) => category === null))('skips tool output %s', (file) => {
    expect(found.get(file)).toBeUndefined();
  });

  it.each(CASES.filter(([, , category]) => category !== null))(
    'checks source %s',
    (file, _content, category) => {
      expect(found.get(file)).toContain(category);
    },
  );
});
