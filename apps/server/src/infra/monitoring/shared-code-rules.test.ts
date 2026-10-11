import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The real packages/core settings (tsconfig, biome.json, hermes.grit) are copied
// into a scratch tree; every banned API sits alone in its own file. The real
// packages/core source is compiled as well.

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const TSC = path.join(REPO_ROOT, 'node_modules/typescript/bin/tsc');
const BIOME = path.join(REPO_ROOT, 'node_modules/@biomejs/biome/bin/biome');
const CORE_TSCONFIG = path.join(REPO_ROOT, 'packages/core/tsconfig.json');
const CORE_TEST_TSCONFIG = path.join(REPO_ROOT, 'packages/core/tsconfig.test.json');
const COPIED_SETTINGS = [
  'biome.json',
  'tsconfig.base.json',
  'packages/core/package.json',
  'packages/core/tsconfig.json',
  'packages/core/rules/hermes.grit',
];

type Case = [name: string, code: string];

const TSC_CASES: Case[] = [
  ['document', 'export const value = document.title;'],
  ['window', 'export const value = window.location;'],
  ['Buffer', "export const value = Buffer.from('x');"],
  ['process', 'export const value = process.env;'],
  ['toSorted', 'export const value = [3, 1].toSorted();'],
];

const BIOME_CASES: Case[] = [
  // The spec's list.
  ['Intl.NumberFormat', "export const value = new Intl.NumberFormat('tr').format(1);"],
  ['localeCompare', "export const value = 'a'.localeCompare('b');"],
  ['toLocaleString', 'export const value = (1).toLocaleString();'],
  ['BigInt call', 'export const value = BigInt(1);'],
  ['bigint literal', 'export const value = 10n;'],
  ['Date.parse', "export const value = Date.parse('2026-10-11');"],
  ['new Date with text', "export const value = new Date('2026-10-11');"],
  ['new Date with a template', 'export const value = new Date(`2026-10-11`);'],
  ['new Date with fields', 'export const value = new Date(2026, 9, 11);'],
  ['getHours', 'export const value = new Date(0).getHours();'],
  ['setHours', 'export const value = new Date(0).setHours(1);'],
  ['getTimezoneOffset', 'export const value = new Date(0).getTimezoneOffset();'],
  ['regex flag s', 'export const value = /a/s;'],
  ['regex flag d', 'export const value = /a/d;'],
  ['regex flag v', 'export const value = /a/v;'],
  ['RegExp flags argument', "export const value = new RegExp('a', 's');"],
  ['Math.pow', 'export const value = Math.pow(2, 3);'],
  ['Math.exp', 'export const value = Math.exp(1);'],
  ['Math.log', 'export const value = Math.log(2);'],
  // Optional calls and references to the same members.
  ['optional localeCompare', "export const value = (a?: string) => a?.localeCompare('b');"],
  ['optional getHours', 'export const value = (d?: Date) => d?.getHours();'],
  ['optional toLocaleString', 'export const value = (n?: number) => n?.toLocaleString();'],
  ['optional Math.exp', 'export const value = Math?.exp(1);'],
  ['Math.log reference', 'export const value = (v: number[]) => v.map(Math.log);'],
  ['Date.parse reference', "export const value = ['2026-10-11'].map(Date.parse);"],
  ['localeCompare reference', 'export const value = String.prototype.localeCompare;'],
  ['getHours reference', 'export const value = Date.prototype.getHours;'],
  ['Math through globalThis', 'export const value = globalThis.Math.pow(2, 3);'],
  ['Math.log destructured', 'const { log } = Math;\nexport const value = log(2);'],
  [
    'Math.exp destructured and renamed',
    'const { exp: e } = globalThis.Math;\nexport const value = e(1);',
  ],
  ['Date.parse destructured', "const { parse } = Date;\nexport const value = parse('2026-10-11');"],
  ['Intl destructured from globalThis', 'const { Intl: I } = globalThis;\nexport const value = I;'],
  // Other ways to reach the same APIs.
  ['Date without new', 'export const value = Date();'],
  ['RegExp without new', "export const value = RegExp('a', 's');"],
  ['RegExp flags in double quotes', 'export const value = new RegExp("a", "gd");'],
  ['RegExp flags in a template', 'export const value = new RegExp("a", `v`);'],
  ['Intl through globalThis', "export const value = new globalThis.Intl.NumberFormat('tr');"],
  ['BigInt through globalThis', 'export const value = globalThis.BigInt(1);'],
  ['power with a fraction', 'export const value = (x: number) => x ** 0.5;'],
  ['power with a negative fraction', 'export const value = (x: number) => x ** -0.5;'],
  ['power with a parenthesized fraction', 'export const value = (x: number) => x ** (0.5);'],
  ['power with a negative exponent', 'export const value = (x: number) => x ** 1e-3;'],
  ['power assignment with a fraction', 'export let value = 2;\nvalue **= 0.5;'],
  ['power with a division', 'export const value = (x: number) => x ** (1 / 2);'],
  [
    'power with a sum holding a fraction',
    'export const value = (x: number, y: number) => x ** (y + 0.5);',
  ],
  ['power assignment with a division', 'export let value = 2;\nvalue **= 1 / 3;'],
  // The same constructors and functions reached through globalThis.
  [
    'new Date with fields through globalThis',
    'export const value = new globalThis.Date(2026, 9, 11);',
  ],
  [
    'new Date with text through globalThis',
    "export const value = new globalThis.Date('2026-10-11');",
  ],
  ['Date without new through globalThis', 'export const value = globalThis.Date();'],
  [
    'RegExp flags through globalThis',
    "export const value = (p: string) => new globalThis.RegExp(p, 's');",
  ],
  // Destructuring from a prototype or through globalThis.
  [
    'getHours destructured from Date.prototype',
    'const { getHours } = Date.prototype;\nexport const value = getHours;',
  ],
  [
    'localeCompare destructured from String.prototype',
    'const { localeCompare } = String.prototype;\nexport const value = localeCompare;',
  ],
  [
    'Math.pow destructured through globalThis',
    'const { Math: { pow } } = globalThis;\nexport const value = pow;',
  ],
];

