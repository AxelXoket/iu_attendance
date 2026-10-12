// The space rule course codes, section labels and document numbers share: NFC, no white
// space at either end, and every inner run of white space one space. White space is what
// String.prototype.trim removes, so the result has none left at the ends or doubled.

/** Collapses white space ('  BİL \t 301 ' -> 'BİL 301'); applying it twice changes nothing. */
export function collapseWhitespace(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}
