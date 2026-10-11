import type { z } from 'zod';
import type { ModuleName } from './modules.ts';

// A queue item type: its name, its body schema and the module in charge of it.
export type ItemTypeDefinition<T extends string = string, B extends z.ZodType = z.ZodType> = {
  type: T;
  body: B;
  module: ModuleName;
};

// The module that owns a phone queue item type exports the body schema from its own
// contract file with this; sync parses the opaque text body with the same schema.
export function defineItemType<const T extends string, B extends z.ZodType>(
  type: T,
  body: B,
  options: { module: ModuleName },
): ItemTypeDefinition<T, B> {
  return { type, body, module: options.module };
}
