import { spawnSync } from 'node:child_process';
import pino from 'pino';
import { afterAll, describe, expect, it } from 'vitest';
import { SECRET_PLACEHOLDER, SecretValue } from '../settings/secret-value.ts';
import { bindRootLogger, log } from './index.ts';

// A logger that keeps its raw lines in memory.
function memoryLogger(level: pino.Level = 'debug') {
  const raw: string[] = [];
  const logger = pino({ level, base: null }, { write: (line: string) => void raw.push(line) });
  const lines = () => raw.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { logger, raw, lines };
}

// What a fresh process writes through the root logger before any binding.
function unboundOutput(script: string) {
  const source = `import { log } from ${JSON.stringify(new URL('./index.ts', import.meta.url).href)};\n${script}`;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return { stdout: run.stdout, stderr: run.stderr, status: run.status };
}

describe('the root logger before the log setup', () => {
  it('writes JSON lines at info to stderr, the time in UTC ISO, without pid and host', () => {
    const run = unboundOutput(
      "log.debug('hidden'); log.info({ step: 1, levels: [log.level, log.child({ m: 1 }).level] }, 'settings loaded');",
    );
    expect([run.status, run.stdout]).toEqual([0, '']);
    const lines = run.stderr
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 30,
      step: 1,
      levels: ['info', 'info'],
      msg: 'settings loaded',
    });
    expect(lines[0].time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Object.keys(lines[0])).not.toContain('pid');
    expect(Object.keys(lines[0])).not.toContain('hostname');
  });
});

describe('the root logger', () => {
  const early = log.child({ module: 'early' });
  // The test leaves a bound logger behind; the next binding in this process replaces it.
  afterAll(() => bindRootLogger(pino({ level: 'info' }, pino.destination(2))));

  it('follows the binding, with the children made before it', () => {
    const first = memoryLogger();
    bindRootLogger(first.logger);
    log.debug({ step: 1 }, 'root');
    early.info({ step: 2 }, 'child');
    log.child({ module: 'late' }).warn('late child');
    expect(first.lines().map(({ msg, module }) => [msg, module])).toEqual([
      ['root', undefined],
      ['child', 'early'],
      ['late child', 'late'],
    ]);
    expect(log.level).toBe('debug');

    const second = memoryLogger('warn');
    bindRootLogger(second.logger);
    early.info('dropped below warn');
    early.error('kept');
    expect(second.lines().map(({ msg, module }) => [msg, module])).toEqual([['kept', 'early']]);
    expect(first.raw).toHaveLength(3);
  });

  it('passes a level set on a child to the children made from it', () => {
    const bound = memoryLogger('info');
    bindRootLogger(bound.logger);
    const parent = log.child({ module: 'parent' });
    parent.level = 'debug';
    parent.child({ part: 'inner' }).debug('inner debug');
    log.debug('root debug');
    expect(bound.lines().map(({ msg, module, part }) => [msg, module, part])).toEqual([
      ['inner debug', 'parent', 'inner'],
    ]);
    expect(() => log.child(undefined as never)).toThrow();
    // Child options, as Fastify passes a route's level, reach the pino child.
    log.child({ module: 'route' }, { level: 'trace' }).trace('route trace');
    expect(bound.lines().at(-1)).toMatchObject({ msg: 'route trace', module: 'route' });
  });

  it('writes a secret setting as [gizli] in its log line', () => {
    const bound = memoryLogger('info');
    bindRootLogger(bound.logger);
    const secret = new SecretValue('db-password-7f3a');
    log.info({ settings: { databasePassword: secret } }, `connecting with ${secret}`);
    expect(bound.lines()[0]).toMatchObject({
      settings: { databasePassword: SECRET_PLACEHOLDER },
      msg: `connecting with ${SECRET_PLACEHOLDER}`,
    });
    // The raw line, before any parsing could hide a repeated key.
    expect(bound.raw.join('\n')).not.toContain(secret.reveal());
  });

  it('sets a level on the logger it is bound to', () => {
    const bound = memoryLogger('info');
    bindRootLogger(bound.logger);
    log.level = 'error';
    expect(bound.logger.level).toBe('error');
    expect(['info' in log, 'notAMethod' in log]).toEqual([true, false]);
  });

  it('is never bound to itself or to a logger made from it', () => {
    expect(() => bindRootLogger(log)).toThrow(TypeError);
    expect(() => bindRootLogger(log.child({ module: 'loop' }))).toThrow(TypeError);
  });
});
