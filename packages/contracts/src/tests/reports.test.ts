import { DECISION_PENDING_REASONS } from '@iu-attendance/core/absence/decision-pending';
import { COURSE_RESULTS, TYPE_DECISIONS } from '@iu-attendance/core/absence/types';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { HELD_STATUSES } from '../courses.ts';
import {
  aksisSnapshotSchema,
  CELL_CODES,
  DATE_RANGE_PROBLEMS,
  endOfDaySnapshotJobDataSchema,
  OUTPUT_BLOCKS,
  OUTPUT_KINDS,
  OUTPUT_STATES,
  PROVISIONAL_REASONS,
  REPORTS_AUDIT_EVENTS,
  REPORTS_ERROR_CODES,
  REPORTS_ROUTES,
  SNAPSHOT_SOURCES,
  SUMMARY_DIGEST_LENGTH,
} from '../reports.ts';
import { ROW_SOURCES } from '../rosters.ts';
import {
  defineRoute,
  FULL_LIST_DEFAULT_MAX,
  FULL_LIST_MAX_META,
  type RouteDefinition,
} from '../shared/index.ts';
import { id, ok } from './helpers.ts';
import { pathsIn } from './schema-walk.ts';

const AT = '2026-10-06T07:05:00.000Z';
const DAY = '2026-10-06';
const DIGEST = 'a'.repeat(SUMMARY_DIGEST_LENGTH);

type RouteKey = keyof typeof REPORTS_ROUTES;
const answerOf = (route: RouteKey) => REPORTS_ROUTES[route].response.schema as z.ZodType;

// The schema at a path of a route's answer, the outermost one when wrappers repeat it.
const nodeAt = (schema: z.ZodType, path: string) => {
  const found = pathsIn(schema).find(([at]) => at === path);
  if (found === undefined) throw new Error(`no field at ${path}`);
  return found[1];
};
const extensibleAt = (schema: z.ZodType, path: string) =>
  pathsIn(schema)
    .filter(([at, node]) => at === path && node.meta()?.['x-extensible-enum'] !== undefined)
    .map(([, node]) => node.meta()?.['x-extensible-enum']);

