import { createHash } from 'node:crypto';

// Names of constraints, indexes and triggers (D12-B01). The table definition and the code
// that branches on a violated constraint call the same function, so the two never drift.

/** Longest identifier PostgreSQL keeps (NAMEDATALEN - 1); a longer one is cut silently. */
export const MAX_IDENTIFIER_BYTES = 63;

/** Hex digits of the full name's SHA-256 digest that a shortened name carries. */
export const DIGEST_HEX_LENGTH = 8;

/** Name endings: primary key, foreign key, unique, check, index, trigger. */
export const CONSTRAINT_KINDS = ['pk', 'fk', 'uq', 'ck', 'idx', 'tg'] as const;

export type ConstraintKind = (typeof CONSTRAINT_KINDS)[number];

// Lower-case ASCII snake_case, the naming rule for tables, columns and suffixes. It also
// keeps every name an unquoted PostgreSQL identifier of one byte per character.
const IDENTIFIER = /^[a-z][a-z0-9_]*$/;

function assertIdentifier(part: string, value: string): void {
  if (!IDENTIFIER.test(value)) {
    throw new TypeError(
      `constraintName: ${part} ${JSON.stringify(value)} is not lower-case ASCII snake_case`,
    );
  }
}

/**
 * Name of a constraint, index or trigger: `<table>_<columns>_<suffix>_<kind>`, or
 * `<table>_<suffix>_<kind>` without columns (sessions_immutable_tg). The suffix tells apart
 * two partial unique indexes or two checks on the same columns
 * (sessions_course_id_date_trial_uq). A name longer than 63 bytes keeps a shortened body and
 * the first 8 hex digits of the full name's SHA-256: `<body>_<digest>_<kind>`. Pure and
 * deterministic. NOT NULL constraints are outside this rule; PostgreSQL names them itself.
 */
export function constraintName(
  table: string,
  columns: readonly string[],
  kind: ConstraintKind,
  suffix?: string,
): string {
  assertIdentifier('table', table);
  for (const column of columns) assertIdentifier('column', column);
  if (suffix !== undefined) assertIdentifier('suffix', suffix);
  if (!(CONSTRAINT_KINDS as readonly string[]).includes(kind)) {
    throw new TypeError(
      `constraintName: kind ${JSON.stringify(kind)} is not one of ${CONSTRAINT_KINDS.join(', ')}`,
    );
  }

  const body = [table, ...columns, ...(suffix === undefined ? [] : [suffix])].join('_');
  const fullName = `${body}_${kind}`;
  if (fullName.length <= MAX_IDENTIFIER_BYTES) return fullName;

  const digest = createHash('sha256').update(fullName).digest('hex').slice(0, DIGEST_HEX_LENGTH);
  // Room left for the body next to the two separators, the digest and the kind.
  const room = MAX_IDENTIFIER_BYTES - DIGEST_HEX_LENGTH - kind.length - 2;
  const shortened = body.slice(0, room).replace(/_+$/, '');
  return `${shortened}_${digest}_${kind}`;
}
