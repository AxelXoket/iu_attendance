import { z } from 'zod';
import { extensibleEnum } from './enum.ts';

// The only fields a module may add to an item result.
export type ItemResultExtras = {
  correction?: z.ZodType;
  newDecision?: z.ZodType;
  counted?: z.ZodType;
};

type OnlyKnownExtras<E> = E & Record<Exclude<keyof E, keyof ItemResultExtras>, never>;

// The same names at runtime, for extras built without a literal type.
const EXTRA_NAMES: Record<keyof ItemResultExtras, true> = {
  correction: true,
  newDecision: true,
  counted: true,
};

// A batch answer { results: [{ id, result, code, ...extras }] } in request order.
// result is an extensible enum; code is the item-level module code or null. Declared
// extras are validated with their schema; unknown fields are dropped rather than
// rejected, so a field the module adds later does not break an older client. An extra
// name other than correction, newDecision and counted is a compile error and throws.
export function itemResultsSchema<
  const S extends readonly [string, ...string[]],
  const E extends ItemResultExtras = Record<never, never>,
>(results: S, extras?: OnlyKnownExtras<E>) {
  const unknownNames = Object.keys(extras ?? {}).filter(
    (name) => !Object.hasOwn(EXTRA_NAMES, name),
  );
  if (unknownNames.length > 0) {
    throw new Error(
      `Item result extras are correction, newDecision and counted; got ${unknownNames.join(', ')}`,
    );
  }
  const item = z.object({
    id: z.string(),
    result: extensibleEnum(results),
    code: z.string().nullable(),
    ...(extras ?? ({} as E)),
  });
  return z.object({ results: z.array(item) });
}
