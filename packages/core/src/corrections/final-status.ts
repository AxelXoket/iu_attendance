import {
  type FinalStatus,
  finalStatusDefinition,
  REASON_CODES,
  type ReasonCode,
  reasonCodeDefinition,
} from './catalog.ts';
import { resolveChain, splitChains } from './chain.ts';

const RECORD_DECISIONS = ['PRESENT', 'PENDING', 'IN_REVIEW', 'REJECTED'] as const;
const RECORD_FLAGS = ['counted', 'selfDeclared', 'approved', 'excludedFromCount'] as const;

// One record of the student in the session. counted marks the record the attendance
// module chose to count; excludedFromCount marks a record that arrived after the lock
// or past the last day, which counts as no record. Any other decision, or a flag that
// is not a boolean, throws FinalStatusInputError, whether or not the record is counted.
export type FinalStatusRecord = {
  counted: boolean;
  decision: (typeof RECORD_DECISIONS)[number];
  selfDeclared: boolean;
  approved: boolean;
  excludedFromCount: boolean;
};

// One stored correction row. A CORRECTION carries its reason code and the whole hours
// it covers per type: 0 to the session hours of that type, at least one in total, and
// none in a type its reason code does not allow. A REVERSAL carries no code and no
// hours. Any other shape throws FinalStatusInputError.
export type FinalStatusCorrection =
  | {
      id: string;
      kind: 'CORRECTION';
      reasonCode: ReasonCode;
      theoryHours: number;
      practiceHours: number;
      previousCorrectionId: string | null;
    }
  | {
      id: string;
      kind: 'REVERSAL';
      reasonCode: null;
      theoryHours: null;
      practiceHours: null;
      previousCorrectionId: string | null;
    };

type CorrectionRow = Extract<FinalStatusCorrection, { kind: 'CORRECTION' }>;

// Hours are whole numbers. held: true when the session took place, false when the
// lecturer said it did not, null while that answer is missing. Callers map D02's
// conflicting state (a head count arrived for a session said not to take place, or for
// a cancelled one) to null, as D02's own session row does: its held answer stays null
// while the conflict flag is set (D02 invariants.13). locked: the unit term is locked,
// so open decisions freeze as ABSENT. Any other held value, or a locked value that is
// not a boolean, throws FinalStatusInputError.
export type FinalStatusSession = {
  theoryHours: number;
  practiceHours: number;
  held: boolean | null;
  locked: boolean;
};

export type HourTypeFinalStatus = {
  finalStatus: FinalStatus | null;
  letter: string | null;
  provisional: boolean;
  present: number;
  absent: number;
  excused: number;
  open: number;
};

export type SessionFinalStatus = {
  finalStatus: FinalStatus | null;
  letter: string | null;
  provisional: boolean;
  source: 'CORRECTION' | 'RECORD' | 'NO_RECORD' | 'NOT_HELD';
  activeCorrectionId: string | null;
  awaitingHeldAnswer: boolean;
  theory: HourTypeFinalStatus;
  practice: HourTypeFinalStatus;
};

export class FinalStatusInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinalStatusInputError';
  }
}

const HELD_ANSWERS: readonly unknown[] = [true, false, null];

function checkSession(session: FinalStatusSession): void {
  for (const hours of [session.theoryHours, session.practiceHours]) {
    if (!Number.isInteger(hours) || hours < 0) {
      throw new FinalStatusInputError(`session hours must be whole numbers, found ${hours}`);
    }
  }
  if (!HELD_ANSWERS.includes(session.held)) {
    throw new FinalStatusInputError(
      `session held must be true, false or null, found ${String(session.held)}`,
    );
  }
  if (typeof session.locked !== 'boolean') {
    throw new FinalStatusInputError(
      `session locked must be a boolean, found ${String(session.locked)}`,
    );
  }
}