describe('reports routes', () => {
  // The spec's five endpoints: method and path, roles, answer statuses and error answers.
  const SPEC = {
    getCourseReport: [
      'GET /v1/reports/courses/{courseId}',
      ['lecturer'],
      [200],
      ['REPORTS_NOT_FOUND', 'REPORTS_DATE_RANGE_INVALID'],
    ],
    getStudentReport: [
      'GET /v1/reports/students/{rosterRowId}',
      ['lecturer'],
      [200],
      ['REPORTS_NOT_FOUND', 'REPORTS_DATE_RANGE_INVALID'],
    ],
    getAksisSummary: [
      'GET /v1/reports/sections/{sectionId}/aksis-summary',
      ['lecturer'],
      [200],
      ['REPORTS_NOT_FOUND'],
    ],
    recordAksisOutput: [
      'POST /v1/reports/sections/{sectionId}/aksis-summary/outputs',
      ['lecturer'],
      [201, 200],
      [
        'REPORTS_NOT_FOUND',
        'REPORTS_ID_CONFLICT',
        'REPORTS_UNANSWERED_SESSIONS',
        'REPORTS_SUMMARY_CHANGED',
      ],
    ],
    getTermEndReport: [
      'GET /v1/reports/admin/term-end',
      ['admin'],
      [200],
      ['REPORTS_NOT_FOUND', 'REPORTS_TERM_NOT_LOCKED'],
    ],
  } as const;

  it('are the five spec endpoints, every one heavy and behind a session', () => {
    expect(Object.keys(REPORTS_ROUTES)).toEqual(Object.keys(SPEC));
    for (const [key, [endpoint, roles, statuses, routeErrors]] of Object.entries(SPEC)) {
      const route = REPORTS_ROUTES[key as keyof typeof SPEC] as RouteDefinition;
      expect(defineRoute(route)).toBe(route);
      expect(`${route.method} ${route.path}`, key).toBe(endpoint);
      expect(route.auth, key).toEqual(['session']);
      expect(route.roles, key).toEqual(roles);
      expect(route.rate, key).toBe('heavy');
      expect(route.response.statuses, key).toEqual(statuses);
      expect(route.errors, key).toEqual(routeErrors);
    }
  });

  it('take an optional range of real days, and the term-end report both ids', () => {
    for (const route of ['getCourseReport', 'getStudentReport'] as const) {
      const query = REPORTS_ROUTES[route].request.query;
      expect(ok(query, {}), route).toBe(true);
      expect(ok(query, { to: DAY }), route).toBe(true);
      expect(ok(query, { from: DAY, to: DAY }), route).toBe(true);
      expect(ok(query, { from: '2026-02-30' }), route).toBe(false);
      expect(ok(query, { to: '2026-1-1' }), route).toBe(false);
    }
    const termEnd = REPORTS_ROUTES.getTermEndReport.request.query;
    expect(ok(termEnd, { termId: id(1), unitId: id(2) })).toBe(true);
    expect(ok(termEnd, { termId: id(1) })).toBe(false);
    expect(ok(termEnd, { unitId: id(2) })).toBe(false);
  });

  it('take an output with a client id, a summary digest and a closed kind', () => {
    const body = REPORTS_ROUTES.recordAksisOutput.request.body;
    const output = { outputId: id(1), summaryDigest: DIGEST, kind: 'SCREEN' };
    expect(ok(body, output)).toBe(true);
    for (const kind of OUTPUT_KINDS) expect(ok(body, { ...output, kind })).toBe(true);
    expect(ok(body, { ...output, kind: 'SMS' })).toBe(false);
    expect(ok(body, { ...output, summaryDigest: DIGEST.toUpperCase() })).toBe(false);
    expect(ok(body, { ...output, summaryDigest: DIGEST.slice(1) })).toBe(false);
    expect(ok(body, { ...output, summaryDigest: `${DIGEST}a` })).toBe(false);
    // A client id is a UUIDv7.
    expect(ok(body, { ...output, outputId: '0192f5c4-7d2a-4b3c-8d4e-000000000001' })).toBe(false);
  });

  it("answer an output with the lecturer's snapshot and no block: a block is refused", () => {
    const answer = REPORTS_ROUTES.recordAksisOutput.response.schema;
    const snapshot = {
      snapshotId: id(1),
      source: 'LECTURER_OUTPUT',
      outputKind: 'EXCEL',
      takenAt: AT,
    };
    const recorded = {
      snapshot,
      output: { state: 'TERM_END', block: null, snapshotAllowed: true },
    };
    expect(ok(answer, recorded)).toBe(true);
    expect(ok(answer, { ...recorded, snapshot: null })).toBe(true);
    const blocked = { ...recorded.output, block: 'UNANSWERED_SESSIONS' };
    expect(ok(answer, { ...recorded, output: blocked })).toBe(false);
    // Only a lecturer's output, always with its kind.
    expect(ok(answer, { ...recorded, snapshot: { ...snapshot, source: 'END_OF_DAY' } })).toBe(
      false,
    );
    expect(ok(answer, { ...recorded, snapshot: { ...snapshot, outputKind: null } })).toBe(false);
  });

  it('answer the summary digest as 64 lower-case hex digits', () => {
    const digest = nodeAt(answerOf('getAksisSummary'), '.summaryDigest');
    expect(ok(digest, DIGEST)).toBe(true);
    expect(ok(digest, `A${DIGEST.slice(1)}`)).toBe(false);
    expect(ok(digest, 'g'.repeat(SUMMARY_DIGEST_LENGTH))).toBe(false);
  });
});