// Every method that formats with a locale or reads or writes local time gets its
// own case. The names come from the runtime, not from hermes.grit, so a name
// dropped from a rule leaves its case uncaught and the test red.
const LOCALE_METHODS = [Object, Number, String, Date, Array].flatMap((type) =>
  Object.getOwnPropertyNames(type.prototype).filter((name) =>
    /^toLocale|^localeCompare$/.test(name),
  ),
);
// Date methods that do not depend on the time zone. toString prints local time,
// but every object has a toString, so it cannot be banned by name and stays allowed.
const TIME_ZONE_FREE = new Set([
  'constructor',
  'getTime',
  'setTime',
  'valueOf',
  'toISOString',
  'toJSON',
  'toUTCString',
  'toGMTString',
  'toString',
  'toTemporalInstant',
]);
const DATE_METHODS = Object.getOwnPropertyNames(Date.prototype);
const LOCAL_TIME_METHODS = DATE_METHODS.filter(
  (name) => !name.includes('UTC') && !TIME_ZONE_FREE.has(name),
);
const SAFE_DATE_METHODS = DATE_METHODS.filter(
  (name) => name !== 'constructor' && (name.includes('UTC') || TIME_ZONE_FREE.has(name)),
);
const methodCase = (name: string): Case => [
  `method ${name}`,
  `export const value = (target: Date & string & number) => target.${name}();`,
];
const GENERATED_CASES: Case[] = [...new Set([...LOCALE_METHODS, ...LOCAL_TIME_METHODS])].map(
  methodCase,
);
const BANNED_CASES = [...BIOME_CASES, ...GENERATED_CASES];

const ALLOWED = [
  'export const hours = new Date(0).getUTCHours();',
  'export const stamp = Date.UTC(2026, 9, 11);',
  'export const instant = new Date(1_760_000_000_000);',
  'export const pattern = /a/giu;',
  'export const rounded = Math.floor(2.5) + Math.max(1, 2);',
  "export const ordered = 'a' < 'b';",
  'export const power = 2 ** 3;',
  'export const last = [3, 1].at(-1);',
].join('\n');

