// Verification constants (D07), the spec's values in one place: code and tests import them
// and never retype them. The ones nothing reads yet (the App Attest renewals, the expired
// value clean-up, the head count item size) belong to the later D07 packages that use them.

/**
 * A student's shared allowance for unverified-clock or backup-code records, in sessions
 * per (term, course).
 */
export const SHARED_LIMIT_SESSIONS = 2;

/** Random name presses allowed in a session before its head count; none after. */
export const RANDOM_NAME_PRESS_LIMIT = 3;

/** Students one random name press picks at most. */
export const RANDOM_NAME_PICKS_MAX = 3;

/** App Attest key renewals of one device within the window before the warning opens. */
export const APP_ATTEST_RENEWAL_THRESHOLD = 2;

/** The window the App Attest renewals are counted in. */
export const APP_ATTEST_RENEWAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Secure random bytes of a device verification value, shown once. */
export const VERIFICATION_VALUE_BYTES = 32;

/** How long a device verification value stays usable. */
export const VERIFICATION_VALUE_LIFETIME_MS = 5 * 60 * 1000;

/** Expired values one new value request deletes at most. */
export const EXPIRED_VALUES_DELETE_MAX = 100;

/** The largest head count a lecturer may enter. */
export const HEAD_COUNT_MAX = 5000;

/** The largest head count queue item body, in bytes. */
export const HEAD_COUNT_ITEM_MAX_BYTES = 1024;

/** The phone sends a record again this many seconds after VERIFICATION_CONTEXT_CHANGING. */
export const CONTEXT_CHANGING_WAIT_SECONDS = 2;

/** Record ids one lock audit event carries at most; a larger session splits into parts. */
export const LOCK_EVENT_RECORDS_MAX = 150;
