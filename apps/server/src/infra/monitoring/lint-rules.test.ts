import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The repository biome.json is copied into a scratch tree and the real Biome lints
// one file per case. Covered here: noFloatingPromises (apps, not packages) and
// noPrivateImports (module boundary through @package exports).

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const BIOME = path.join(REPO_ROOT, 'node_modules/@biomejs/biome/bin/biome');
const COPIED_SETTINGS = ['biome.json', 'packages/core/rules/hermes.grit'];

const FLOATING_PROMISES = 'lint/nursery/noFloatingPromises';
const PRIVATE_IMPORTS = 'lint/correctness/noPrivateImports';

const FLOATING_CALL = 'async function work(): Promise<void> {}\nwork();\nexport {};';
const FLOATING_RESOLVE = 'Promise.resolve(1);\nexport {};';
const HANDLED = 'async function work(): Promise<void> {}\nawait work();\nvoid work();\nexport {};';

type Case = [file: string, category: string, count: number, content: string];

const CASES: Case[] = [
  ['apps/server/src/modules/attendance/floating-call.ts', FLOATING_PROMISES, 1, FLOATING_CALL],
  [
    'apps/server/src/modules/attendance/floating-resolve.ts',
    FLOATING_PROMISES,
    1,
    FLOATING_RESOLVE,
  ],
  ['apps/server/src/infra/jobs/floating-call.ts', FLOATING_PROMISES, 1, FLOATING_CALL],
  ['apps/server/test/steps/floating-call.ts', FLOATING_PROMISES, 1, FLOATING_CALL],
  ['apps/mobile/src/floating-call.ts', FLOATING_PROMISES, 1, FLOATING_CALL],
  // Ground: an awaited or voided promise is handled.
  ['apps/server/src/modules/attendance/handled.ts', FLOATING_PROMISES, 0, HANDLED],
  // Shared packages are exempt (the same content as the rejected cases above).
  ['packages/core/src/sync/floating-call.ts', FLOATING_PROMISES, 0, FLOATING_CALL],
  ['packages/core/src/sync/floating-call.test.ts', FLOATING_PROMISES, 0, FLOATING_CALL],
  ['packages/contracts/src/floating-call.ts', FLOATING_PROMISES, 0, FLOATING_CALL],
  [
    'apps/server/src/modules/identity/internal.ts',
    PRIVATE_IMPORTS,
    0,
    '/** @package */\nexport const hidden = 1;\nexport const shown = 2;',
  ],
  [
    'apps/server/src/modules/attendance/uses-hidden.ts',
    PRIVATE_IMPORTS,
    1,
    "import { hidden } from '../identity/internal.ts';\nexport const value = hidden;",
  ],
  // Ground: a public export of the same file crosses the boundary freely.
  [
    'apps/server/src/modules/attendance/uses-shown.ts',
    PRIVATE_IMPORTS,
    0,
    "import { shown } from '../identity/internal.ts';\nexport const value = shown;",
  ],
  // Ground: a @package export is open to its own folder.
  [
    'apps/server/src/modules/identity/uses-hidden.ts',
    PRIVATE_IMPORTS,
    0,
    "import { hidden } from './internal.ts';\nexport const value = hidden;",
  ],
];

let scratch = '';
const found = new Map<string, number>();

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), 'lint-rules-'));
  for (const relative of COPIED_SETTINGS) {
    await mkdir(path.dirname(path.join(scratch, relative)), { recursive: true });
    await copyFile(path.join(REPO_ROOT, relative), path.join(scratch, relative));
  }
  for (const [file, , , content] of CASES) {
    await mkdir(path.dirname(path.join(scratch, file)), { recursive: true });
    await writeFile(path.join(scratch, file), `${content}\n`);
  }
  const biome = spawnSync(
    process.execPath,
    [BIOME, 'lint', '--reporter=github', '--max-diagnostics=1000', '.'],
    { cwd: scratch, encoding: 'utf8', windowsHide: true },
  );
  for (const match of biome.stdout.matchAll(/^::\w+ title=([^,]*),file=([^,]+),line=\d+/gm)) {
    const [, category, encodedFile] = match;
    const file = path
      .relative(scratch, path.resolve(scratch, decodeURIComponent(encodedFile ?? '')))
      .replaceAll('\\', '/');
    const key = `${file} ${category}`;
    found.set(key, (found.get(key) ?? 0) + 1);
  }
}, 120_000);

afterAll(async () => {
  if (scratch !== '') await rm(scratch, { recursive: true, force: true });
});

describe('Floating promises and private imports in biome.json', () => {
  it.each(CASES)('%s: %s reported %i time(s)', (file, category, count) => {
    expect(found.get(`${file} ${category}`) ?? 0).toBe(count);
  });
});