describe('reports value lists', () => {
  it('carry the growing codes as extensible lists from their one source', () => {
    const fields: ReadonlyArray<readonly [RouteKey, string, readonly string[]]> = [
      ['getCourseReport', '.sections[].students[].cells[].theory.status', CELL_CODES],
      ['getCourseReport', '.provisionalReasons[].code', PROVISIONAL_REASONS],
      ['getCourseReport', '.sections[].students[].source', ROW_SOURCES],
      ['getCourseReport', '.sections[].sessions[].heldStatus', HELD_STATUSES],
      ['getAksisSummary', '.rows[].result', COURSE_RESULTS],
      ['getAksisSummary', '.rows[].theory.decision', TYPE_DECISIONS],
      ['getAksisSummary', '.rows[].decisionPendingReasons[]', DECISION_PENDING_REASONS],
      ['getAksisSummary', '.output.state', OUTPUT_STATES],
      ['getAksisSummary', '.output.block', OUTPUT_BLOCKS],
      ['getAksisSummary', '.baseline.source', SNAPSHOT_SOURCES],
      ['getAksisSummary', '.baseline.outputKind', OUTPUT_KINDS],
      ['recordAksisOutput', '.snapshot.outputKind', OUTPUT_KINDS],
    ];
    for (const [route, path, list] of fields) {
      const found = extensibleAt(answerOf(route), path);
      // Ground control: the field is there.
      expect(found, path).toHaveLength(1);
      expect(found[0], path).toEqual([...list]);
    }
  });

  it('mark the student rows as full lists, never the cells or sessions beside them', () => {
    const marked = (route: RouteKey) =>
      pathsIn(answerOf(route))
        .filter(([, node]) => node.meta()?.[FULL_LIST_MAX_META] !== undefined)
        .map(([at, node]) => [at, node.meta()?.[FULL_LIST_MAX_META]]);
    expect(marked('getCourseReport')).toEqual([['.sections[].students', FULL_LIST_DEFAULT_MAX]]);
    expect(marked('getStudentReport')).toEqual([['.courses[].sessions', FULL_LIST_DEFAULT_MAX]]);
    expect(marked('getAksisSummary')).toEqual([['.rows', FULL_LIST_DEFAULT_MAX]]);
    expect(marked('getTermEndReport')).toEqual([]);
    // The unmarked lists keep the same bound.
    const session = {
      sessionId: id(1),
      classDay: DAY,
      startTime: '09:00',
      theoryHours: 2,
      practiceHours: 0,
      kind: 'regular',
      heldStatus: 'held',
      sendingEndsAt: AT,
      headCountFlag: false,
    };
    const lists = [
      ['.sections[].sessions', session],
      ['.sections[].students[].cells', { theory: null, practice: null }],
    ] as const;
    for (const [path, item] of lists) {
      const list = nodeAt(answerOf('getCourseReport'), path);
      const many = (count: number) => Array.from({ length: count }, () => item);
      expect(ok(list, many(FULL_LIST_DEFAULT_MAX)), path).toBe(true);
      expect(ok(list, many(FULL_LIST_DEFAULT_MAX + 1)), path).toBe(false);
    }
  });

  it('bound the numbers of an answer where they sit', () => {
    const cases = [
      ['getAksisSummary', '.rows[].theory.attendedPerMille', 1000, 1001],
      ['getTermEndReport', '.totals.excusedReturnsPerMille', 1000, 1001],
      ['getAksisSummary', '.rates.theoryPercent', 100, 101],
      ['getCourseReport', '.sections[].students[].cells[].theory.presentHours', 0, -1],
    ] as const;
    for (const [route, path, good, bad] of cases) {
      const node = nodeAt(answerOf(route), path);
      expect(ok(node, good), path).toBe(true);
      expect(ok(node, bad), path).toBe(false);
    }
  });
});

