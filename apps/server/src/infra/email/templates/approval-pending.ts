// The approval pending e-mail: the application waits for an administrator, then the fixed
// warning sentence. It takes no data, so no code can travel in it.

import { FIXED_WARNING_SENTENCE } from '../fixed-texts.ts';
import type { ProductTemplate } from './index.ts';

export const approvalPendingTemplate: ProductTemplate<'approval_pending'> = Object.freeze({
  tr: (_data, productName) => ({
    subject: `${productName}: başvurun onay bekliyor`,
    text: [
      'Başvurun yönetici onayı bekliyor; onaylanınca giriş kodu isteyebilirsin.',
      '',
      FIXED_WARNING_SENTENCE.tr,
    ].join('\n'),
  }),
  en: (_data, productName) => ({
    subject: `${productName}: your application is awaiting approval`,
    text: [
      'Your application is awaiting administrator approval; once it is approved, you can request a sign-in code.',
      '',
      FIXED_WARNING_SENTENCE.en,
    ].join('\n'),
  }),
});
