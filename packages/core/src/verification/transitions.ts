// Which decision changes may be written (D07, the record decision state machine). The
// automatic path, deciding again after an event, may move an automatic decision anywhere
// but from present to in review: that record stays present, so the student never gets a
// contradicting notice. A lecturer moves a decision only along the table's rows; anything
// else is VERIFICATION_TRANSITION_INVALID for the caller. The term lock, the lecturer's
// authority over the course and the expected old decision are the caller's checks.

import {
  DECISION_REASONS,
  type DecisionEvent,
  type DecisionReason,
  RECORD_DECISIONS,
  type RecordDecision,
  reasonDefinition,
} from './codes.ts';

export type TransitionInput = {
  /**
   * The current decision's primary reason, its decision and source from the catalog; null
   * for a plain present record, which the rule set without a reason.
   */
  readonly currentReason: DecisionReason | null;
  readonly next: RecordDecision;
  /** AUTOMATIC when the rule decides again, otherwise the lecturer's event. */
  readonly by: 'AUTOMATIC' | DecisionEvent;
  /** The record carries the self-declared label. */
  readonly selfDeclared: boolean;
  /** The record's approval instant is set (D05 onay_ani): a lecturer approved its self-declaration. */
  readonly approved: boolean;
  /** The session's head count flag was raised once (its first flag instant is set), even if lowered since. */
  readonly sessionFlagged: boolean;
};

const PLAIN_PRESENT = { decision: 'PRESENT', source: 'AUTOMATIC' } as const;

// A lecturer's own approvals and rejections: the only decisions CHANGE_DECISION may change.
// An automatic decision and the not-in-class rejection are not among them.
const LECTURER_RULINGS: readonly DecisionReason[] = DECISION_REASONS.filter(
  (entry) => entry.source === 'LECTURER' && entry.code !== 'NOT_IN_CLASS_AT_CHECK',
).map((entry) => entry.code);

/** RangeError for a reason, a decision or an event the catalog does not have. */
export function isAllowedTransition(input: TransitionInput): boolean {
  const { currentReason, next } = input;
  const { decision, source } =
    currentReason === null ? PLAIN_PRESENT : reasonDefinition(currentReason);
  if (!RECORD_DECISIONS.includes(next)) throw new RangeError(`unknown decision ${next}`);
  // A self-declaration awaits approval while the record is present and its approval
  // instant is empty, whatever the reason (D07): an approved one changes by CHANGE_DECISION.
  const awaitsApproval = input.selfDeclared && !input.approved && decision === 'PRESENT';
  switch (input.by) {
    case 'AUTOMATIC':
      return source === 'AUTOMATIC' && !(decision === 'PRESENT' && next === 'IN_REVIEW');
    case 'SELF_DECLARED_APPROVE':
      return awaitsApproval && next === 'PRESENT';
    case 'SELF_DECLARED_REJECT':
      return awaitsApproval && next === 'REJECTED';
    case 'REVIEW_APPROVE':
      // A record that arrived after the unit's last day is never approved.
      return decision === 'IN_REVIEW' && currentReason !== 'AFTER_LAST_DAY' && next === 'PRESENT';
    case 'REVIEW_REJECT':
      return decision === 'IN_REVIEW' && next === 'REJECTED';
    case 'FLAGGED_SESSION_REJECT':
      return input.sessionFlagged && decision === 'PRESENT' && next === 'REJECTED';
    case 'CHANGE_DECISION':
      // Present to rejected or back: the lecturer's ruling turns, never repeats.
      return (
        currentReason !== null &&
        LECTURER_RULINGS.includes(currentReason) &&
        next === (decision === 'PRESENT' ? 'REJECTED' : 'PRESENT')
      );
    case 'NOT_IN_CLASS':
      return decision !== 'REJECTED' && next === 'REJECTED';
    case 'NOT_IN_CLASS_UNDONE':
      // The earlier lecturer decision comes back, or the rule decides again: any decision.
      return currentReason === 'NOT_IN_CLASS_AT_CHECK';
    default:
      throw new RangeError(`unknown decision event ${String(input.by)}`);
  }
}
