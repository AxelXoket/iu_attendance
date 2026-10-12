import { AppError } from '@iu-attendance/contracts/shared';
import { sql } from 'drizzle-orm';
import type { Transaction } from './index.ts';

// The database generation (D12-B32): the cluster's system identifier and its timeline. A
// restore or a promotion changes it, so the sync module stamps every change cursor with it.
// Two sources must agree on the timeline: the control file's last checkpoint and the name
// of the WAL file being written. Right after a promotion they can differ for a moment; the
// generation is then uncertain and the caller retries (503).

export type Generation = {
  readonly systemId: string;
  readonly timeline: number;
  /** '<system>.<timeline>', the form cursors and restore rows store. */
  readonly text: string;
};

// A WAL file name is 24 hex digits; the first 8 are the timeline.
const WAL_FILE = /^[0-9A-F]{24}$/;

/** The generation from the two sources, or null when they disagree on the timeline. */
export function decideGeneration(
  systemId: string,
  controlTimeline: number,
  walFileName: string,
): Generation | null {
  if (!WAL_FILE.test(walFileName)) return null;
  const walTimeline = Number.parseInt(walFileName.slice(0, 8), 16);
  if (walTimeline !== controlTimeline) return null;
  return { systemId, timeline: controlTimeline, text: `${systemId}.${controlTimeline}` };
}

/**
 * Reads the generation in the caller's transaction through the two functions of the first
 * migration. Primary only: the WAL position fails during recovery. Throws
 * AppError('DATABASE_GENERATION_UNCERTAIN') when the sources disagree.
 */
export async function readGeneration(tx: Transaction): Promise<Generation> {
  const control = await tx.execute<{ system_identifier: string; timeline_id: number }>(
    sql`SELECT system_identifier, timeline_id FROM app.database_generation_control_file()`,
  );
  const wal = await tx.execute<{ wal_file: string }>(
    sql`SELECT app.database_generation_wal_file() AS wal_file`,
  );
  const [controlRow] = control.rows;
  const [walRow] = wal.rows;
  const generation =
    controlRow === undefined || walRow === undefined
      ? null
      : decideGeneration(controlRow.system_identifier, controlRow.timeline_id, walRow.wal_file);
  if (generation === null) throw new AppError('DATABASE_GENERATION_UNCERTAIN');
  return generation;
}
