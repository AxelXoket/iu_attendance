import { CORRECTION_REASONS, ISSUE_REASONS } from '@iu-attendance/core/corrections/catalog';
import { DIGEST_DOCUMENT_NUMBER_FIELD } from '@iu-attendance/core/corrections/request-digest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  auditEventInputSchema,
  CORRECTION_REASON_CODES,
  CORRECTIONS_AUDIT_CHANGES,
  CORRECTIONS_AUDIT_EVENTS,
  CORRECTIONS_ERROR_CODES,
  CORRECTIONS_ITEM_CODES,
  CORRECTIONS_ROUTES,
  ISSUE_REASON_CODES,
  ISSUE_REPORT_ITEM,
  MANUAL_ADD_ITEM,
  QUEUE_REASON_CODES,
} from '../corrections.ts';
import {
  defineRoute,
  FULL_LIST_MAX_META,
  REQUEST_ITEMS_MAX,
  type RouteDefinition,
} from '../shared/index.ts';
import { id, ok } from './helpers.ts';
import { objectsIn, schemasIn, unknownKeys } from './schema-walk.ts';

const routes = Object.entries(CORRECTIONS_ROUTES) as [string, RouteDefinition][];

// A valid UUID of version 4, which no row id has.
const V4_ID = '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e';

// The 16 endpoints of the spec (contracts.json owns_endpoints), in English.
const SPEC_ENDPOINTS = [
  'POST /v1/corrections',
  'GET /v1/corrections',
  'POST /v1/corrections/{correctionId}/undo',
  'GET /v1/corrections/approvals/summary',
  'GET /v1/corrections/self-declared',
  'POST /v1/corrections/self-declared/decisions',
  'GET /v1/corrections/confirmations',
  'POST /v1/corrections/confirmations/decisions',
  'GET /v1/corrections/reviews',
  'POST /v1/corrections/reviews/decisions',
  'GET /v1/corrections/flagged-sessions',
  'POST /v1/corrections/flagged-sessions/{sessionId}/reviewed',
  'GET /v1/corrections/issue-reports',
  'POST /v1/corrections/issue-reports/{issueReportId}/close',
  'GET /v1/corrections/later-changes',
  'GET /v1/corrections/audit',
];

// Each route's own error answers, from the spec's endpoint list.
const SPEC_ROUTE_ERRORS: Record<string, string[]> = {
  addCorrections: [],
  listCorrections: ['CORRECTIONS_CURSOR_INVALID', 'CORRECTIONS_NOT_FOUND'],
  undoCorrection: [
    'CORRECTIONS_NOT_FOUND',
    'CORRECTIONS_CORRECTION_CHANGED',
    'CORRECTIONS_ALREADY_REVERSED',
    'CORRECTIONS_ID_CONFLICT',
    'CORRECTIONS_SNAPSHOT_PENDING',
  ],
  approvalSummary: [],
  listSelfDeclared: ['CORRECTIONS_NOT_FOUND'],
  decideSelfDeclared: [],
  listConfirmations: ['CORRECTIONS_NOT_FOUND'],
  decideConfirmations: [],
  listReviews: ['CORRECTIONS_NOT_FOUND'],
  decideReviews: [],
  listFlaggedSessions: ['CORRECTIONS_NOT_FOUND'],
  markFlaggedSessionReviewed: ['CORRECTIONS_NOT_FOUND', 'CORRECTIONS_ALREADY_REVIEWED'],
  listIssueReports: ['CORRECTIONS_CURSOR_INVALID', 'CORRECTIONS_NOT_FOUND'],
  closeIssueReport: ['CORRECTIONS_NOT_FOUND', 'CORRECTIONS_REPORT_NOT_OPEN'],
  listLaterChanges: ['CORRECTIONS_CURSOR_INVALID', 'CORRECTIONS_NOT_FOUND'],
  listAuditEvents: ['CORRECTIONS_CURSOR_INVALID', 'CORRECTIONS_NOT_FOUND'],
};

// The codes only a phone queue item returns (marked "kuyruk" in the spec's catalog).
const QUEUE_ONLY_CODES = [
  'CORRECTIONS_ITEM_INVALID',
  'CORRECTIONS_NOT_AUTHORIZED',
  'CORRECTIONS_OPEN_REPORT_EXISTS',
  'CORRECTIONS_REPORT_REPEATED',
  'CORRECTIONS_REPORT_EXPIRED',
];