describe('the AKSIS snapshot', () => {
  const type = {
    heldHours: 10,
    absentHours: 2,
    excusedHours: 1,
    attendedPerMille: 800,
    decision: 'MET',
  };
  const row = {
    rosterRowId: id(6),
    studentNumber: '0123456789',
    exempt: false,
    theory: type,
    practice: null,
    result: 'MET',
    decisionPendingReasons: ['OPEN_FLAG', 'NO_CONNECTION'],
  };
  const snapshot = {
    snapshotId: id(1),
    source: 'END_OF_DAY',
    outputKind: null,
    termId: id(2),
    unitId: id(3),
    courseId: id(4),
    sectionId: id(5),
    takenAt: AT,
    lockAt: AT,
    lastSessionEndAt: null,
    provisional: true,
    provisionalReasons: ['DECISION_PENDING_STUDENT'],
    countBase: 'HELD',
    theoryPercent: 70,
    practicePercent: 80,
    rows: [row],
  };
  const accepts = (patch: object) => ok(aksisSnapshotSchema, { ...snapshot, ...patch });
  const acceptsRow = (patch: object) => accepts({ rows: [{ ...row, ...patch }] });
  const acceptsType = (patch: object) => acceptsRow({ theory: { ...type, ...patch } });

  it('holds a whole snapshot as it was written', () => {
    expect(aksisSnapshotSchema.parse(snapshot)).toStrictEqual(snapshot);
  });

  it('closes its codes at every depth: it is an internal type', () => {
    // Each with the other fields right, so only the list refuses it.
    expect(accepts({ source: 'OTHER', outputKind: 'EXCEL' })).toBe(false);
    expect(accepts({ countBase: 'OTHER' })).toBe(false);
    expect(accepts({ provisionalReasons: ['LATE'] })).toBe(false);
    expect(accepts({ source: 'LECTURER_OUTPUT', outputKind: 'SMS' })).toBe(false);
    expect(acceptsRow({ result: 'PASSED' })).toBe(false);
    expect(acceptsRow({ decisionPendingReasons: ['WAITING'] })).toBe(false);
    expect(acceptsType({ decision: 'OTHER' })).toBe(false);
    expect(acceptsType({ attendedPerMille: 1001 })).toBe(false);
    expect(accepts({ lockAt: null })).toBe(false);
  });

  it('refuses an unknown field at every depth, a name above all', () => {
    expect(accepts({ fullName: 'x' })).toBe(false);
    expect(acceptsRow({ fullName: 'x' })).toBe(false);
    expect(acceptsType({ attendedHours: 8 })).toBe(false);
  });

  it('keeps its fields consistent with each other', () => {
    // The source and the output kind.
    expect(accepts({ outputKind: 'EXCEL' })).toBe(false);
    expect(accepts({ source: 'LECTURER_OUTPUT' })).toBe(false);
    expect(accepts({ source: 'LECTURER_OUTPUT', outputKind: 'EXCEL' })).toBe(true);
    // Provisional exactly with a reason, each reason once.
    expect(accepts({ provisional: false })).toBe(false);
    expect(accepts({ provisionalReasons: [] })).toBe(false);
    expect(accepts({ provisional: false, provisionalReasons: [] })).toBe(true);
    const twice = ['DECISION_PENDING_STUDENT', 'DECISION_PENDING_STUDENT'];
    expect(accepts({ provisionalReasons: twice })).toBe(false);
    expect(acceptsRow({ decisionPendingReasons: ['OPEN_FLAG', 'OPEN_FLAG'] })).toBe(false);
    // After the lock only the surviving reasons remain; a lecturer's output may list others.
    const running = { provisionalReasons: ['SENDING_TIME_RUNNING'] };
    expect(accepts(running)).toBe(false);
    expect(accepts({ ...running, source: 'LECTURER_OUTPUT', outputKind: 'PRINT' })).toBe(true);
    expect(accepts({ provisionalReasons: ['UNANSWERED_SESSIONS'] })).toBe(true);
    // A rate exactly while hours are held.
    expect(acceptsType({ heldHours: 0, absentHours: 0, excusedHours: 0 })).toBe(false);
    expect(
      acceptsType({ heldHours: 0, absentHours: 0, excusedHours: 0, attendedPerMille: null }),
    ).toBe(true);
    expect(acceptsType({ attendedPerMille: null })).toBe(false);
  });

  it('keeps every row: the job writes a section whatever its size', () => {
    const rows = Array.from({ length: FULL_LIST_DEFAULT_MAX + 1 }, () => row);
    expect(accepts({ rows })).toBe(true);
  });
});

