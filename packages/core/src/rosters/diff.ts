// Roster diff (D03-B03, B04, B12, B15, B24, B25, B28, A04): what applying one file to one
// section changes. The server reads the rows in one snapshot, calls rosterDiff for the
// preview, and again under its locks before writing the result in one transaction. No
// row is ever deleted: a student missing from the file becomes inactive, and one who
// comes back reactivates the same row with its original start.

import { trimmedInactiveAtMs } from './interval.ts';
import { namesMatch } from './name.ts';

/** The source of every row an upload writes. */
export const UPLOAD_SOURCE = 'FILE';

export type RosterRow = {
  readonly rowId: string;
  readonly sectionId: string;
  readonly studentNumber: string;
  readonly fullName: string;
  readonly order: number;
  readonly source: string;
  readonly addedAtMs: number;
  /** null while the row is active. */
  readonly inactiveAtMs: number | null;
};

/** A valid file row that matches the section; findings and other sections are already left out. */
export type FileEntry = {
  readonly fileRowNumber: number;
  readonly studentNumber: string;
  readonly fullName: string;
};

export type DiffInput = {
  readonly sectionId: string;
  /** The section's rows and the course's other rows of the file's numbers; no anonymised row. */
  readonly courseRows: readonly RosterRow[];
  /** In file order: an entry's order is its position, from 1. */
  readonly entries: readonly FileEntry[];
  /** The apply instant: new rows start here and moved students leave their old row here. */
  readonly nowMs: number;
  /** Start of the section's first held session, or null when none was held (D03-B12). */
  readonly firstHeldAtMs: number | null;
};

type Placement = {
  readonly fileRowNumber: number;
  readonly studentNumber: string;
  readonly fullName: string;
  readonly order: number;
};

export type RosterDiff = {
  /** Numbers without a row in this section and not active elsewhere in the course. */
  readonly toAdd: readonly (Placement & { readonly lateAdded: boolean })[];
  /** This section's inactive rows whose number is back and not active elsewhere. */
  readonly toReactivate: readonly (Placement & { readonly rowId: string })[];
  /** Students active in another section of the course; targetRowId is this section's inactive row, if any. */
  readonly sectionChanges: readonly (Placement & {
    readonly oldRowId: string;
    readonly oldSectionId: string;
    readonly targetRowId: string | null;
  })[];
  /** This section's active rows whose number is not in the file. */
  readonly toDeactivate: readonly { readonly rowId: string; readonly source: string }[];
  /**
   * Inactive spans a reactivation overlaps, in any section of the course; inactiveAtMs is
   * the end before the cut (for the row a moving student leaves: the apply instant).
   */
  readonly toTrim: readonly {
    readonly rowId: string;
    readonly sectionId: string;
    readonly inactiveAtMs: number;
    readonly newInactiveAtMs: number;
  }[];
  /**
   * Kept rows (staying, reactivated or reused by a move) whose name really differs
   * (namesMatch false): a change of its own, reported even when the row also comes back.
   */
  readonly nameChanges: readonly {
    readonly rowId: string;
    readonly fileRowNumber: number;
    readonly oldName: string;
    readonly newName: string;
  }[];
  /** Kept rows whose name matches but is written differently: the shown name follows the file. */
  readonly spellingFixes: readonly { readonly rowId: string; readonly newName: string }[];
  readonly orderChanges: readonly { readonly rowId: string; readonly order: number }[];
  /** Staying rows that were added by hand or by the system: the upload makes them file rows. */
  readonly sourceChanges: readonly { readonly rowId: string }[];
  /** Staying rows whose name and order stay (the source may still turn to FILE). */
  readonly unchanged: number;
};

function rowsByNumber(input: DiffInput): Map<string, RosterRow[]> {
  const byNumber = new Map<string, RosterRow[]>();
  for (const row of input.courseRows) {
    const rows = byNumber.get(row.studentNumber) ?? [];
    if (rows.some((other) => other.sectionId === row.sectionId)) {
      throw new RangeError('rosterDiff expects at most one row per section and number');
    }
    if (row.inactiveAtMs === null && rows.some((other) => other.inactiveAtMs === null)) {
      throw new RangeError('rosterDiff expects at most one active row per number in the course');
    }
    rows.push(row);
    byNumber.set(row.studentNumber, rows);
  }
  return byNumber;
}

