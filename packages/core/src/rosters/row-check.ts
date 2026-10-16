// Roster file row check (D03): the findings of every row and the entries the diff takes.
// The panel runs it to show the findings before the preview, and the server runs it
// again on the same rows, so both see the same result. A file with an ERROR cannot be
// applied; a WARNING needs the lecturer's confirmation; INFO is only shown.

import { nonEmpty } from '../shared/list.ts';
import { hasControlCharacter } from '../shared/text.ts';
import type { FileEntry } from './diff.ts';
import { namesMatch, rosterName } from './name.ts';
import { isShortNumberCell, parseStudentNumber, STUDENT_NUMBER_MIN_LENGTH } from './number.ts';
import { sectionsMatch } from './section.ts';

export const FINDING_LEVELS = ['ERROR', 'WARNING', 'INFO'] as const;
export type FindingLevel = (typeof FINDING_LEVELS)[number];

/** Every finding code with its level. */
export const FINDING_LEVEL_OF = {
  // Not 9 or 10 ASCII digits once the white space and the ="..." wrapper are off.
  NUMBER_FORMAT: 'ERROR',
  // An Excel number cell shorter than 9 digits: its leading zeros were lost.
  NUMBER_SHORT_NUMERIC_CELL: 'ERROR',
  // In a file without cell types (CSV, HTML), the rarer of 9 and 10 digit numbers (9 on
  // a tie).
  MIXED_LENGTH: 'WARNING',
  // A number seen again with a matching name: the first row counts.
  NUMBER_REPEATED_SAME_NAME: 'WARNING',
  NUMBER_REPEATED_OTHER_NAME: 'ERROR',
  NAME_EMPTY: 'ERROR',
  NAME_TOO_LONG: 'ERROR',
  NAME_CONTROL_CHARACTER: 'ERROR',
  // The row's section label is another section's, or it has none in a file with a
  // section column: it stays out of the diff.
  SECTION_MISMATCH: 'WARNING',
  // The file has a section column and no row matches: on the first row.
  NO_SECTION_ROWS: 'ERROR',
  // An Excel number cell of 9 digits may be a 10 digit number that lost its zero.
  NUMERIC_CELL_9_DIGITS: 'WARNING',
  // An Excel number cell of 10 digits lost nothing; shown only.
  NUMERIC_CELL_10_DIGITS: 'INFO',
} as const satisfies Record<string, FindingLevel>;

export type FindingCode = keyof typeof FINDING_LEVEL_OF;
export const FINDING_CODES = nonEmpty(Object.keys(FINDING_LEVEL_OF) as FindingCode[]);

/** The longest roster name, in code points, as rosterName gives it. */
export const ROSTER_NAME_MAX_LENGTH = 200;

/** A row as the panel read it from the file. */
export type FileRow = {
  readonly fileRowNumber: number;
  readonly studentNumber: string;
  readonly fullName: string;
  /** null when the file has no section column. */
  readonly sectionLabel: string | null;
  /** The cell was an Excel number, not text. */
  readonly numberCell: boolean;
};

export type RowFinding = {
  readonly fileRowNumber: number;
  readonly code: FindingCode;
  readonly level: FindingLevel;
};

export type RowCheck = {
  /** In file order, a row's findings together. */
  readonly findings: readonly RowFinding[];
  /**
   * The rows the diff takes, in file order: no ERROR, the chosen section's, each number
   * once; the number parsed and the name as rosterName gives it.
   */
  readonly entries: readonly FileEntry[];
  /** Rows of another section, left out of the diff. */
  readonly leftOut: number;
};

type Checked = {
  readonly number: string | null;
  readonly name: string;
  readonly codes: FindingCode[];
  /** A later row of a number already seen. */
  repeated: boolean;
};

function numberCodes(cell: string, number: string | null, numberCell: boolean): FindingCode[] {
  if (!numberCell) return number === null ? ['NUMBER_FORMAT'] : [];
  if (number === null) {
    return isShortNumberCell(cell) ? ['NUMBER_SHORT_NUMERIC_CELL'] : ['NUMBER_FORMAT'];
  }
  return [
    number.length === STUDENT_NUMBER_MIN_LENGTH
      ? 'NUMERIC_CELL_9_DIGITS'
      : 'NUMERIC_CELL_10_DIGITS',
  ];
}