// Forms close to a banned one that must stay allowed (Biome only).
const ALLOWED_NEAR_MISSES: Case[] = [
  [
    'RegExp with a flags variable',
    'export const value = (p: string, flags: string) => new RegExp(p, flags);',
  ],
  ['RegExp with allowed literal flags', "export const value = new RegExp('a', 'gi');"],
  [
    'RegExp with a template of a variable',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: fixture source with a template literal
    'export const value = (f: string) => new RegExp("a", `${f}`);',
  ],
  ['power with an integer in exponent notation', 'export const value = (x: number) => x ** 1e3;'],
  ['power with a hex integer', 'export const value = (x: number) => x ** 0xe;'],
  ['power with a variable', 'export const value = (x: number, y: number) => x ** y;'],
  ['power with a member', 'export const value = (x: number, c: { e: number }) => x ** c.e;'],
  ['multiplication by a fraction', 'export const value = (x: number) => x * 0.5;'],
  ['Date from a number variable', 'export const value = (t: number) => new Date(t);'],
  ['another global through globalThis', 'export const value = globalThis.Number.MAX_SAFE_INTEGER;'],
  ['parse on another object', "export const value = JSON.parse('1');"],
  [
    'an allowed Math function destructured',
    'const { max } = Math;\nexport const value = max(1, 2);',
  ],
  ['Date.now destructured', 'const { now } = Date;\nexport const value = now;'],
  ['parse destructured from JSON', "const { parse } = JSON;\nexport const value = parse('1');"],
  ['another global destructured', 'const { Number: N } = globalThis;\nexport const value = N;'],
  [
    'log on another object',
    "export const value = (c: { log: (s: string) => void }) => c.log('x');",
  ],
  [
    'a name that only ends like a banned one',
    'export const value = (s: { notlocaleCompare: () => number }) => s.notlocaleCompare();',
  ],
  // Names that hold a banned name inside them; every alternative of a rule must be
  // anchored at both ends, not only the first and the last.
  ['a name holding getDate', 'export const value = (l: { targetDate: number }) => l.targetDate;'],
  [
    'a name holding setHours',
    'export const value = (z: { offsetHours: number }) => z.offsetHours;',
  ],
  [
    'a name holding setMinutes',
    'export const value = (s: { offsetMinutes: number }) => s.offsetMinutes;',
  ],
  [
    'a name holding getHours',
    'export const value = (c: { budgetHours: number }) => c.budgetHours;',
  ],
  [
    'a method holding setDate',
    'export const value = (f: { resetDate: () => void }) => f.resetDate();',
  ],
  [
    'a method starting with getDay',
    'export const value = (w: { getDayIndex: () => number }) => w.getDayIndex();',
  ],
  [
    'a method starting with localeCompare',
    'export const value = (o: { localeCompareFn: () => number }) => o.localeCompareFn();',
  ],
  [
    'parse on an object whose name starts with Date',
    "export const value = (DateRange: { parse: (s: string) => number }) => DateRange.parse('a');",
  ],
  [
    'log on an object whose name starts with Math',
    "export const value = (MathUtils: { log: (s: string) => void }) => MathUtils.log('x');",
  ],
  ['a Math member holding exp', 'export const value = Math.expm1(1);'],
  [
    'a destructured name holding exp',
    'const { random: expRandom } = Math;\nexport const value = expRandom;',
  ],
  [
    'parse destructured from an object whose name starts with Date',
    'const DateSchema = { parse: (s: string) => s };\nconst { parse } = DateSchema;\nexport const value = parse;',
  ],
  [
    'a getUTC method destructured from Date.prototype',
    'const { getUTCHours } = Date.prototype;\nexport const value = getUTCHours;',
  ],
  [
    'power with a member of _',
    'export const value = (x: number, _: { size: number }) => x ** _.size;',
  ],
  [
    'power with a member of a name ending in a digit',
    'export const value = (x: number, v1: { x: number }) => x ** v1.x;',
  ],
  ['new Date with one number through globalThis', 'export const value = new globalThis.Date(0);'],
  [
    'RegExp with allowed flags through globalThis',
    "export const value = new globalThis.RegExp('a', 'gi');",
  ],
  ...SAFE_DATE_METHODS.map(methodCase),
];

