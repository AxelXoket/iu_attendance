import { z } from 'zod';

const isPrintableAscii = (text: string) => {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit < 0x20 || unit > 0x7e) return false;
  }
  return true;
};

/**
 * A text a phone only notes (a time zone name, a runtime version): printable ASCII of at
 * most max characters, so its length is its size and no NUL reaches the database.
 */
export function printableAsciiSchema(max: number) {
  return z.string().max(max).refine(isPrintableAscii, { message: 'Printable ASCII only' });
}
