import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

// Runs the real packages/core "test" script with the real packages/core
// vitest.config.ts in a scratch tree: a source file that no test imports must
// count against the coverage gate instead of being left out.

const CORE_ROOT = fileURLToPath(new URL('../../../../../packages/core/', import.meta.url));
const VITEST = path.join(CORE_ROOT, 'node_modules/vitest/vitest.mjs');

const TESTED: Record<string, string> = {
  'src/math/double.ts': [
    'export function double(x: number): number {',
    '  if (x < 0) {',
    '    return -2 * -x;',
    '  }',
    '  return 2 * x;',
    '}',
  ].join('\n'),
  // The unused helper would lower the numbers if test files were counted.
  'src/math/double.test.ts': [
    "import { expect, it } from 'vitest';",
    "import { double } from './double.ts';",
    'export function unusedHelper(x: number): number {',
    '  if (x > 0) {',
    '    return 1;',
    '  }',
    '  return x < -5 ? 3 : 2;',
    '}',
    "it('doubles', () => {",
    '  expect(double(2)).toBe(4);',
    '  expect(double(-2)).toBe(-4);',
    '});',
  ].join('\n'),
};

const UNTESTED: Record<string, string> = {
  'src/untested/grade.ts': [
    'export function grade(score: number): string {',
    '  if (score >= 90) {',
    "    return 'A';",
    '  }',
    '  if (score >= 80) {',
    "    return 'B';",
    '  }',
    '  if (score >= 70) {',
    "    return 'C';",
    '  }',
    "  return 'F';",
    '}',
  ].join('\n'),
};

// The script is "NAME=value ... vitest <args>"; the environment prefix is kept.
async function coreTestScript(): Promise<{ env: Record<string, string>; args: string[] }> {
  const manifest = JSON.parse(await readFile(path.join(CORE_ROOT, 'package.json'), 'utf8'));
  const words = String(manifest.scripts.test).trim().split(/\s+/);
  const env: Record<string, string> = {};
  while (/^[A-Z_]+=/.test(words[0] ?? '')) {
    const [name = '', ...value] = (words.shift() ?? '').split('=');
    env[name] = value.join('=');
  }
  expect(words.shift()).toBe('vitest');
  return { env, args: words };
}

const tempRoots: string[] = [];

async function runGate(files: Record<string, string>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'core-coverage-'));
  tempRoots.push(root);
  // A junction lets the scratch tree resolve vitest without admin rights.
  await symlink(path.join(CORE_ROOT, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  await copyFile(path.join(CORE_ROOT, 'vitest.config.ts'), path.join(root, 'vitest.config.ts'));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }));
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), `${content}\n`);
  }
  const script = await coreTestScript();
  // Without --no-cache Vitest would write its results cache through the junction
  // into the real packages/core/node_modules.
  const args = [VITEST, ...script.args, '--coverage.reporter=text', '--no-cache'];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...script.env },
    windowsHide: true,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

afterAll(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('The packages/core coverage gate counts every source file', () => {
  it('passes when every source file is tested, test files not counted (ground)', async () => {
    const { status, output } = await runGate(TESTED);
    expect(output).toContain('Lines        : 100%');
    expect(output).not.toContain('does not meet');
    expect(status).toBe(0);
  }, 60_000);

  it('fails when a source file has no test', async () => {
    const { status, output } = await runGate({ ...TESTED, ...UNTESTED });
    expect(output).toMatch(/Coverage for lines \([\d.]+%\) does not meet global threshold/);
    expect(output).toMatch(/Coverage for branches \([\d.]+%\) does not meet global threshold/);
    expect(status).toBe(1);
  }, 60_000);

  it('also counts an untested source file with another TypeScript extension', async () => {
    const grade = Object.values(UNTESTED)[0] ?? '';
    expect(grade).not.toBe('');
    const { status, output } = await runGate({ ...TESTED, 'src/untested/grade.mts': grade });
    expect(output).toMatch(/Coverage for lines \([\d.]+%\) does not meet global threshold/);
    expect(status).toBe(1);
  }, 60_000);
});
