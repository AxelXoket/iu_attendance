import { z } from 'zod';

// Small value schemas and checks the module contracts share.

/** A number of things: a whole number from zero. */
export const countSchema = z.number().int().nonnegative();

/** A whole percent from 0 to 100. */
export const percentSchema = z.number().int().min(0).max(100);

/** True when no value repeats. */
export const isUnique = (values: readonly unknown[]) => new Set(values).size === values.length;
