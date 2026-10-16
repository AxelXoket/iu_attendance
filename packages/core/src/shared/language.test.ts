import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES } from './language.ts';

describe('languages (D13)', () => {
  it('are Turkish and English, Turkish by default', () => {
    expect(LANGUAGES).toEqual(['tr', 'en']);
    expect(DEFAULT_LANGUAGE).toBe('tr');
  });

  it('knows its own languages only, in their case', () => {
    for (const language of LANGUAGES) expect(isLanguage(language)).toBe(true);
    for (const other of ['TR', 'de', '', 'tr-TR']) expect(isLanguage(other), other).toBe(false);
  });
});
