import { nameKey } from './name.ts';

// The section key (D03-B15): the panel keeps the file rows whose section label matches
// the chosen section (sectionsMatch), and the server checks the labels again with the
// same function. '1. Şube', '1.ŞUBE', 'şube 1', ' 1 ' and 'Şube 01' all give '1'. A
// label without a key matches nothing.

/**
 * Lower case spellings of the word şube that are dropped as whole words: the ASCII
 * spelling and the possessive ('A Şubesi'), as Turkish lowering gives them.
 */
export const SECTION_WORDS: readonly string[] = [
  'şube',
  'şubesi',
  'şubesı',
  'sube',
  'subesi',
  'subesı',
];

const WORDS: ReadonlySet<string> = new Set(SECTION_WORDS);
const LETTER_RUN = /[\p{L}\p{M}]+/gu;
const NOT_LETTER_OR_DIGIT = /[^\p{L}\p{M}\p{Nd}]+/gu;
const ASCII_DIGIT_RUN = /[0-9]+/g;
const LEADING_ZEROS = /^0+(?=[0-9])/;

/**
 * The section key of a label: lowered by the Turkish rule (nameKey), the word şube
 * dropped and every character that is not a letter or a digit dropped, repeated until
 * nothing changes; then, once, the leading zeros of every run of ASCII digits dropped
 * ('01' gives '1', '0' stays '0'). Only at the end, so the key does not depend on the
 * pass in which the word drops: '1 Şube 01' and '1 Şu-be 01' both give '101'. The key
 * of a key is the key itself. A label that leaves nothing (empty, separators only, the
 * word şube only) has no key: null, and null matches nothing (sectionsMatch).
 */
export function sectionKey(label: string): string | null {
  let key = label;
  let previous: string;
  do {
    previous = key;
    key = nameKey(previous)
      .replace(LETTER_RUN, (word) => (WORDS.has(word) ? ' ' : word))
      .replace(NOT_LETTER_OR_DIGIT, '');
  } while (key !== previous);
  key = key.replace(ASCII_DIGIT_RUN, (digits) => digits.replace(LEADING_ZEROS, ''));
  return key === '' ? null : key;
}

/**
 * Whether two section labels name the same section: true only when both have a key
 * and the keys are equal. A label without a key matches nothing, not even another
 * label without a key: 'Şube' matches neither '' nor 'Şube'. Symmetric.
 */
export function sectionsMatch(a: string, b: string): boolean {
  const key = sectionKey(a);
  return key !== null && key === sectionKey(b);
}
