import { canonicalJson } from '../shared/canonical-json.ts';
import { sha256 } from '../shared/sha256.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import { normalizeDocumentNumber } from './document-number.ts';

// The SHA-256 digest of a queue item as it was sent: a repeat with the same id is
// compared with it only. The item is written as canonical JSON (shared/canonical-json.ts)
// with its top-level document number normalised. The caller passes the item as sent: hours the
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

// The 32-byte digest of a queue item as sent.
export function requestDigest(fields: DigestFields): Uint8Array {
  // Only the top-level document number is normalised: the request bodies carry it nowhere
  // else, and a nested value is digested as sent.
  const text = canonicalJson(fields, 'item', (key, member) =>
    key === DIGEST_DOCUMENT_NUMBER_FIELD && typeof member === 'string'
      ? normalizeDocumentNumber(member)
      : member,
  );
  return sha256(utf8Bytes(text));
}
