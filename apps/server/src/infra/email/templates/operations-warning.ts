// The operations warning e-mail (D15), Turkish only and with no fixed sentence: the subject
// after the product name, the lines one per line. Any link in the subject or the lines is
// written as [adres] and only their count goes back to the sender. When the lines give
// nothing to read (none, or only white space) the body is the subject, since an e-mail
// body is never empty.

import { checkLinks } from '../link-check.ts';
import type { CountedEmail, OperationsTemplate } from './index.ts';

/** The operations e-mail of a subject line and body lines, its links written as [adres]. */
export function operationsEmail(subject: string, lines: readonly string[]): CountedEmail {
  const checkedSubject = checkLinks(subject);
  const checkedBody = checkLinks(lines.join('\n'));
  const empty = checkedBody.cleanText.trim() === '';
  return {
    subject: checkedSubject.cleanText,
    text: empty ? checkedSubject.cleanText : checkedBody.cleanText,
    // Each link once, though an empty body repeats the subject.
    linkCount: checkedSubject.linkCount + checkedBody.linkCount,
  };
}

export const operationsWarningTemplate: OperationsTemplate<'operations_warning'> = (
  data,
  productName,
) => operationsEmail(`${productName} işletim uyarısı: ${data.subject}`, data.lines);
