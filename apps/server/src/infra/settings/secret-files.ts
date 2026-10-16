import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  heartbeatSecretSchema,
  SECRET_KEY_PURPOSES,
  type SECRET_KEY_STATUSES,
  SECRET_MATRIX,
  type Service,
  secretKeyFileSchema,
} from '@iu-attendance/contracts/operations';
import type { Process } from './schema.ts';
import { SecretValue } from './secret-value.ts';

// The secret files (D15): one file per secret under the secrets directory, named as in
// SECRET_MATRIX, bound only to the services the matrix names. A key set file holds one
// to four keys of a purpose (secretKeyFileSchema); the other files hold one value, and the
// heartbeat file a small JSON object. A problem is reported by the file's name only.

export type SecretName = keyof typeof SECRET_MATRIX;
export type SecretKeyPurpose = (typeof SECRET_KEY_PURPOSES)[number];
export type SecretKeyStatus = (typeof SECRET_KEY_STATUSES)[number];

/** One key of a purpose with its 32 bytes; the readers hand out copies. */
export type SecretKey = Readonly<{
  purpose: SecretKeyPurpose;
  kid: string;
  value: Uint8Array;
  status: SecretKeyStatus;
  /** When the suspicion began; only for a compromised key. */
  compromisedAt: Date | null;
}>;

export type SecretKeySet = Readonly<{ activeKid: string; keys: readonly SecretKey[] }>;

type SingleValueName = Exclude<SecretName, SecretKeyPurpose | 'heartbeat'>;

export type LoadedSecrets = Readonly<{
  keySets: ReadonlyMap<SecretKeyPurpose, SecretKeySet>;
  values: Readonly<Partial<Record<SingleValueName, SecretValue>>>;
  heartbeat: Readonly<{ normalUrl: SecretValue; problemUrl: SecretValue | null }> | null;
  /** The review fixed code file exists and is not empty. */
  reviewFixedCodePresent: boolean;
}>;

// A command runs in the migration service's container with its secrets (D15, commands).
const SERVICE_OF = {
  api: 'api',
  worker: 'worker',
  migration: 'migration',
  cli: 'migration',
} as const satisfies Record<Process, Service>;

export const isKeyPurpose = (name: string): name is SecretKeyPurpose =>
  (SECRET_KEY_PURPOSES as readonly string[]).includes(name);

// The worker only learns whether the review fixed code is there; it never reads the value.
const presenceOnly = (name: SecretName, kind: Process) =>
  name === 'review_fixed_code' && kind === 'worker';

/** The secrets a process reads, in the matrix's order. */
export function secretsOf(kind: Process): readonly SecretName[] {
  const service = SERVICE_OF[kind];
  return (Object.keys(SECRET_MATRIX) as SecretName[]).filter((name) =>
    (SECRET_MATRIX[name] as readonly Service[]).includes(service),
  );
}

/**
 * The secrets a process cannot start without: all it reads but a presence-only one, and
 * the SMTP password only with an SMTP user (Compose binds that file in any case).
 */
export function requiredSecretsOf(kind: Process, hasSmtpUser: boolean): readonly SecretName[] {
  return secretsOf(kind).filter(
    (name) => !presenceOnly(name, kind) && (name !== 'smtp_password' || hasSmtpUser),
  );
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

// A byte order mark and one trailing line end are the file's, not the value's.
const BYTE_ORDER_MARK = String.fromCodePoint(0xfeff);
const fileValue = (text: string) =>
  (text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text).replace(/\r?\n$/, '');

function parseJson(text: string): unknown {
  try {
    return JSON.parse(fileValue(text));
  } catch {
    return undefined;
  }
}

function parseKeySet(purpose: SecretKeyPurpose, text: string): SecretKeySet | null {
  const parsed = secretKeyFileSchema.safeParse(parseJson(text));
  if (!parsed.success || parsed.data.purpose !== purpose) return null;
  const keys = parsed.data.keys.map((key) =>
    Object.freeze({
      purpose,
      kid: key.kid,
      value: new Uint8Array(Buffer.from(key.value, 'base64')),
      status: key.status,
      compromisedAt: key.compromisedAt === undefined ? null : new Date(key.compromisedAt),
    }),
  );
  return Object.freeze({ activeKid: parsed.data.activeKid, keys: Object.freeze(keys) });
}

// Whether a file holds something, read without its content: the worker never reads the
// review fixed code's value.
function hasContent(path: string): boolean {
  try {
    const stat = statSync(path);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

/**
 * Reads the process's secrets from dir. Returns what it read and the names of the files
 * at fault: a required file missing, unreadable or empty, or a file that does not parse.
 * An empty file of a secret the process may go without counts as absent.
 */
export function readSecrets(
  dir: string,
  kind: Process,
  hasSmtpUser: boolean,
): { readonly secrets: LoadedSecrets; readonly problems: readonly SecretName[] } {
  const required = new Set(requiredSecretsOf(kind, hasSmtpUser));
  const problems: SecretName[] = [];
  const keySets = new Map<SecretKeyPurpose, SecretKeySet>();
  const values: Partial<Record<SingleValueName, SecretValue>> = {};
  let heartbeat: LoadedSecrets['heartbeat'] = null;
  for (const name of secretsOf(kind)) {
    if (presenceOnly(name, kind)) continue;
    const text = readText(join(dir, name));
    if (text === null) {
      if (required.has(name)) problems.push(name);
    } else if (isKeyPurpose(name)) {
      const set = parseKeySet(name, text);
      if (set === null) problems.push(name);
      else keySets.set(name, set);
    } else if (name === 'heartbeat') {
      const parsed = heartbeatSecretSchema.safeParse(parseJson(text));
      if (!parsed.success) problems.push(name);
      else {
        const { normalUrl, problemUrl } = parsed.data;
        heartbeat = Object.freeze({
          normalUrl: new SecretValue(normalUrl),
          problemUrl: problemUrl === null ? null : new SecretValue(problemUrl),
        });
      }
    } else {
      const value = fileValue(text);
      if (value.trim() !== '') values[name] = new SecretValue(value);
      else if (required.has(name)) problems.push(name);
    }
  }
  const reviewFixedCodePresent = presenceOnly('review_fixed_code', kind)
    ? hasContent(join(dir, 'review_fixed_code'))
    : values.review_fixed_code !== undefined;
  return {
    secrets: Object.freeze({
      keySets,
      values: Object.freeze(values),
      heartbeat,
      reviewFixedCodePresent,
    }),
    problems,
  };
}

/**
 * A key set's digest for the start-up log line: SHA-256 over its keys sorted by kid,
 * one line each of kid, status and the SHA-256 of the key; never the key itself. The key
 * rotation script compares it with the file's.
 */
export function keySetDigest(set: SecretKeySet): string {
  const lines = [...set.keys]
    .sort((a, b) => (a.kid < b.kid ? -1 : a.kid > b.kid ? 1 : 0))
    .map((key) => `${key.kid} ${key.status} ${sha256Hex(key.value)}`);
  return sha256Hex(new TextEncoder().encode(lines.join('\n')));
}

const sha256Hex = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
