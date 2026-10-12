import { collapseWhitespace } from '../shared/text.ts';

// Course code normalisation (D02, dersler.kod): NFC, no space at either end, single spaces
// inside, Turkish upper case. Pure, with no Intl and no locale methods: i becomes İ first,
// because the generic upper case would turn it into I; the generic upper case already
// turns ı into I. NFC comes first, so a decomposed ç or İ meets the same rules as the
// composed one, and again last, because upper-casing can leave a sequence that NFC writes
// in another form.

/** The normal form of a course code ('bil  301' -> 'BİL 301'); normalising twice changes nothing. */
export function normalizeCourseCode(text: string): string {
  return collapseWhitespace(text).replace(/i/g, 'İ').toUpperCase().normalize('NFC');
}