describe('corrections routes', () => {
  it('are the 16 spec endpoints, each named by its key under /v1/corrections', () => {
    expect(routes.map(([, route]) => `${route.method} ${route.path}`)).toEqual(SPEC_ENDPOINTS);
    for (const [key, route] of routes) {
      expect(route.name).toBe(key);
      expect(route.module).toBe('corrections');
      expect(defineRoute(route)).toBe(route);
    }
  });

  it('take a session from every route, open no write on GET, and rate the two live lists heavy', () => {
    for (const [key, route] of routes) {
      expect(route.auth, key).toEqual(['session']);
      if (route.method === 'GET') expect(route.writesOnRead, key).toBeUndefined();
      const heavy = key === 'listConfirmations' || key === 'listLaterChanges';
      expect(route.rate, key).toBe(heavy ? 'heavy' : 'session');
      const adminReads = key === 'listCorrections' || key === 'listAuditEvents';
      expect(route.roles, key).toEqual(adminReads ? ['lecturer', 'admin'] : ['lecturer']);
    }
  });

  it('give the four multi-item routes a 256 KiB body and at most 200 items', () => {
    const multi = Object.keys(CORRECTIONS_ITEM_CODES);
    expect(multi.sort()).toEqual(
      ['addCorrections', 'decideConfirmations', 'decideReviews', 'decideSelfDeclared'].sort(),
    );
    for (const [key, route] of routes) {
      expect(route.bodyLimit, key).toBe(multi.includes(key) ? 256 * 1024 : undefined);
    }
    const body = CORRECTIONS_ROUTES.decideSelfDeclared.request.body;
    const item = (n: number) => ({
      record: { termId: id(1), recordId: id(1000 + n) },
      decision: 'APPROVE',
    });
    const items = (count: number) => Array.from({ length: count }, (_, n) => item(n));
    expect(ok(body, { operationId: id(3), items: items(REQUEST_ITEMS_MAX) })).toBe(true);
    expect(ok(body, { operationId: id(3), items: items(REQUEST_ITEMS_MAX + 1) })).toBe(false);
    expect(ok(body, { operationId: id(3), items: [] })).toBe(false);
  });

  it('take each record or student once in a decision request, in any letter case', () => {
    const record = { termId: id(1), recordId: id(2) };
    const upper = { ...record, recordId: id(2).toUpperCase() };
    const self = CORRECTIONS_ROUTES.decideSelfDeclared.request.body;
    const selfItems = (second: typeof record) => [
      { record, decision: 'APPROVE' },
      { record: second, decision: 'REJECT' },
    ];
    expect(ok(self, { operationId: id(9), items: selfItems({ ...record, recordId: id(3) }) })).toBe(
      true,
    );
    expect(ok(self, { operationId: id(9), items: selfItems(record) })).toBe(false);
    expect(ok(self, { operationId: id(9), items: selfItems(upper) })).toBe(false);
    const review = (recordId: string) => ({
      record: { ...record, recordId },
      context: 'REVIEW',
      expectedDecision: 'IN_REVIEW',
      newDecision: 'PRESENT',
    });
    const reviews = CORRECTIONS_ROUTES.decideReviews.request.body;
    expect(ok(reviews, { operationId: id(9), items: [review(id(2)), review(id(3))] })).toBe(true);
    expect(ok(reviews, { operationId: id(9), items: [review(id(2)), review(id(2))] })).toBe(false);
    const confirm = (studentId: string) => ({
      studentId,
      decision: 'CONFIRM',
      bulk: false,
      rejectReason: null,
    });
    const confirmations = CORRECTIONS_ROUTES.decideConfirmations.request.body;
    expect(ok(confirmations, { operationId: id(9), items: [confirm(id(4)), confirm(id(5))] })).toBe(
      true,
    );
    const twice = [confirm(id(4)), confirm(id(4).toUpperCase())];
    expect(ok(confirmations, { operationId: id(9), items: twice })).toBe(false);
  });

  it('drop unknown keys in every request object and keep the audit objects strict (D13-B24)', () => {
    const requestObjects = routes.flatMap(([, route]) =>
      Object.values(route.request).flatMap((part) => (part ? objectsIn(part) : [])),
    );
    // Ground control: the walk reaches an object inside the items of a body.
    const reviewItem = CORRECTIONS_ROUTES.decideReviews.request.body.shape.items.element;
    expect(requestObjects).toContain(reviewItem.shape.record);
    for (const schema of requestObjects) expect(unknownKeys(schema)).toBe('strip');
    const auditObjects = [
      ...objectsIn(auditEventInputSchema),
      ...Object.values(CORRECTIONS_AUDIT_EVENTS).flatMap(objectsIn),
      ...Object.values(CORRECTIONS_AUDIT_CHANGES).flatMap(({ before, after }) =>
        [before, after].flatMap((state) => (state ? objectsIn(state) : [])),
      ),
    ];
    // Ground control: the envelope with its three actor options, record and target; eleven
    // details; three before and after pairs.
    expect(auditObjects.length).toBe(6 + 11 + 3 * 2);
    for (const schema of auditObjects) expect(unknownKeys(schema)).toBe('strict');
    // Positive controls: the classifier tells the three kinds apart.
    expect(unknownKeys(z.object({}))).toBe('strip');
    expect(unknownKeys(z.strictObject({}))).toBe('strict');
    expect(unknownKeys(z.looseObject({}))).toBe('keep');
  });
});

