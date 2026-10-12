// Single entry point of the database infrastructure (D12). Later database packages add only
// their own export lines here.
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * The tx that every database facade takes: the transaction of the schemaless Drizzle
 * instance. D13 derives the same expression, so the two types cannot diverge.
 */
export type Transaction = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

export { constraintName } from './constraint-name.ts';
export { constraintViolation, transientErrorCode } from './error.ts';
export { type Generation, readGeneration } from './generation.ts';
export { newestMigrationHash, readSchemaStatus, type SchemaStatus } from './schema-status.ts';
export { tableHelpers } from './table-helpers.ts';
