// The AKSIS summary's canonical content (D10-B29), format 1: the text whose SHA-256 the
// summary answer carries and the snapshot stores, so a lecturer's snapshot proves what the
// lecturer saw and a stored snapshot rebuilt from its rows gives the same digest. It holds
// only what the snapshot stores: one header array, then one array per student ordered by
// (roster order, roster row id). Each array is JSON with no object keys, so no key order
// can differ; list fields are inner arrays in their stored order. Lines end with LF, the
// last one too. Texts are NFC first, ids lower case, dates YYYY-MM-DD, codes their English
// upper-case values; numbers are whole. Each value is checked against its own domain (a
// code in its list, a number in its range), so no digest is made of a snapshot the
// tables would refuse; rules across fields are the absence module's and the tables'. A
// new format adds a builder and keeps the old ones: a snapshot is always rebuilt with its
// own format version.

import {
  DECISION_PENDING_REASONS,
  type DecisionPendingReason,
} from '../absence/decision-pending.ts';
import {
  COUNT_BASES,
  COURSE_RESULTS,
  type CountBase,
  type CourseResult,
  TYPE_DECISIONS,
  type TypeDecision,
} from '../absence/types.ts';
import { isDate } from '../courses/calendar.ts';
import { isStudentNumber } from '../rosters/number.ts';
import { isWholeIn } from '../shared/number.ts';
import { sha256 } from '../shared/sha256.ts';
import { compareText } from '../shared/text.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import { idKey, uuidBytes } from '../shared/uuid.ts';
import { PROVISIONAL_REASONS } from './codes.ts';
import type { ProvisionalReasonCount } from './provisional.ts';

/** One type's values of a student (the absence module's, as the snapshot stores them). */
export type SummaryTypeValues = {
  readonly heldHours: number;
  readonly absentHours: number;
  readonly excusedHours: number;
  readonly attendedPerMille: number | null;
  readonly decision: TypeDecision;
};

export type SummaryRow = {
  readonly rosterRowId: string;
  /** null on a row the retention period made anonymous, as the summary answer gives it. */
  readonly studentNumber: string | null;
  readonly fullName: string | null;
  /** The roster order, from 1; with rosterRowId the rows' sort key. */
  readonly order: number;
  /** The roster row's source code (the rosters module's FILE, MANUAL or SYSTEM). */
  readonly source: string;
  readonly exempt: boolean;
  /** null when the schedule has no hours of the type. */
  readonly theory: SummaryTypeValues | null;
  readonly practice: SummaryTypeValues | null;
  readonly result: CourseResult;
  readonly decisionPendingReasons: readonly DecisionPendingReason[];
};

export type SummarySnapshot = {
  readonly courseId: string;
  readonly sectionId: string;
  readonly courseCode: string;
  readonly courseName: string;
  readonly sectionLabel: string;
  readonly trackingStart: string | null;
  readonly lastHeldClassDay: string | null;
  readonly countBase: CountBase;
  readonly theoryPercent: number;
  readonly practicePercent: number;
  readonly theoryScheduled: boolean;
  readonly practiceScheduled: boolean;
  readonly theoryMissingMakeupHours: number;
  readonly practiceMissingMakeupHours: number;
  readonly unansweredSessionCount: number;
  readonly provisionalReasons: readonly ProvisionalReasonCount[];
  readonly rows: readonly SummaryRow[];
};

/** The format a new snapshot is written with. */
export const SUMMARY_FORMAT_VERSION = 1;

const SOURCE_CODE = /^[A-Z]+(?:_[A-Z]+)*$/;
const PERCENT_MAX = 100;
const PER_MILLE_MAX = 1000;