describe('corrections error catalog', () => {
  const codes = Object.entries(CORRECTIONS_ERROR_CODES);

  it('has 35 codes: one 400, one 404, six 409 and 27 item codes', () => {
    expect(codes).toHaveLength(35);
    const byStatus = (http: number | null) =>
      codes.filter(([, definition]) => definition.http === http).map(([code]) => code);
    expect(byStatus(400)).toEqual(['CORRECTIONS_CURSOR_INVALID']);
    expect(byStatus(404)).toEqual(['CORRECTIONS_NOT_FOUND']);
    expect(byStatus(409).sort()).toEqual(
      [
        'CORRECTIONS_CORRECTION_CHANGED',
        'CORRECTIONS_ALREADY_REVERSED',
        'CORRECTIONS_ID_CONFLICT',
        'CORRECTIONS_REPORT_NOT_OPEN',
        'CORRECTIONS_ALREADY_REVIEWED',
        'CORRECTIONS_SNAPSHOT_PENDING',
      ].sort(),
    );
    expect(byStatus(null)).toHaveLength(27);
  });

  it('gives every code texts for both audiences in both languages, without digits or placeholders', () => {
    for (const [code, definition] of codes) {
      for (const text of [definition.lecturer, definition.student]) {
        expect(text, code).not.toBeNull();
        for (const value of Object.values(text ?? {})) {
          expect(value.trim(), code).not.toBe('');
          expect(value, code).not.toMatch(/[0-9{}]/);
        }
      }
    }
  });

  it('lists on each route exactly its spec error answers', () => {
    for (const [key, route] of routes) expect(route.errors, key).toEqual(SPEC_ROUTE_ERRORS[key]);
  });

  it('reaches every item code from a multi-item route or a queue item, and no other code', () => {
    const itemCodes = new Set<string>([
      ...Object.values(CORRECTIONS_ITEM_CODES).flat(),
      ...QUEUE_ONLY_CODES,
    ]);
    for (const code of itemCodes) expect(Object.keys(CORRECTIONS_ERROR_CODES)).toContain(code);
    const itemOnly = codes.filter(([, definition]) => definition.http === null).map(([c]) => c);
    for (const code of itemOnly) expect(itemCodes.has(code), code).toBe(true);
    // A retry comes only from the two transient codes.
    expect(CORRECTIONS_ITEM_CODES.addCorrections).toContain('CORRECTIONS_SNAPSHOT_PENDING');
    for (const list of Object.values(CORRECTIONS_ITEM_CODES)) {
      expect(list).toContain('CORRECTIONS_TRANSIENT_CONFLICT');
    }
  });
});

describe('corrections reason codes', () => {
  it('derive from the core catalog, the queue list from selectableInQueue', () => {
    expect(CORRECTION_REASON_CODES).toEqual(CORRECTION_REASONS.map(({ code }) => code));
    expect(ISSUE_REASON_CODES).toEqual(ISSUE_REASONS.map(({ code }) => code));
    expect(QUEUE_REASON_CODES).toEqual(
      CORRECTION_REASONS.filter((entry) => entry.selectableInQueue).map(({ code }) => code),
    );
    expect(QUEUE_REASON_CODES).toEqual([
      'PHONE_MISSING_OR_BROKEN',
      'QR_SCAN_FAILED',
      'MAKEUP_NOT_ON_PHONE',
    ]);
  });
});

