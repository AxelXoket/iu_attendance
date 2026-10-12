// How a late-enrolled student's earlier sessions count, one value per course and student
// (D03-B12): PREVIOUS_ABSENT keeps the sessions of the first row's section before its
// addition in scope (they count as absent), PREVIOUS_NOT_COUNTED leaves them out. The
// roster contract, its CHECK constraint and the absence scope use this list.
export const LATE_CHOICES = ['PREVIOUS_NOT_COUNTED', 'PREVIOUS_ABSENT'] as const;
export type LateChoice = (typeof LATE_CHOICES)[number];
