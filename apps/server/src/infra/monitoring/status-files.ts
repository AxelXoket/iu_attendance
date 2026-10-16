// The status files the host scripts write (D15), read under the settings' statusDir (the
// folder layout is in contracts operations.ts, status files): clock/chrony.json every
// thirty seconds, machine/machine.json every ten minutes, machine/maintenance.json while a
// release runs and database/<job>.json after each backup job. Each call reads the file
// whole, bounded in size, and checks it with its contract schema; nothing is cached, and no
// file trouble is thrown (settings() before the settings are loaded is a start-up bug and
// throws). No threshold and no file age is applied here: D04's document rule and the
// operations check apply them, so a file is only read or unreadable, never healthy.

import { open, stat } from 'node:fs/promises';
import path from 'node:path';
import { type BACKUP_JOBS, backupJobStatusSchema } from '@iu-attendance/contracts/database';
import {
  chronyStatusSchema,
  machineStatusSchema,
  maintenanceFileSchema,
} from '@iu-attendance/contracts/operations';
import type { z } from 'zod';
import { settings } from '../settings/index.ts';

/**
 * The largest file a reader takes; a longer one is MALFORMED. 4 KiB is the spec's bound for
 * the clock file and holds the largest valid maintenance and backup file too; the machine
 * file's largest valid form (64 disks, 64 containers) is about 70 KB.
 */
export const STATUS_FILE_MAX_BYTES = 4 * 1024;
export const MACHINE_FILE_MAX_BYTES = 128 * 1024;

export type UnreadableReason = 'FILE_MISSING' | 'MALFORMED' | 'NO_ACCESS';
export type Unreadable = { readonly status: 'UNREADABLE'; readonly reason: UnreadableReason };
export type StatusFileReading<T> = { readonly status: 'READ'; readonly value: T } | Unreadable;

type ChronyStatus = z.output<typeof chronyStatusSchema>;
/** The clock file's fields flat, as the spec's reading gives them, its instants as dates. */
export type ClockSyncReading =
  | (Readonly<Omit<ChronyStatus, 'format' | 'measuredAt' | 'lastBrokenAt'>> & {
      readonly status: 'READ';
      readonly measuredAt: Date;
      readonly lastBrokenAt: Date | null;
    })
  | Unreadable;

const unreadable = (reason: UnreadableReason): Unreadable => ({ status: 'UNREADABLE', reason });
const UTF8 = new TextDecoder('utf-8', { fatal: true });

/**
 * One status file: FILE_MISSING when it or its directory does not exist, NO_ACCESS when it
 * is not a regular file (a directory, a FIFO that would block the open) or cannot be read,
 * MALFORMED when it is longer than maxBytes, not UTF-8, not JSON or not of the schema.
 */
export async function readStatusFile<S extends z.ZodType>(
  file: string,
  schema: S,
  maxBytes: number,
): Promise<StatusFileReading<z.output<S>>> {
  let bytes: Uint8Array;
  try {
    if (!(await stat(file)).isFile()) return unreadable('NO_ACCESS');
    const handle = await open(file, 'r');
    try {
      // One read of one byte more than allowed: a regular file gives it all at once, and a
      // full buffer means the file is too long, even one that grew after the check above.
      const buffer = new Uint8Array(maxBytes + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > maxBytes) return unreadable('MALFORMED');
      bytes = buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return unreadable(code === 'ENOENT' ? 'FILE_MISSING' : 'NO_ACCESS');
  }
  let value: unknown;
  try {
    value = JSON.parse(UTF8.decode(bytes));
  } catch {
    return unreadable('MALFORMED');
  }
  const parsed = schema.safeParse(value);
  return parsed.success ? { status: 'READ', value: parsed.data } : unreadable('MALFORMED');
}

const statusFile = (...parts: string[]) => path.join(settings().general.statusDir, ...parts);

/** The clock sync file (D15 saatEsitlemeDurumu), which D04 reads every five seconds. */
export async function clockSyncStatus(): Promise<ClockSyncReading> {
  const reading = await readStatusFile(
    statusFile('clock', 'chrony.json'),
    chronyStatusSchema,
    STATUS_FILE_MAX_BYTES,
  );
  if (reading.status === 'UNREADABLE') return reading;
  const { value } = reading;
  return {
    status: 'READ',
    synced: value.synced,
    offsetMs: value.offsetMs,
    stratum: value.stratum,
    source: value.source,
    measuredAt: new Date(value.measuredAt),
    lastBrokenAt: value.lastBrokenAt === null ? null : new Date(value.lastBrokenAt),
  };
}

/** The machine check's file, for the operations check. */
export function machineStatus() {
  return readStatusFile(
    statusFile('machine', 'machine.json'),
    machineStatusSchema,
    MACHINE_FILE_MAX_BYTES,
  );
}

/** The release's maintenance file; missing outside a release. */
export function maintenanceStatus() {
  return readStatusFile(
    statusFile('machine', 'maintenance.json'),
    maintenanceFileSchema,
    STATUS_FILE_MAX_BYTES,
  );
}

/** One backup job's file (D12), each read on its own; a file naming another job is MALFORMED. */
export function backupJobStatus(job: (typeof BACKUP_JOBS)[number]) {
  return readStatusFile(
    statusFile('database', `${job}.json`),
    backupJobStatusSchema.refine((status) => status.job === job, {
      message: 'The file names its own job',
      path: ['job'],
    }),
    STATUS_FILE_MAX_BYTES,
  );
}