describe('corrections requests', () => {
  const correction = {
    id: id(1),
    sessionId: id(2),
    rosterRowId: id(3),
    reasonCode: 'OFFICIAL_DUTY',
    documentNumber: 'GR-12',
    theoryHours: null,
    practiceHours: 1,
    previousCorrectionId: null,
    issueReportId: null,
    record: null,
  };
  const addBody = CORRECTIONS_ROUTES.addCorrections.request.body;
  const add = (patch: Record<string, unknown>) =>
    ok(addBody, { operationId: id(9), items: [{ ...correction, ...patch }] });

  it('take a correction item with the request digest field name and closed codes', () => {
    expect(add({})).toBe(true);
    const shape = (addBody.shape.items.element as z.ZodObject).shape;
    expect(Object.keys(shape)).toContain(DIGEST_DOCUMENT_NUMBER_FIELD);
    expect(add({ reasonCode: 'A_CODE_ADDED_LATER' })).toBe(false);
    expect(add({ id: V4_ID })).toBe(false);
    expect(add({ previousCorrectionId: id(4), issueReportId: id(5) })).toBe(true);
    // A record id is always a UUIDv7, so another version is a malformed request.
    expect(add({ record: { termId: id(6), recordId: V4_ID } })).toBe(false);
    expect(add({ record: { termId: id(6), recordId: id(7) } })).toBe(true);
  });

  it('bound hours to whole numbers from 0 to 24 and leave the session bound to the item', () => {
    for (const hours of [0, 24, null])
      expect(add({ theoryHours: hours }), String(hours)).toBe(true);
    for (const hours of [-1, 25, 1.5])
      expect(add({ theoryHours: hours }), String(hours)).toBe(false);
  });

  it('bound the raw document number before normalization, and leave the rule to the item', () => {
    expect(add({ documentNumber: 'x'.repeat(256) })).toBe(true);
    expect(add({ documentNumber: 'x'.repeat(257) })).toBe(false);
    // Blank or missing on a documented reason is an item code, not a 400.
    expect(add({ documentNumber: '   ' })).toBe(true);
    expect(add({ documentNumber: null })).toBe(true);
  });

  it('let a rejection of an account name its reason and never be bulk', () => {
    const body = CORRECTIONS_ROUTES.decideConfirmations.request.body;
    const decide = (item: Record<string, unknown>) =>
      ok(body, { operationId: id(9), items: [{ studentId: id(1), ...item }] });
    expect(decide({ decision: 'CONFIRM', bulk: true, rejectReason: null })).toBe(true);
    expect(decide({ decision: 'CONFIRM', bulk: false, rejectReason: null })).toBe(true);
    expect(decide({ decision: 'REJECT', bulk: false, rejectReason: 'NOT_THIS_STUDENT' })).toBe(
      true,
    );
    expect(decide({ decision: 'CONFIRM', bulk: false, rejectReason: 'OTHER' })).toBe(false);
    expect(decide({ decision: 'REJECT', bulk: false, rejectReason: null })).toBe(false);
    expect(decide({ decision: 'REJECT', bulk: true, rejectReason: 'OTHER' })).toBe(false);
  });

  it('decide a record in review, or turn present into rejected and back', () => {
    const body = CORRECTIONS_ROUTES.decideReviews.request.body;
    const decide = (context: string, expectedDecision: string, newDecision: string) =>
      ok(body, {
        operationId: id(9),
        items: [
          { record: { termId: id(1), recordId: id(2) }, context, expectedDecision, newDecision },
        ],
      });
    expect(decide('REVIEW', 'IN_REVIEW', 'PRESENT')).toBe(true);
    expect(decide('REVIEW', 'IN_REVIEW', 'REJECTED')).toBe(true);
    expect(decide('CHANGE_DECISION', 'PRESENT', 'REJECTED')).toBe(true);
    expect(decide('CHANGE_DECISION', 'REJECTED', 'PRESENT')).toBe(true);
    expect(decide('REVIEW', 'PRESENT', 'REJECTED')).toBe(false);
    expect(decide('CHANGE_DECISION', 'PRESENT', 'PRESENT')).toBe(false);
    expect(decide('CHANGE_DECISION', 'IN_REVIEW', 'PRESENT')).toBe(false);
    expect(decide('REVIEW', 'IN_REVIEW', 'PENDING')).toBe(false);
  });

  it('read the query defaults and the strict true or false of activeOnly', () => {
    const list = CORRECTIONS_ROUTES.listCorrections.request.query;
    expect(list.parse({}).activeOnly).toBe(false);
    expect(list.parse({ activeOnly: 'true' }).activeOnly).toBe(true);
    expect(list.parse({ activeOnly: 'false' }).activeOnly).toBe(false);
    expect(ok(list, { activeOnly: 'yes' })).toBe(false);
    expect(CORRECTIONS_ROUTES.listReviews.request.query.parse({}).view).toBe('TODAY');
    expect(CORRECTIONS_ROUTES.listIssueReports.request.query.parse({}).view).toBe('OPEN');
    const later = CORRECTIONS_ROUTES.listLaterChanges.request.query;
    expect(ok(later, {})).toBe(false);
    expect(ok(later, { courseId: id(1), part: 'RESULT_CHANGED' })).toBe(true);
  });

  it('take a record term in the audit filter only with its record', () => {
    const query = CORRECTIONS_ROUTES.listAuditEvents.request.query;
    expect(ok(query, { recordTermId: id(1), recordId: id(2) })).toBe(true);
    expect(ok(query, { recordId: id(2) })).toBe(true);
    expect(ok(query, { recordTermId: id(1) })).toBe(false);
    expect(ok(query, { eventType: 'corrections.' })).toBe(true);
    expect(ok(query, { eventType: 'x'.repeat(97) })).toBe(false);
  });
});

