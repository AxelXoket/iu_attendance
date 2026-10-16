import { describe, expect, it } from 'vitest';
import type { DisplayedLevel } from './level.ts';
import { type PhoneCorrectionInput, phoneCorrection, type UnsentRecord } from './phone.ts';
import { ABSENCE_FINAL_STATUS_CODES } from './session-layer.ts';

const displayed: DisplayedLevel = { level: 2, message: 'ONE_MORE_ENDS_ALLOWANCE', remaining: 2 };
const unsent = (sessionId: string, patch: Partial<UnsentRecord> = {}): UnsentRecord => ({
  sessionId,
  hours: 2,
  serverStatus: 'ABSENT',
  ...patch,
});
const correct = (patch: Partial<PhoneCorrectionInput>) =>
  phoneCorrection({ displayed, notifiedLevel: 2, unsent: [], ...patch });

describe('phoneCorrection (D08-B07)', () => {
  it('raises the remaining allowance by an unsent session the server counts absent, and by nothing else', () => {
    expect(correct({ unsent: [unsent('s1')] }).remaining).toBe(4);
    for (const serverStatus of [...ABSENCE_FINAL_STATUS_CODES, null]) {
      const expected = serverStatus === 'ABSENT' ? 4 : 2;
      expect(
        correct({ unsent: [unsent('s1', { serverStatus })] }).remaining,
        String(serverStatus),
      ).toBe(expected);
    }
    // Two absent sessions add up; at level 4 the remainder may be under 0.
    const over = { level: 4, message: 'ALLOWANCE_EXCEEDED', remaining: -1 } as const;
    expect(
      correct({
        displayed: over,
        notifiedLevel: 4,
        unsent: [unsent('s1'), unsent('s2', { hours: 1 })],
      }).remaining,
    ).toBe(2);
  });

  it('counts a session once, however many unsent records it has, in either case', () => {
    expect(correct({ unsent: [unsent('s-a'), unsent('S-A'), unsent('s-a')] }).remaining).toBe(4);
    expect(() => correct({ unsent: [unsent('s-a'), unsent('S-A', { hours: 1 })] })).toThrow(
      RangeError,
    );
    expect(() =>
      correct({ unsent: [unsent('s-a'), unsent('s-a', { serverStatus: 'PRESENT' })] }),
    ).toThrow(RangeError);
  });

  it('holds back a level increase while an unsent record of the type is left', () => {
    const rising = {
      notifiedLevel: 1,
      unsent: [unsent('s1', { serverStatus: 'PRESENT' })],
    } as const;
    expect(correct(rising)).toMatchObject({ notifyLevel: 1, notice: null });
    // Ground controls: nothing unsent, or an unsent session without hours of this type.
    const notified = { notifyLevel: 2, notice: 'ONE_MORE_ENDS_ALLOWANCE' };
    expect(correct({ notifiedLevel: 1 })).toMatchObject(notified);
    expect(correct({ notifiedLevel: 1, unsent: [unsent('s1', { hours: 0 })] })).toMatchObject(
      notified,
    );
    // A fall or the same level is never held, and never notified.
    expect(correct({ notifiedLevel: 3, unsent: [unsent('s1')] })).toMatchObject({
      notifyLevel: 2,
      notice: null,
    });
    expect(correct({ notifiedLevel: 2 })).toMatchObject({ notifyLevel: 2, notice: null });
  });

  it('adds no hours from a session without hours of this type', () => {
    expect(correct({ unsent: [unsent('s1', { hours: 0 })] }).remaining).toBe(2);
  });

  it('refuses a level or hours out of form', () => {
    const bad: Partial<PhoneCorrectionInput>[] = [
      { displayed: { ...displayed, level: 5 as 4 } },
      { displayed: { ...displayed, remaining: 1.5 } },
      { notifiedLevel: -1 as 0 },
      { notifiedLevel: 1.5 as 1 },
      // A message that is not its level's, a level without one, a message at level 0.
      { displayed: { ...displayed, message: 'HALF_USED' } },
      { displayed: { ...displayed, message: null } },
      { displayed: { level: 0, message: 'HALF_USED', remaining: 2 } },
      { displayed: { ...displayed, message: 'LATER' as 'HALF_USED' } },
      { unsent: [unsent('s1', { hours: -1 })] },
      { unsent: [unsent('s1', { hours: 0.5 })] },
      { unsent: [unsent('s1', { serverStatus: 'absent' as 'ABSENT' })] },
      // The corrected remainder must stay exact.
      {
        displayed: { ...displayed, remaining: Number.MAX_SAFE_INTEGER - 1 },
        unsent: [unsent('s1')],
      },
    ];
    for (const patch of bad)
      expect(() => correct(patch), JSON.stringify(patch)).toThrow(RangeError);
    // Ground controls: level 0 without a message, and the largest exact remainder.
    expect(
      correct({ displayed: { level: 0, message: null, remaining: 5 }, notifiedLevel: 0 }),
    ).toEqual({ remaining: 5, notifyLevel: 0, notice: null });
    expect(
      correct({
        displayed: { ...displayed, remaining: Number.MAX_SAFE_INTEGER - 2 },
        unsent: [unsent('s1')],
      }).remaining,
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
});
