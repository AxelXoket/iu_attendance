import { sha256 } from '../shared/sha256.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import { normalizeDocumentNumber } from './document-number.ts';

// The SHA-256 digest of a queue item as it was sent: a repeat with the same id is
// compared with it only. The item is written as canonical JSON: object keys sorted by
// UTF-16 code units at every depth, arrays in their order, nulls kept as null, numbers
// only as safe integers, no whitespace. The caller passes the item as sent: hours the
// server resolves and previousCorrectionId are not part of it (D09 tables.0 request
// digest column note, endpoints.0 previous correction id field note, resolved_gaps.29 =
// D09-B30).
// A reversal digests { kind: 'REVERSAL', target }.

export type DigestValue =
  | string
  | number
  | boolean
  | null
  | readonly DigestValue[]
  | { readonly [key: string]: DigestValue };
export type DigestFields = { readonly [key: string]: DigestValue };

export const DIGEST_DOCUMENT_NUMBER_FIELD = 'documentNumber';

// The canonical JSON text of a value; `at` names the value in errors. Anything that is
// not JSON (undefined, a function, a Date or another non-plain object, a number that
// is not a safe integer) throws.
function canonicalJson(value: unknown, at: string, topLevel = false): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`digest value ${at} must be a safe integer`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = Array.from(value, (item: unknown, index) =>
      canonicalJson(item, `${at}[${index}]`),
    );
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      const object = value as { readonly [key: string]: unknown };
      const members = Object.keys(object)
        .sort()
        .map((key) => {
          let member = object[key];
          // Only the top-level document number is normalised: the request bodies carry
          // it nowhere else, and a nested value is digested as sent.
          if (topLevel && key === DIGEST_DOCUMENT_NUMBER_FIELD && typeof member === 'string') {
            member = normalizeDocumentNumber(member);
          }
          return `${JSON.stringify(key)}:${canonicalJson(member, `${at}.${key}`)}`;
        });
      return `{${members.join(',')}}`;
    }
  }
  throw new Error(`digest value ${at} is not JSON`);
}

// The 32-byte digest of a queue item as sent.
export function requestDigest(fields: DigestFields): Uint8Array {
  return sha256(utf8Bytes(canonicalJson(fields, 'item', true)));
}