// The shared-code rules cover every TypeScript extension tsc can pull into the core
// program, not only .ts; test files of every extension stay exempt. The sample trips
// both the Grit plugin (10n) and noRestrictedGlobals (Intl).
const OTHER_EXTENSIONS = ['mts', 'cts', 'tsx'];
const EXTENSION_SAMPLE = 'export const big = 10n;\nexport const locale = Intl;';
const extensionFile = (extension: string, test = false) =>
  `packages/core/src/cases/other-extension${test ? '.test' : ''}.${extension}`;

const fileName = (name: string) => name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
const caseFile = (name: string) => `packages/core/src/cases/${fileName(name)}.ts`;

let scratch = '';
const tscErrors = new Map<string, number>();
const hermesDiagnostics = new Map<string, number>();

function countBy(map: Map<string, number>, file: string) {
  map.set(file, (map.get(file) ?? 0) + 1);
}

async function put(relative: string, content: string) {
  const target = path.join(scratch, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${content}\n`);
}

function runTsc(args: string[]) {
  const result = spawnSync(process.execPath, [TSC, ...args, '--pretty', 'false'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    stdout: result.stdout,
  };
}

// Files of the real packages/core/src that a tsconfig puts in its program.
function coreProgramFiles(tsconfig: string): string[] {
  const coreSource = `${path.join(REPO_ROOT, 'packages/core/src').replaceAll('\\', '/')}/`;
  return runTsc(['-p', tsconfig, '--listFilesOnly'])
    .stdout.split(/\r?\n/)
    .map((line) => line.trim().replaceAll('\\', '/'))
    .filter((file) => file.startsWith(coreSource));
}

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), 'shared-code-rules-'));
  for (const relative of COPIED_SETTINGS) {
    await mkdir(path.dirname(path.join(scratch, relative)), { recursive: true });
    await copyFile(path.join(REPO_ROOT, relative), path.join(scratch, relative));
  }
  for (const [name, code] of [...TSC_CASES, ...BANNED_CASES]) {
    await put(caseFile(name), code);
    await put(caseFile(name).replace(/\.ts$/, '.test.ts'), code);
    await put(`apps/server/src/cases/${fileName(name)}.ts`, code);
  }
  for (const [name, code] of ALLOWED_NEAR_MISSES) {
    await put(caseFile(`allowed ${name}`), code);
  }
  await put('packages/core/src/cases/allowed.ts', ALLOWED);
  for (const extension of OTHER_EXTENSIONS) {
    await put(extensionFile(extension), EXTENSION_SAMPLE);
    await put(extensionFile(extension, true), EXTENSION_SAMPLE);
  }

  const tsc = spawnSync(
    process.execPath,
    [TSC, '-p', path.join(scratch, 'packages/core/tsconfig.json'), '--noEmit', '--pretty', 'false'],
    { cwd: scratch, encoding: 'utf8', windowsHide: true },
  );
  for (const match of tsc.stdout.matchAll(/^(.+?)\(\d+,\d+\): error TS\d+:/gm)) {
    countBy(
      tscErrors,
      path.relative(scratch, path.resolve(scratch, match[1] ?? '')).replaceAll('\\', '/'),
    );
  }

  const biome = spawnSync(
    process.execPath,
    [BIOME, 'lint', '--reporter=github', '--max-diagnostics=5000', '.'],
    { cwd: scratch, encoding: 'utf8', windowsHide: true },
  );
  // Plugin diagnostics carry the Hermes message; noRestrictedGlobals prints its own
  // message and keeps the configured one as a note, so it is matched by category.
  // A plugin that fails to run reports a different message and counts as nothing.
  for (const match of biome.stdout.matchAll(
    /^::\w+ title=([^,]*),file=([^,]+),line=\d+.*?::(.*)$/gm,
  )) {
    const [, category, encodedFile, message] = match;
    const hermesPlugin = category === 'plugin' && message?.startsWith('Hermes rule:') === true;
    if (hermesPlugin || category === 'lint/style/noRestrictedGlobals') {
      const file = decodeURIComponent(encodedFile ?? '');
      countBy(
        hermesDiagnostics,
        path.relative(scratch, path.resolve(scratch, file)).replaceAll('\\', '/'),
      );
    }
  }
}, 120_000);

afterAll(async () => {
  if (scratch !== '') await rm(scratch, { recursive: true, force: true });
});

describe('Shared code Hermes rules are caught by tsc and Biome', () => {
  it.each(TSC_CASES)('tsc rejects %s in shared code with exactly one error', (name) => {
    expect(tscErrors.get(caseFile(name))).toBe(1);
  });

  it.each(BIOME_CASES)('Biome rejects %s in shared code with exactly one diagnostic', (name) => {
    expect(hermesDiagnostics.get(caseFile(name))).toBe(1);
  });

  it('derives a case for every locale and local-time method of the runtime', () => {
    // Ground for the generated cases: the oracle is not empty and covers the spec's examples.
    expect(GENERATED_CASES.map(([name]) => name)).toEqual(
      expect.arrayContaining([
        'method localeCompare',
        'method toLocaleUpperCase',
        'method toLocaleDateString',
        'method getHours',
        'method setMilliseconds',
        'method getTimezoneOffset',
        'method toDateString',
      ]),
    );
    expect(SAFE_DATE_METHODS).toEqual(expect.arrayContaining(['getUTCHours', 'getTime']));
  });

  it.each(GENERATED_CASES)(
    'Biome rejects %s in shared code with exactly one diagnostic',
    (name) => {
      expect(hermesDiagnostics.get(caseFile(name))).toBe(1);
    },
  );

  it('accepts the allowed forms (UTC getters, Date.UTC, integer math, plain flags)', () => {
    expect(tscErrors.get('packages/core/src/cases/allowed.ts')).toBeUndefined();
    expect(hermesDiagnostics.get('packages/core/src/cases/allowed.ts')).toBeUndefined();
  });

  it.each(ALLOWED_NEAR_MISSES)('Biome accepts %s', (name) => {
    expect(hermesDiagnostics.get(caseFile(`allowed ${name}`))).toBeUndefined();
  });

  it.each(OTHER_EXTENSIONS)(
    'Biome applies the rules to .%s sources, not to their tests',
    (extension) => {
      // One diagnostic from the Grit plugin, one from noRestrictedGlobals.
      expect(hermesDiagnostics.get(extensionFile(extension))).toBe(2);
      expect(hermesDiagnostics.get(extensionFile(extension, true))).toBeUndefined();
    },
  );

  it('does not apply the rules to test files or to server code', () => {
    const exempt = [...hermesDiagnostics.keys(), ...tscErrors.keys()].filter(
      (file) => /\.test\.[cm]?tsx?$/.test(file) || file.startsWith('apps/'),
    );
    expect(exempt).toEqual([]);
    expect(hermesDiagnostics.size).toBe(BANNED_CASES.length + OTHER_EXTENSIONS.length);
  });
});

describe('The real packages/core source', () => {
  it('compiles with packages/core/tsconfig.json without a diagnostic', () => {
    const { status, output } = runTsc(['-p', CORE_TSCONFIG, '--noEmit']);
    expect(output).toBe('');
    expect(status).toBe(0);
  }, 60_000);

  it('puts source files and no *.test.ts file in that program (tsc --listFilesOnly)', () => {
    const files = coreProgramFiles(CORE_TSCONFIG);
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((file) => file.endsWith('.test.ts'))).toEqual([]);
  }, 60_000);

  it('the same listing shows test files for tsconfig.test.json (control)', () => {
    expect(coreProgramFiles(CORE_TEST_TSCONFIG).some((file) => file.endsWith('.test.ts'))).toBe(
      true,
    );
  }, 60_000);
});