// Every record is checked, counted or not, whether or not the session was held, so a
// corrupt record throws on every path.
function checkRecord(record: FinalStatusRecord, index: number): void {
  if (!(RECORD_DECISIONS as readonly unknown[]).includes(record.decision)) {
    throw new FinalStatusInputError(
      `record ${index} has an unknown decision ${String(record.decision)}`,
    );
  }
  for (const flag of RECORD_FLAGS) {
    if (typeof record[flag] !== 'boolean') {
      throw new FinalStatusInputError(
        `record ${index} has ${flag} ${String(record[flag])}, not a boolean`,
      );
    }
  }
}

function checkCorrectionRow(row: CorrectionRow, session: FinalStatusSession): void {
  const definition = REASON_CODES.find((entry) => entry.code === row.reasonCode);
  if (definition === undefined) {
    throw new FinalStatusInputError(`correction ${row.id} has an unknown reason code`);
  }
  const types = [
    ['THEORY', row.theoryHours, session.theoryHours],
    ['PRACTICE', row.practiceHours, session.practiceHours],
  ] as const;
  for (const [type, hours, sessionHours] of types) {
    if (!Number.isInteger(hours) || hours < 0 || hours > sessionHours) {
      throw new FinalStatusInputError(
        `correction ${row.id} covers ${hours} ${type} hours of ${sessionHours}`,
      );
    }
    if (hours > 0 && !definition.allowedHourTypes.includes(type)) {
      throw new FinalStatusInputError(`correction ${row.id} covers ${type} hours its code forbids`);
    }
  }
  if (row.theoryHours + row.practiceHours === 0) {
    throw new FinalStatusInputError(`correction ${row.id} covers no hour`);
  }
}

// Every row is checked, whether or not it is active and whether or not the session
// was held, so a corrupt chain throws on every path.
function checkCorrection(row: FinalStatusCorrection, session: FinalStatusSession): void {
  switch (row.kind) {
    case 'CORRECTION':
      checkCorrectionRow(row, session);
      return;
    case 'REVERSAL': {
      // Typed as nulls, checked anyway: rows come from the database or a download.
      const carried: readonly unknown[] = [row.reasonCode, row.theoryHours, row.practiceHours];
      if (carried.some((value) => value !== null)) {
        throw new FinalStatusInputError(`reversal ${row.id} carries a reason code or hours`);
      }
      return;
    }
    default:
      throw new FinalStatusInputError(
        `row ${(row as { id: string }).id} is neither a correction nor a reversal`,
      );
  }
}

// The active correction among the chains of the student's roster rows. At most one
// chain may end in a correction, the server rejects a second one (D09 resolved_gaps.41);
// the others end in a reversal. Every chain is resolved before the actives are
// counted, so a broken link throws CorrectionChainError whatever the row order, and the
// ids in the message are sorted.
function activeCorrection(corrections: readonly FinalStatusCorrection[]): CorrectionRow | null {
  const actives = splitChains(corrections)
    .map((chain) => resolveChain(chain).active)
    .filter((active) => active !== null);
  if (actives.length > 1) {
    const ids = actives.map((active) => active.id).sort();
    throw new FinalStatusInputError(`more than one correction is active: ${ids.join(', ')}`);
  }
  return actives[0] ?? null;
}

// The status the record alone gives each hour: a final status, or null for an open
// decision; provisional for an unapproved self declaration.
type RecordStatus = {
  status: FinalStatus | null;
  provisional: boolean;
  source: 'RECORD' | 'NO_RECORD';
};

function recordStatus(records: readonly FinalStatusRecord[], locked: boolean): RecordStatus {
  const counted = records.filter((record) => record.counted);
  if (records.length > 0 && counted.length !== 1) {
    throw new FinalStatusInputError(`exactly one record must be counted, found ${counted.length}`);
  }
  const record = counted[0];
  // An excluded record counts as no record at all.
  if (record === undefined || record.excludedFromCount) {
    return { status: 'ABSENT', provisional: false, source: 'NO_RECORD' };
  }
  switch (record.decision) {
    case 'PRESENT':
      return {
        status: 'PRESENT',
        provisional: !locked && record.selfDeclared && !record.approved,
        source: 'RECORD',
      };
    case 'PENDING':
    case 'IN_REVIEW':
      return { status: locked ? 'ABSENT' : null, provisional: false, source: 'RECORD' };
    case 'REJECTED':
      return { status: 'ABSENT', provisional: false, source: 'RECORD' };
  }
}

