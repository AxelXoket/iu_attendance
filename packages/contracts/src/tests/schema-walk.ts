import type { z } from 'zod';

// The contract rules read a schema as a tree. These helpers walk it through object
// fields, arrays, records, wrappers, pipes and unions, so a rule reaches every nested
// object, value list and field rather than the top level only.

type Def = { type: string } & Record<string, unknown>;
const defOf = (schema: z.ZodType) => schema.def as unknown as Def;

/**
 * The schema and every schema it reaches, each with its path from the start: an object
 * field adds .key, an array element [] and a record value {}; wrappers, pipes and union
 * options keep the path.
 */
export function pathsIn(schema: z.ZodType, path = ''): Array<readonly [string, z.ZodType]> {
  const def = defOf(schema);
  const children: Array<readonly [string, unknown]> = [];
  switch (def.type) {
    case 'object':
      for (const [key, child] of Object.entries(def.shape as Record<string, unknown>)) {
        children.push([`${path}.${key}`, child]);
      }
      break;
    case 'array':
      children.push([`${path}[]`, def.element]);
      break;
    case 'record':
      children.push([`${path}{}`, def.valueType]);
      break;
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'readonly':
    case 'nonoptional':
    case 'catch':
      children.push([path, def.innerType]);
      break;
    case 'pipe':
      children.push([path, def.in], [path, def.out]);
      break;
    case 'union':
      for (const option of def.options as unknown[]) children.push([path, option]);
      break;
  }
  return [
    [path, schema],
    ...children.flatMap(([childPath, child]) => pathsIn(child as z.ZodType, childPath)),
  ];
}

/** The schema itself and every schema it reaches. */
export const schemasIn = (schema: z.ZodType) => pathsIn(schema).map(([, node]) => node);

export const objectsIn = (schema: z.ZodType) =>
  schemasIn(schema).filter((node): node is z.ZodObject => defOf(node).type === 'object');

/** The text schemas a schema reaches, with their paths. */
export const stringsIn = (schema: z.ZodType, path = '') =>
  pathsIn(schema, path).filter(([, node]) => defOf(node).type === 'string');

/** How an object treats a key it does not know. */
export function unknownKeys(schema: z.ZodObject): 'strip' | 'strict' | 'keep' {
  const catchall = schema.def.catchall;
  if (catchall === undefined) return 'strip';
  return catchall._zod.def.type === 'never' ? 'strict' : 'keep';
}

/** The closed value lists (z.enum) a schema reaches. */
export const closedEnumsIn = (schema: z.ZodType) =>
  schemasIn(schema).filter((node) => defOf(node).type === 'enum');

/** The extensible value lists (extensibleEnum) a schema reaches. */
export const extensibleEnumsIn = (schema: z.ZodType) =>
  schemasIn(schema).filter((node) => node.meta()?.['x-extensible-enum'] !== undefined);
