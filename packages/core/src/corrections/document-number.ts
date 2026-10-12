import { collapseWhitespace } from '../shared/text.ts';

export const DOCUMENT_NUMBER_MAX_LENGTH = 64;

export class DocumentNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentNumberError';
  }
}

// C0 and C1 control characters, including tab and line breaks.
// biome-ignore lint/suspicious/noControlCharactersInRegex: detecting them is the purpose
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/;

// Normalises a document number: NFC, no leading or trailing space, inner whitespace
// runs become one space; the result is 1 to 64 characters (code points) and has no
// control character. Turkish letters are kept as written. Applying it twice gives
// the same result.
export function normalizeDocumentNumber(input: string): string {
  if (CONTROL.test(input))
    throw new DocumentNumberError('document number contains a control character');
  const normalized = collapseWhitespace(input);
  const length = [...normalized].length;
  if (length === 0 || length > DOCUMENT_NUMBER_MAX_LENGTH) {
    throw new DocumentNumberError(
      `document number must be 1 to ${DOCUMENT_NUMBER_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}
