import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ordersOf } from '../testing/orders.ts';
import { CHANGE_KINDS } from './codes.ts';
import { MINUTE_MS } from './constants.ts';
import {
  type ComputedWindow,
  computeWindow,
  type WindowChange,
  type WindowEffect,
  type WindowInput,
  windowPlacement,
  windowStatus,
} from './window.ts';

// Istanbul time on a class day (UTC+3).
const at = (hour: number, minute: number, second = 0, ms = 0) =>
  Date.UTC(2026, 9, 19, hour - 3, minute, second, ms);
const A = at(9, 0);
const B = at(11, 0);

// A change maker per test: ids and default sequences count from 1 in each test.
const changeMaker = () => {
  let count = 0;
  return (patch: Partial<WindowChange>): WindowChange => {
    count += 1;
    return {
      id: `c${String(count).padStart(3, '0')}`,
      kind: 'WINDOW_LENGTH',
      newWindowMinutes: null,
      pressedAtHighMs: A,
      arrivedAtMs: A,
      installId: 'i1',
      sequence: count,
      ...patch,
    };
  };
};
const compute = (
  changes: readonly WindowChange[],
  plannedWindowMinutes: number | null = 15,
  extra: Partial<WindowInput> = {},
) =>
  computeWindow({
    openAtMs: A,
    classEndAtMs: B,
    plannedWindowMinutes,
    movedAtMs: null,
    pressedByMs: null,
    arrivedByMs: null,
    changes,
    ...extra,
  });

const changeArbitrary = fc.record({
  id: fc.uuid(),
  kind: fc.constantFrom(...CHANGE_KINDS),
  newWindowMinutes: fc.option(fc.integer({ min: 1, max: 150 }), { nil: null }),
  pressedAtHighMs: fc.integer({ min: A - 10 * MINUTE_MS, max: B + 10 * MINUTE_MS }),
  arrivedAtMs: fc.integer({ min: A, max: B + 60 * MINUTE_MS }),
  installId: fc.constantFrom('i1', 'i2', 'i3'),
  sequence: fc.integer({ min: 1, max: 9 }),
});
const plannedArbitrary = fc.option(fc.integer({ min: 1, max: 150 }), { nil: null });

describe('window placement', () => {
  const bounds = { openAtMs: A, closeAtMs: at(9, 15), latestCloseAtMs: at(9, 30) };
  const placed = (lowMs: number, highMs: number) => windowPlacement({ lowMs, highMs }, bounds);

  it('favours the student at a half open window', () => {
    // The high end touching the opening is inside; the low end at the close is not.
    expect(placed(A - 500, A)).toBe('INSIDE');
    expect(placed(A - 500, A - 1)).toBe('OUTSIDE');
    expect(placed(at(9, 15) - 1, at(9, 16))).toBe('INSIDE');
    expect(placed(at(9, 15), at(9, 16))).toBe('CHANGE_SLICE');
    expect(placed(at(9, 30) - 1, at(9, 31))).toBe('CHANGE_SLICE');
    expect(placed(at(9, 30), at(9, 31))).toBe('OUTSIDE');
    // A range wider than the window is inside.
    expect(placed(A - MINUTE_MS, at(9, 40))).toBe('INSIDE');
  });

  it('puts nothing inside a window closed before it opened', () => {
    // An early close pressed at 08:55 shuts the 15 minute window at the opening.
    const change = changeMaker();
    const shut = compute([change({ kind: 'EARLY_CLOSE', pressedAtHighMs: at(8, 55) })]);
    expect([shut.closeAtMs, shut.latestCloseAtMs]).toEqual([A, at(9, 15)]);
    const place = (lowMs: number, highMs: number) => windowPlacement({ lowMs, highMs }, shut);
    expect(place(A - 200, A + 300)).toBe('CHANGE_SLICE');
    expect(place(A, A)).toBe('CHANGE_SLICE');
    expect(place(at(8, 50), at(9, 40))).toBe('CHANGE_SLICE');
    expect(place(A - 500, A - 1)).toBe('OUTSIDE');
    // The phone shows it closed at every instant.
    expect(windowStatus(A, shut).open).toBe(false);
  });

  it('agrees with the set definition on integer instants', () => {
    const instant = fc.integer({ min: A - 20 * MINUTE_MS, max: at(9, 50) });
    // Closes at the opening and slices of length 0 are drawn often.
    const span = fc.oneof(fc.constant(0), fc.integer({ min: 0, max: 30 * MINUTE_MS }));
    // Some integer t with max(low, from) <= t <= min(high, to - 1).
    const meets = (lowMs: number, highMs: number, fromMs: number, toMs: number) =>
      Math.max(lowMs, fromMs) <= Math.min(highMs, toMs - 1);
    const seen = new Set<string>();
    fc.assert(
      fc.property(instant, instant, instant, span, span, (a, b, openAtMs, shut, slice) => {
        const [lowMs, highMs] = a <= b ? [a, b] : [b, a];
        const closeAtMs = openAtMs + shut;
        const latestCloseAtMs = closeAtMs + slice;
        const expected = meets(lowMs, highMs, openAtMs, closeAtMs)
          ? 'INSIDE'
          : meets(lowMs, highMs, openAtMs, latestCloseAtMs)
            ? 'CHANGE_SLICE'
            : 'OUTSIDE';
        const result = windowPlacement({ lowMs, highMs }, { openAtMs, closeAtMs, latestCloseAtMs });
        expect(result).toBe(expected);
        seen.add(`${result} ${shut === 0}`);
      }),
      { numRuns: 10_000 },
    );
    // Ground control: each answer occurred, with and without an empty window.
    expect([...seen].sort()).toEqual([
      'CHANGE_SLICE false',
      'CHANGE_SLICE true',
      'INSIDE false',
      'OUTSIDE false',
      'OUTSIDE true',
    ]);
  });
});

