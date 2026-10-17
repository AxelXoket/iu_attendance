// The sign-in code e-mail: the code and how long it holds, then the fixed warning sentence.

import { FIXED_WARNING_SENTENCE } from '../fixed-texts.ts';
import type { ProductTemplate } from './index.ts';

export const signInCodeTemplate: ProductTemplate<'sign_in_code'> = Object.freeze({
  tr: ({ code, validityMinutes }, productName) => ({
    subject: `${productName} giriş kodu`,
    text: [
      `Giriş kodun: ${code}`,
      `Kod ${validityMinutes} dakika geçerli ve yalnız bir kez kullanılır.`,
      '',
      FIXED_WARNING_SENTENCE.tr,
    ].join('\n'),
  }),
  en: ({ code, validityMinutes }, productName) => ({
    subject: `${productName} sign-in code`,
    text: [
      `Your sign-in code: ${code}`,
      `The code is valid for ${validityMinutes} minutes and can be used only once.`,
      '',
      FIXED_WARNING_SENTENCE.en,
    ].join('\n'),
  }),
});
