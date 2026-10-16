// The session value lists of the courses module (D02), the hour limit and the short code
// width. They live in core because the absence rules (the make-up debt) and the QR layout
// read them and core never imports contracts; the courses contract re-exports the lists,
// and other modules import them and keep no copy.

export const SESSION_KINDS = ['regular', 'makeup', 'trial'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];
export const SESSION_STATUSES = ['planned', 'cancelled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];
// Make-up debt (absence) and the reports read the cancel reason.
export const CANCEL_REASONS = [
  'lecturer',
  'moved',
  'holiday',
  'exam_week',
  'calendar',
  'schedule',
  'archive',
] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];
// "Was the class held?": the panel answer's held.status.
export const HELD_STATUSES = ['unanswered', 'held', 'not_held', 'conflicting'] as const;
export type HeldStatus = (typeof HELD_STATUSES)[number];

// The session short code (D02 kisa_kod): from 1, written with 10 zero-padded digits, as the
// QR content carries it.
export const SHORT_CODE_DIGITS = 10;
export const SHORT_CODE_MAX = 10 ** SHORT_CODE_DIGITS - 1;

// A session or schedule slot has 1 to 12 hours in all, theory and practice each whole
// and not below 0 (D02 teori_saat + uygulama_saat BETWEEN 1 AND 12).
export const SESSION_HOURS_MAX = 12;
export const areSessionHours = (theoryHours: number, practiceHours: number) =>
  Number.isInteger(theoryHours) &&
  Number.isInteger(practiceHours) &&
  theoryHours >= 0 &&
  practiceHours >= 0 &&
  theoryHours + practiceHours >= 1 &&
  theoryHours + practiceHours <= SESSION_HOURS_MAX;
