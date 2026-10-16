// Clock proof constants (D04). Tests import them and never retype them.

/** Drift allowance of the phone's own counter, parts per million: k(x) = ceil(x / 10000). */
export const DRIFT_PPM = 100;

/** Seven days: the longest time either anchor may span (DOCUMENT_OVER_7_DAYS, RECORD_OVER_7_DAYS). */
export const DOCUMENT_MAX_AGE_MS = 604_800_000;

/** The longest a document request may take (REQUEST_TOO_SLOW); also the phone's timeout for it. */
export const DOCUMENT_REQUEST_MAX_MS = 10_000;

/** Binary length of a version 1 clock document. */
export const DOCUMENT_BYTES = 82;

/** Length of a document as unpadded base64url. */
export const DOCUMENT_CHARS = 110;

/** Length of the phone's one-time value (22 base64url characters). */
export const VALUE_BYTES = 16;

/** One minute: window lengths are whole minutes. */
export const MINUTE_MS = 60_000;

/**
 * One day, 24 hours. The calendar (D02-P02) and the server's Istanbul helpers (D04-P01)
 * keep their own copy: their packages come before this file in the roadmap.
 */
export const DAY_MS = 86_400_000;
