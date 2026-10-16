import { describe, expect, it } from 'vitest';
import {
  areSessionHours,
  CANCEL_REASONS,
  HELD_STATUSES,
  SESSION_HOURS_MAX,
  SESSION_KINDS,
  SESSION_STATUSES,
  SHORT_CODE_DIGITS,
  SHORT_CODE_MAX,
} from './sessions.ts';

describe('session value lists (D02)', () => {
  it("hold the spec's values in its order, by the name map", () => {
    // normal, telafi, deneme; planlandi, iptal; hoca, tasindi, tatil, sinav_haftasi,
    // takvim, program, arsiv; cevapsiz, yapildi, yapilmadi, celiskili.
    expect(SESSION_KINDS).toEqual(['regular', 'makeup', 'trial']);
    expect(SESSION_STATUSES).toEqual(['planned', 'cancelled']);
    expect(CANCEL_REASONS).toEqual([
      'lecturer',
      'moved',
      'holiday',
      'exam_week',
      'calendar',
      'schedule',
      'archive',
    ]);
    expect(HELD_STATUSES).toEqual(['unanswered', 'held', 'not_held', 'conflicting']);
  });

  it('takes 1 to 12 hours in all, each type whole and not below 0', () => {
    expect(SESSION_HOURS_MAX).toBe(12);
    for (const [theory, practice] of [
      [1, 0],
      [0, 1],
      [12, 0],
      [5, 7],
    ] as const) {
      expect(areSessionHours(theory, practice), `${theory}+${practice}`).toBe(true);
    }
    for (const [theory, practice] of [
      [0, 0],
      [13, 0],
      [6, 7],
      [-1, 3],
      [3, -1],
      [1.5, 1],
      [1, 0.5],
      [Number.NaN, 1],
    ] as const) {
      expect(areSessionHours(theory, practice), `${theory}+${practice}`).toBe(false);
    }
  });
});

describe('session short code (D02 kisa_kod)', () => {
  it('is written with 10 digits, so the largest is 9,999,999,999', () => {
    expect([SHORT_CODE_DIGITS, SHORT_CODE_MAX]).toEqual([10, 9_999_999_999]);
  });
});
