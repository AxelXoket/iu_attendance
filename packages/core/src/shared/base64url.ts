// base64url (RFC 4648 section 5) without padding, for shared code: Hermes has no Buffer,
// and atob and btoa work on Latin-1 text only. Decoding is strict, so each byte string has
// exactly one text: only the 64 URL-safe letters, no padding, no length that leaves a
// single letter over, and the unused low bits of the last letter are zero. A text that
// decodes therefore encodes back to itself.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Letter values by UTF-16 code unit; -1 marks a code unit outside the alphabet.
const VALUES = new Int8Array(128).fill(-1);
for (let value = 0; value < ALPHABET.length; value += 1) VALUES[ALPHABET.charCodeAt(value)] = value;

/** The base64url text of a byte string, without padding. */
export function encodeBase64Url(bytes: Uint8Array): string {
  let text = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      text += ALPHABET.charAt((buffer >> bits) & 63);
    }
    buffer &= (1 << bits) - 1;
  }
  // One or two bytes left over: the last letter carries them in its high bits.
  if (bits > 0) text += ALPHABET.charAt((buffer << (6 - bits)) & 63);
  return text;
}

/** The bytes of a canonical base64url text, or null for any other text. Never throws. */
export function decodeBase64Url(text: string): Uint8Array | null {
  if (text.length % 4 === 1) return null;
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let out = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const value = code < 128 ? (VALUES[code] as number) : -1;
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out] = buffer >> bits;
      out += 1;
      buffer &= (1 << bits) - 1;
    }
  }
  // The 2 or 4 bits left after the last whole byte must be zero.
  return buffer === 0 ? bytes : null;
}
