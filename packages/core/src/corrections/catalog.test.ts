import { describe, expect, it } from 'vitest';
import {
  CORRECTION_REASONS,
  FINAL_STATUSES,
  type FinalStatus,
  finalStatusDefinition,
  ISSUE_REASONS,
  type ReasonCode,
  reasonCodeDefinition,
} from './catalog.ts';
import { type HourTypeFinalStatus, resolveFinalStatus } from './final-status.ts';

const codes = (list: readonly { code: string }[]) => list.map((entry) => entry.code);

// D09 resolved_gaps.0 and the final status letters (exports.7): what each reason code
// does to the hours it covers.
const CODE_EFFECTS: Record<
  ReasonCode,
  { letter: string; bucket: 'present' | 'absent' | 'excused'; practice: boolean }
> = {
  OFFICIAL_DUTY: { letter: 'G', bucket: 'excused', practice: true },
  STUDENT_AFFAIRS_LETTER: { letter: 'B', bucket: 'excused', practice: false },
  BOARD_DECISION: { letter: 'B', bucket: 'excused', practice: true },
  BASED_ON_STATEMENT: { letter: 'E', bucket: 'present', practice: true },
  PHONE_MISSING_OR_BROKEN: { letter: 'E', bucket: 'present', practice: true },
  QR_SCAN_FAILED: { letter: 'E', bucket: 'present', practice: true },
  MAKEUP_NOT_ON_PHONE: { letter: 'E', bucket: 'present', practice: true },
  PARTIAL_ATTENDANCE: { letter: 'V', bucket: 'present', practice: true },
  NOT_IN_CLASS_AT_CHECK: { letter: 'Y', bucket: 'absent', practice: true },
};

const covered = (bucket: 'present' | 'absent' | 'excused', hours: number) => ({
  present: 0,
  absent: 0,
  excused: 0,
  open: 0,
  [bucket]: hours,
});

const counts = ({ present, absent, excused, open }: HourTypeFinalStatus) => ({
  present,
  absent,
  excused,
  open,
});

