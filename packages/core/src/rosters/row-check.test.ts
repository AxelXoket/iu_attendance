import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { nameKey, namesMatch, rosterName } from './name.ts';
import {
  checkName,
  checkRows,
  FINDING_CODES,
  FINDING_LEVEL_OF,
  type FileRow,
  type FindingCode,
  ROSTER_NAME_MAX_LENGTH,
} from './row-check.ts';

const row = (fileRowNumber: number, patch: Partial<FileRow> = {}): FileRow => ({
  fileRowNumber,
  studentNumber: `12345678${fileRowNumber}`.slice(-9),
  fullName: `Ad ${fileRowNumber}`,
  sectionLabel: null,
  numberCell: false,
  ...patch,
});
// Built at run time: Biome would write the escapes as raw characters.
const TAB = String.fromCodePoint(9);
const LF = String.fromCodePoint(10);
const CR = String.fromCodePoint(13);
const untyped = { sectionLabel: '1', typedCells: false };
const typed = { sectionLabel: '1', typedCells: true };
// The codes of each row, by file row number.
const codesOf = (rows: FileRow[], context = untyped) => {
  const byRow = new Map<number, FindingCode[]>();
  for (const finding of checkRows(rows, context).findings) {
    byRow.set(finding.fileRowNumber, [...(byRow.get(finding.fileRowNumber) ?? []), finding.code]);
  }
  return Object.fromEntries(byRow);
};

