// Text forms several modules share, written once. The two base64 forms are canonical: the
// last letter leaves its spare bits zero, so equal bytes are always equal text.

/** The id of a key in a key set: lower-case letters, digits and dashes, at most 8. */
export const KEY_ID = /^[a-z0-9-]{1,8}$/;

/** A 32-byte key as standard base64 with its padding: 43 letters and '='. */
export const BASE64_32_BYTES = /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/;
