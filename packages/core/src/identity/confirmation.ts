// Bulk confirmation rule (D01): which unconfirmed student accounts a lecturer may
// confirm in one go. The bulk path of the confirm service, the blocker field of the
// student account reader and the confirmation groups (D09) all read this one file;
// nobody writes a second copy of the rule.

export const CONFIRMATION_STATUSES = ['pending', 'confirmed', 'rejected'] as const;
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number];

export const MATCH_STATUSES = ['matched', 'name_mismatch', 'not_on_roster'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

// In priority order: the first one that applies is the blocker. same_number, then the
// name match, then the device follows the order of the D09 confirmation groups;
// not_pending covers an account that is no longer waiting for confirmation at all.
export const BULK_CONFIRMATION_BLOCKERS = [
  'not_pending',
  'same_number',
  'name_mismatch',
  'not_on_roster',
  'device_not_verified',
] as const;
export type BulkConfirmationBlocker = (typeof BULK_CONFIRMATION_BLOCKERS)[number];

export type BulkConfirmationInput = {
  confirmationStatus: ConfirmationStatus;
  matchStatus: MatchStatus;
  // The account's active device passed device verification.
  deviceVerified: boolean;
  // Another unconfirmed account asks for the same student number.
  otherUnconfirmedAccountOnSameNumber: boolean;
};

// Why the account cannot be confirmed in bulk, or null when it can.
export function getBulkConfirmationBlocker(
  input: BulkConfirmationInput,
): BulkConfirmationBlocker | null {
  if (input.confirmationStatus !== 'pending') return 'not_pending';
  if (input.otherUnconfirmedAccountOnSameNumber) return 'same_number';
  if (input.matchStatus !== 'matched') return input.matchStatus;
  if (!input.deviceVerified) return 'device_not_verified';
  return null;
}

// True only for a pending account whose name matches the roster, whose active device
// is verified and whose number no other unconfirmed account asks for. Defined
// through the blocker, so the two can never disagree.
export function isBulkConfirmationEligible(input: BulkConfirmationInput): boolean {
  return getBulkConfirmationBlocker(input) === null;
}
