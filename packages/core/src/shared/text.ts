// Text rules course codes, section labels, roster names and document numbers share. The
// space rule: NFC, no white space at either end, and every inner run of white space one
// space; white space is what String.prototype.trim removes, so the result has none left
// at the ends or doubled. The control rule: no C0, DEL or C1 character. And the one
// text order sort tie breaks use.

/** Unicode White_Space, written out so every engine uses the same set. Each becomes a space. */
export const WHITE_SPACE_CHARACTERS: readonly string[] = [
  '\t',
  '\n',
  '\v',
  '\f',
  '\r',
  ' ',
  '\u0085',
  '\u00a0',
  '\u1680',
  '\u2000',
  '\u2001',
  '\u2002',
  '\u2003',
  '\u2004',
  '\u2005',
  '\u2006',
  '\u2007',
  '\u2008',
  '\u2009',
  '\u200a',
  '\u2028',
  '\u2029',
  '\u202f',
  '\u205f',
  '\u3000',
];

/** Zero width space, non-joiner and joiner, and the byte order mark. These are dropped. */
export const INVISIBLE_CHARACTERS: readonly string[] = ['\u200b', '\u200c', '\u200d', '\ufeff'];

// The space rule reads the engine's white space (trim and \s): the set above without U+0085,
// a C1 control the control rule refuses anyway, and with U+FEFF, which it drops.
/** Collapses white space ('  BİL \t 301 ' -> 'BİL 301'); applying it twice changes nothing. */
export function collapseWhitespace(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** True when the text has a control character: C0, DEL or C1. */
export function hasControlCharacter(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit < 0x20 || (unit >= 0x7f && unit < 0xa0)) return true;
  }
  return false;
}

/**
 * Code unit order, the same in every runtime and locale: for lower-case UUIDs it is the
 * database's uuid order. For sort tie breaks.
 */
export const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
