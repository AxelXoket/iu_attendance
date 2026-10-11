import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  compareNodeVersions,
  MOBILE_EAS_FILE,
  NODE_VERSION_FILE,
  parseDockerfileNodeVersions,
  parseEasNodeVersions,
  SERVER_DOCKERFILE,
} from './node-version-check.ts';

const SCRIPT = fileURLToPath(new URL('./node-version-check.ts', import.meta.url));

const dockerfile = (version: string) =>
  [
    `FROM node:${version}-trixie-slim@sha256:${'a'.repeat(64)} AS build`,
    'WORKDIR /app',
    `FROM node:${version}-trixie-slim@sha256:${'a'.repeat(64)}`,
    'CMD ["node", "src/server.ts"]',
  ].join('\n');

const easJson = (version: string) =>
  JSON.stringify({
    cli: { version: '>= 16.0.0' },
    build: { development: { node: version }, production: { node: version } },
  });

const tempRoots: string[] = [];

async function makeRoot(files: { nodeVersion?: string; docker?: string; eas?: string }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'node-version-check-'));
  tempRoots.push(root);
  await mkdir(path.join(root, 'apps/server'), { recursive: true });
  await mkdir(path.join(root, 'apps/mobile'), { recursive: true });
  if (files.nodeVersion !== undefined) {
    await writeFile(path.join(root, NODE_VERSION_FILE), `${files.nodeVersion}\n`);
  }
  if (files.docker !== undefined) await writeFile(path.join(root, SERVER_DOCKERFILE), files.docker);
  if (files.eas !== undefined) await writeFile(path.join(root, MOBILE_EAS_FILE), files.eas);
  return root;
}

function runCheck(root: string) {
  const result = spawnSync(process.execPath, [SCRIPT, root], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Node version matches in three files', { timeout: 30_000 }, () => {
  it('exits 0 when .node-version, the Dockerfile base tag and eas.json agree', async () => {
    const root = await makeRoot({
      nodeVersion: '26.11.1',
      docker: dockerfile('26.11.1'),
      eas: easJson('26.11.1'),
    });
    const { status, output } = runCheck(root);
    expect(status).toBe(0);
    expect(output).toContain('Node version matches');
  });

  it('exits 1 and prints the three values when only the Dockerfile moves up a minor version', async () => {
    const root = await makeRoot({
      nodeVersion: '26.11.1',
      docker: dockerfile('26.12.0'),
      eas: easJson('26.11.1'),
    });
    const { status, output } = runCheck(root);
    expect(status).toBe(1);
    expect(output).toContain(`${NODE_VERSION_FILE}: 26.11.1`);
    expect(output).toContain(`${SERVER_DOCKERFILE}: 26.12.0, 26.12.0`);
    expect(output).toContain(`${MOBILE_EAS_FILE}: 26.11.1, 26.11.1`);
  });

  it('exits 1 when one eas.json profile differs', async () => {
    const eas = JSON.stringify({
      build: { development: { node: '26.11.1' }, production: { node: '26.10.0' } },
    });
    const root = await makeRoot({ nodeVersion: '26.11.1', docker: dockerfile('26.11.1'), eas });
    expect(runCheck(root).status).toBe(1);
  });

  it('exits 1 and names the missing file when a file is absent', async () => {
    const root = await makeRoot({ nodeVersion: '26.11.1', docker: dockerfile('26.11.1') });
    const { status, output } = runCheck(root);
    expect(status).toBe(1);
    expect(output).toContain(`${MOBILE_EAS_FILE}: (none) (file is missing)`);
  });

  it('exits 1 and names the eas.json profile that has no node value', async () => {
    const eas = JSON.stringify({
      build: { production: { node: '26.11.1' }, preview: { distribution: 'internal' } },
    });
    const root = await makeRoot({ nodeVersion: '26.11.1', docker: dockerfile('26.11.1'), eas });
    const { status, output } = runCheck(root);
    expect(status).toBe(1);
    expect(output).toContain('build profile preview has no node value');
  });

  it('exits 0 when a profile inherits node through extends', async () => {
    const eas = JSON.stringify({
      build: {
        production: { node: '26.11.1' },
        preview: { extends: 'production', distribution: 'internal' },
      },
    });
    const root = await makeRoot({ nodeVersion: '26.11.1', docker: dockerfile('26.11.1'), eas });
    const { status, output } = runCheck(root);
    expect(status).toBe(0);
    expect(output).toContain(`${MOBILE_EAS_FILE}: 26.11.1, 26.11.1`);
  });
});

describe('node version parsers', () => {
  it('reads every node stage of a multi-stage Dockerfile and ignores other images', () => {
    const text = [
      'FROM node:26.11.1-trixie-slim AS build',
      'FROM caddy:2.10',
      'FROM node:26.11.0',
    ].join('\n');
    expect(parseDockerfileNodeVersions(text)).toEqual({
      file: SERVER_DOCKERFILE,
      versions: ['26.11.1', '26.11.0'],
    });
  });

  it('rejects a floating Dockerfile tag such as node:26', () => {
    expect(parseDockerfileNodeVersions('FROM node:26-trixie-slim').problem).toBe(
      'not an exact version: "26"',
    );
  });

  it('reports eas.json without any node value', () => {
    expect(parseEasNodeVersions(JSON.stringify({ build: { production: {} } })).problem).toBe(
      'build profile production has no node value',
    );
    expect(parseEasNodeVersions(JSON.stringify({ build: {} })).problem).toBe('no build profiles');
    expect(parseEasNodeVersions(JSON.stringify({ cli: {} })).problem).toBe('no build profiles');
  });

  it('follows an extends chain and reports a missing target or a cycle', () => {
    const parse = (build: Record<string, unknown>) =>
      parseEasNodeVersions(JSON.stringify({ build }));
    expect(
      parse({ a: { node: '26.11.1' }, b: { extends: 'a' }, c: { extends: 'b', node: '26.11.1' } }),
    ).toEqual({ file: MOBILE_EAS_FILE, versions: ['26.11.1', '26.11.1', '26.11.1'] });
    // A profile's own node wins over the one it extends, so a differing value shows up.
    expect(
      parse({ a: { node: '26.11.1' }, b: { extends: 'a', node: '26.10.0' } }).versions,
    ).toEqual(['26.11.1', '26.10.0']);
    expect(parse({ a: { node: '26.11.1' }, b: { extends: 'gone' } }).problem).toBe(
      'build profile b extends a missing profile gone',
    );
    expect(parse({ a: { extends: 'b' }, b: { extends: 'a' } }).problem).toBe(
      'build profile a has an extends cycle (a -> b -> a); build profile b has an extends cycle (b -> a -> b)',
    );
  });

  it('agrees only when every source has exactly one shared version', () => {
    const same = [
      { file: 'a', versions: ['26.11.1'] },
      { file: 'b', versions: ['26.11.1', '26.11.1'] },
    ];
    expect(compareNodeVersions(same).ok).toBe(true);
    expect(compareNodeVersions([...same, { file: 'c', versions: ['26.11.2'] }]).ok).toBe(false);
    expect(compareNodeVersions([...same, { file: 'c', versions: [], problem: 'x' }]).ok).toBe(
      false,
    );
  });
});
