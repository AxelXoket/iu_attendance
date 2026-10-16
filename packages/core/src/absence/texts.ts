// The warning texts (D08), one place for both languages: per message code one sentence,
// led by the hour type's name, and at levels 1 and 2 the remaining allowance after it. The
// Turkish sentences are the plan's. The server sends only the level and the message code;
// the phone picks the text in its own language. No Intl: the hours are whole numbers
// written as digits, and the English plural is chosen here.

import { isLanguage, type Language } from '../shared/language.ts';
import { LEVEL_MESSAGES, type LevelMessage, MESSAGE_LEVELS } from './level.ts';
import { HOUR_TYPES, type HourType } from './types.ts';

const SENTENCES = {
  tr: {
    HALF_USED: 'Hakkının yarısını kullandın',
    ONE_MORE_ENDS_ALLOWANCE: 'Bir ders daha kaçırırsan hakkın biter',
    ONE_MORE_MAKES_ABSENT: 'Bir ders daha kaçırırsan devamsız kalırsın',
    NO_ALLOWANCE_LEFT: 'Hakkın kalmadı',
    ALLOWANCE_EXCEEDED: 'Hakkını aştın',
  },
  en: {
    HALF_USED: 'You have used half of your absence allowance',
    ONE_MORE_ENDS_ALLOWANCE: 'If you miss one more class, your allowance runs out',
    ONE_MORE_MAKES_ABSENT: 'If you miss one more class, you will fail attendance',
    NO_ALLOWANCE_LEFT: 'You have no absence allowance left',
    ALLOWANCE_EXCEEDED: 'You have exceeded your absence allowance',
  },
} as const satisfies Record<Language, Record<LevelMessage, string>>;

const TYPE_NAMES = {
  tr: { THEORY: 'Teori', PRACTICE: 'Uygulama' },
  en: { THEORY: 'Theory', PRACTICE: 'Practice' },
} as const satisfies Record<Language, Record<HourType, string>>;

const REMAINING = {
  tr: (hours: number) => `Kalan hakkın ${hours} saat.`,
  en: (hours: number) => `Allowance left: ${hours} ${hours === 1 ? 'hour' : 'hours'}.`,
} as const satisfies Record<Language, (hours: number) => string>;

/** RangeError for a code, type or language the lists do not have, or a remainder under 1 where it is shown. */
export function levelMessageText(
  message: LevelMessage,
  hourType: HourType,
  remaining: number,
  language: Language,
): string {
  if (
    !isLanguage(language) ||
    !LEVEL_MESSAGES.includes(message) ||
    !HOUR_TYPES.includes(hourType)
  ) {
    throw new RangeError('unknown message code, hour type or language');
  }
  const text = `${TYPE_NAMES[language][hourType]}: ${SENTENCES[language][message]}.`;
  // Levels 1 and 2: the allowance is not used up, so its remainder is part of the warning.
  if (MESSAGE_LEVELS[message] > 2) return text;
  if (!(Number.isSafeInteger(remaining) && remaining >= 1)) {
    throw new RangeError(
      'the remaining allowance of a level 1 or 2 warning is a whole number from 1',
    );
  }
  return `${text} ${REMAINING[language](remaining)}`;
}
