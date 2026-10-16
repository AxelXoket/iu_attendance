// Final statuses, reason codes and issue report reasons: fixed tables that the
// database CHECK lists, the Zod schemas and the client choices are derived from.

import { HOUR_TYPES, type HourType } from '../absence/types.ts';

// The hour types belong to the absence rules; re-exported for the correction callers.
export type { HourType };
export type HourClass = 'PRESENT' | 'EXCUSED' | 'ABSENT';

export const FINAL_STATUSES = [
  // Letters stay Turkish: they are the cell values of the AKSIS report format.
  { code: 'PRESENT', letter: 'V', hourClass: 'PRESENT' },
  { code: 'ABSENT', letter: 'Y', hourClass: 'ABSENT' },
  { code: 'ON_DUTY', letter: 'G', hourClass: 'EXCUSED' },
  { code: 'DOCUMENTED', letter: 'B', hourClass: 'EXCUSED' },
  { code: 'MANUALLY_ADDED', letter: 'E', hourClass: 'PRESENT' },
] as const satisfies readonly { code: string; letter: string; hourClass: HourClass }[];

export type FinalStatus = (typeof FINAL_STATUSES)[number]['code'];
export type FinalStatusDefinition = (typeof FINAL_STATUSES)[number];

const BOTH: readonly HourType[] = HOUR_TYPES;

export type ReasonCodeDefinition = {
  code: string;
  finalStatus: FinalStatus;
  documentRequired: boolean;
  allowedHourTypes: readonly HourType[];
  countsAsUnjustifiedAbsence: boolean;
  selectableInQueue: boolean;
  onlyWithOpenFlag: boolean;
  onlyOnCountedPresentRecord: boolean;
};

const reason = <const C extends string>(
  code: C,
  finalStatus: FinalStatus,
  flags: Partial<Omit<ReasonCodeDefinition, 'code' | 'finalStatus'>> = {},
): ReasonCodeDefinition & { readonly code: C } => ({
  code,
  finalStatus,
  documentRequired: false,
  allowedHourTypes: BOTH,
  countsAsUnjustifiedAbsence: false,
  selectableInQueue: false,
  onlyWithOpenFlag: false,
  onlyOnCountedPresentRecord: false,
  ...flags,
});

export const CORRECTION_REASONS = [
  reason('OFFICIAL_DUTY', 'ON_DUTY', { documentRequired: true }),
  reason('STUDENT_AFFAIRS_LETTER', 'DOCUMENTED', {
    documentRequired: true,
    allowedHourTypes: ['THEORY'],
  }),
  reason('BOARD_DECISION', 'DOCUMENTED', { documentRequired: true }),
  reason('BASED_ON_STATEMENT', 'MANUALLY_ADDED', { countsAsUnjustifiedAbsence: true }),
  reason('PHONE_MISSING_OR_BROKEN', 'MANUALLY_ADDED', {
    countsAsUnjustifiedAbsence: true,
    selectableInQueue: true,
  }),
  reason('QR_SCAN_FAILED', 'MANUALLY_ADDED', {
    countsAsUnjustifiedAbsence: true,
    selectableInQueue: true,
  }),
  // Reported apart from the other unjustified absences in the term report.
  reason('MAKEUP_NOT_ON_PHONE', 'MANUALLY_ADDED', {
    countsAsUnjustifiedAbsence: true,
    selectableInQueue: true,
  }),
  // Only on the student's counted PRESENT record: covered hours present, the rest absent.
  reason('PARTIAL_ATTENDANCE', 'PRESENT', { onlyOnCountedPresentRecord: true }),
  // Only while the session has an open flag.
  reason('NOT_IN_CLASS_AT_CHECK', 'ABSENT', { onlyWithOpenFlag: true }),
] as const satisfies readonly ReasonCodeDefinition[];

export type ReasonCode = (typeof CORRECTION_REASONS)[number]['code'];

export const ISSUE_REASONS = [
  { code: 'PHONE_MISSING_OR_BROKEN', suggestedReasonCode: 'PHONE_MISSING_OR_BROKEN' },
  { code: 'QR_SCAN_FAILED', suggestedReasonCode: 'QR_SCAN_FAILED' },
  { code: 'RECORD_IN_WRONG_COURSE', suggestedReasonCode: null },
] as const satisfies readonly { code: string; suggestedReasonCode: ReasonCode | null }[];

export type IssueReasonCode = (typeof ISSUE_REASONS)[number]['code'];

export function reasonCodeDefinition(code: ReasonCode): ReasonCodeDefinition {
  const definition = CORRECTION_REASONS.find((entry) => entry.code === code);
  if (definition === undefined) throw new Error(`Unknown reason code ${code}`);
  return definition;
}

export function finalStatusDefinition(code: FinalStatus): FinalStatusDefinition {
  const definition = FINAL_STATUSES.find((entry) => entry.code === code);
  if (definition === undefined) throw new Error(`Unknown final status ${code}`);
  return definition;
}
