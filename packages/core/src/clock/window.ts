// Attendance window (D04): the one window rule the phone (button and countdown), the
// server (decision input) and the panel share, in UTC milliseconds, without Intl.
// A is the opening, B the class end, C the close; a change carries the upper end p of
// its press instant, and its effective press p' is never earlier than the press before
// it on the same installation (by sequence number), since one phone presses in order.
// Changes apply in p', installation, sequence and id order, so the order they arrive
// in does not matter:
//   plan:          C0 = min(A + length, B) with a length, otherwise B
//   WINDOW_LENGTH: C = max(target, min(C, p')), target worked out as the plan
//   EARLY_CLOSE:   C = max(A, min(C, p'))
// A change never closes the window before its own press: each new C is at least
// min(C, p'). The latest close is the largest C on the way, the plan included. Instants
// are integer milliseconds, A <= B and lengths whole minutes from 1 (the contract checks
// them; anything else throws RangeError).

import { compareText } from '../shared/text.ts';
import { idKey } from '../shared/uuid.ts';
import type { ChangeKind, WindowResult } from './codes.ts';
import { MINUTE_MS } from './constants.ts';
import type { ClockRange } from './types.ts';

/** A lecturer's change to one session's window. */
export type WindowChange = {
  readonly id: string;
  readonly kind: ChangeKind;
  /** WINDOW_LENGTH only: the new length; null removes it, so the window runs to B. */
  readonly newWindowMinutes: number | null;
  readonly pressedAtHighMs: number;
  readonly arrivedAtMs: number;
  readonly installId: string;
  readonly sequence: number;
};

/** What one change did, in the order the changes apply. */
export type WindowEffect = {
  readonly id: string;
  readonly effectivePressedAtMs: number;
} & (
  | { readonly effective: true; readonly previousCloseAtMs: number; readonly nextCloseAtMs: number }
  | { readonly effective: false; readonly previousCloseAtMs: null; readonly nextCloseAtMs: null }
);

export type WindowBounds = {
  readonly openAtMs: number;
  readonly closeAtMs: number;
  readonly latestCloseAtMs: number;
};

export type ComputedWindow = WindowBounds & {
  readonly classEndAtMs: number;
  readonly plannedCloseAtMs: number;
  /** The length in force; null when none is chosen (the window runs to B). */
  readonly windowMinutes: number | null;
  readonly windowChosen: boolean;
  readonly effects: readonly WindowEffect[];
};

export type WindowInput = {
  readonly openAtMs: number;
  readonly classEndAtMs: number;
  readonly plannedWindowMinutes: number | null;
  /** The move that started the current schedule; changes pressed (p') before it are left out. */
  readonly movedAtMs: number | null;
  /** Leaves out changes pressed (p') after it, inclusive. */
  readonly pressedByMs: number | null;
  /** Leaves out changes arrived after it, inclusive: the window as the server knew it then. */
  readonly arrivedByMs: number | null;
  readonly changes: readonly WindowChange[];
};

const isLength = (minutes: number | null) =>
  minutes === null || (Number.isSafeInteger(minutes) && minutes >= 1);

function checkInput(input: WindowInput): void {
  const { openAtMs, classEndAtMs, movedAtMs, pressedByMs, arrivedByMs } = input;
  const instants = [openAtMs, classEndAtMs, movedAtMs ?? 0, pressedByMs ?? 0, arrivedByMs ?? 0];
  if (!instants.every(Number.isSafeInteger) || classEndAtMs < openAtMs) {
    throw new RangeError('window instants must be integer milliseconds with A <= B');
  }
  if (!isLength(input.plannedWindowMinutes)) {
    throw new RangeError(
      `planned length ${input.plannedWindowMinutes} is not whole minutes from 1`,
    );
  }
  const ids = new Set<string>();
  for (const change of input.changes) {
    const integers = [change.pressedAtHighMs, change.arrivedAtMs, change.sequence];
    if (
      ids.has(idKey(change.id)) ||
      !integers.every(Number.isSafeInteger) ||
      (change.kind === 'WINDOW_LENGTH' && !isLength(change.newWindowMinutes))
    ) {
      throw new RangeError(`window change ${change.id} is repeated or outside its form`);
    }
    ids.add(idKey(change.id));
  }
}

const bySequence = (a: WindowChange, b: WindowChange) =>
  compareText(idKey(a.installId), idKey(b.installId)) ||
  a.sequence - b.sequence ||
  compareText(idKey(a.id), idKey(b.id));

