// The application approved e-mail (D14-A01): sent once when an administrator approves, with
// no code and no link, then the fixed warning sentence. It takes no data.

import { FIXED_WARNING_SENTENCE } from '../fixed-texts.ts';
import type { ProductTemplate } from './index.ts';

export const applicationApprovedTemplate: ProductTemplate<'application_approved'> = Object.freeze({
  tr: (_data, productName) => ({
    subject: `${productName}: hesabın onaylandı`,
    text: ['Hesabın onaylandı, uygulamadan giriş yap.', '', FIXED_WARNING_SENTENCE.tr].join('\n'),
  }),
  en: (_data, productName) => ({
    subject: `${productName}: your account has been approved`,
    text: [
      'Your account has been approved; sign in from the app.',
      '',
      FIXED_WARNING_SENTENCE.en,
    ].join('\n'),
  }),
});
