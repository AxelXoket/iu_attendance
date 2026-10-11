// The fixed sentences of the e-mails and the jobs error text, one value per language.
// Templates, the jobs error catalog and the scenarios import them, so a wording change
// is made here and nowhere else.
import type { Language } from '@iu-attendance/contracts/shared/language';

// Same shape as BilingualText in the error contract: a text for every language.
type TextByLanguage = Readonly<Record<Language, string>>;

// The last paragraph of every product e-mail.
export const FIXED_WARNING_SENTENCE: TextByLanguage = Object.freeze({
  tr: 'Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.',
  en: 'Enter this code only in the app or on the panel; the app never asks for the code by e-mail, phone or any other way.',
});

// A paragraph of its own in the sign-in notification.
export const IF_NOT_YOU_SENTENCE: TextByLanguage = Object.freeze({
  tr: 'Sen değilsen Oturumlarım ekranından kapat.',
  en: 'If this was not you, sign it out from the My sessions screen.',
});

// Lecturer and student text of every jobs error code that can arise in a request.
export const JOBS_GENERIC_ERROR_TEXT: TextByLanguage = Object.freeze({
  tr: 'Beklenmeyen bir sorun oldu. Biraz sonra yeniden dene.',
  en: 'Something unexpected went wrong. Try again in a moment.',
});
