import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The repository biome.json is copied into a scratch tree; each case is one file
// with one import, linted by the real Biome. The restricted packages are checked
// in every folder that has its own copy of the rule, by bare name and by subpath,
// so a ban forgotten in one copy shows up as a red case.

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const BIOME = path.join(REPO_ROOT, 'node_modules/@biomejs/biome/bin/biome');
const COPIED_SETTINGS = ['biome.json', 'packages/core/rules/hermes.grit'];

type Case = [file: string, source: string];

// One folder per noRestrictedImports configuration (top level and each override).
const FOLDERS = {
  modules: 'apps/server/src/modules/attendance',
  database: 'apps/server/src/infra/database',
  jobs: 'apps/server/src/infra/jobs',
  email: 'apps/server/src/infra/email',
  monitoring: 'apps/server/src/infra/monitoring',
  steps: 'apps/server/test/steps',
  support: 'apps/server/test/support',
  core: 'packages/core/src/sync',
} as const;
type Folder = keyof typeof FOLDERS;

// The spec: pg-boss only in infra/jobs, nodemailer only in infra/email, pino only in
// infra/monitoring, tsx only under test/steps, dotenv nowhere.
const RESTRICTED: Array<{ name: string; home: Folder | null; subpath: string }> = [
  { name: 'pg-boss', home: 'jobs', subpath: 'pg-boss/dist/index.js' },
  { name: 'nodemailer', home: 'email', subpath: 'nodemailer/lib/smtp-transport' },
  { name: 'pino', home: 'monitoring', subpath: 'pino/file' },
  { name: 'tsx', home: 'steps', subpath: 'tsx/esm/api' },
  { name: 'dotenv', home: null, subpath: 'dotenv/config' },
];

const caseFile = (folder: string, specifier: string) =>
  `${folder}/import-${specifier.replace(/[^A-Za-z0-9]+/g, '-')}.ts`;

const MATRIX: Array<{ file: string; specifier: string; allowed: boolean }> = Object.entries(
  FOLDERS,
).flatMap(([folder, dir]) =>
  RESTRICTED.flatMap(({ name, home, subpath }) =>
    [name, subpath].map((specifier) => ({
      file: caseFile(dir, specifier),
      specifier,
      allowed: home === folder,
    })),
  ),
);
const REJECTED_MATRIX: Case[] = MATRIX.filter((c) => !c.allowed).map((c) => [c.file, c.specifier]);
const ALLOWED_MATRIX: Case[] = MATRIX.filter((c) => c.allowed).map((c) => [c.file, c.specifier]);

const REJECTED: Case[] = [
  ['apps/server/src/infra/jobs/f.ts', '../../modules/identity/index.ts'],
  ['apps/server/src/infra/monitoring/f.ts', '../../modules/identity/leaf.ts'],
  ['packages/core/src/sync/g.ts', 'node:fs'],
  ['packages/contracts/src/g.ts', 'node:crypto'],
  // Every TypeScript extension tsc can pull into the program, not only .ts.
  ['packages/core/src/sync/h.mts', 'node:fs'],
  ['packages/contracts/src/h.cts', 'node:crypto'],
];

const ALLOWED: Case[] = [
  ['apps/server/src/modules/attendance/f.ts', '../identity/leaf.ts'],
  ['apps/server/src/infra/jobs/g.ts', 'node:fs'],
  // Tests in shared packages run only in Node (tsconfig.test.json gives them Node types).
  ['packages/core/src/sync/g.test.ts', 'node:fs'],
  ['packages/contracts/src/g.test.ts', 'node:crypto'],
  ['packages/core/src/sync/h.test.mts', 'node:fs'],
];

// The usual way to load dotenv is a side-effect import of its subpath.
const SIDE_EFFECT_FILE = 'apps/server/src/modules/attendance/load-dotenv.ts';

let scratch = '';
const restricted = new Map<string, number>();

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), 'import-rules-'));
  for (const relative of COPIED_SETTINGS) {
    await mkdir(path.dirname(path.join(scratch, relative)), { recursive: true });
    await copyFile(path.join(REPO_ROOT, relative), path.join(scratch, relative));
  }
  for (const [file, source] of [...REJECTED_MATRIX, ...ALLOWED_MATRIX, ...REJECTED, ...ALLOWED]) {
    await mkdir(path.dirname(path.join(scratch, file)), { recursive: true });
    await writeFile(path.join(scratch, file), `export * from '${source}';\n`);
  }
  await writeFile(path.join(scratch, SIDE_EFFECT_FILE), "import 'dotenv/config';\n");
  const biome = spawnSync(
    process.execPath,
    [BIOME, 'lint', '--reporter=github', '--max-diagnostics=5000', '.'],
    { cwd: scratch, encoding: 'utf8', windowsHide: true },
  );
  for (const match of biome.stdout.matchAll(/^::\w+ title=([^,]*),file=([^,]+),line=\d+/gm)) {
    const [, category, encodedFile] = match;
    if (
      category === 'lint/style/noRestrictedImports' ||
      category === 'lint/correctness/noNodejsModules'
    ) {
      const file = path
        .relative(scratch, path.resolve(scratch, decodeURIComponent(encodedFile ?? '')))
        .replaceAll('\\', '/');
      restricted.set(file, (restricted.get(file) ?? 0) + 1);
    }
  }
}, 120_000);

afterAll(async () => {
  if (scratch !== '') await rm(scratch, { recursive: true, force: true });
});

describe('Import boundaries in biome.json', () => {
  it('covers every restricted package, by name and by subpath, in every rule folder', () => {
    expect(MATRIX).toHaveLength(Object.keys(FOLDERS).length * RESTRICTED.length * 2);
    // Each package except dotenv has exactly one home folder (name and subpath).
    expect(ALLOWED_MATRIX).toHaveLength(2 * RESTRICTED.filter((r) => r.home !== null).length);
  });

  it.each(REJECTED_MATRIX)('%s may not import %s', (file) => {
    expect(restricted.get(file)).toBe(1);
  });

  it.each(ALLOWED_MATRIX)('%s may import %s', (file) => {
    expect(restricted.get(file)).toBeUndefined();
  });

  it.each(REJECTED)('%s may not import %s', (file) => {
    expect(restricted.get(file)).toBe(1);
  });

  it.each(ALLOWED)('%s may import %s', (file) => {
    expect(restricted.get(file)).toBeUndefined();
  });

  it("rejects the side-effect import 'dotenv/config' outside every override", () => {
    expect(restricted.get(SIDE_EFFECT_FILE)).toBe(1);
  });
});
