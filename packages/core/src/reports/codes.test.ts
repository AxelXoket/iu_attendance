import { describe, expect, it } from 'vitest';
import { FINAL_STATUSES } from '../corrections/catalog.ts';
import { CELL_CODES, LOCK_SURVIVING_REASONS, PROVISIONAL_REASONS } from './codes.ts';

describe('report codes', () => {
  it('name the ten cell codes: the final statuses, exempt, then the four session cells', () => {
    expect(CELL_CODES).toEqual([
      ...FINAL_STATUSES.map(({ code }) => code),
      'EXEMPT',
      'DECISION_OPEN',
      'NOT_HELD',
      'AWAITING_ANSWER',
      'OUT_OF_SCOPE',
    ]);
    // Ground control: the corrections module's five statuses lead.
    expect(CELL_CODES.slice(0, 5)).toEqual([
      'PRESENT',
      'ABSENT',
      'ON_DUTY',
      'DOCUMENTED',
      'MANUALLY_ADDED',
    ]);
  });

  it('list the six provisional reasons, two of them surviving the lock', () => {
    expect(PROVISIONAL_REASONS).toEqual([
      'SELF_DECLARED_AWAITING_APPROVAL',
      'OPEN_DECISION_RECORD',
      'DECISION_PENDING_STUDENT',
      'HEAD_COUNT_FLAG',
      'SENDING_TIME_RUNNING',
      'UNANSWERED_SESSIONS',
    ]);
    expect(LOCK_SURVIVING_REASONS).toEqual(['DECISION_PENDING_STUDENT', 'UNANSWERED_SESSIONS']);
  });
});
