// The application deletion code e-mail (D01-B32): the code, how long it holds and that
// entering it deletes the application, then the fixed warning sentence.

import { FIXED_WARNING_SENTENCE } from '../fixed-texts.ts';
import type { ProductTemplate } from './index.ts';

export const applicationDeletionCodeTemplate: ProductTemplate<'application_deletion_code'> =
  Object.freeze({
    tr: ({ code, validityMinutes }, productName) => ({
      subject: `${productName} başvuru silme kodu`,
      text: [
        `Başvuru silme kodun: ${code}`,
        `Kod ${validityMinutes} dakika geçerli ve yalnız bir kez kullanılır. Kodu girince başvurun ve başvuru bilgilerin silinir.`,
        '',
        FIXED_WARNING_SENTENCE.tr,
      ].join('\n'),
    }),
    en: ({ code, validityMinutes }, productName) => ({
      subject: `${productName} application deletion code`,
      text: [
        `Your application deletion code: ${code}`,
        `The code is valid for ${validityMinutes} minutes and can be used only once. Once you enter it, your application and its details are deleted.`,
        '',
        FIXED_WARNING_SENTENCE.en,
      ].join('\n'),
    }),
  });