describe('correction catalog', () => {
  it('has unique UPPER_SNAKE ASCII codes and one letter per final status', () => {
    for (const list of [CORRECTION_REASONS, FINAL_STATUSES, ISSUE_REASONS]) {
      expect(new Set(codes(list)).size).toBe(list.length);
      for (const code of codes(list)) expect(code).toMatch(/^[A-Z]+(?:_[A-Z]+)*$/);
    }
    expect(FINAL_STATUSES.map((entry) => entry.letter)).toEqual(['V', 'Y', 'G', 'B', 'E']);
  });

  it('requires a document exactly for on-duty and documented corrections', () => {
    for (const entry of CORRECTION_REASONS) {
      expect(entry.documentRequired).toBe(
        entry.finalStatus === 'ON_DUTY' || entry.finalStatus === 'DOCUMENTED',
      );
    }
  });

  it('limits the student affairs letter to theory hours only', () => {
    expect(reasonCodeDefinition('STUDENT_AFFAIRS_LETTER').allowedHourTypes).toEqual(['THEORY']);
    expect(reasonCodeDefinition('BOARD_DECISION').allowedHourTypes).toEqual(['THEORY', 'PRACTICE']);
  });

  it('counts only manually added codes as unjustified absence and offers three of them in the queue', () => {
    for (const entry of CORRECTION_REASONS) {
      expect(entry.countsAsUnjustifiedAbsence).toBe(entry.finalStatus === 'MANUALLY_ADDED');
    }
    expect(codes(CORRECTION_REASONS.filter((entry) => entry.selectableInQueue))).toEqual([
      'PHONE_MISSING_OR_BROKEN',
      'QR_SCAN_FAILED',
      'MAKEUP_NOT_ON_PHONE',
    ]);
  });

  it('marks the two codes with a precondition', () => {
    expect(codes(CORRECTION_REASONS.filter((entry) => entry.onlyOnCountedPresentRecord))).toEqual([
      'PARTIAL_ATTENDANCE',
    ]);
    expect(codes(CORRECTION_REASONS.filter((entry) => entry.onlyWithOpenFlag))).toEqual([
      'NOT_IN_CLASS_AT_CHECK',
    ]);
  });

  it('suggests a reason code only for the phone and QR issue reasons', () => {
    for (const entry of ISSUE_REASONS) {
      if (entry.suggestedReasonCode !== null)
        expect(codes(CORRECTION_REASONS)).toContain(entry.suggestedReasonCode);
    }
    expect(
      ISSUE_REASONS.find((entry) => entry.code === 'RECORD_IN_WRONG_COURSE')?.suggestedReasonCode,
    ).toBeNull();
    // Positive control (resolved_gaps.17): the first two turn into the reason code of
    // the same name with one tap.
    expect(ISSUE_REASONS.map((entry) => [entry.code, entry.suggestedReasonCode])).toEqual([
      ['PHONE_MISSING_OR_BROKEN', 'PHONE_MISSING_OR_BROKEN'],
      ['QR_SCAN_FAILED', 'QR_SCAN_FAILED'],
      ['RECORD_IN_WRONG_COURSE', null],
    ]);
  });

  it('allows practice hours for every code but the student affairs letter', () => {
    for (const entry of CORRECTION_REASONS) {
      expect(entry.allowedHourTypes).toEqual(
        CODE_EFFECTS[entry.code].practice ? ['THEORY', 'PRACTICE'] : ['THEORY'],
      );
    }
  });

  it.each(CORRECTION_REASONS.map((entry) => [entry.code] as const))(
    'gives the covered hours of %s its letter and hour class',
    (code) => {
      const effect = CODE_EFFECTS[code];
      const practiceHours = effect.practice ? 2 : 0;
      const outcome = resolveFinalStatus(
        [
          {
            counted: true,
            decision: 'PRESENT',
            selfDeclared: false,
            approved: true,
            excludedFromCount: false,
          },
        ],
        [
          {
            id: 'c1',
            kind: 'CORRECTION',
            reasonCode: code,
            theoryHours: 2,
            practiceHours,
            previousCorrectionId: null,
          },
        ],
        { theoryHours: 2, practiceHours: 2, held: true, locked: false },
      );
      expect(outcome.letter).toBe(effect.letter);
      expect(outcome.theory.letter).toBe(effect.letter);
      expect(counts(outcome.theory)).toEqual(covered(effect.bucket, 2));
      // Ground control: uncovered practice hours keep the present record's V.
      expect(outcome.practice.letter).toBe(effect.practice ? effect.letter : 'V');
      expect(counts(outcome.practice)).toEqual(
        effect.practice ? covered(effect.bucket, 2) : covered('present', 2),
      );
    },
  );

  it('maps every final status to one hour class', () => {
    const classes = Object.fromEntries(
      FINAL_STATUSES.map((entry) => [entry.code, finalStatusDefinition(entry.code).hourClass]),
    );
    expect(classes).toEqual({
      PRESENT: 'PRESENT',
      ABSENT: 'ABSENT',
      ON_DUTY: 'EXCUSED',
      DOCUMENTED: 'EXCUSED',
      MANUALLY_ADDED: 'PRESENT',
    });
  });

  it('throws for a code that is not in the catalog', () => {
    expect(() => reasonCodeDefinition('NOPE' as ReasonCode)).toThrow('Unknown reason code NOPE');
    expect(() => finalStatusDefinition('NOPE' as FinalStatus)).toThrow('Unknown final status NOPE');
    // Control: a listed code resolves.
    expect(reasonCodeDefinition('OFFICIAL_DUTY').finalStatus).toBe('ON_DUTY');
    expect(finalStatusDefinition('ON_DUTY').letter).toBe('G');
  });
});
