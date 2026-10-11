import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

// Runs the real apps/server/cucumber.js in scratch trees laid out as the spec lays
// out the server: features in test/features/<module>/, support code in test/support
// and steps in test/steps. Support code records "support" when it loads and step
// code records "steps", so a step can tell which loaded first.

const SERVER_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const CUCUMBER = path.join(SERVER_ROOT, 'node_modules/@cucumber/cucumber/bin/cucumber.js');
const UNIT_TEST_LOADED = 'a unit test file was loaded by Cucumber';

const feature = (module: string) =>
  [
    `Feature: ${module} load order`,
    '  Scenario: Support code loads before step code',
    '    Then support code loaded before step code',
  ].join('\n');

const FILES: Record<string, string> = {
  'test/features/identity/load-order.feature': feature('Identity'),
  'test/features/attendance/load-order.feature': feature('Attendance'),
  'test/support/load-order.ts': [
    'const state = globalThis as { loadOrder?: string[] };',
    "state.loadOrder = [...(state.loadOrder ?? []), 'support'];",
  ].join('\n'),
  'test/steps/load-order.steps.ts': [
    "import assert from 'node:assert/strict';",
    "import { Then } from '@cucumber/cucumber';",
    'const state = globalThis as { loadOrder?: string[] };',
    "state.loadOrder = [...(state.loadOrder ?? []), 'steps'];",
    "Then('support code loaded before step code', () => {",
    "  assert.deepEqual(state.loadOrder, ['support', 'steps']);",
    '});',
  ].join('\n'),
  'test/steps/load-order.test.ts': `throw new Error('${UNIT_TEST_LOADED}');`,
  'test/support/load-order.test.ts': `throw new Error('${UNIT_TEST_LOADED}');`,
};

// The real configuration with only the import order reversed (steps first).
const SWAPPED_CONFIG = [
  "import config from './cucumber.js';",
  'export default { ...config, import: [...config.import].reverse() };',
].join('\n');

const tempRoots: string[] = [];

async function runCucumber(files: Record<string, string>, args: string[] = []) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cucumber-config-'));
  tempRoots.push(root);
  // A junction lets the scratch tree resolve @cucumber/cucumber without admin rights.
  await symlink(
    path.join(SERVER_ROOT, 'node_modules'),
    path.join(root, 'node_modules'),
    'junction',
  );
  await copyFile(path.join(SERVER_ROOT, 'cucumber.js'), path.join(root, 'cucumber.js'));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }));
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), `${content}\n`);
  }
  const result = spawnSync(process.execPath, [CUCUMBER, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, TZ: 'UTC' },
    windowsHide: true,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

afterAll(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Cucumber configuration', () => {
  it('runs every feature under test/features, support before steps, never *.test.ts', async () => {
    const { status, output } = await runCucumber(FILES);
    expect(output).not.toContain(UNIT_TEST_LOADED);
    expect(output).toContain('2 scenarios (2 passed)');
    expect(status).toBe(0);
  }, 60_000);

  it('the order probe fails when steps load before support (control)', async () => {
    const files = { ...FILES, 'cucumber.swapped.js': SWAPPED_CONFIG };
    const { status, output } = await runCucumber(files, ['--config', 'cucumber.swapped.js']);
    expect(output).toContain('2 scenarios (2 failed)');
    expect(status).toBe(1);
  }, 60_000);

  it('a support file that is not a unit test does load, so the marker would show (control)', async () => {
    const files = { ...FILES, 'test/support/broken.ts': `throw new Error('${UNIT_TEST_LOADED}');` };
    const { status, output } = await runCucumber(files);
    expect(output).toContain(UNIT_TEST_LOADED);
    expect(status).not.toBe(0);
  }, 60_000);
});
