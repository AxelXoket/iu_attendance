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

/** Length of the one-time value as unpadded base64url. */
export const VALUE_CHARS = 22;
