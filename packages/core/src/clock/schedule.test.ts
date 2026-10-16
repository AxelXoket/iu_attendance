import { describe, expect, it } from 'vitest';
import { type OldSchedule, oldSchedule } from './schedule.ts';
import { computeWindow, type WindowChange, windowPlacement } from './window.ts';

// Istanbul time on a class day (UTC+3).
const at = (hour: number, minute: number) => Date.UTC(2026, 9, 19, hour - 3, minute);
const instant = (ms: number) => ({ lowMs: ms, highMs: ms });

// A 09:00 to 11:00 session with a 15 minute window, moved at 08:00 to 14:00 to 16:00.
const earlier: OldSchedule = {
  openAtMs: at(9, 0),
  classEndAtMs: at(11, 0),
  plannedWindowMinutes: 15,
  heldFromMs: null,
  heldUntilMs: at(8, 0),
};
const current = computeWindow({
  openAtMs: at(14, 0),
  classEndAtMs: at(16, 0),
  plannedWindowMinutes: 15,
  movedAtMs: at(8, 0),
  pressedByMs: null,
  arrivedByMs: null,
  changes: [],
});
// The window result as the server puts it together.
const resultOf = (ms: number, schedules: readonly OldSchedule[], changes: WindowChange[] = []) => {
  const placement = windowPlacement(instant(ms), current);
  if (placement !== 'OUTSIDE') return placement;
  return oldSchedule(instant(ms), schedules, changes) === null ? 'OUTSIDE' : 'OLD_SCHEDULE';
};
const lengthChange = (pressedAtHighMs: number): WindowChange => ({
  id: `c${pressedAtHighMs}`,
  kind: 'WINDOW_LENGTH',
  newWindowMinutes: 30,
  pressedAtHighMs,
  arrivedAtMs: at(14, 0),
  installId: 'i1',
  sequence: 1,
});

describe('old schedule', () => {
  it('places a record given under the schedule the session had', () => {
    expect(oldSchedule(instant(at(9, 5)), [earlier], [])).toEqual(earlier);
    expect(resultOf(at(9, 5), [earlier])).toBe('OLD_SCHEDULE');
    expect(resultOf(at(14, 5), [earlier])).toBe('INSIDE');
    expect(resultOf(at(12, 0), [earlier])).toBe('OUTSIDE');
    expect(resultOf(at(9, 20), [earlier])).toBe('OUTSIDE');
    // The range's high end at the old opening counts, as in the current window.
    expect(oldSchedule({ lowMs: at(9, 0) - 500, highMs: at(9, 0) }, [earlier], [])).toEqual(
      earlier,
    );
    expect(oldSchedule({ lowMs: at(9, 0) - 500, highMs: at(9, 0) - 1 }, [earlier], [])).toBeNull();
    // Ground control: without the history the same record is outside.
    expect(resultOf(at(9, 5), [])).toBe('OUTSIDE');
  });

  it('rebuilds an old window with the changes pressed while it held', () => {
    // A 30 minute choice pressed at 07:59, while the 09:00 schedule held, widens it.
    expect(resultOf(at(9, 20), [earlier], [lengthChange(at(7, 59))])).toBe('OLD_SCHEDULE');
    // Pressed in the last millisecond before the move, it still belongs to the old one.
    expect(resultOf(at(9, 20), [earlier], [lengthChange(at(8, 0) - 1)])).toBe('OLD_SCHEDULE');
    // Pressed at the move or after it, it belongs to the new schedule.
    expect(resultOf(at(9, 20), [earlier], [lengthChange(at(8, 0))])).toBe('OUTSIDE');
    // A schedule that held from an earlier move takes a change pressed at that move, and
    // none pressed before it.
    const second = { ...earlier, heldFromMs: at(7, 59) };
    expect(resultOf(at(9, 20), [second], [lengthChange(at(7, 59))])).toBe('OLD_SCHEDULE');
    expect(resultOf(at(9, 20), [second], [lengthChange(at(7, 59) - 1)])).toBe('OUTSIDE');
  });

  it('takes an old window up to its latest close, the shortened slice included', () => {
    // An early close pressed at 07:30, while the 09:00 schedule held, shut it at 09:00.
    const early: WindowChange = {
      id: 'e1',
      kind: 'EARLY_CLOSE',
      newWindowMinutes: null,
      pressedAtHighMs: at(7, 30),
      arrivedAtMs: at(7, 31),
      installId: 'i1',
      sequence: 1,
    };
    expect(resultOf(at(9, 5), [earlier], [early])).toBe('OLD_SCHEDULE');
    expect(resultOf(at(9, 15), [earlier], [early])).toBe('OUTSIDE');
  });

  it('answers with the first old schedule the record falls in', () => {
    const other = { ...earlier, openAtMs: at(9, 3), classEndAtMs: at(11, 3) };
    expect(oldSchedule(instant(at(9, 5)), [other, earlier], [])).toEqual(other);
    expect(oldSchedule(instant(at(9, 1)), [other, earlier], [])).toEqual(earlier);
  });
});
