import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Process } from '../../src/infra/settings/schema.ts';
import {
  isKeyPurpose,
  type SecretKeyPurpose,
  type SecretName,
  secretsOf,
} from '../../src/infra/settings/secret-files.ts';

// The settings tests' world: an environment every process starts with, and a secrets
// directory holding every file a process reads.

export const AT = '2026-10-06T07:05:00.000Z';

/** U+FEFF, built at run time so no tool turns an escape into an invisible character. */
export const BYTE_ORDER_MARK = String.fromCodePoint(0xfeff);

/** 32 bytes of one value, as base64. */
export const key32 = (byte: number) => Buffer.alloc(32, byte).toString('base64');

export const keySetFile = (purpose: SecretKeyPurpose, kid = 'k1', byte = 1) =>
  JSON.stringify({
    format: 1,
    purpose,
    activeKid: kid,
    keys: [{ kid, value: key32(byte), status: 'ACTIVE', createdAt: AT }],
  });

// A value that must never show up in an error message or its details.
export const DATABASE_HOST = 'db-secret-host.internal';

export const envFor = (patch: Record<string, string | undefined> = {}) => ({
  APP_ENVIRONMENT: 'test',
  PANEL_ORIGIN: 'https://panel.example.edu',
  DATABASE_HOST,
  EMAIL_SMTP_HOST: 'smtp.example.edu',
  EMAIL_FROM_ADDRESS: 'yoklama@example.edu',
  EMAIL_FROM_NAME: 'Yoklama',
  EMAIL_PRODUCT_NAME: 'IU Yoklama',
  REVIEW_LECTURER_EMAIL: 'review-lecturer@example.edu',
  REVIEW_LECTURER_NAME: 'Review Lecturer',
  REVIEW_STUDENT_NUMBER: '0123456789',
  REVIEW_STUDENT_NAME: 'Review Student',
  ANDROID_PACKAGE_NAME: 'edu.example.attendance',
  ANDROID_SIGNING_DIGESTS: 'a'.repeat(64),
  APP_ATTEST_APP_ID: 'ABCDE12345.edu.example.attendance',
  DOMAIN_NAME: 'yoklama.example.edu',
  ...patch,
});

/** A fresh directory with every secret file the process reads; removed by the caller. */
export function secretsDirFor(kind: Process, skip: readonly SecretName[] = []): string {
  const dir = mkdtempSync(join(tmpdir(), 'iu-settings-'));
  for (const name of secretsOf(kind)) {
    if (skip.includes(name)) continue;
    if (isKeyPurpose(name)) {
      writeFileSync(join(dir, name), keySetFile(name));
    } else if (name === 'heartbeat') {
      writeFileSync(
        join(dir, name),
        JSON.stringify({ normalUrl: 'https://hc.example.edu/ok', problemUrl: null }),
      );
    } else {
      writeFileSync(join(dir, name), `${name}-value\n`);
    }
  }
  return dir;
}

export const removeDir = (dir: string) => rmSync(dir, { recursive: true, force: true });

/** A fake cgroup memory.max holding the given text, in its own directory. */
export function memoryMaxFile(text: string): { readonly dir: string; readonly path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'iu-cgroup-'));
  const path = join(dir, 'memory.max');
  writeFileSync(path, `${text}\n`);
  return { dir, path };
}
