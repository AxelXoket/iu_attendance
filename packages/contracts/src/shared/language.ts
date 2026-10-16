// The two languages of the app and the default are core's (core/shared/language.ts).
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGES,
  type Language,
} from '@iu-attendance/core/shared/language';

export { DEFAULT_LANGUAGE, LANGUAGES, type Language };

export const ACCEPT_LANGUAGE_MAX_LENGTH = 256;

// Optional whitespace (RFC 9110 OWS) is space and tab only, and only around the list
// commas and the weight semicolon.
const OWS_EDGES = /^[ \t]+|[ \t]+$/g;

// One list element without its outer OWS: a language range (RFC 4647 2.1) and at most
// one weight, OWS ";" OWS "q=" qvalue, with q in either case and nothing around "=".
const ELEMENT =
  /^(\*|[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*)(?:[ \t]*;[ \t]*[qQ]=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/;

// q as an integer in thousandths ("0.8" is 800), so no floating point is involved.
function qualityInThousandths(text: string): number {
  const [whole = '0', fraction = ''] = text.split('.');
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
}

// Picks the language from an Accept-Language value (RFC 9110 12.5.4): ranges in
// falling q order (ties keep their written order, q=0 is skipped); the first range
// whose primary subtag, in lower case, is one of LANGUAGES wins; "*" and no match give
// the default. A missing, empty or longer than 256 characters value gives the
// default, and so does any malformed element: another parameter, a second weight,
// whitespace other than space and tab, or whitespace around "=". Empty list elements
// are skipped (RFC 9110 5.6.1). Pure, no Intl, never throws.
export function selectLanguage(acceptLanguage: string | null | undefined): Language {
  if (typeof acceptLanguage !== 'string') return DEFAULT_LANGUAGE;
  if (acceptLanguage.length === 0 || acceptLanguage.length > ACCEPT_LANGUAGE_MAX_LENGTH) {
    return DEFAULT_LANGUAGE;
  }
  const ranges: Array<{ tag: string; quality: number; order: number }> = [];
  const elements = acceptLanguage.split(',');
  for (let order = 0; order < elements.length; order += 1) {
    const element = (elements[order] ?? '').replace(OWS_EDGES, '');
    if (element === '') continue;
    const match = ELEMENT.exec(element);
    if (match === null) return DEFAULT_LANGUAGE;
    const [, tag = '', weight] = match;
    const quality = weight === undefined ? 1000 : qualityInThousandths(weight);
    if (quality > 0) ranges.push({ tag, quality, order });
  }
  ranges.sort((a, b) => b.quality - a.quality || a.order - b.order);
  for (const { tag } of ranges) {
    if (tag === '*') return DEFAULT_LANGUAGE;
    const primary = (tag.split('-')[0] ?? '').toLowerCase();
    if (isLanguage(primary)) return primary;
  }
  return DEFAULT_LANGUAGE;
}
