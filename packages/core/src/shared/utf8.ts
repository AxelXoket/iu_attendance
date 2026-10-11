// UTF-8 for shared code: Hermes has no TextEncoder or TextDecoder guarantee.

/** UTF-8 bytes of a string; a lone surrogate becomes U+FFFD, as TextEncoder does. */
export function utf8Bytes(text: string): Uint8Array {
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      } else {
        code = 0xfffd;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      code = 0xfffd;
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * The text of UTF-8 bytes, or null when the bytes are not well-formed UTF-8. Strict, as
 * TextDecoder with fatal: true: an overlong form, a surrogate, a code point above U+10FFFF
 * or a cut-off sequence makes the whole text invalid. A byte order mark is kept as U+FEFF.
 */
export function decodeUtf8(bytes: Uint8Array): string | null {
  let text = '';
  let index = 0;
  while (index < bytes.length) {
    const first = bytes[index] as number;
    if (first < 0x80) {
      text += String.fromCharCode(first);
      index += 1;
      continue;
    }
    // Length and the allowed range of the second byte (Unicode 15, table 3-7).
    let length: number;
    let low = 0x80;
    let high = 0xbf;
    let code: number;
    if (first >= 0xc2 && first <= 0xdf) {
      length = 2;
      code = first & 0x1f;
    } else if (first >= 0xe0 && first <= 0xef) {
      length = 3;
      code = first & 0x0f;
      if (first === 0xe0) low = 0xa0;
      if (first === 0xed) high = 0x9f;
    } else if (first >= 0xf0 && first <= 0xf4) {
      length = 4;
      code = first & 0x07;
      if (first === 0xf0) low = 0x90;
      if (first === 0xf4) high = 0x8f;
    } else {
      return null;
    }
    if (index + length > bytes.length) return null;
    for (let offset = 1; offset < length; offset += 1) {
      const next = bytes[index + offset] as number;
      if (offset === 1 ? next < low || next > high : next < 0x80 || next > 0xbf) return null;
      code = (code << 6) | (next & 0x3f);
    }
    if (code < 0x10000) {
      text += String.fromCharCode(code);
    } else {
      const above = code - 0x10000;
      text += String.fromCharCode(0xd800 + (above >> 10), 0xdc00 + (above & 0x3ff));
    }
    index += length;
  }
  return text;
}