function id(value: string): string {
  if (uuidBytes(value) === null) throw new RangeError('a summary id is a UUID');
  return idKey(value);
}
function whole(value: number, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!isWholeIn(value, min, max)) {
    throw new RangeError('a summary number is a whole number in its range');
  }
  return value;
}
const count = (value: number) => whole(value, 0);
function day(value: string | null): string | null {
  if (value !== null && !isDate(value)) throw new RangeError('a summary date is YYYY-MM-DD');
  return value;
}
function oneOf(value: string, list: readonly string[]): string {
  if (!list.includes(value)) throw new RangeError('a summary code is one of its list');
  return value;
}
// A list field holds codes of its list in the list's order, each at most once.
function inListOrder(values: readonly string[], list: readonly string[]): string[] {
  const at = values.map((value) => list.indexOf(oneOf(value, list)));
  if (at.some((index, n) => n > 0 && index <= (at[n - 1] as number))) {
    throw new RangeError('a summary code list follows its list order without repeats');
  }
  return [...values];
}
// The roster row's source code: the rosters contract owns its list, which core cannot read.
function sourceCode(value: string): string {
  if (!SOURCE_CODE.test(value)) throw new RangeError('a summary code is upper case');
  return value;
}
function studentNumber(value: string | null): string | null {
  if (value !== null && !isStudentNumber(value)) {
    throw new RangeError('a summary student number is 9 or 10 digits');
  }
  return value;
}
function text(value: string): string {
  if (value.length === 0) throw new RangeError('a summary course text is not empty');
  return value;
}

const typeValues = (values: SummaryTypeValues | null) =>
  values === null
    ? [null, null, null, null, null]
    : [
        count(values.heldHours),
        count(values.absentHours),
        count(values.excusedHours),
        values.attendedPerMille === null ? null : whole(values.attendedPerMille, 0, PER_MILLE_MAX),
        oneOf(values.decision, TYPE_DECISIONS),
      ];

// Every text is written NFC, so a name typed in either form gives one content.
const nfc = (_key: string, value: unknown) =>
  typeof value === 'string' ? value.normalize('NFC') : value;

function format1(snapshot: SummarySnapshot): string {
  const header = [
    1,
    id(snapshot.courseId),
    id(snapshot.sectionId),
    text(snapshot.courseCode),
    text(snapshot.courseName),
    text(snapshot.sectionLabel),
    day(snapshot.trackingStart),
    day(snapshot.lastHeldClassDay),
    oneOf(snapshot.countBase, COUNT_BASES),
    whole(snapshot.theoryPercent, 0, PERCENT_MAX),
    whole(snapshot.practicePercent, 0, PERCENT_MAX),
    snapshot.theoryScheduled,
    snapshot.practiceScheduled,
    count(snapshot.theoryMissingMakeupHours),
    count(snapshot.practiceMissingMakeupHours),
    count(snapshot.unansweredSessionCount),
    inListOrder(
      snapshot.provisionalReasons.map((reason) => reason.code),
      PROVISIONAL_REASONS,
    ),
    // A listed reason counts at least once.
    snapshot.provisionalReasons.map((reason) => whole(reason.count, 1)),
    snapshot.rows.length,
  ];
  // Each row is checked before the sort, so no unchecked value can upset the order.
  const rows = snapshot.rows
    .map((row) => {
      const rowId = id(row.rosterRowId);
      const order = whole(row.order, 1);
      const line = [
        rowId,
        studentNumber(row.studentNumber),
        row.fullName,
        order,
        sourceCode(row.source),
        row.exempt,
        ...typeValues(row.theory),
        ...typeValues(row.practice),
        oneOf(row.result, COURSE_RESULTS),
        inListOrder(row.decisionPendingReasons, DECISION_PENDING_REASONS),
      ];
      return { order, rowId, line };
    })
    .sort((a, b) => a.order - b.order || compareText(a.rowId, b.rowId))
    .map((row) => row.line);
  return [header, ...rows].map((line) => `${JSON.stringify(line, nfc)}\n`).join('');
}

// Old formats stay: a stored snapshot is rebuilt with its own version.
const FORMATS: { readonly [version: number]: (snapshot: SummarySnapshot) => string } = {
  1: format1,
};

/**
 * The canonical content of a summary in the given format version. Throws RangeError for an
 * unknown version, an id that is not a UUID, a date that is not YYYY-MM-DD, an empty course
 * text, a student number that is not 9 or 10 digits, a number that is not whole or out of
 * its range, a code outside its list or a code list out of its list's order.
 */
export function summaryContent(snapshot: SummarySnapshot, version: number): string {
  const build = Object.hasOwn(FORMATS, version) ? FORMATS[version] : undefined;
  if (build === undefined) throw new RangeError(`unknown summary format ${version}`);
  return build(snapshot);
}

/** The SHA-256 of the canonical content's UTF-8 bytes: 32 bytes, 64 hex digits in answers. */
export function summaryDigest(snapshot: SummarySnapshot, version: number): Uint8Array {
  return sha256(utf8Bytes(summaryContent(snapshot, version)));
}
