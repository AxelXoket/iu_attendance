import { DATE_LENGTH, INSTANT_LENGTH, UUID_LENGTH } from '@iu-attendance/contracts/shared';
import { isDate } from '@iu-attendance/core/courses/calendar';
import { uuidBytes } from '@iu-attendance/core/shared/uuid';
import { z } from 'zod';

// What a job carries stays small and free of personal data (D14-B12, B23). A queue's
// data and output schemas are checked on the JSON Schema Zod 4 writes for them: only
// ids, dates, instants, bounded integers, booleans and fixed lists, in strict objects and
// arrays with a maximum, so no number, name, code or address fits. The worst case size
// adds up the longest JSON form of every leaf, so a job that passes the definition never
// fails the size limit when it is sent. A schema that coerces or transforms is refused:
// its JSON Schema would not tell what it takes or gives.

export const JOB_SIZE_LIMITS = { dataMaxBytes: 8192, outputMaxBytes: 1024 } as const;
/** The data field the sender fills with the request id; no schema may name it. */
export const REQUEST_ID_FIELD = '_requestId';
// A six-digit code or a student number does not fit under this bound.
const DATA_INTEGER_MAX = 100_000;

type Leaf = 'uuid' | 'date' | 'instant' | 'integer' | 'boolean' | 'enum';
type Rules = {
  readonly leaves: ReadonlySet<Leaf>;
  readonly integerMax: number;
  // The bytes an integer counts: fixed for data, the longer bound for an output.
  readonly integerBytes: ((minimum: number, maximum: number) => number) | number;
  readonly underscoreFields: boolean;
};
const DATA_RULES: Rules = {
  leaves: new Set(['uuid', 'date', 'instant', 'integer', 'boolean', 'enum']),
  integerMax: DATA_INTEGER_MAX,
  integerBytes: String(-DATA_INTEGER_MAX).length,
  underscoreFields: false,
};
// An output has no ids; its integers need bounds of their own, not the safe range.
const OUTPUT_RULES: Rules = {
  leaves: new Set(['date', 'instant', 'integer', 'boolean', 'enum']),
  integerMax: Number.MAX_SAFE_INTEGER - 1,
  integerBytes: (minimum, maximum) => Math.max(String(minimum).length, String(maximum).length),
  underscoreFields: true,
};

// The longest JSON form of the fixed-size leaves, quotes included.
// An instant can be no longer than instantSchema writes it, so no digit is left over.
const LEAF_BYTES = {
  uuid: UUID_LENGTH + 2,
  instant: INSTANT_LENGTH + 2,
  date: DATE_LENGTH + 2,
  boolean: String(false).length,
} as const;

type Node = {
  type?: unknown;
  format?: unknown;
  maxLength?: unknown;
  enum?: unknown;
  minimum?: unknown;
  maximum?: unknown;
  exclusiveMinimum?: unknown;
  exclusiveMaximum?: unknown;
  items?: unknown;
  prefixItems?: unknown;
  maxItems?: unknown;
  properties?: Record<string, unknown>;
  additionalProperties?: unknown;
};

const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

// A string leaf is an id, a date or an instant by its format; metadata cannot set it.
function leafOf(node: Node): Leaf | null {
  if (node.type === 'boolean') return 'boolean';
  if (node.type === 'integer') return 'integer';
  if (node.type !== 'string') return null;
  if (Array.isArray(node.enum)) return 'enum';
  if (node.format === 'uuid') return 'uuid';
  if (node.format === 'date') return 'date';
  if (node.format === 'date-time') return 'instant';
  return null;
}

// The worst case size of a node, adding a problem for every rule it breaks.
function measure(node: Node, path: string, rules: Rules, problems: string[]): number {
  const fail = (rule: string) => {
    problems.push(`${path}: ${rule}`);
    return 0;
  };
  if (node.type === 'object') {
    if (node.additionalProperties !== false) return fail('an object must be strict');
    const entries = Object.entries(node.properties ?? {});
    let bytes = 2 + Math.max(entries.length - 1, 0);
    for (const [key, child] of entries) {
      if (!rules.underscoreFields && key.startsWith('_')) fail(`the field ${key} starts with _`);
      bytes += jsonBytes(key) + 1 + measure(child as Node, `${path}.${key}`, rules, problems);
    }
    return bytes;
  }
  if (node.type === 'array') {
    const max = node.maxItems;
    if (!Number.isInteger(max) || (max as number) < 0) return fail('an array needs a maximum');
    if (node.prefixItems !== undefined || typeof node.items !== 'object' || node.items === null) {
      return fail('an array needs one item type');
    }
    const item = measure(node.items as Node, `${path}[]`, rules, problems);
    return 2 + (max as number) * item + Math.max((max as number) - 1, 0);
  }
  const leaf = leafOf(node);
  if (leaf === null || !rules.leaves.has(leaf)) return fail('a type a job may not carry');
  if (leaf === 'enum') return Math.max(...(node.enum as unknown[]).map(jsonBytes));
  if (leaf === 'instant' && !(Number(node.maxLength) <= INSTANT_LENGTH)) {
    return fail(`an instant needs a maximum length of ${INSTANT_LENGTH}, as instantSchema has`);
  }
  if (leaf === 'integer') {
    // Zod writes gt and lt as exclusive bounds; either kind bounds the value.
    const minimum = node.minimum ?? node.exclusiveMinimum;
    const maximum = node.maximum ?? node.exclusiveMaximum;
    if (
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      Math.max(Math.abs(minimum as number), Math.abs(maximum as number)) > rules.integerMax
    ) {
      return fail(`an integer needs bounds within ${rules.integerMax}`);
    }
    return typeof rules.integerBytes === 'number'
      ? rules.integerBytes
      : rules.integerBytes(minimum as number, maximum as number);
  }
  return LEAF_BYTES[leaf];
}

