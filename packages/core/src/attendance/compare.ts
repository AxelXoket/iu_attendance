// Envelope comparison (D05): the answer to an item whose record id is already stored.
// The incoming signature is verified before this, so the same record text means the same
// record signed with the same key: a second signature over it (ECDSA signs with a fresh
// nonce) is still the same record. A different text under a stored id is an id conflict.
// Whether the item came from the phone or through a scan changes nothing.

import { equalBytes } from '../shared/bytes.ts';
import type { ParsedEnvelope } from './envelope.ts';

export const ENVELOPE_COMPARISONS = ['SAME', 'SAME_TEXT_OTHER_SIGNATURE', 'TEXT_DIFFERS'] as const;
export type EnvelopeComparison = (typeof ENVELOPE_COMPARISONS)[number];

/** How an incoming envelope compares with the stored one of the same record id. */
export function compareEnvelopes(
  stored: ParsedEnvelope,
  incoming: ParsedEnvelope,
): EnvelopeComparison {
  if (stored.recordText !== incoming.recordText) return 'TEXT_DIFFERS';
  return stored.signatureKind === incoming.signatureKind &&
    equalBytes(stored.signature, incoming.signature)
    ? 'SAME'
    : 'SAME_TEXT_OTHER_SIGNATURE';
}

/** The item result of a comparison: the record already exists, or its id conflicts. */
export function itemResultOf(
  comparison: EnvelopeComparison,
):
  | { readonly result: 'ALREADY_EXISTS'; readonly code: null }
  | { readonly result: 'REJECTED'; readonly code: 'ATTENDANCE_ID_CONFLICT' } {
  return comparison === 'TEXT_DIFFERS'
    ? { result: 'REJECTED', code: 'ATTENDANCE_ID_CONFLICT' }
    : { result: 'ALREADY_EXISTS', code: null };
}
