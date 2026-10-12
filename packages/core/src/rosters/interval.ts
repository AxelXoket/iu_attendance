// Membership spans of roster rows (D03-B10, D03-A04). A row is a member over the
// half-open span [addedAt, inactiveAt): from the instant it was added up to, but not
// including, the instant it became inactive; an active row's span has no end. Instants
// are epoch milliseconds.

export type MembershipSpan = {
  readonly addedAtMs: number;
  readonly inactiveAtMs: number | null;
};

/** True when the row is a member at the instant: addedAt <= at < inactiveAt. */
export function isMemberAt(span: MembershipSpan, atMs: number): boolean {
  return span.addedAtMs <= atMs && (span.inactiveAtMs === null || atMs < span.inactiveAtMs);
}

/** True when the span holds no instant: a row a reactivation trimmed to zero length. */
export function isEmptySpan(span: MembershipSpan): boolean {
  return span.inactiveAtMs !== null && span.inactiveAtMs <= span.addedAtMs;
}

/**
 * The new end of an inactive span when a row of the same course and student comes back
 * with the span [reactivatedAddedAt, no end). An overlapping span that starts earlier
 * now ends where the reactivated one starts; one that starts at or after it shrinks to
 * zero length at its own start. Null when the spans do not overlap; an empty span
 * overlaps nothing.
 */
export function trimmedInactiveAtMs(
  span: { readonly addedAtMs: number; readonly inactiveAtMs: number },
  reactivatedAddedAtMs: number,
): number | null {
  // [a, p) and [r, no end) overlap exactly when a < p and r < p.
  if (isEmptySpan(span) || span.inactiveAtMs <= reactivatedAddedAtMs) return null;
  return span.addedAtMs < reactivatedAddedAtMs ? reactivatedAddedAtMs : span.addedAtMs;
}
