// The fixed sentences of the e-mails, one value per language. Templates and the scenarios
// import them, so a wording change is made here and nowhere else. The jobs error text
// lives in the jobs contract, whose catalog uses it.
import type { BilingualText } from '@iu-attendance/contracts/shared';

// The last paragraph of every product e-mail.
export const FIXED_WARNING_SENTENCE: BilingualText = Object.freeze({
  tr: 'Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.',
  en: 'Enter this code only in the app or on the panel; the app never asks for the code by e-mail, phone or any other way.',
});

// A paragraph of its own in the sign-in notification.
export const IF_NOT_YOU_SENTENCE: BilingualText = Object.freeze({
  tr: 'Sen değilsen Oturumlarım ekranından kapat.',
  en: 'If this was not you, sign it out from the My sessions screen.',
});
