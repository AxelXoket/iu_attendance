import type { Config } from 'drizzle-kit';

// drizzle-kit settings (D12-B09). Run it from apps/server as
// NODE_OPTIONS=--conditions=source drizzle-kit <command>: table files import workspace
// packages, which resolve to their TypeScript source only under that condition.
// Migrations use the folder format <14-digit UTC>_<token>_<description>/ holding
// migration.sql and snapshot.json; there is no shared journal file. Database credentials are
// not here: the database:migrate step applies the folders itself (drizzle-orm migrate).

/** Every module's tables.ts; the schema test loads the same files to read status checks. */
export const TABLE_FILES = './src/**/tables.ts';

export default {
  dialect: 'postgresql',
  schema: TABLE_FILES,
  out: './migrations',
  breakpoints: true,
  // Only the application schema is drizzle-kit's; drizzle keeps the migration ledger and
  // pgboss belongs to the job queue library.
  schemaFilter: ['app'],
  migrations: { schema: 'drizzle', table: '__drizzle_migrations' },
} satisfies Config;