// A coercing schema reads as its target type in JSON Schema but takes any input.
function coerces(schema: unknown, seen = new Set<unknown>()): boolean {
  if (typeof schema !== 'object' || schema === null || !('_zod' in schema) || seen.has(schema)) {
    return false;
  }
  seen.add(schema);
  const def = (schema as z.ZodType)._zod.def as unknown as Record<string, unknown>;
  if (def.coerce === true) return true;
  const shape = def.shape;
  const children = [
    def.innerType,
    def.element,
    def.in,
    def.out,
    def.rest,
    ...(Array.isArray(def.options) ? def.options : []),
    ...(Array.isArray(def.items) ? def.items : []),
    ...(typeof shape === 'object' && shape !== null ? Object.values(shape) : []),
  ];
  return children.some((child) => coerces(child, seen));
}

// The input side: an object that strips unknown keys reads as closed on the output side,
// so only the input side tells a strict object from a stripping one. The output side must
// be writable too: Zod refuses to write a transform.
function jsonSchemaOf(schema: z.ZodType, problems: string[]): Node | null {
  try {
    // A fresh registry: metadata a schema carries cannot rewrite its type or bounds.
    z.toJSONSchema(schema, { io: 'output', metadata: z.registry() });
    if (coerces(schema)) {
      problems.push('root: a coercing schema takes any input');
      return null;
    }
    return z.toJSONSchema(schema, { io: 'input', metadata: z.registry() }) as Node;
  } catch {
    problems.push('root: cannot be written as JSON Schema, or transforms its value');
    return null;
  }
}

/**
 * The rules a queue's data schema breaks, and its worst case size with the request id:
 * a strict object whose leaves are ids, dates, instants, integers within 100,000,
 * booleans and fixed lists, at most 8 KiB.
 */
export function checkDataSchema(schema: z.ZodType): { problems: string[]; worstCaseBytes: number } {
  const problems: string[] = [];
  const root = jsonSchemaOf(schema, problems);
  if (root === null) return { problems, worstCaseBytes: 0 };
  if (root.type !== 'object') problems.push('root: the data must be an object');
  const bytes = measure(root, 'root', DATA_RULES, problems);
  const fields = Object.keys(root.properties ?? {}).length;
  const worstCaseBytes =
    bytes + (fields > 0 ? 1 : 0) + jsonBytes(REQUEST_ID_FIELD) + 1 + LEAF_BYTES.uuid;
  if (worstCaseBytes > JOB_SIZE_LIMITS.dataMaxBytes) {
    problems.push(`root: ${worstCaseBytes} bytes at worst, over ${JOB_SIZE_LIMITS.dataMaxBytes}`);
  }
  return { problems, worstCaseBytes };
}

/**
 * The rules a queue's output schema breaks, and its worst case size: integers with their
 * own bounds, booleans, fixed lists, dates and instants, alone or in strict objects and
 * bounded arrays, at most 1 KiB.
 */
export function checkOutputSchema(schema: z.ZodType): {
  problems: string[];
  worstCaseBytes: number;
} {
  const problems: string[] = [];
  const root = jsonSchemaOf(schema, problems);
  if (root === null) return { problems, worstCaseBytes: 0 };
  const worstCaseBytes = measure(root, 'root', OUTPUT_RULES, problems);
  if (worstCaseBytes > JOB_SIZE_LIMITS.outputMaxBytes) {
    problems.push(`root: ${worstCaseBytes} bytes at worst, over ${JOB_SIZE_LIMITS.outputMaxBytes}`);
  }
  return { problems, worstCaseBytes };
}

// A singleton key is parts joined by ':', each a lower-case UUID, a calendar date, or
// lower-case letters and underscores: a digit run of any other kind (a number, a code)
// never fits.
export const SINGLETON_KEY_MAX_LENGTH = 200;
const WORD_PART = /^[a-z_]+$/;
const isLowerCaseUuid = (part: string) => part === part.toLowerCase() && uuidBytes(part) !== null;

export function isValidSingletonKey(key: string): boolean {
  return (
    key.length <= SINGLETON_KEY_MAX_LENGTH &&
    key.split(':').every((part) => isLowerCaseUuid(part) || isDate(part) || WORD_PART.test(part))
  );
}