describe('the end-of-day snapshot job', () => {
  it('takes both ids from the lock step, or none for the safety net, internal ids only', () => {
    const data = endOfDaySnapshotJobDataSchema;
    expect(ok(data, { unitId: id(1), termId: id(2) })).toBe(true);
    expect(ok(data, {})).toBe(true);
    expect(ok(data, { unitId: id(1) })).toBe(false);
    expect(ok(data, { termId: id(2) })).toBe(false);
    expect(ok(data, { unitId: id(1), termId: id(2), studentNumber: '0123456789' })).toBe(false);
    expect(ok(data, { unitId: 'unit', termId: id(2) })).toBe(false);
  });
});

describe('reports error catalog and audit', () => {
  it('answers 404 for a resource not seen, 400 for a range and 409 otherwise', () => {
    const statuses = Object.fromEntries(
      Object.entries(REPORTS_ERROR_CODES).map(([code, definition]) => [code, definition.http]),
    );
    expect(statuses).toEqual({
      REPORTS_NOT_FOUND: 404,
      REPORTS_DATE_RANGE_INVALID: 400,
      REPORTS_UNANSWERED_SESSIONS: 409,
      REPORTS_SUMMARY_CHANGED: 409,
      REPORTS_ID_CONFLICT: 409,
      REPORTS_TERM_NOT_LOCKED: 409,
    });
    // A student meets these routes only at the role check: the spec's one general text.
    const studentTexts = new Set(
      Object.values(REPORTS_ERROR_CODES).map((definition) => JSON.stringify(definition.student)),
    );
    expect(studentTexts.size).toBe(1);
    expect(REPORTS_ERROR_CODES.REPORTS_NOT_FOUND.student.tr).toBe(
      'Bu bilgi öğrenci hesabıyla görüntülenemez.',
    );
  });

  it('details a refused range by its reason, a block by its sessions, a change by its digest', () => {
    const codes = REPORTS_ERROR_CODES;
    const range = codes.REPORTS_DATE_RANGE_INVALID.details;
    expect(ok(range, { reason: 'REVERSED' })).toBe(true);
    expect(extensibleAt(range, '.reason')).toEqual([[...DATE_RANGE_PROBLEMS]]);
    const blocked = codes.REPORTS_UNANSWERED_SESSIONS.details;
    const session = { sessionId: id(1), classDay: DAY, startTime: '09:00' };
    expect(ok(blocked, { sessions: [session] })).toBe(true);
    expect(ok(blocked, { sessions: [{ ...session, startTime: '9:00' }] })).toBe(false);
    const changed = codes.REPORTS_SUMMARY_CHANGED.details;
    expect(ok(changed, { summaryDigest: DIGEST })).toBe(true);
    expect(ok(changed, { summaryDigest: DIGEST.toUpperCase() })).toBe(false);
    // Ground control: the other codes carry none.
    const detailed = Object.entries(codes)
      .filter(([, definition]) => 'details' in definition && definition.details !== undefined)
      .map(([code]) => code);
    expect(detailed).toEqual([
      'REPORTS_DATE_RANGE_INVALID',
      'REPORTS_UNANSWERED_SESSIONS',
      'REPORTS_SUMMARY_CHANGED',
    ]);
  });

  it('writes no audit event', () => {
    expect(REPORTS_AUDIT_EVENTS).toEqual({});
  });
});
