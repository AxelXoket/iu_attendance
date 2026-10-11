import { z } from 'zod';

export const EXTENSIBLE_ENUM_MAX_LENGTH = 64;

// A response value that may grow later: at runtime any string up to 64 characters,
// in the OpenAPI document an x-extensible-enum (no enum keyword). The type suggests
// the known values but accepts unknown ones too, so clients must write a default
// branch. Request schemas use a closed z.enum instead.
export function extensibleEnum<const T extends readonly [string, ...string[]]>(
  values: T,
): z.ZodType<T[number] | (string & {})> {
  return z
    .string()
    .max(EXTENSIBLE_ENUM_MAX_LENGTH)
    .meta({ 'x-extensible-enum': [...values] }) as z.ZodType<T[number] | (string & {})>;
}
