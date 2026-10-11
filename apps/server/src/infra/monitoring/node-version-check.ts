import { readFile } from 'node:fs/promises';
import path from 'node:path';

// The quality gate's Node version check: .node-version, the Node base image tag in
// apps/server/Dockerfile and every build profile's node value in apps/mobile/eas.json
// must name the same exact version. A profile may inherit node through "extends"; a
// profile that ends up without one would build with the image's default Node, so
// it fails the check. Usage: node node-version-check.ts [rootDir]

export const NODE_VERSION_FILE = '.node-version';
export const SERVER_DOCKERFILE = 'apps/server/Dockerfile';
export const MOBILE_EAS_FILE = 'apps/mobile/eas.json';

const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const NODE_IMAGE =
  /^\s*FROM\s+(?:--platform=\S+\s+)?(?:docker\.io\/)?(?:library\/)?node:([^\s@]+)/i;

export interface VersionSource {
  file: string;
  versions: string[];
  problem?: string;
}

export function parseNodeVersionFile(text: string): VersionSource {
  const value = text.trim();
  if (!EXACT_VERSION.test(value)) {
    return { file: NODE_VERSION_FILE, versions: [], problem: `not an exact version: "${value}"` };
  }
  return { file: NODE_VERSION_FILE, versions: [value] };
}

export function parseDockerfileNodeVersions(text: string): VersionSource {
  const versions: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = NODE_IMAGE.exec(line);
    if (match?.[1] !== undefined) {
      // A tag such as 26.11.1-trixie-slim starts with the version.
      versions.push(match[1].split('-')[0] ?? '');
    }
  }
  if (versions.length === 0) {
    return { file: SERVER_DOCKERFILE, versions, problem: 'no FROM node:<version> line' };
  }
  const inexact = versions.find((version) => !EXACT_VERSION.test(version));
  if (inexact !== undefined) {
    return { file: SERVER_DOCKERFILE, versions, problem: `not an exact version: "${inexact}"` };
  }
  return { file: SERVER_DOCKERFILE, versions };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Follows "extends" until a profile names node. Returns the value or a problem.
function resolveProfileNode(
  profiles: Record<string, unknown>,
  name: string,
): { node: string } | { problem: string } {
  const chain: string[] = [];
  let current = name;
  while (!chain.includes(current)) {
    chain.push(current);
    const profile = profiles[current];
    if (!isRecord(profile)) {
      return current === name
        ? { problem: `build profile ${name} is not an object` }
        : { problem: `build profile ${name} extends a missing profile ${current}` };
    }
    if (profile.node !== undefined) return { node: String(profile.node) };
    if (typeof profile.extends !== 'string') {
      return { problem: `build profile ${name} has no node value` };
    }
    current = profile.extends;
  }
  return {
    problem: `build profile ${name} has an extends cycle (${[...chain, current].join(' -> ')})`,
  };
}

export function parseEasNodeVersions(text: string): VersionSource {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { file: MOBILE_EAS_FILE, versions: [], problem: 'not valid JSON' };
  }
  const profiles = isRecord(parsed) ? parsed.build : undefined;
  if (!isRecord(profiles) || Object.keys(profiles).length === 0) {
    return { file: MOBILE_EAS_FILE, versions: [], problem: 'no build profiles' };
  }
  const versions: string[] = [];
  const problems: string[] = [];
  for (const name of Object.keys(profiles)) {
    const resolved = resolveProfileNode(profiles, name);
    if ('node' in resolved) versions.push(resolved.node);
    else problems.push(resolved.problem);
  }
  if (problems.length > 0) {
    return { file: MOBILE_EAS_FILE, versions, problem: problems.join('; ') };
  }
  const inexact = versions.find((version) => !EXACT_VERSION.test(version));
  if (inexact !== undefined) {
    return { file: MOBILE_EAS_FILE, versions, problem: `not an exact version: "${inexact}"` };
  }
  return { file: MOBILE_EAS_FILE, versions };
}

export interface NodeVersionReport {
  ok: boolean;
  lines: string[];
}

export function compareNodeVersions(sources: VersionSource[]): NodeVersionReport {
  const all = new Set(sources.flatMap((source) => source.versions));
  const ok = sources.every((source) => source.problem === undefined) && all.size === 1;
  const lines = sources.map((source) => {
    const shown = source.versions.length > 0 ? source.versions.join(', ') : '(none)';
    return source.problem === undefined
      ? `${source.file}: ${shown}`
      : `${source.file}: ${shown} (${source.problem})`;
  });
  return { ok, lines };
}

async function readSource(
  root: string,
  file: string,
  parse: (text: string) => VersionSource,
): Promise<VersionSource> {
  try {
    return parse(await readFile(path.join(root, file), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { file, versions: [], problem: 'file is missing' };
    }
    throw error;
  }
}

export async function checkNodeVersions(root: string): Promise<NodeVersionReport> {
  const sources = await Promise.all([
    readSource(root, NODE_VERSION_FILE, parseNodeVersionFile),
    readSource(root, SERVER_DOCKERFILE, parseDockerfileNodeVersions),
    readSource(root, MOBILE_EAS_FILE, parseEasNodeVersions),
  ]);
  return compareNodeVersions(sources);
}

if (import.meta.main) {
  const report = await checkNodeVersions(path.resolve(process.argv[2] ?? '.'));
  const heading = report.ok ? 'Node version matches:' : 'Node version mismatch:';
  const write = report.ok ? console.log : console.error;
  write([heading, ...report.lines.map((line) => `  ${line}`)].join('\n'));
  process.exitCode = report.ok ? 0 : 1;
}