describe('corrections answers', () => {
  const correctionAnswer = {
    id: id(1),
    operationId: id(2),
    kind: 'CORRECTION',
    reasonCode: 'QR_SCAN_FAILED',
    finalStatus: 'MANUALLY_ADDED',
    unitId: null,
    courseId: id(3),
    sessionId: id(4),
    rosterRowId: id(5),
    record: null,
    documentNumber: null,
    theoryHours: 2,
    practiceHours: 0,
    previousCorrectionId: null,
    issueReportId: null,
    source: 'PHONE_QUEUE',
    actorPersonId: id(6),
    clientLowerAt: '2026-10-12T08:00:00.000Z',
    clientUpperAt: '2026-10-12T08:00:01.000Z',
    clockSource: 'BOTH_ANCHORS',
    arrivedAt: '2026-10-12T08:00:05.000Z',
    createdAt: '2026-10-12T08:00:06.000Z',
  };

  it('carry the correction on an item result, and accept values added later', () => {
    const answer = CORRECTIONS_ROUTES.addCorrections.response.schema;
    const result = { id: id(1), result: 'ACCEPTED', code: null, correction: correctionAnswer };
    expect(ok(answer, { operationId: id(2), results: [result] })).toBe(true);
    expect(ok(answer, { results: [result] })).toBe(false);
    const later = { ...correctionAnswer, source: 'A_SOURCE_ADDED_LATER', kind: 'NEW_KIND' };
    expect(
      ok(answer, {
        operationId: id(2),
        results: [{ ...result, result: 'A_RESULT_ADDED_LATER', correction: later }],
      }),
    ).toBe(true);
    expect(
      ok(answer, {
        operationId: id(2),
        results: [
          { id: id(1), result: 'REJECTED', code: 'CORRECTIONS_HOURS_INVALID', correction: null },
        ],
      }),
    ).toBe(true);
  });

  it('carry the new decision and the counted flag on a review result', () => {
    const answer = CORRECTIONS_ROUTES.decideReviews.response.schema;
    const result = {
      id: id(1),
      result: 'ACCEPTED',
      code: null,
      newDecision: 'PRESENT',
      counted: false,
    };
    expect(ok(answer, { operationId: id(2), results: [result] })).toBe(true);
    expect(ok(answer, { operationId: id(2), results: [{ ...result, counted: 'no' }] })).toBe(false);
  });

  it('mark the class-sized row lists, never the session or group lists', () => {
    const marked = (schema: z.ZodType) =>
      schemasIn(schema)
        .filter((node) => node.meta()?.[FULL_LIST_MAX_META] !== undefined)
        .map((node) => objectsIn(node)[0]);
    const rowFields = (schema: z.ZodType) =>
      marked(schema).map((row) => Object.keys(row?.shape ?? {}).slice(0, 2));
    // Record rows inside the sessions; the sessions themselves are groups.
    expect(rowFields(CORRECTIONS_ROUTES.listSelfDeclared.response.schema)).toEqual([
      ['record', 'rosterRowId'],
    ]);
    expect(marked(CORRECTIONS_ROUTES.listConfirmations.response.schema)).toHaveLength(4);
    expect(marked(CORRECTIONS_ROUTES.listReviews.response.schema)).toHaveLength(1);
    expect(marked(CORRECTIONS_ROUTES.listIssueReports.response.schema)).toHaveLength(1);
    // The flagged sessions list has no size limit in the spec.
    expect(marked(CORRECTIONS_ROUTES.listFlaggedSessions.response.schema)).toHaveLength(0);
  });

  it('tell the three parts of the later changes apart', () => {
    const answer = CORRECTIONS_ROUTES.listLaterChanges.response.schema;
    const record = { termId: id(1), recordId: id(2) };
    const row = { rosterRowId: id(3), studentFullName: 'Ada' };
    const items = [
      {
        part: 'WOULD_CHANGE_IF_COUNTED',
        ...row,
        record,
        sessionId: id(4),
        arrivedAt: '2026-10-12T08:00:00.000Z',
        action: {
          route: 'POST /v1/corrections',
          suggestedReasonCode: 'BASED_ON_STATEMENT',
          record,
        },
      },
      {
        part: 'RESULT_CHANGED',
        ...row,
        resultType: 'OVERALL',
        baseResult: 'MET',
        currentResult: 'NOT_MET',
        baseAt: '2026-10-12T08:00:00.000Z',
        changeClass: 'UNJUSTIFIED',
        sources: [],
      },
    ];
    const lock = { locked: true, lockAt: '2026-10-11T21:00:00.000Z' };
    const late = {
      part: 'LATE_ARRIVED',
      ...row,
      record,
      sessionId: id(4),
      sessionStartAt: '2026-10-12T08:00:00.000Z',
      reason: 'ARRIVED_LATE',
      arrivedAt: '2026-10-14T08:00:00.000Z',
      decidedAt: null,
      sendWindowEndAt: '2026-10-13T08:00:00.000Z',
      decision: 'PRESENT',
    };
    expect(ok(answer, { items: [...items, late], nextCursor: null, lock })).toBe(true);
    const wrongPart = { ...items[1], part: 'LATE_ARRIVED' };
    expect(ok(answer, { items: [wrongPart], nextCursor: null, lock })).toBe(false);
    // A part added later reaches an older client as a row it can skip.
    const added = { part: 'A_PART_ADDED_LATER', anything: 1 };
    expect(ok(answer, { items: [added], nextCursor: null, lock })).toBe(true);
  });
});