// Each change with its effective press, in the order the changes apply.
function inApplyOrder(changes: readonly WindowChange[]) {
  let installId: string | null = null;
  let floorMs = Number.NEGATIVE_INFINITY;
  const pressed = [...changes].sort(bySequence).map((change) => {
    if (idKey(change.installId) !== installId) {
      installId = idKey(change.installId);
      floorMs = Number.NEGATIVE_INFINITY;
    }
    floorMs = Math.max(floorMs, change.pressedAtHighMs);
    return { change, pressedMs: floorMs };
  });
  return pressed.sort((a, b) => a.pressedMs - b.pressedMs || bySequence(a.change, b.change));
}

/**
 * The window of one session. Changes that had not arrived by arrivedByMs are not known
 * at all, so they do not raise the effective press of later ones either. A known change
 * pressed before movedAtMs or after pressedByMs is left out and stays in the effects
 * list with effective false.
 */
export function computeWindow(input: WindowInput): ComputedWindow {
  checkInput(input);
  const { openAtMs, classEndAtMs, movedAtMs, pressedByMs, arrivedByMs } = input;
  const closeFor = (minutes: number | null) =>
    minutes === null ? classEndAtMs : Math.min(openAtMs + minutes * MINUTE_MS, classEndAtMs);
  const known =
    arrivedByMs === null
      ? input.changes
      : input.changes.filter((change) => change.arrivedAtMs <= arrivedByMs);

  const plannedCloseAtMs = closeFor(input.plannedWindowMinutes);
  let closeAtMs = plannedCloseAtMs;
  let latestCloseAtMs = plannedCloseAtMs;
  let windowMinutes = input.plannedWindowMinutes;
  const effects = inApplyOrder(known).map(({ change, pressedMs }): WindowEffect => {
    const base = { id: change.id, effectivePressedAtMs: pressedMs };
    if (
      (movedAtMs !== null && pressedMs < movedAtMs) ||
      (pressedByMs !== null && pressedMs > pressedByMs)
    ) {
      return { ...base, effective: false, previousCloseAtMs: null, nextCloseAtMs: null };
    }
    const previousCloseAtMs = closeAtMs;
    const pressFloorMs = Math.min(closeAtMs, pressedMs);
    if (change.kind === 'WINDOW_LENGTH') {
      windowMinutes = change.newWindowMinutes;
      closeAtMs = Math.max(closeFor(windowMinutes), pressFloorMs);
    } else {
      closeAtMs = Math.max(openAtMs, pressFloorMs);
    }
    latestCloseAtMs = Math.max(latestCloseAtMs, closeAtMs);
    return { ...base, effective: true, previousCloseAtMs, nextCloseAtMs: closeAtMs };
  });
  return {
    openAtMs,
    classEndAtMs,
    plannedCloseAtMs,
    closeAtMs,
    latestCloseAtMs,
    windowMinutes,
    windowChosen: windowMinutes !== null,
    effects,
  };
}

/**
 * Where a record's clock range falls, in the student's favour (D04-B01): meeting
 * [open, close) is INSIDE (the range's high end at the opening counts, its low end at the
 * close does not); meeting only the part a shortening cut off, [close, latest close), is
 * CHANGE_SLICE; otherwise OUTSIDE. A window closed before it opened (close = open) holds
 * no instant, so nothing is INSIDE it. OLD_SCHEDULE is the caller's next step.
 */
export function windowPlacement(
  range: ClockRange,
  window: WindowBounds,
): Exclude<WindowResult, 'OLD_SCHEDULE'> {
  if (range.highMs < window.openAtMs) return 'OUTSIDE';
  const fromMs = Math.max(range.lowMs, window.openAtMs);
  if (fromMs < window.closeAtMs) return 'INSIDE';
  return fromMs < window.latestCloseAtMs ? 'CHANGE_SLICE' : 'OUTSIDE';
}

/**
 * For the phone's button and countdown: whether the window is open at the estimate, and
 * how long until it closes (0 once closed). With a broken first anchor the phone passes
 * its own clock (D04-C01).
 */
export function windowStatus(
  estimateMs: number,
  window: Pick<WindowBounds, 'openAtMs' | 'closeAtMs'>,
): { readonly open: boolean; readonly remainingMs: number } {
  return {
    open: window.openAtMs <= estimateMs && estimateMs < window.closeAtMs,
    remainingMs: Math.max(0, window.closeAtMs - estimateMs),
  };
}
