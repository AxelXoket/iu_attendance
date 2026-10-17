// The application code e-mail: the code, how long it holds and that entering it sends the
// application for approval, then the fixed warning sentence.

import { FIXED_WARNING_SENTENCE } from '../fixed-texts.ts';
import type { ProductTemplate } from './index.ts';

export const applicationCodeTemplate: ProductTemplate<'application_code'> = Object.freeze({
  tr: ({ code, validityMinutes }, productName) => ({
    subject: `${productName} başvuru kodu`,
    text: [
      `Başvuru kodun: ${code}`,
      `Kod ${validityMinutes} dakika geçerli ve yalnız bir kez kullanılır. Kodu girince başvurun yönetici onayına gider.`,
      '',
      FIXED_WARNING_SENTENCE.tr,
    ].join('\n'),
  }),
  en: ({ code, validityMinutes }, productName) => ({
    subject: `${productName} application code`,
    text: [
      `Your application code: ${code}`,
      `The code is valid for ${validityMinutes} minutes and can be used only once. Once you enter it, your application goes to an administrator for approval.`,
      '',
      FIXED_WARNING_SENTENCE.en,
    ].join('\n'),
  }),
});