describe('corrections answers, one valid sample each', () => {
  const at = '2026-10-12T08:00:00.000Z';
  const record = { termId: id(1), recordId: id(2) };
  const correction = {
    id: id(10),
    operationId: id(11),
    kind: 'CORRECTION',
    reasonCode: 'OFFICIAL_DUTY',
    finalStatus: 'ON_DUTY',
    unitId: id(12),
    courseId: id(13),
    sessionId: id(14),
    rosterRowId: id(15),
    record,
    documentNumber: 'GR-12',
    theoryHours: 2,
    practiceHours: 0,
    previousCorrectionId: null,
    issueReportId: null,
    source: 'PANEL',
    actorPersonId: id(16),
    clientLowerAt: null,
    clientUpperAt: null,
    clockSource: null,
    arrivedAt: null,
    createdAt: at,
  };
  const reversal = {
    ...correction,
    id: id(17),
    kind: 'REVERSAL',
    reasonCode: null,
    finalStatus: null,
    documentNumber: null,
    theoryHours: null,
    practiceHours: null,
    previousCorrectionId: id(10),
  };
  const issueReport = {
    id: id(20),
    courseId: id(13),
    sessionId: id(14),
    studentId: id(21),
    rosterRowId: null,
    record: null,
    issueReasonCode: 'RECORD_IN_WRONG_COURSE',
    status: 'OPEN',
    clientLowerAt: at,
    arrivedAt: at,
    windowEndAt: at,
    closedAt: null,
    closedByPersonId: null,
    correctionId: null,
  };
  const check = (key: keyof typeof CORRECTIONS_ROUTES, answer: unknown) => {
    const schema = CORRECTIONS_ROUTES[key].response.schema;
    const result = schema.safeParse(answer);
    expect(result.success, `${key}: ${JSON.stringify(result.error?.issues[0])}`).toBe(true);
  };

  it('parse a valid answer of every reading route', () => {
    check('listCorrections', {
      items: [
        {
          ...correction,
          sessionStartAt: at,
          studentFullName: 'Ada',
          active: true,
          afterLock: false,
        },
      ],
      nextCursor: null,
    });
    check('undoCorrection', {
      reversal,
      reversed: correction,
      reopenedIssueReportId: null,
    });
    check('approvalSummary', {
      selfDeclared: 1,
      confirmations: { bulk: 2, oneByOne: 0 },
      reviews: 3,
      issueReports: 0,
      flaggedSessions: 1,
      headCountPendingSessions: 2,
      todaysBatch: { day: null, total: 0, remaining: 0 },
      total: 7,
    });
    const sessionRef = { sessionId: id(14), courseId: id(13), startAt: at };
    check('listSelfDeclared', {
      sessions: [
        {
          ...sessionRef,
          courseName: 'Fizik',
          records: [
            { record, rosterRowId: id(15), studentFullName: 'Ada', arrivedAt: at, labels: [] },
          ],
        },
      ],
      headCountPendingSessions: [sessionRef],
      total: 1,
    });
    const account = {
      studentId: id(21),
      studentNumber: '0123456789',
      rosterFullName: 'Ada Yılmaz',
      enteredFullName: null,
      courses: [{ courseId: id(13), courseName: 'Fizik' }],
      registeredAt: at,
    };
    check('listConfirmations', {
      bulk: [account],
      unverifiedDevice: [],
      nameMismatch: [{ ...account, enteredFullName: 'Ada Yilmaz' }],
      sameNumber: [{ studentNumber: '0123456789', rosterFullName: 'Ada', accounts: [account] }],
      total: 2,
    });
    check('listReviews', {
      day: '2026-10-12',
      items: [
        {
          record,
          sessionId: id(14),
          courseId: id(13),
          courseName: 'Fizik',
          sessionStartAt: at,
          rosterRowId: id(15),
          studentFullName: 'Ada',
          decisionReason: 'HEAD_COUNT_EXCEEDED',
          labels: ['NEW_LABEL'],
          arrivedAt: at,
          decidedAt: at,
          batchPosition: 1,
          critical: true,
        },
      ],
      headCountPendingSessions: [],
      total: 1,
    });
    check('markFlaggedSessionReviewed', { sessionId: id(14), flagId: id(19), reviewedAt: at });
    const listed = {
      ...issueReport,
      courseName: 'Fizik',
      sessionStartAt: at,
      studentFullName: 'Ada',
      recordDecision: null,
      suggestedReasonCode: null,
      batchPosition: null,
      critical: null,
    };
    check('listIssueReports', { items: [listed], nextCursor: null, day: null });
    check('closeIssueReport', {
      issueReport: { ...issueReport, status: 'NO_CHANGE', closedAt: at, closedByPersonId: id(16) },
    });
    check('listAuditEvents', {
      items: [
        {
          id: id(18),
          eventType: 'corrections.correction_added',
          at,
          actor: { kind: 'SYSTEM', personId: null, role: null, fullName: null },
          client: 'server',
          operationId: null,
          clientAt: null,
          termId: null,
          unitId: null,
          courseId: null,
          sessionId: null,
          studentId: null,
          rosterRowId: null,
          record: null,
          target: { kind: 'CORRECTION', id: id(10) },
          code: 'OFFICIAL_DUTY',
          before: null,
          after: { decision: 'PRESENT' },
          details: {},
        },
      ],
      nextCursor: null,
    });
  });

  it('refuse an unpaged issue report view beyond 2,000 rows rather than cutting it', () => {
    const schema = CORRECTIONS_ROUTES.listIssueReports.response.schema;
    const listed = {
      ...issueReport,
      courseName: 'Fizik',
      sessionStartAt: at,
      studentFullName: 'Ada',
      recordDecision: null,
      suggestedReasonCode: null,
      batchPosition: null,
      critical: null,
    };
    const rows = (count: number) => Array.from({ length: count }, () => listed);
    expect(ok(schema, { items: rows(2000), nextCursor: null, day: null })).toBe(true);
    expect(ok(schema, { items: rows(2001), nextCursor: null, day: null })).toBe(false);
  });
});

