import { describe, expect, it } from 'vitest';
import { LANGUAGES, type Language } from '../shared/language.ts';
import { LEVEL_MESSAGES, type LevelMessage, MESSAGE_LEVELS } from './level.ts';
import { levelMessageText } from './texts.ts';
import { HOUR_TYPES, type HourType } from './types.ts';

const TYPE_WORDS = { tr: ['teori', 'uygulama'], en: ['theory', 'practice'] } as const;
// The plan's sentences (plan.html, Bildirim).
const PLAN_SENTENCES: Readonly<Record<LevelMessage, string>> = {
  HALF_USED: 'Hakkının yarısını kullandın',
  ONE_MORE_ENDS_ALLOWANCE: 'Bir ders daha kaçırırsan hakkın biter',
  ONE_MORE_MAKES_ABSENT: 'Bir ders daha kaçırırsan devamsız kalırsın',
  NO_ALLOWANCE_LEFT: 'Hakkın kalmadı',
  ALLOWANCE_EXCEEDED: 'Hakkını aştın',
};

const everyText = () =>
  LEVEL_MESSAGES.flatMap((message) =>
    HOUR_TYPES.flatMap((hourType) =>
      LANGUAGES.map((language) => levelMessageText(message, hourType, 3, language)),
    ),
  );

describe('levelMessageText (D08 warning texts)', () => {
  it('has a text in every language for every message code and hour type, with the type name', () => {
    for (const message of LEVEL_MESSAGES) {
      for (const [index, hourType] of HOUR_TYPES.entries()) {
        const texts = LANGUAGES.map((language) => levelMessageText(message, hourType, 3, language));
        for (const [n, language] of LANGUAGES.entries()) {
          const text = texts[n] as string;
          expect(text.trim().length).toBeGreaterThan(0);
          expect(text.toLowerCase()).toContain(TYPE_WORDS[language][index]);
        }
        expect(new Set(texts).size).toBe(LANGUAGES.length);
      }
    }
  });

  it("uses the plan's Turkish sentences, and the remaining allowance at levels 1 and 2 only", () => {
    for (const message of LEVEL_MESSAGES) {
      const tr = levelMessageText(message, 'THEORY', 3, 'tr');
      expect(tr).toContain(PLAN_SENTENCES[message]);
      expect(/\d/.test(tr)).toBe(MESSAGE_LEVELS[message] <= 2);
    }
    expect(levelMessageText('HALF_USED', 'THEORY', 3, 'tr')).toBe(
      'Teori: Hakkının yarısını kullandın. Kalan hakkın 3 saat.',
    );
    expect(levelMessageText('ONE_MORE_MAKES_ABSENT', 'PRACTICE', 1, 'en')).toBe(
      'Practice: If you miss one more class, you will fail attendance. Allowance left: 1 hour.',
    );
    expect(levelMessageText('ONE_MORE_ENDS_ALLOWANCE', 'THEORY', 2, 'en')).toBe(
      'Theory: If you miss one more class, your allowance runs out. Allowance left: 2 hours.',
    );
    // Levels 3 and 4 show no remainder, so any value is taken, 0 and below too.
    expect(levelMessageText('NO_ALLOWANCE_LEFT', 'THEORY', 0, 'tr')).toBe('Teori: Hakkın kalmadı.');
    expect(levelMessageText('ALLOWANCE_EXCEEDED', 'PRACTICE', -2, 'en')).toBe(
      'Practice: You have exceeded your absence allowance.',
    );
  });

  it('gives the same texts with Intl removed', () => {
    const before = everyText();
    const intl = globalThis.Intl;
    try {
      Reflect.deleteProperty(globalThis, 'Intl');
      expect(typeof globalThis.Intl).toBe('undefined');
      expect(everyText()).toEqual(before);
    } finally {
      globalThis.Intl = intl;
    }
  });

  it('refuses a code, type or language it does not have, and a remainder under 1 where it is shown', () => {
    expect(() => levelMessageText('LATER' as LevelMessage, 'THEORY', 3, 'tr')).toThrow(RangeError);
    expect(() => levelMessageText('HALF_USED', 'LAB' as HourType, 3, 'tr')).toThrow(RangeError);
    expect(() => levelMessageText('HALF_USED', 'THEORY', 3, 'de' as Language)).toThrow(RangeError);
    for (const remaining of [0, -1, 1.5, Number.NaN]) {
      expect(
        () => levelMessageText('HALF_USED', 'THEORY', remaining, 'tr'),
        String(remaining),
      ).toThrow(RangeError);
    }
  });
});
