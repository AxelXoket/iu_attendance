// Report code lists (D10): the cell codes of the course and student reports and the
// reasons a report or AKSIS summary is provisional. The reports contract re-exports them
// and core never imports contracts, so the lists live here, where the report rules of the
// later D10 packages read them.

import { ABSENCE_FINAL_STATUS_CODES, type AbsenceFinalStatus } from '../absence/session-layer.ts';
import { nonEmpty } from '../shared/list.ts';

// The cells the six letters of the plan cannot show (D10-A01): a record still in
// pending or review, a session answered not held, a session whose held question is
// unanswered, and a session outside the student's scope.
const SESSION_CELL_CODES = [
  'DECISION_OPEN',
  'NOT_HELD',
  'AWAITING_ANSWER',
  'OUT_OF_SCOPE',
] as const;

export type CellCode = AbsenceFinalStatus | (typeof SESSION_CELL_CODES)[number];

// A cell's code: the absence module's final statuses (the corrections module's, then
// EXEMPT), then the four session cells. The letters live with their owners.
const cellCodes: CellCode[] = [...ABSENCE_FINAL_STATUS_CODES, ...SESSION_CELL_CODES];
export const CELL_CODES = nonEmpty(cellCodes);

// Why a report or summary is provisional, in the order the answers list them. Two are the
// plan's conditions (a self-declared record awaiting approval, a decision-pending student),
// four are proposals (D10-A03).
export const PROVISIONAL_REASONS = [
  'SELF_DECLARED_AWAITING_APPROVAL',
  'OPEN_DECISION_RECORD',
  'DECISION_PENDING_STUDENT',
  'HEAD_COUNT_FLAG',
  'SENDING_TIME_RUNNING',
  'UNANSWERED_SESSIONS',
] as const;
export type ProvisionalReason = (typeof PROVISIONAL_REASONS)[number];

// The reasons still counted once the term is locked (D10-C04): decisions freeze at the
// lock and the sending time ends by it, but a decision-pending student and an
// unanswered held question remain.
export const LOCK_SURVIVING_REASONS = [
  'DECISION_PENDING_STUDENT',
  'UNANSWERED_SESSIONS',
] as const satisfies readonly ProvisionalReason[];