describe('corrections queue items', () => {
  it('take a manual add only with a code the queue may send', () => {
    expect(MANUAL_ADD_ITEM.type).toBe('manual_add');
    expect(MANUAL_ADD_ITEM.module).toBe('corrections');
    const item = {
      id: id(1),
      sessionId: id(2),
      rosterRowId: id(3),
      reasonCode: 'PHONE_MISSING_OR_BROKEN',
      theoryHours: null,
      practiceHours: null,
    };
    expect(ok(MANUAL_ADD_ITEM.body, item)).toBe(true);
    for (const reasonCode of ['BASED_ON_STATEMENT', 'PARTIAL_ATTENDANCE', 'OFFICIAL_DUTY']) {
      expect(ok(MANUAL_ADD_ITEM.body, { ...item, reasonCode }), reasonCode).toBe(false);
    }
  });

  it('take the decision version of an issue report as a JSON number of at least 1', () => {
    expect(ISSUE_REPORT_ITEM.type).toBe('issue_report');
    expect(ISSUE_REPORT_ITEM.module).toBe('corrections');
    const item = {
      id: id(1),
      sessionId: id(2),
      record: { termId: id(3), recordId: id(4) },
      decisionVersion: 3,
      issueReasonCode: 'QR_SCAN_FAILED',
    };
    expect(ok(ISSUE_REPORT_ITEM.body, item)).toBe(true);
    expect(ok(ISSUE_REPORT_ITEM.body, { ...item, record: null, decisionVersion: null })).toBe(true);
    expect(ok(ISSUE_REPORT_ITEM.body, { ...item, decisionVersion: null })).toBe(true);
    // A decision version belongs to a record.
    expect(ok(ISSUE_REPORT_ITEM.body, { ...item, record: null })).toBe(false);
    expect(ok(ISSUE_REPORT_ITEM.body, { ...item, decisionVersion: '3' })).toBe(false);
    expect(ok(ISSUE_REPORT_ITEM.body, { ...item, decisionVersion: 0 })).toBe(false);
    expect(ok(ISSUE_REPORT_ITEM.body, { ...item, issueReasonCode: 'OTHER' })).toBe(false);
  });
});

