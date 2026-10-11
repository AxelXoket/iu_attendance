// Conflict rules of the courses module (D02): half-open intervals, the overlap of weekly
// schedule slots, the schedule check and the plan for a new section that joins the
// schedule (programaKat). Pure and import-free. Times are Istanbul HH:MM; days are
// YYYY-MM-DD and compare as text.

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Half-open intervals [a, b) and [c, d) intersect exactly when a < d and c < b, so touching
 * intervals (b = c) do not. Throws RangeError for an empty interval (a >= b or c >= d).
 */
export function halfOpenOverlap(a: number, b: number, c: number, d: number): boolean {
  if (!(a < b) || !(c < d)) throw new RangeError('halfOpenOverlap expects non-empty intervals');
  return a < d && c < b;
}

/** A weekly schedule slot (program_saatleri). */
export type ScheduleSlot = {
  /** ISO weekday: 1 Monday to 7 Sunday. */
  readonly weekday: number;
  /** HH:MM, before end. */
  readonly start: string;
  /** HH:MM, on the same day. */
  readonly end: string;
  /** First valid day; null means the term's first day of classes. */
  readonly validFrom: string | null;
  /** Last valid day (included); null means the term's last day of classes. */
  readonly validTo: string | null;
};

/** The term's days of classes, both included. */
export type TermDays = { readonly classesStart: string; readonly classesEnd: string };

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

function checkSlot(slot: ScheduleSlot): void {
  if (!Number.isInteger(slot.weekday) || slot.weekday < 1 || slot.weekday > 7) {
    throw new RangeError('a schedule slot needs a weekday from 1 to 7');
  }
  if (!TIME.test(slot.start) || !TIME.test(slot.end) || !(slot.start < slot.end)) {
    throw new RangeError('a schedule slot needs HH:MM times with start before end');
  }
  for (const day of [slot.validFrom, slot.validTo]) {
    if (day !== null && !DATE.test(day)) throw new RangeError('a validity day must be YYYY-MM-DD');
  }
}

/**
 * Two slots overlap exactly when they are on the same weekday, their [start, end) times
 * intersect and their validity ranges intersect, an empty bound standing for the term's first
 * or last day of classes. A validity range that is empty after that intersects nothing.
 */
export function slotsOverlap(x: ScheduleSlot, y: ScheduleSlot, term: TermDays): boolean {
  checkSlot(x);
  checkSlot(y);
  if (!DATE.test(term.classesStart) || !DATE.test(term.classesEnd)) {
    throw new RangeError('the term days must be YYYY-MM-DD');
  }
  if (x.weekday !== y.weekday) return false;
  if (!halfOpenOverlap(minutes(x.start), minutes(x.end), minutes(y.start), minutes(y.end))) {
    return false;
  }
  const xFrom = x.validFrom ?? term.classesStart;
  const xTo = x.validTo ?? term.classesEnd;
  const yFrom = y.validFrom ?? term.classesStart;
  const yTo = y.validTo ?? term.classesEnd;
  return xFrom <= xTo && yFrom <= yTo && xFrom <= yTo && yFrom <= xTo;
}

/** A course's slot with the sections it serves. */
export type CourseSlot = {
  readonly id: string;
  readonly slot: ScheduleSlot;
  readonly sections: readonly string[];
};

/**
 * The pairs of slots the schedule check refuses: they overlap and serve a common section.
 * Overlapping slots of different sections (parallel labs) and shared sections at different
 * times are both fine.
 */
export function scheduleConflicts(
  slots: readonly CourseSlot[],
  term: TermDays,
): readonly (readonly [string, string])[] {
  const conflicts: (readonly [string, string])[] = [];
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const x = slots[i] as CourseSlot;
      const y = slots[j] as CourseSlot;
      if (!slotsOverlap(x.slot, y.slot, term)) continue;
      if (x.sections.some((section) => y.sections.includes(section))) conflicts.push([x.id, y.id]);
    }
  }
  return conflicts;
}

/**
 * Where a new section goes when it joins the schedule (programaKat): every slot except the
 * parallel ones, a slot that overlaps another slot of the course (two labs at the same time
 * for different sections). A parallel slot is skipped and listed, so the new section never
 * sits in two overlapping slots; the course coordinator places it there by hand.
 */
export function joinSchedulePlan(
  slots: readonly CourseSlot[],
  term: TermDays,
): { readonly joined: readonly string[]; readonly skipped: readonly string[] } {
  const joined: string[] = [];
  const skipped: string[] = [];
  for (const x of slots) {
    const parallel = slots.some((y) => y !== x && slotsOverlap(x.slot, y.slot, term));
    (parallel ? skipped : joined).push(x.id);
  }
  return { joined, skipped };
}