/** Computes the changes that make the section's active rows equal the file's entries. */
export function rosterDiff(input: DiffInput): RosterDiff {
  const { sectionId, entries, nowMs, firstHeldAtMs } = input;
  const byNumber = rowsByNumber(input);
  const fileNumbers = new Set(entries.map((entry) => entry.studentNumber));
  if (fileNumbers.size !== entries.length) {
    throw new RangeError('rosterDiff expects each number once in the entries');
  }

  const diff = {
    toAdd: [] as (Placement & { lateAdded: boolean })[],
    toReactivate: [] as (Placement & { rowId: string })[],
    sectionChanges: [] as RosterDiff['sectionChanges'][number][],
    toDeactivate: [] as RosterDiff['toDeactivate'][number][],
    toTrim: [] as RosterDiff['toTrim'][number][],
    nameChanges: [] as RosterDiff['nameChanges'][number][],
    spellingFixes: [] as RosterDiff['spellingFixes'][number][],
    orderChanges: [] as RosterDiff['orderChanges'][number][],
    sourceChanges: [] as RosterDiff['sourceChanges'][number][],
    unchanged: 0,
  };

  // A reactivated row keeps its start, so its span runs back over time when the student
  // may have been elsewhere: every other row of the number that overlaps is cut (A04).
  type EndedSpan = { rowId: string; sectionId: string; addedAtMs: number; inactiveAtMs: number };
  const trimAround = (reactivated: RosterRow, spans: readonly EndedSpan[]) => {
    for (const span of spans) {
      const newInactiveAtMs = trimmedInactiveAtMs(span, reactivated.addedAtMs);
      if (newInactiveAtMs !== null) {
        const { rowId, sectionId: spanSectionId, inactiveAtMs } = span;
        diff.toTrim.push({ rowId, sectionId: spanSectionId, inactiveAtMs, newInactiveAtMs });
      }
    }
  };
  // The number's other ended spans; the row a moving student leaves is added with its
  // end at nowMs.
  const endedSpans = (rows: readonly RosterRow[], reactivated: RosterRow): EndedSpan[] =>
    rows.flatMap((row) =>
      row === reactivated || row.inactiveAtMs === null
        ? []
        : [
            {
              rowId: row.rowId,
              sectionId: row.sectionId,
              addedAtMs: row.addedAtMs,
              inactiveAtMs: row.inactiveAtMs,
            },
          ],
    );
  // A kept row's name against the file: a real change is reported on its own, a spelling
  // fix only makes the shown name follow the file (D03-B25). True when the text is equal.
  const compareName = (row: RosterRow, entry: FileEntry) => {
    if (row.fullName === entry.fullName) return true;
    if (namesMatch(row.fullName, entry.fullName)) {
      diff.spellingFixes.push({ rowId: row.rowId, newName: entry.fullName });
    } else {
      diff.nameChanges.push({
        rowId: row.rowId,
        fileRowNumber: entry.fileRowNumber,
        oldName: row.fullName,
        newName: entry.fullName,
      });
    }
    return false;
  };

  entries.forEach((entry, index) => {
    const placement = { ...entry, order: index + 1 };
    const rows = byNumber.get(entry.studentNumber) ?? [];
    const here = rows.find((row) => row.sectionId === sectionId);
    const activeElsewhere = rows.find(
      (row) => row.inactiveAtMs === null && row.sectionId !== sectionId,
    );

    if (here !== undefined && here.inactiveAtMs === null) {
      const sameName = compareName(here, entry);
      if (here.order !== placement.order)
        diff.orderChanges.push({ rowId: here.rowId, order: placement.order });
      if (here.source !== UPLOAD_SOURCE) diff.sourceChanges.push({ rowId: here.rowId });
      // The preview has no source count, so a row whose only change is its source shows
      // as unchanged; sourceChanges still carries the write.
      if (sameName && here.order === placement.order) diff.unchanged += 1;
    } else if (activeElsewhere !== undefined) {
      diff.sectionChanges.push({
        ...placement,
        oldRowId: activeElsewhere.rowId,
        oldSectionId: activeElsewhere.sectionId,
        targetRowId: here?.rowId ?? null,
      });
      if (here !== undefined) {
        compareName(here, entry);
        const leaving = {
          rowId: activeElsewhere.rowId,
          sectionId: activeElsewhere.sectionId,
          addedAtMs: activeElsewhere.addedAtMs,
          inactiveAtMs: nowMs,
        };
        trimAround(here, [...endedSpans(rows, here), leaving]);
      }
    } else if (here !== undefined) {
      diff.toReactivate.push({ ...placement, rowId: here.rowId });
      compareName(here, entry);
      trimAround(here, endedSpans(rows, here));
    } else {
      // Late only for a number new to the course, added after its first held session.
      const lateAdded = rows.length === 0 && firstHeldAtMs !== null && nowMs > firstHeldAtMs;
      diff.toAdd.push({ ...placement, lateAdded });
    }
  });

  for (const rows of byNumber.values()) {
    for (const row of rows) {
      if (
        row.sectionId === sectionId &&
        row.inactiveAtMs === null &&
        !fileNumbers.has(row.studentNumber)
      ) {
        diff.toDeactivate.push({ rowId: row.rowId, source: row.source });
      }
    }
  }
  return diff;
}

/** True when the diff changes nothing: applying the same file again. */
export function isEmptyDiff(diff: RosterDiff): boolean {
  return (
    diff.toAdd.length === 0 &&
    diff.toReactivate.length === 0 &&
    diff.sectionChanges.length === 0 &&
    diff.toDeactivate.length === 0 &&
    diff.toTrim.length === 0 &&
    diff.nameChanges.length === 0 &&
    diff.spellingFixes.length === 0 &&
    diff.orderChanges.length === 0 &&
    diff.sourceChanges.length === 0
  );
}
