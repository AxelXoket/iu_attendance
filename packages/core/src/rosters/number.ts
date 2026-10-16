// Student number (D03): 9 or 10 ASCII digits, kept as text so leading zeros stay. A
// roster file cell may carry white space around it and Excel's ="..." text wrapper,
// which keeps the zeros of a CSV cell; both come off before the check. Other digits
// (Arabic-Indic, fullwidth) are not ASCII digits and fail.

export const STUDENT_NUMBER_MIN_LENGTH = 9;
export const STUDENT_NUMBER_MAX_LENGTH = 10;
export const STUDENT_NUMBER = new RegExp(
  `^[0-9]{${STUDENT_NUMBER_MIN_LENGTH},${STUDENT_NUMBER_MAX_LENGTH}}$`,
);
const TEXT_WRAPPER = /^="([^"]*)"$/;
// An Excel number cell that lost leading zeros: 1 to 8 digits.
const SHORT_NUMBER = new RegExp(`^[0-9]{1,${STUDENT_NUMBER_MIN_LENGTH - 1}}$`);

/** True when the text is a student number: exactly 9 or 10 ASCII digits, nothing around them. */
export function isStudentNumber(text: string): boolean {
  return STUDENT_NUMBER.test(text);
}

/**
 * The student number a file cell holds, or null: white space at either end and then a
 * ="..." wrapper are removed, and what remains must be a student number as it is.
 */
export function parseStudentNumber(cell: string): string | null {
  const text = cell.trim();
  const number = TEXT_WRAPPER.exec(text)?.[1] ?? text;
  return isStudentNumber(number) ? number : null;
}

/** True when an Excel number cell holds fewer digits than a student number has. */
export function isShortNumberCell(cell: string): boolean {
  return SHORT_NUMBER.test(cell.trim());
}
