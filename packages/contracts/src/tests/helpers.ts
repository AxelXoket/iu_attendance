import type { z } from 'zod';

// Helpers the contract tests share.

/** A UUIDv7 numbered n: id(1) and id(2) differ only in their last digits. */
export const id = (n: number) => `01890a5d-ac96-7000-8000-${n.toString(16).padStart(12, '0')}`;

/** True when the schema accepts the value. */
export const ok = (schema: z.ZodType, value: unknown) => schema.safeParse(value).success;

/** The issue codes of a parse result; an accepted value has none. */
export const issueCodes = (result: { error?: z.ZodError }) =>
  result.error?.issues.map((issue) => issue.code) ?? [];
