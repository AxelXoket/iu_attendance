// Turkish name matching (D03-B18): one pure key decides whether two spellings are the
// same name, for matching by student number, the roster diff and the panel alike.
// No Intl, no locale, no SQL lower(). Letters are never simplified (Ş is not S) and
// punctuation stays.

import {
  collapseWhitespace,
  INVISIBLE_CHARACTERS,
  WHITE_SPACE_CHARACTERS,
} from '../shared/text.ts';

/**
 * Upper and lower case pairs of the Turkish alphabet and of the circumflexed vowels
 * used in Turkish names. I and İ are where Turkish differs from the Unicode default,
 * which lowers I to i and İ to i plus U+0307.
 */
export const TURKISH_CASE_PAIRS: ReadonlyArray<readonly [upper: string, lower: string]> = [
  ['A', 'a'],
  ['Â', 'â'],
  ['B', 'b'],
  ['C', 'c'],
  ['Ç', 'ç'],
  ['D', 'd'],
  ['E', 'e'],
  ['F', 'f'],
  ['G', 'g'],
  ['Ğ', 'ğ'],
  ['H', 'h'],
  ['I', 'ı'],
  ['İ', 'i'],
  ['Î', 'î'],
  ['J', 'j'],
  ['K', 'k'],
  ['L', 'l'],
  ['M', 'm'],
  ['N', 'n'],
  ['O', 'o'],
  ['Ö', 'ö'],
  ['P', 'p'],
  ['R', 'r'],
  ['S', 's'],
  ['Ş', 'ş'],
  ['T', 't'],
  ['U', 'u'],
  ['Û', 'û'],
  ['Ü', 'ü'],
  ['V', 'v'],
  ['Y', 'y'],
  ['Z', 'z'],
];

const SPACES: ReadonlySet<string> = new Set(WHITE_SPACE_CHARACTERS);
const INVISIBLES: ReadonlySet<string> = new Set(INVISIBLE_CHARACTERS);
const LOWER_BY_UPPER: ReadonlyMap<string, string> = new Map(TURKISH_CASE_PAIRS);
const DOT_ABOVE_AFTER_I = /i\u0307+/g;
const SPACE_RUN = / {2,}/g;
const EDGE_SPACE = /^ | $/g;

/**
 * The matching key of a name: spaces mapped and invisible characters dropped (before
 * NFC, so they cannot keep a letter and its mark apart), NFC, Turkish letters lowered
 * through the table and the rest locale-free, U+0307 after i dropped (an İ lowered
 * elsewhere arrives as i plus U+0307), NFC again, space runs collapsed and the ends
 * trimmed. Idempotent: nameKey(nameKey(x)) === nameKey(x). Known gap (D03-B18), pinned
 * in the tests: ı before a mark that composes with I, and i before U+0323, U+0328 or
 * U+0330, key differently from their upper case.
 */
export function nameKey(name: string): string {
  let visible = '';
  for (const character of name) {
    if (SPACES.has(character)) visible += ' ';
    else if (!INVISIBLES.has(character)) visible += character;
  }
  let lowered = '';
  for (const character of visible.normalize('NFC')) {
    lowered += LOWER_BY_UPPER.get(character) ?? character;
  }
  return lowered
    .toLowerCase()
    .replace(DOT_ABOVE_AFTER_I, 'i')
    .normalize('NFC')
    .replace(SPACE_RUN, ' ')
    .replace(EDGE_SPACE, '');
}

/**
 * A name as the roster shows and stores it: invisible characters dropped, then the space
 * rule (NFC, ends trimmed, inner white space one space). Its key is the name's own key.
 */
export function rosterName(name: string): string {
  let visible = '';
  for (const character of name) if (!INVISIBLES.has(character)) visible += character;
  return collapseWhitespace(visible);
}

/** Whether two spellings are the same name under the Turkish rule. Reflexive and symmetric. */
export function namesMatch(a: string, b: string): boolean {
  return nameKey(a) === nameKey(b);
}