describe('the audit event envelope', () => {
  const event = {
    type: 'corrections.correction_added',
    at: new Date(0),
    actor: { kind: 'PERSON', personId: id(1), role: 'lecturer' },
    client: 'panel',
    courseId: id(2),
    unitId: id(3),
    target: { kind: 'CORRECTION', id: id(4) },
    code: 'OFFICIAL_DUTY',
    details: {},
  };

  it('takes an event of any module, a system actor, and a course with or without a unit', () => {
    expect(ok(auditEventInputSchema, event)).toBe(true);
    expect(ok(auditEventInputSchema, { ...event, type: 'courses.course_opened' })).toBe(true);
    expect(ok(auditEventInputSchema, { ...event, unitId: null })).toBe(true);
    const system = { ...event, actor: { kind: 'SYSTEM' }, client: 'server' };
    expect(ok(auditEventInputSchema, system)).toBe(true);
  });

  it('refuses a course without its unit, a malformed type, a loose actor and an unknown field', () => {
    const { unitId: _unit, ...withoutUnit } = event;
    expect(ok(auditEventInputSchema, withoutUnit)).toBe(false);
    const { courseId: _course, ...withoutCourse } = withoutUnit;
    expect(ok(auditEventInputSchema, withoutCourse)).toBe(true);
    // Each type breaks one rule only: an unknown module, no event, an upper-case or a
    // one-letter event, three parts.
    for (const type of [
      'nomodule.correction_added',
      'corrections',
      'corrections.Correction_added',
      'corrections.x',
      'corrections.correction_added.extra',
    ]) {
      expect(ok(auditEventInputSchema, { ...event, type }), type).toBe(false);
    }
    expect(
      ok(auditEventInputSchema, { ...event, actor: { kind: 'SYSTEM', personId: id(1) } }),
    ).toBe(false);
    expect(
      ok(auditEventInputSchema, { ...event, actor: { kind: 'PERSON', personId: id(1) } }),
    ).toBe(false);
    expect(ok(auditEventInputSchema, { ...event, studentNumber: '123456789' })).toBe(false);
  });

  it('keeps the bounds of the audit table, so a wrong value fails before the write', () => {
    const accepts = (patch: Record<string, unknown>) =>
      ok(auditEventInputSchema, { ...event, ...patch });
    expect(accepts({ requestId: 'r'.repeat(64) })).toBe(true);
    expect(accepts({ requestId: 'r'.repeat(65) })).toBe(false);
    for (const kind of ['CORRECTION', 'correction', `A${'B'.repeat(39)}`]) {
      expect(accepts({ target: { kind, id: id(4) } }), kind).toBe(true);
    }
    for (const kind of ['', '1A', 'A-B', `A${'B'.repeat(40)}`]) {
      expect(accepts({ target: { kind, id: id(4) } }), kind).toBe(false);
    }
    expect(accepts({ target: { kind: 'CORRECTION', id: 'not-a-uuid' } })).toBe(false);
    const name = (length: number) => `corrections.e${'x'.repeat(length - 1)}`;
    for (const type of ['corrections.event2', name(2), name(63)]) {
      expect(accepts({ type }), type).toBe(true);
    }
    for (const type of ['clock.x', name(64), 'corrections._a', 'corrections.2a']) {
      expect(accepts({ type }), type).toBe(false);
    }
  });
});

describe('corrections audit events', () => {
  // A valid detail for each event: the positive control of the strict schemas.
  const samples: Record<string, unknown> = {
    'corrections.correction_added': {},
    'corrections.correction_replaced': { previousCorrectionId: id(1) },
    'corrections.correction_reversed': { reversedCorrectionId: id(1), reopenedIssueReportId: null },
    'corrections.manual_add_rejected': { itemId: id(1), activeCorrectionId: id(2) },
    'corrections.self_declared_decided': {},
    'corrections.review_decided': { counted: true },
    'corrections.decision_changed': { decisionReason: 'LECTURER_REJECTED' },
    'corrections.flagged_session_reviewed': {},
    'corrections.issue_report_received': {
      status: 'EXPIRED',
      clockSource: 'ARRIVAL',
      clientDecisionVersion: null,
    },
    'corrections.issue_report_closed': {},
    'corrections.issue_report_reopened': { reversedCorrectionId: id(1) },
  };

  it('name eleven corrections events, each accepting its detail and refusing an extra field', () => {
    const types = Object.keys(CORRECTIONS_AUDIT_EVENTS);
    expect(types).toHaveLength(11);
    expect(types.sort()).toEqual(Object.keys(samples).sort());
    expect(Object.keys(CORRECTIONS_AUDIT_CHANGES).sort()).toEqual(types);
    for (const [type, schema] of Object.entries(CORRECTIONS_AUDIT_EVENTS)) {
      expect(
        ok(auditEventInputSchema, {
          type,
          at: new Date(0),
          actor: { kind: 'SYSTEM' },
          client: 'server',
        }),
        type,
      ).toBe(true);
      const sample = samples[type] as Record<string, unknown>;
      expect(ok(schema, sample), type).toBe(true);
      expect(ok(schema, { ...sample, extra: 1 }), type).toBe(false);
    }
  });

  it('keep the decisions before and after for the three decision events', () => {
    for (const type of [
      'corrections.self_declared_decided',
      'corrections.review_decided',
      'corrections.decision_changed',
    ] as const) {
      const { before, after } = CORRECTIONS_AUDIT_CHANGES[type];
      expect(ok(before, { decision: 'IN_REVIEW' }), type).toBe(true);
      expect(ok(after, { decision: 'PRESENT' }), type).toBe(true);
      expect(ok(after, { decision: 'MAYBE' }), type).toBe(false);
    }
  });

  it('keep the audit writer forbidden names out of every detail and state schema', () => {
    const forbidden = [
      'studentNumber',
      'number',
      'fullName',
      'name',
      'email',
      'code',
      'key',
      'token',
      'documentNumber',
    ];
    const schemas = [
      ...Object.values(CORRECTIONS_AUDIT_EVENTS),
      ...Object.values(CORRECTIONS_AUDIT_CHANGES).flatMap(({ before, after }) =>
        [before, after].filter((state) => state !== null),
      ),
    ];
    const fields = schemas.flatMap((schema) =>
      objectsIn(schema).flatMap((object) => Object.keys(object.shape)),
    );
    // Ground control: the walk found the detail fields.
    expect(fields).toContain('reversedCorrectionId');
    for (const field of fields) expect(forbidden).not.toContain(field);
  });
});