describe('window computation', () => {
  it('plans the close from the length, never past the class end', () => {
    expect(compute([], 15)).toMatchObject({
      openAtMs: A,
      classEndAtMs: B,
      plannedCloseAtMs: at(9, 15),
      closeAtMs: at(9, 15),
      latestCloseAtMs: at(9, 15),
      windowMinutes: 15,
      windowChosen: true,
    });
    expect(compute([], null)).toMatchObject({
      closeAtMs: B,
      windowMinutes: null,
      windowChosen: false,
    });
    expect(compute([], 150).closeAtMs).toBe(B);
  });

  it('gives the same window whatever order the changes arrive in', { timeout: 60_000 }, () => {
    fc.assert(
      fc.property(
        fc.array(changeArbitrary, { minLength: 1, maxLength: 6 }),
        plannedArbitrary,
        (changes, minutes) => {
          const first = compute(changes, minutes);
          const expected = JSON.stringify(first);
          for (const order of ordersOf(changes.length)) {
            const result = compute(
              order.map((index) => changes[index] as WindowChange),
              minutes,
            );
            if (JSON.stringify(result) !== expected) expect(result).toEqual(first);
          }
          expect(A <= first.closeAtMs).toBe(true);
          expect(first.closeAtMs <= first.latestCloseAtMs).toBe(true);
          expect(first.latestCloseAtMs <= B).toBe(true);
        },
      ),
      { numRuns: 5000 },
    );
    // Ground control: every order of three items, each once.
    expect(new Set(ordersOf(3).map((order) => order.join())).size).toBe(6);
  });

  it('applies the changes as the rule is written, on several installations', () => {
    // The rule step by step: p' per installation in sequence order, then the changes in
    // [p', installation, sequence, id] order, each formula applied in turn.
    const model = (changes: readonly WindowChange[], minutes: number | null) => {
      const closeFor = (m: number | null) => (m === null ? B : Math.min(A + m * MINUTE_MS, B));
      const pressed: [WindowChange, number][] = [];
      for (const installId of new Set(changes.map((c) => c.installId))) {
        let floor = Number.NEGATIVE_INFINITY;
        const own = changes.filter((c) => c.installId === installId);
        own.sort((a, b) => a.sequence - b.sequence || (a.id < b.id ? -1 : 1));
        for (const c of own) {
          floor = Math.max(floor, c.pressedAtHighMs);
          pressed.push([c, floor]);
        }
      }
      const key = ([c, p]: [WindowChange, number]) => [p, c.installId, c.sequence, c.id];
      pressed.sort((x, y) => {
        const [kx, ky] = [key(x), key(y)];
        const index = kx.findIndex((part, i) => part !== ky[i]);
        return index === -1 ? 0 : (kx[index] as number) < (ky[index] as number) ? -1 : 1;
      });
      let close = closeFor(minutes);
      let latest = close;
      let length = minutes;
      const effects: WindowEffect[] = [];
      for (const [c, p] of pressed) {
        const before = close;
        if (c.kind === 'WINDOW_LENGTH') {
          length = c.newWindowMinutes;
          close = Math.max(closeFor(length), Math.min(close, p));
        } else close = Math.max(A, Math.min(close, p));
        latest = Math.max(latest, close);
        effects.push({
          id: c.id,
          effectivePressedAtMs: p,
          effective: true,
          previousCloseAtMs: before,
          nextCloseAtMs: close,
        });
      }
      return { closeAtMs: close, latestCloseAtMs: latest, windowMinutes: length, effects };
    };
    fc.assert(
      fc.property(
        fc.uniqueArray(changeArbitrary, { minLength: 1, maxLength: 6, selector: (c) => c.id }),
        plannedArbitrary,
        (changes, minutes) => {
          expect(compute(changes, minutes)).toMatchObject(model(changes, minutes));
        },
      ),
      { numRuns: 5000 },
    );
  });

  it('takes the effective press per installation and orders by it', () => {
    const change = changeMaker();
    // Sequence 1 '5 minutes' pressed by 09:05:20 (an old document), sequence 2 '30
    // minutes' by 09:05:05 (a fresh one): sequence 2 counts as pressed at 09:05:20.
    const result = compute([
      change({ newWindowMinutes: 5, pressedAtHighMs: at(9, 5, 20), sequence: 1 }),
      change({ newWindowMinutes: 30, pressedAtHighMs: at(9, 5, 5), sequence: 2 }),
    ]);
    expect(result.closeAtMs).toBe(at(9, 30));
    expect(result.effects.map((effect) => effect.effectivePressedAtMs)).toEqual([
      at(9, 5, 20),
      at(9, 5, 20),
    ]);
    // Ground control: on two installations the presses stand as they are.
    const apart = compute([
      change({ newWindowMinutes: 5, pressedAtHighMs: at(9, 5, 20), sequence: 1 }),
      change({ newWindowMinutes: 30, pressedAtHighMs: at(9, 5, 5), installId: 'i2' }),
    ]);
    expect(apart.closeAtMs).toBe(at(9, 5, 20));
    // Another installation's change between two of one phone's does not lift the floor.
    const between = compute([
      change({ newWindowMinutes: 30, pressedAtHighMs: at(9, 20), sequence: 1 }),
      change({ newWindowMinutes: 45, pressedAtHighMs: at(9, 1), installId: 'i2', sequence: 2 }),
      change({ kind: 'EARLY_CLOSE', pressedAtHighMs: at(9, 10), sequence: 3 }),
    ]);
    expect(between.closeAtMs).toBe(at(9, 20));
    expect(between.effects.map((effect) => effect.effectivePressedAtMs)).toEqual([
      at(9, 1),
      at(9, 20),
      at(9, 20),
    ]);
    // Equal presses on two installations apply in installation order, not sequence order.
    const tie = compute([
      change({ kind: 'EARLY_CLOSE', pressedAtHighMs: at(9, 5), installId: 'i2', sequence: 1 }),
      change({ newWindowMinutes: 30, pressedAtHighMs: at(9, 5), installId: 'i1', sequence: 9 }),
    ]);
    expect(tie.closeAtMs).toBe(at(9, 5));
  });

  it('never closes the window before a change was pressed', () => {
    fc.assert(
      fc.property(fc.array(changeArbitrary, { maxLength: 6 }), (changes) => {
        for (const effect of compute(changes).effects) {
          if (!effect.effective) continue;
          expect(effect.nextCloseAtMs).toBeGreaterThanOrEqual(
            Math.min(effect.previousCloseAtMs, effect.effectivePressedAtMs),
          );
        }
      }),
      { numRuns: 5000 },
    );
    const change = changeMaker();
    const length = (minutes: number, hour: number, minute: number) =>
      compute([change({ newWindowMinutes: minutes, pressedAtHighMs: at(hour, minute) })]).closeAtMs;
    expect(length(5, 9, 12)).toBe(at(9, 12));
    expect(length(10, 9, 30)).toBe(at(9, 15));
    expect(length(45, 9, 30)).toBe(at(9, 45));
    // An early close pressed by 09:08:00.400 that arrives at 10:30.
    const early = compute([
      change({ kind: 'EARLY_CLOSE', pressedAtHighMs: at(9, 8, 0, 400), arrivedAtMs: at(10, 30) }),
    ]);
    expect(early).toMatchObject({ closeAtMs: at(9, 8, 0, 400), latestCloseAtMs: at(9, 15) });
    // An early close keeps the length in force.
    expect(early).toMatchObject({ windowMinutes: 15, windowChosen: true });
  });

  it('leaves out changes pressed before a move or after the press bound', () => {
    const change = changeMaker();
    const before = change({ newWindowMinutes: 45, pressedAtHighMs: at(9, 10) });
    const after = change({ newWindowMinutes: 30, pressedAtHighMs: at(9, 20) });
    const moved = compute([before, after], 15, { movedAtMs: at(9, 15) });
    expect(moved.closeAtMs).toBe(at(9, 30));
    expect(moved.effects).toEqual([
      {
        id: before.id,
        effectivePressedAtMs: at(9, 10),
        previousCloseAtMs: null,
        nextCloseAtMs: null,
        effective: false,
      },
      {
        id: after.id,
        effectivePressedAtMs: at(9, 20),
        previousCloseAtMs: at(9, 15),
        nextCloseAtMs: at(9, 30),
        effective: true,
      },
    ]);
    // A change pressed at the move instant belongs to the new schedule.
    expect(compute([before], 15, { movedAtMs: at(9, 10) }).closeAtMs).toBe(at(9, 45));
    expect(compute([before, after], 15, { pressedByMs: at(9, 19) }).closeAtMs).toBe(at(9, 45));
    expect(compute([before, after], 15, { pressedByMs: at(9, 20) }).closeAtMs).toBe(at(9, 30));
    // A left-out change shows its effective press, not its own.
    const own = changeMaker();
    const lifted = compute(
      [
        own({ newWindowMinutes: 30, pressedAtHighMs: at(9, 10), sequence: 1 }),
        own({ newWindowMinutes: 45, pressedAtHighMs: at(9, 4), sequence: 2 }),
      ],
      15,
      { movedAtMs: at(9, 12) },
    );
    expect(lifted.effects.map((effect) => [effect.effectivePressedAtMs, effect.effective])).toEqual(
      [
        [at(9, 10), false],
        [at(9, 10), false],
      ],
    );
    // The move check is on the effective press too: sequence 4 pressed by 09:10 on a
    // phone whose sequence 3 was pressed by 09:20 counts as pressed after a 09:15 move.
    const kept = compute(
      [
        own({ newWindowMinutes: 30, pressedAtHighMs: at(9, 20), sequence: 3 }),
        own({ newWindowMinutes: 45, pressedAtHighMs: at(9, 10), sequence: 4 }),
      ],
      15,
      { movedAtMs: at(9, 15) },
    );
    expect(kept.effects.map((effect) => effect.effective)).toEqual([true, true]);
    expect(kept.closeAtMs).toBe(at(9, 45));
  });

  it('knows only the changes that had arrived by the arrival bound', () => {
    const change = changeMaker();
    const sent = change({
      newWindowMinutes: 30,
      pressedAtHighMs: at(9, 20),
      arrivedAtMs: at(10, 0),
    });
    const known = (arrivedByMs: number) => compute([sent], 15, { arrivedByMs });
    expect(known(at(9, 59)).closeAtMs).toBe(at(9, 15));
    expect(known(at(10, 0)).closeAtMs).toBe(at(9, 30));
    // A change not yet known is not listed and does not lift a later one's press.
    const late = change({
      kind: 'EARLY_CLOSE',
      pressedAtHighMs: at(9, 6),
      arrivedAtMs: at(10, 30),
      sequence: 1,
    });
    const chosen = change({
      newWindowMinutes: 10,
      pressedAtHighMs: at(9, 4),
      arrivedAtMs: at(9, 4, 30),
      sequence: 2,
    });
    const thenKnown = compute([late, chosen], null, {
      pressedByMs: at(9, 5),
      arrivedByMs: at(9, 6),
    });
    expect(thenKnown.effects.map((effect) => effect.id)).toEqual([chosen.id]);
    expect(thenKnown.windowChosen).toBe(true);
    // Ground control: once the early close had arrived, it lifts the choice past 09:05.
    const later = compute([late, chosen], null, { pressedByMs: at(9, 5), arrivedByMs: at(10, 30) });
    expect(later.windowChosen).toBe(false);
  });

  it('tells whether a length was chosen when the record was made', () => {
    const change = changeMaker();
    const chosenAt = (
      changes: WindowChange[],
      minutes: number | null,
      highMs: number,
      arrivedMs: number,
    ) => compute(changes, minutes, { pressedByMs: highMs, arrivedByMs: arrivedMs }).windowChosen;
    // No length on the course; 10 minutes chosen at 09:30; a 09:05 record arriving at 10:00.
    const chosen = change({
      newWindowMinutes: 10,
      pressedAtHighMs: at(9, 30),
      arrivedAtMs: at(9, 30),
    });
    expect(chosenAt([chosen], null, at(9, 5), at(10, 0))).toBe(false);
    expect(windowPlacement({ lowMs: at(9, 5), highMs: at(9, 5) }, compute([chosen], null))).toBe(
      'INSIDE',
    );
    // 15 minutes on the course; the length removed at 09:10: the 09:05 record had one.
    const removed = change({
      newWindowMinutes: null,
      pressedAtHighMs: at(9, 10),
      arrivedAtMs: at(9, 10),
    });
    expect(chosenAt([removed], 15, at(9, 5), at(9, 6))).toBe(true);
    // A choice pressed at 09:02 that arrived at 10:30 does not count for a 09:05 record
    // that arrived at 09:06; the same call again gives the same answer.
    const late = change({
      newWindowMinutes: 10,
      pressedAtHighMs: at(9, 2),
      arrivedAtMs: at(10, 30),
    });
    expect(chosenAt([late], null, at(9, 5), at(9, 6))).toBe(false);
    expect(chosenAt([late], null, at(9, 5), at(9, 6))).toBe(false);
    // The press bound is on the effective press: sequence 2 pressed by 09:04 on a phone
    // whose sequence 1 was pressed by 09:06 counts as pressed at 09:06.
    const first = change({ newWindowMinutes: 10, pressedAtHighMs: at(9, 6), sequence: 1 });
    const second = change({ newWindowMinutes: 20, pressedAtHighMs: at(9, 4), sequence: 2 });
    expect(chosenAt([first, second], null, at(9, 5), at(10, 0))).toBe(false);
    expect(chosenAt([first, second], null, at(9, 6), at(10, 0))).toBe(true);
    // Ground control: once it had arrived, it counts.
    expect(chosenAt([late], null, at(9, 5), at(10, 30))).toBe(true);
  });

  it('refuses input outside its form', () => {
    const change = changeMaker();
    const ok = change({ newWindowMinutes: 30 });
    const bad: [WindowChange[], number | null, Partial<WindowInput>][] = [
      [[ok, { ...ok, newWindowMinutes: 45 }], 15, {}],
      [[{ ...ok, pressedAtHighMs: Number.NaN }], 15, {}],
      [[{ ...ok, arrivedAtMs: 1.5 }], 15, {}],
      [[{ ...ok, sequence: 1.5 }], 15, {}],
      [[{ ...ok, newWindowMinutes: 0 }], 15, {}],
      [[{ ...ok, newWindowMinutes: -5 }], 15, {}],
      [[{ ...ok, newWindowMinutes: 1.5 }], 15, {}],
      [[ok], 0, {}],
      [[ok], 15, { classEndAtMs: A - 1 }],
      [[ok], 15, { movedAtMs: Number.NaN }],
      [[ok], 15, { pressedByMs: 0.5 }],
      [[ok], 15, { arrivedByMs: Number.POSITIVE_INFINITY }],
    ];
    for (const [changes, minutes, extra] of bad) {
      expect(() => compute(changes, minutes, extra), JSON.stringify(extra)).toThrow(RangeError);
    }
    // Ground control: an early close carries no length, and the valid change passes.
    const early = change({ kind: 'EARLY_CLOSE', newWindowMinutes: null });
    expect(compute([ok, early]).effects).toHaveLength(2);
  });

  it('reads a change id and an installation in either case as one', () => {
    const change = changeMaker();
    const lower = change({ id: 'c-a', newWindowMinutes: 30 });
    expect(() => compute([lower, { ...lower, id: 'C-A' }])).toThrow(RangeError);
    expect(() => compute([{ ...lower, id: 'C-A' }, lower])).toThrow(RangeError);
    // One installation spelled two ways keeps one floor: its second press, made earlier,
    // still takes the first one's instant.
    const close = { kind: 'EARLY_CLOSE', newWindowMinutes: null } as const;
    const first = change({ ...close, installId: 'i1', sequence: 1, pressedAtHighMs: at(9, 20) });
    const second = change({ ...close, installId: 'I1', sequence: 2, pressedAtHighMs: at(9, 10) });
    const mixed = compute([first, second]);
    expect(mixed.effects.map((effect) => effect.effectivePressedAtMs)).toEqual([
      at(9, 20),
      at(9, 20),
    ]);
    // The planned close (09:15) is earlier than both presses.
    expect(mixed.closeAtMs).toBe(at(9, 15));
    // The same with the upper case spelling first.
    const swapped = compute([
      { ...first, installId: 'I1' },
      { ...second, installId: 'i1' },
    ]);
    expect(swapped.effects.map((effect) => effect.effectivePressedAtMs)).toEqual([
      at(9, 20),
      at(9, 20),
    ]);
    // Same installation and sequence: the smaller id in lower case comes first, whatever
    // the list order, so 'c-a' keeps its own earlier press.
    const tie = [
      change({ ...close, id: 'c-a', installId: 'i9', sequence: 1, pressedAtHighMs: at(9, 10) }),
      change({ ...close, id: 'C-B', installId: 'i9', sequence: 1, pressedAtHighMs: at(9, 20) }),
    ];
    for (const order of [tie, [...tie].reverse()]) {
      const effect = compute(order).effects.find((entry) => entry.id === 'c-a');
      expect(effect?.effectivePressedAtMs).toBe(at(9, 10));
    }
    // Ground control: two installations take a press each.
    const apart = compute([first, { ...second, installId: 'i2' }]);
    expect(apart.effects.map((effect) => effect.effectivePressedAtMs)).toEqual([
      at(9, 10),
      at(9, 20),
    ]);
    expect(apart.closeAtMs).toBe(at(9, 10));
  });
});

describe('window status', () => {
  it('is open from the opening up to the close, counting down to it', () => {
    const bounds = { openAtMs: A, closeAtMs: at(9, 15) };
    expect(windowStatus(A - 1, bounds)).toEqual({ open: false, remainingMs: 15 * MINUTE_MS + 1 });
    expect(windowStatus(A, bounds)).toEqual({ open: true, remainingMs: 15 * MINUTE_MS });
    expect(windowStatus(at(9, 15) - 1, bounds)).toEqual({ open: true, remainingMs: 1 });
    expect(windowStatus(at(9, 15), bounds)).toEqual({ open: false, remainingMs: 0 });
    expect(windowStatus(at(9, 20), bounds)).toEqual({ open: false, remainingMs: 0 });
  });

  it('takes a computed window as it is', () => {
    const window: ComputedWindow = compute([]);
    expect(windowStatus(at(9, 14), window)).toEqual({ open: true, remainingMs: MINUTE_MS });
  });
});
