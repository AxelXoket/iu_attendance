// The two languages of the app and the default, in one place. Text that reaches a
// person (error messages, e-mail templates, warnings) exists in each of them; codes,
// keys and state values carry no language. Core holds the list because its warning
// texts are written in each language; the contracts re-export it (D13).
export const LANGUAGES = ['tr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE = 'tr' satisfies Language;
export const isLanguage = (value: string): value is Language =>
  (LANGUAGES as readonly string[]).includes(value);
