// UUID text to bytes for shared code (RFC 9562): any version, either case, the canonical
// 8-4-4-4-12 form only. The two cases give the same 16 bytes, so a MAC over the bytes does
// not depend on how a client spelled the id.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The text an id is compared, grouped and keyed by: lower case, so the two spellings a
 * client may send of one UUID are one id (the database writes UUIDs in lower case).
 */
export function idKey(id: string): string {
  return id.toLowerCase();
}

/** The 16 bytes of a UUID text, or null for any other text. */
export function uuidBytes(text: string): Uint8Array | null {
  if (typeof text !== 'string' || !UUID.test(text)) return null;
  const digits = text.split('-').join('');
  const bytes = new Uint8Array(16);
  for (let index = 0; index < 16; index += 1) {
    bytes[index] = Number.parseInt(digits.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** The lowercase canonical text of 16 bytes. Throws RangeError for any other length. */
export function uuidText(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new RangeError('uuidText expects 16 bytes');
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