describe('roster row check', () => {
  it('gives every finding its level from one table', () => {
    // The levels of the spec's finding table.
    expect(FINDING_LEVEL_OF).toEqual({
      NUMBER_FORMAT: 'ERROR',
      NUMBER_SHORT_NUMERIC_CELL: 'ERROR',
      MIXED_LENGTH: 'WARNING',
      NUMBER_REPEATED_SAME_NAME: 'WARNING',
      NUMBER_REPEATED_OTHER_NAME: 'ERROR',
      NAME_EMPTY: 'ERROR',
      NAME_TOO_LONG: 'ERROR',
      NAME_CONTROL_CHARACTER: 'ERROR',
      SECTION_MISMATCH: 'WARNING',
      NO_SECTION_ROWS: 'ERROR',
      NUMERIC_CELL_9_DIGITS: 'WARNING',
      NUMERIC_CELL_10_DIGITS: 'INFO',
    });
    expect(FINDING_CODES).toEqual(Object.keys(FINDING_LEVEL_OF));
    const result = checkRows([row(2, { studentNumber: 'x' }), row(3, { fullName: '' })], untyped);
    for (const finding of result.findings) {
      expect(finding.level).toBe(FINDING_LEVEL_OF[finding.code]);
    }
    expect(result.findings.map((finding) => finding.level)).toEqual(['ERROR', 'ERROR']);
  });

  it('passes clean rows into the entries in file order, the name collapsed', () => {
    const rows = [
      row(2, { studentNumber: ' ="0123456789" ', fullName: '  Ada   Yılmaz ' }),
      row(3, { studentNumber: '1234567890' }),
    ];
    const result = checkRows(rows, untyped);
    expect(result.findings).toEqual([]);
    expect(result.leftOut).toBe(0);
    expect(result.entries).toEqual([
      { fileRowNumber: 2, studentNumber: '0123456789', fullName: 'Ada Yılmaz' },
      { fileRowNumber: 3, studentNumber: '1234567890', fullName: 'Ad 3' },
    ]);
  });

  it('flags a number that is not 9 or 10 ASCII digits and keeps the row out', () => {
    const rows = [row(2, { studentNumber: '١٢٣٤٥٦٧٨٩' }), row(3, { studentNumber: '' })];
    expect(codesOf(rows)).toEqual({ 2: ['NUMBER_FORMAT'], 3: ['NUMBER_FORMAT'] });
    expect(checkRows(rows, untyped).entries).toEqual([]);
  });

  it('reads Excel number cells by their length in a typed file only', () => {
    const rows = [
      row(2, { studentNumber: '12345678', numberCell: true }),
      row(3, { studentNumber: '123456789', numberCell: true }),
      row(4, { studentNumber: '1234567890', numberCell: true }),
      row(5, { studentNumber: '12345678901', numberCell: true }),
      row(6, { studentNumber: '1234-5678', numberCell: true }),
      row(7, { studentNumber: '7', numberCell: true }),
      row(8, { studentNumber: ' 12345678 ', numberCell: true }),
      row(9, { studentNumber: '', numberCell: true }),
    ];
    expect(codesOf(rows, typed)).toEqual({
      7: ['NUMBER_SHORT_NUMERIC_CELL'],
      8: ['NUMBER_SHORT_NUMERIC_CELL'],
      9: ['NUMBER_FORMAT'],
      2: ['NUMBER_SHORT_NUMERIC_CELL'],
      3: ['NUMERIC_CELL_9_DIGITS'],
      4: ['NUMERIC_CELL_10_DIGITS'],
      5: ['NUMBER_FORMAT'],
      6: ['NUMBER_FORMAT'],
    });
    // A warning and an info row still reach the diff.
    expect(checkRows(rows, typed).entries.map((entry) => entry.fileRowNumber)).toEqual([3, 4]);
    // In a file without cell types the flag means nothing: a short number is a format error.
    expect(codesOf(rows.slice(0, 2), untyped)).toEqual({ 2: ['NUMBER_FORMAT'] });
  });

  it('warns on the rarer number length in a file without cell types, 9 digits on a tie', () => {
    const nine = (n: number) => row(n, { studentNumber: `10000000${n}` });
    const ten = (n: number) => row(n, { studentNumber: `200000000${n}` });
    expect(codesOf([nine(2), ten(3), ten(4)])).toEqual({ 2: ['MIXED_LENGTH'] });
    expect(codesOf([nine(2), nine(3), ten(4)])).toEqual({ 4: ['MIXED_LENGTH'] });
    expect(codesOf([nine(2), ten(3)])).toEqual({ 2: ['MIXED_LENGTH'] });
    // Ground controls: one length only, or a typed file, gives no warning.
    expect(codesOf([nine(2), nine(3)])).toEqual({});
    expect(codesOf([nine(2), ten(3)], typed)).toEqual({});
  });

  it('counts each number once for the mixed length warning', () => {
    const same = (n: number) => row(n, { studentNumber: '100000002', fullName: 'Ada' });
    const ten = (n: number) => row(n, { studentNumber: `200000000${n}` });
    // One 9 digit number on three rows against two 10 digit numbers: 9 is the rarer.
    expect(codesOf([same(2), same(3), same(4), ten(5), ten(6)])).toEqual({
      2: ['MIXED_LENGTH'],
      3: ['NUMBER_REPEATED_SAME_NAME', 'MIXED_LENGTH'],
      4: ['NUMBER_REPEATED_SAME_NAME', 'MIXED_LENGTH'],
    });
    // Rows with an error still count: two 9 digit numbers against one clean and two
    // nameless 10 digit numbers make 9 the rarer length.
    const nameless = (n: number) => row(n, { studentNumber: `300000000${n}`, fullName: '' });
    const nine = (n: number) => row(n, { studentNumber: `10000000${n}` });
    expect(codesOf([nameless(2), nameless(3), nine(4), nine(5), ten(6)])).toEqual({
      2: ['NAME_EMPTY'],
      3: ['NAME_EMPTY'],
      4: ['MIXED_LENGTH'],
      5: ['MIXED_LENGTH'],
    });
  });

  it('counts the first of a repeated number and errs only when the names differ', () => {
    const rows = [
      row(2, { studentNumber: '123456789', fullName: 'Ayşe Işık' }),
      row(3, { studentNumber: '123456789', fullName: 'AYŞE IŞIK' }),
      row(4, { studentNumber: '123456789', fullName: 'Başka Ad' }),
    ];
    expect(namesMatch('Ayşe Işık', 'AYŞE IŞIK')).toBe(true);
    expect(codesOf(rows)).toEqual({
      3: ['NUMBER_REPEATED_SAME_NAME'],
      4: ['NUMBER_REPEATED_OTHER_NAME'],
    });
    expect(checkRows(rows, untyped).entries.map((entry) => entry.fileRowNumber)).toEqual([2]);
    // Every repeat is compared with the first row, the one counted: a third row with the
    // first name is a warning even after a row with another name.
    const again = [rows[0], rows[2], row(5, { studentNumber: '123456789', fullName: 'Ayşe Işık' })];
    expect(codesOf(again as typeof rows)).toEqual({
      4: ['NUMBER_REPEATED_OTHER_NAME'],
      5: ['NUMBER_REPEATED_SAME_NAME'],
    });
  });

  it('checks the name of a numbered row: empty, too long, control characters', () => {
    const astral = String.fromCodePoint(0x1d400);
    const rows = [
      // Tabs and line breaks are white space, so this name is empty.
      row(2, { fullName: ` ${TAB}${CR}${LF} ` }),
      row(3, { fullName: 'a'.repeat(ROSTER_NAME_MAX_LENGTH + 1) }),
      row(4, { fullName: `Ada${String.fromCodePoint(0x85)}` }),
      row(5, { fullName: 'a'.repeat(ROSTER_NAME_MAX_LENGTH) }),
      // Collapsed white space counts once.
      row(6, { fullName: `${'a'.repeat(ROSTER_NAME_MAX_LENGTH - 1)}    b` }),
      // The bound is on the collapsed name: white space at the ends does not count.
      row(7, { fullName: `   ${'a'.repeat(ROSTER_NAME_MAX_LENGTH)}   ` }),
      // A line break inside a cell, or a CR the reader left, is a space.
      row(8, { fullName: `Ada${LF}Yılmaz${CR}` }),
      // Code points are counted, not UTF-16 units.
      row(9, { fullName: astral.repeat(ROSTER_NAME_MAX_LENGTH) }),
      row(10, { fullName: astral.repeat(ROSTER_NAME_MAX_LENGTH + 1) }),
      // Invisible characters alone are an empty name.
      row(11, { fullName: `${String.fromCodePoint(0x200b)} ${String.fromCodePoint(0xfeff)}` }),
      // Each name rule on its own.
      row(12, { fullName: `${'a'.repeat(ROSTER_NAME_MAX_LENGTH)}${String.fromCodePoint(1)}` }),
    ];
    expect(codesOf(rows)).toEqual({
      2: ['NAME_EMPTY'],
      3: ['NAME_TOO_LONG'],
      4: ['NAME_CONTROL_CHARACTER'],
      6: ['NAME_TOO_LONG'],
      10: ['NAME_TOO_LONG'],
      11: ['NAME_EMPTY'],
      12: ['NAME_CONTROL_CHARACTER', 'NAME_TOO_LONG'],
    });
    expect(checkRows([rows[6] as FileRow], untyped).entries[0]?.fullName).toBe('Ada Yılmaz');
    // A row whose number cell is empty has only the number finding; a filled cell, even
    // a wrong one, has the empty name too.
    expect(codesOf([row(13, { studentNumber: ' ', fullName: '' })])).toEqual({
      13: ['NUMBER_FORMAT'],
    });
    expect(codesOf([row(14, { studentNumber: '12AB', fullName: '' })])).toEqual({
      14: ['NUMBER_FORMAT', 'NAME_EMPTY'],
    });
  });

  it('stores the name the way it is matched', () => {
    const character = fc.constantFrom(
      ...'AaİIıiÇçŞş.-',
      ' ',
      TAB,
      String.fromCodePoint(0xa0),
      String.fromCodePoint(0x200b),
      String.fromCodePoint(0xfeff),
      String.fromCodePoint(0x307),
    );
    const name = fc.array(character, { maxLength: 12 }).map((list) => list.join(''));
    fc.assert(
      fc.property(name, (text) => {
        expect(nameKey(rosterName(text))).toBe(nameKey(text));
        expect(checkName(text).includes('NAME_EMPTY')).toBe(nameKey(text) === '');
      }),
      { numRuns: 1000 },
    );
  });

  it("leaves another section's rows out with that finding alone", () => {
    const rows = [
      row(2, { sectionLabel: '1. Şube' }),
      row(3, { sectionLabel: '2', fullName: '', studentNumber: 'x' }),
      row(4, { sectionLabel: 'Şube 01' }),
    ];
    const result = checkRows(rows, untyped);
    expect(codesOf(rows)).toEqual({ 3: ['SECTION_MISMATCH'] });
    expect(result.leftOut).toBe(1);
    expect(result.entries.map((entry) => entry.fileRowNumber)).toEqual([2, 4]);
    // In a file with a section column, a row without a label is not the section's.
    const unlabelled = [row(2, { sectionLabel: '2' }), row(3), row(4, { sectionLabel: '1' })];
    expect(codesOf(unlabelled)).toEqual({ 2: ['SECTION_MISMATCH'], 3: ['SECTION_MISMATCH'] });
    expect(checkRows(unlabelled, untyped).leftOut).toBe(2);
  });

  it('checks rows by position, even the same row object twice', () => {
    const same = row(2);
    const result = checkRows([same, same], untyped);
    expect(result.entries).toHaveLength(1);
    expect(result.findings.map((finding) => finding.code)).toEqual(['NUMBER_REPEATED_SAME_NAME']);
  });

  it('errs on the first row when no row is the chosen section', () => {
    const rows = [row(2, { sectionLabel: '2' }), row(3, { sectionLabel: '3' })];
    expect(codesOf(rows)).toEqual({
      2: ['SECTION_MISMATCH', 'NO_SECTION_ROWS'],
      3: ['SECTION_MISMATCH'],
    });
    // Ground control: no section column, no such error.
    expect(codesOf([row(2)])).toEqual({});
    expect(checkRows([], untyped)).toEqual({ findings: [], entries: [], leftOut: 0 });
  });

  it('hands the diff each number once, never a row with an error', () => {
    const cell = fc.record({
      studentNumber: fc.constantFrom('123456789', '1234567890', ' 123456789', 'x', ''),
      fullName: fc.constantFrom('Ada', 'ADA', 'Can', '', `A${String.fromCodePoint(1)}`),
      sectionLabel: fc.constantFrom(null, '1', '2'),
      numberCell: fc.boolean(),
    });
    let entered = 0;
    fc.assert(
      fc.property(fc.array(cell, { maxLength: 8 }), fc.boolean(), (cells, typedCells) => {
        const rows = cells.map((fields, index) => ({ fileRowNumber: index + 2, ...fields }));
        const { findings, entries, leftOut } = checkRows(rows, { sectionLabel: '1', typedCells });
        const numbers = entries.map((entry) => entry.studentNumber);
        expect(new Set(numbers).size).toBe(numbers.length);
        const erring = new Set(
          findings.filter((f) => f.level === 'ERROR').map((f) => f.fileRowNumber),
        );
        const positions = entries.map((entry) => entry.fileRowNumber);
        expect(positions.some((position) => erring.has(position))).toBe(false);
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
        const hasColumn = rows.some((r) => r.sectionLabel !== null);
        const outside = (r: FileRow) =>
          r.sectionLabel === '2' || (hasColumn && r.sectionLabel === null);
        expect(leftOut).toBe(rows.filter(outside).length);
        entered += entries.length;
      }),
      { numRuns: 500 },
    );
    expect(entered).toBeGreaterThan(100);
  });
});
