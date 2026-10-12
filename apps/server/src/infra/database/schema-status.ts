import { isAppError } from '@iu-attendance/contracts/shared';
import { sql } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { readGeneration } from './generation.ts';

// The database half of the readiness answer (D12-B10): the server is ready when the
// database answers, its migration ledger holds the newest migration this code ships with
// (later ones may follow: an expand step runs ahead of the old image), and its generation
// is certain.

export type SchemaStatus = {
  readonly ready: boolean;
  readonly reason: 'ready' | 'unreachable' | 'behind' | 'generation_uncertain';
  /** The hash of the newest migration this code ships with. */
  readonly expectedMigration: string;
  readonly generation: string | null;
};

/**
 * The hash of the newest migration of a drizzle-kit folder, as drizzle's migrator writes
 * it to the ledger. Read once at startup: the folder is part of the image.
 */
export function newestMigrationHash(migrationsFolder: string): string {
  const newest = readMigrationFiles({ migrationsFolder }).at(-1);
  if (newest === undefined) throw new Error(`No migration in ${migrationsFolder}`);
  return newest.hash;
}

export type SchemaReading =
  | { readonly kind: 'unreachable' }
  | {
      readonly kind: 'read';
      /** The hashes in the ledger; empty before the first migration. */
      readonly applied: readonly string[];
      readonly generation: string | null;
    };

/** The status from what the database answered: unreachable, then behind, then uncertain. */
export function schemaStatusOf(expectedMigration: string, reading: SchemaReading): SchemaStatus {
  const status = (reason: SchemaStatus['reason'], generation: string | null): SchemaStatus => ({
    ready: reason === 'ready',
    reason,
    expectedMigration,
    generation,
  });
  if (reading.kind === 'unreachable') return status('unreachable', null);
  if (!reading.applied.includes(expectedMigration)) return status('behind', null);
  if (reading.generation === null) return status('generation_uncertain', null);
  return status('ready', reading.generation);
}

// drizzle's ledger, in its default schema and table, one row per applied migration; before
// the first migration the table does not exist. D12 reads only its hash column.
const LEDGER_PRESENT = sql`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
const APPLIED_HASHES = sql`SELECT hash FROM drizzle.__drizzle_migrations`;

/**
 * Reads the ledger and, once the expected migration is in it, the generation, in one
 * read-only transaction. A database that cannot be read is not ready: the check reports
 * unreachable rather than throwing.
 */
export async function readSchemaStatus(
  db: NodePgDatabase,
  expectedMigration: string,
): Promise<SchemaStatus> {
  let reading: SchemaReading;
  try {
    reading = await db.transaction(
      async (tx) => {
        const ledger = await tx.execute<{ present: boolean }>(LEDGER_PRESENT);
        const applied =
          ledger.rows[0]?.present === true
            ? (await tx.execute<{ hash: string }>(APPLIED_HASHES)).rows.map((row) => row.hash)
            : [];
        // Behind is decided without the generation, whose functions the first migration
        // brings.
        if (!applied.includes(expectedMigration)) {
          return { kind: 'read', applied, generation: null } as const;
        }
        try {
          return { kind: 'read', applied, generation: (await readGeneration(tx)).text } as const;
        } catch (error) {
          if (isAppError(error) && error.code === 'DATABASE_GENERATION_UNCERTAIN') {
            return { kind: 'read', applied, generation: null } as const;
          }
          throw error;
        }
      },
      { accessMode: 'read only' },
    );
  } catch {
    reading = { kind: 'unreachable' };
  }
  return schemaStatusOf(expectedMigration, reading);
}