const letterOf = (status: FinalStatus | null) =>
  status === null ? null : finalStatusDefinition(status).letter;

function emptyHourType(): HourTypeFinalStatus {
  return {
    finalStatus: null,
    letter: null,
    provisional: false,
    present: 0,
    absent: 0,
    excused: 0,
    open: 0,
  };
}

function addHours(target: HourTypeFinalStatus, status: FinalStatus | null, hours: number): void {
  if (status === null) {
    target.open += hours;
    return;
  }
  switch (finalStatusDefinition(status).hourClass) {
    case 'PRESENT':
      target.present += hours;
      return;
    case 'EXCUSED':
      target.excused += hours;
      return;
    case 'ABSENT':
      target.absent += hours;
      return;
  }
}

// The hours of one type. Covered hours take the code's status; the hours a
// present-class code (manually added, partial attendance) leaves uncovered are absent,
// the others keep the record status.
function hourTypeStatus(
  sessionHours: number,
  coveredHours: number,
  codeStatus: FinalStatus | null,
  record: RecordStatus,
): HourTypeFinalStatus {
  const presentClassCode =
    codeStatus !== null && finalStatusDefinition(codeStatus).hourClass === 'PRESENT';
  const uncoveredStatus = presentClassCode ? 'ABSENT' : record.status;
  const uncoveredHours = sessionHours - coveredHours;
  const result = emptyHourType();
  addHours(result, codeStatus, coveredHours);
  addHours(result, uncoveredStatus, uncoveredHours);
  result.finalStatus = coveredHours > 0 ? codeStatus : sessionHours > 0 ? uncoveredStatus : null;
  result.letter = letterOf(result.finalStatus);
  result.provisional = uncoveredHours > 0 && !presentClassCode && record.provisional;
  return result;
}

// The final status of one student in one session, per hour type. The single place
// where hours are split: the attendance screen, the absence module, the reports, the
// panel and the phone all call it and get the same answer. corrections holds the rows
// of every roster row of the student in the session. Pure; record and correction
// order does not matter. Throws FinalStatusInputError for a field value no stored state
// can produce and CorrectionChainError for broken links; the session, every record and
// every row are checked first, so the error class does not depend on the order either.
export function resolveFinalStatus(
  records: readonly FinalStatusRecord[],
  corrections: readonly FinalStatusCorrection[],
  session: FinalStatusSession,
): SessionFinalStatus {
  checkSession(session);
  for (const [index, entry] of records.entries()) checkRecord(entry, index);
  for (const row of corrections) checkCorrection(row, session);
  const record = recordStatus(records, session.locked);
  const active = activeCorrection(corrections);
  const awaitingHeldAnswer = session.held === null;
  if (session.held === false) {
    return {
      finalStatus: null,
      letter: null,
      provisional: false,
      source: 'NOT_HELD',
      activeCorrectionId: active?.id ?? null,
      awaitingHeldAnswer,
      theory: emptyHourType(),
      practice: emptyHourType(),
    };
  }
  const codeStatus = active === null ? null : reasonCodeDefinition(active.reasonCode).finalStatus;
  const theory = hourTypeStatus(session.theoryHours, active?.theoryHours ?? 0, codeStatus, record);
  const practice = hourTypeStatus(
    session.practiceHours,
    active?.practiceHours ?? 0,
    codeStatus,
    record,
  );
  const finalStatus = codeStatus ?? record.status;
  return {
    finalStatus,
    letter: letterOf(finalStatus),
    provisional: theory.provisional || practice.provisional,
    source: active !== null ? 'CORRECTION' : record.source,
    activeCorrectionId: active?.id ?? null,
    awaitingHeldAnswer,
    theory,
    practice,
  };
}
