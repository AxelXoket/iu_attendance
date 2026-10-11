import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type CourseSlot,
  halfOpenOverlap,
  joinSchedulePlan,
  type ScheduleSlot,
  scheduleConflicts,
  slotsOverlap,
  type TermDays,
} from './conflict.ts';

const term: TermDays = { classesStart: '2026-09-21', classesEnd: '2026-10-18' };
// Ten days on either side of the term too, so validity bounds can lie outside it and an
// open bound (the term's day) can matter. The brute-force oracle walks all of them.
const termDays = Array.from({ length: 48 }, (_, i) =>
  new Date(Date.UTC(2026, 8, 11 + i)).toISOString().slice(0, 10),
);
const pad = (value: number) => String(value).padStart(2, '0');
const at = (minute: number) => `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;

describe('half-open intervals', () => {
  it('intersect exactly when they share a point, never when they only touch', () => {
    const interval = fc
      .tuple(fc.integer({ min: 0, max: 40 }), fc.integer({ min: 1, max: 10 }))
      .map(([start, length]) => [start, start + length] as const);
    let touching = 0;
    fc.assert(
      fc.property(interval, interval, ([a, b], [c, d]) => {
        let shared = false;
        for (let x = 0; x <= 50; x += 1) if (a <= x && x < b && c <= x && x < d) shared = true;
        expect(halfOpenOverlap(a, b, c, d)).toBe(shared);
        expect(halfOpenOverlap(c, d, a, b)).toBe(shared);
        if (b === c || d === a) {
          touching += 1;
          if (b === c) expect(halfOpenOverlap(a, b, c, d)).toBe(false);
        }
      }),
      { numRuns: 500 },
    );
    expect(touching).toBeGreaterThan(10);
  });

  it('refuses an empty interval', () => {
    expect(() => halfOpenOverlap(5, 5, 1, 9)).toThrow(RangeError);
    expect(() => halfOpenOverlap(1, 9, 6, 2)).toThrow(RangeError);
  });
});

// Slots on a small grid, so overlaps are common: 3 weekdays, half hours from 08:00 to 13:00,
// validity bounds anywhere in the window or open. When both bounds are set the first is not
// after the last (the table's CHECK); an open bound can still leave the range empty, as a
// first day after the term's last day does.
const slotArb: fc.Arbitrary<ScheduleSlot> = fc
  .record({
    weekday: fc.integer({ min: 1, max: 3 }),
    start: fc.integer({ min: 0, max: 8 }),
    length: fc.integer({ min: 1, max: 4 }),
    from: fc.option(fc.integer({ min: 0, max: 47 }), { nil: null }),
    to: fc.option(fc.integer({ min: 0, max: 47 }), { nil: null }),
  })
  .map(({ weekday, start, length, from, to }) => ({
    weekday,
    start: at(480 + start * 30),
    end: at(480 + (start + length) * 30),
    validFrom: from === null ? null : (termDays[from] as string),
    validTo: to === null ? null : (termDays[Math.max(to, from ?? 0)] as string),
  }));

// The definition, point by point: same weekday, a shared minute and a shared valid day.
const oracleOverlap = (x: ScheduleSlot, y: ScheduleSlot) => {
  if (x.weekday !== y.weekday) return false;
  const toMinute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  let minute = false;
  for (let m = 0; m < 1440; m += 1) {
    if (
      toMinute(x.start) <= m &&
      m < toMinute(x.end) &&
      toMinute(y.start) <= m &&
      m < toMinute(y.end)
    ) {
      minute = true;
    }
  }
  const valid = (s: ScheduleSlot, day: string) =>
    (s.validFrom ?? term.classesStart) <= day && day <= (s.validTo ?? term.classesEnd);
  return minute && termDays.some((day) => valid(x, day) && valid(y, day));
};

describe('schedule slot overlap', () => {
  it('overlaps exactly on the same weekday with shared minutes and shared valid days, both ways', () => {
    let overlaps = 0;
    fc.assert(
      fc.property(slotArb, slotArb, (x, y) => {
        const expected = oracleOverlap(x, y);
        if (expected) overlaps += 1;
        expect(slotsOverlap(x, y, term)).toBe(expected);
        expect(slotsOverlap(y, x, term)).toBe(expected);
      }),
      { numRuns: 1000 },
    );
    // Ground control: about 70 of the 1000 pairs overlap.
    expect(overlaps).toBeGreaterThan(30);
  });

  it('lets two slots share a weekday and hour when their validity does not meet', () => {
    const first: ScheduleSlot = {
      weekday: 1,
      start: '09:00',
      end: '11:00',
      validFrom: null,
      validTo: '2026-10-04',
    };
    const second: ScheduleSlot = { ...first, validFrom: '2026-10-05', validTo: null };
    expect(slotsOverlap(first, second, term)).toBe(false);
    expect(slotsOverlap(first, { ...second, validFrom: '2026-10-04' }, term)).toBe(true);
    // Touching times do not overlap.
    expect(slotsOverlap(first, { ...first, start: '11:00', end: '12:00' }, term)).toBe(false);
  });

  it('does not let an empty validity range reach across another range', () => {
    // First day after the term's last day, last day open: empty, yet its ends straddle y.
    const empty: ScheduleSlot = {
      weekday: 1,
      start: '09:00',
      end: '10:00',
      validFrom: '2026-10-20',
      validTo: null,
    };
    const wide: ScheduleSlot = { ...empty, validFrom: null, validTo: '2026-12-31' };
    expect(slotsOverlap(empty, wide, term)).toBe(false);
    expect(slotsOverlap(wide, empty, term)).toBe(false);
    // Open bounds are the term's days, not the start or end of time.
    const before: ScheduleSlot = { ...empty, validFrom: '2026-09-01', validTo: '2026-09-15' };
    const open: ScheduleSlot = { ...empty, validFrom: null, validTo: null };
    expect(slotsOverlap(open, before, term)).toBe(false);
    const after: ScheduleSlot = { ...empty, validFrom: '2026-11-01', validTo: '2026-11-15' };
    expect(slotsOverlap(open, after, term)).toBe(false);
    expect(slotsOverlap(after, open, term)).toBe(false);
  });

  it('refuses a slot with its times reversed even on another weekday', () => {
    const slot: ScheduleSlot = {
      weekday: 1,
      start: '09:00',
      end: '10:00',
      validFrom: null,
      validTo: null,
    };
    const reversed = { ...slot, start: '10:00', end: '09:00' };
    expect(() => slotsOverlap(reversed, { ...slot, weekday: 2 }, term)).toThrow(RangeError);
    expect(() => slotsOverlap({ ...slot, weekday: 2 }, reversed, term)).toThrow(RangeError);
  });

  it('treats a validity range left empty by the term bound as never valid', () => {
    const late: ScheduleSlot = {
      weekday: 1,
      start: '09:00',
      end: '10:00',
      validFrom: '2026-12-01',
      validTo: null,
    };
    const always: ScheduleSlot = {
      weekday: 1,
      start: '09:00',
      end: '10:00',
      validFrom: null,
      validTo: null,
    };
    expect(slotsOverlap(late, always, term)).toBe(false);
    expect(slotsOverlap(always, late, term)).toBe(false);
  });

  it.each<[string, Partial<ScheduleSlot>]>([
    ['weekday 0', { weekday: 0 }],
    ['weekday 8', { weekday: 8 }],
    ['an end before the start', { start: '10:00', end: '09:00' }],
    ['equal times', { start: '10:00', end: '10:00' }],
    ['a time without a leading zero', { start: '9:00' }],
    ['a validity day that is not a day', { validFrom: '2026-9-21' }],
  ])('refuses a slot with %s', (_name, change) => {
    const slot: ScheduleSlot = {
      weekday: 1,
      start: '09:00',
      end: '10:00',
      validFrom: null,
      validTo: null,
    };
    expect(() => slotsOverlap({ ...slot, ...change }, slot, term)).toThrow(RangeError);
    expect(() => slotsOverlap(slot, { ...slot, ...change }, term)).toThrow(RangeError);
  });

  it('refuses term days it cannot read', () => {
    const slot: ScheduleSlot = {
      weekday: 1,
      start: '09:00',
      end: '10:00',
      validFrom: null,
      validTo: null,
    };
    expect(() =>
      slotsOverlap(slot, slot, { classesStart: '2026-09-21', classesEnd: '18.10.2026' }),
    ).toThrow(RangeError);
  });
});

const sectionsArb = fc.uniqueArray(fc.constantFrom('s1', 's2', 's3'), {
  minLength: 1,
  maxLength: 2,
});
const scheduleArb = fc
  .array(fc.record({ slot: slotArb, sections: sectionsArb }), { maxLength: 8 })
  .map((list) => list.map((entry, index): CourseSlot => ({ id: `p${index}`, ...entry })));

describe('schedule check and joining a new section', () => {
  it('refuses exactly the overlapping pairs that share a section', () => {
    let refused = 0;
    let parallelAllowed = 0;
    fc.assert(
      fc.property(scheduleArb, (slots) => {
        const conflicts = scheduleConflicts(slots, term);
        const expected: [string, string][] = [];
        slots.forEach((x, i) => {
          slots.forEach((y, j) => {
            if (j <= i || !oracleOverlap(x.slot, y.slot)) return;
            if (x.sections.some((s) => y.sections.includes(s))) expected.push([x.id, y.id]);
            else parallelAllowed += 1;
          });
        });
        refused += expected.length;
        expect(conflicts).toEqual(expected);
      }),
      { numRuns: 1000 },
    );
    expect(refused).toBeGreaterThan(100);
    expect(parallelAllowed).toBeGreaterThan(100);
  });

  it('never puts a joining section into an overlapping pair', () => {
    let skippedSome = 0;
    fc.assert(
      fc.property(scheduleArb, (slots) => {
        // Start from a schedule that passes the check.
        const valid = slots.filter(
          (x) => !scheduleConflicts(slots, term).some((pair) => pair.includes(x.id)),
        );
        expect(scheduleConflicts(valid, term)).toEqual([]);
        const plan = joinSchedulePlan(valid, term);
        expect([...plan.joined, ...plan.skipped].sort()).toEqual(valid.map((x) => x.id).sort());
        const after = valid.map((x) =>
          plan.joined.includes(x.id) ? { ...x, sections: [...x.sections, 'new'] } : x,
        );
        expect(scheduleConflicts(after, term)).toEqual([]);
        if (plan.skipped.length > 0) skippedSome += 1;
        // A slot is skipped only when it overlaps another slot.
        for (const id of plan.skipped) {
          const x = valid.find((s) => s.id === id) as CourseSlot;
          expect(valid.some((y) => y !== x && oracleOverlap(x.slot, y.slot))).toBe(true);
        }
      }),
      { numRuns: 1000 },
    );
    expect(skippedSome).toBeGreaterThan(50);
  });

  it('joins the theory slot and skips two parallel labs, and joins every slot without parallels', () => {
    const theory: CourseSlot = {
      id: 'theory',
      slot: { weekday: 1, start: '09:00', end: '11:00', validFrom: null, validTo: null },
      sections: ['s1', 's2'],
    };
    const labA: CourseSlot = {
      id: 'lab-a',
      slot: { weekday: 3, start: '13:00', end: '15:00', validFrom: null, validTo: null },
      sections: ['s1'],
    };
    const labB: CourseSlot = { ...labA, id: 'lab-b', sections: ['s2'] };
    expect(scheduleConflicts([theory, labA, labB], term)).toEqual([]);
    expect(joinSchedulePlan([theory, labA, labB], term)).toEqual({
      joined: ['theory'],
      skipped: ['lab-a', 'lab-b'],
    });
    // Control: without parallel slots the section joins every slot.
    expect(joinSchedulePlan([theory, labA], term)).toEqual({
      joined: ['theory', 'lab-a'],
      skipped: [],
    });
  });
});