/**
 * The name findings of a roster name, each on its own (D03 isimDenetle): checked on the
 * name as rosterName gives it, so a line break or tab inside a cell is a space, not a
 * control character. A manually added row passes the same check.
 */
export function checkName(fullName: string): FindingCode[] {
  const name = rosterName(fullName);
  const codes: FindingCode[] = [];
  if (hasControlCharacter(name)) codes.push('NAME_CONTROL_CHARACTER');
  if (name === '') codes.push('NAME_EMPTY');
  if ([...name].length > ROSTER_NAME_MAX_LENGTH) codes.push('NAME_TOO_LONG');
  return codes;
}

/**
 * Checks the rows of one file for one section. typedCells is true for a file that keeps
 * cell types (XLSX and XLS): only there does numberCell mean anything, and only a file
 * without them is checked for mixed number lengths. A row without a label is the chosen
 * section's only when no row has one (the file has no section column).
 */
export function checkRows(
  rows: readonly FileRow[],
  context: { readonly sectionLabel: string; readonly typedCells: boolean },
): RowCheck {
  const hasSectionColumn = rows.some((row) => row.sectionLabel !== null);
  // A row of another section is null here and gets only SECTION_MISMATCH.
  const checked: (Checked | null)[] = rows.map((row) => {
    const inSection =
      row.sectionLabel === null
        ? !hasSectionColumn
        : sectionsMatch(row.sectionLabel, context.sectionLabel);
    if (!inSection) return null;
    const number = parseStudentNumber(row.studentNumber);
    // A row with an empty number cell has only the number finding: NAME_EMPTY is for a
    // row whose number is filled.
    const nameCodes = checkName(row.fullName).filter(
      (code) => code !== 'NAME_EMPTY' || row.studentNumber.trim() !== '',
    );
    return {
      number,
      name: rosterName(row.fullName),
      codes: [
        ...numberCodes(row.studentNumber, number, context.typedCells && row.numberCell),
        ...nameCodes,
      ],
      repeated: false,
    };
  });
  const inSection = checked.filter((item) => item !== null);

  const firstByNumber = new Map<string, Checked>();
  for (const item of inSection) {
    if (item.number === null) continue;
    const first = firstByNumber.get(item.number);
    if (first === undefined) firstByNumber.set(item.number, item);
    else {
      item.repeated = true;
      item.codes.push(
        namesMatch(first.name, item.name)
          ? 'NUMBER_REPEATED_SAME_NAME'
          : 'NUMBER_REPEATED_OTHER_NAME',
      );
    }
  }

  if (!context.typedCells) {
    const counted = [...firstByNumber.keys()];
    const shorter = counted.filter((number) => number.length === STUDENT_NUMBER_MIN_LENGTH).length;
    const longer = counted.length - shorter;
    if (shorter > 0 && longer > 0) {
      // The rarer length, the shorter one on a tie.
      const rarerIsShorter = shorter <= longer;
      for (const item of inSection) {
        if (
          item.number !== null &&
          (item.number.length === STUDENT_NUMBER_MIN_LENGTH) === rarerIsShorter
        ) {
          item.codes.push('MIXED_LENGTH');
        }
      }
    }
  }

  // When no row is the chosen section's, the first row carries the error.
  const findings = rows.flatMap((row, index) => {
    const codes = checked[index]?.codes ?? ['SECTION_MISMATCH'];
    if (index === 0 && inSection.length === 0) codes.push('NO_SECTION_ROWS');
    return codes.map((code) => ({
      fileRowNumber: row.fileRowNumber,
      code,
      level: FINDING_LEVEL_OF[code],
    }));
  });

  const entries = rows.flatMap((row, index) => {
    const item = checked[index];
    return item == null ||
      item.number === null ||
      item.repeated ||
      item.codes.some((code) => FINDING_LEVEL_OF[code] === 'ERROR')
      ? []
      : [{ fileRowNumber: row.fileRowNumber, studentNumber: item.number, fullName: item.name }];
  });
  return { findings, entries, leftOut: rows.length - inSection.length };
}
