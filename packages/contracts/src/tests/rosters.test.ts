import { describe, expect, it } from 'vitest';
import {
  ENCODINGS,
  FILE_TYPES,
  LATE_CHOICES,
  ROSTERS_AUDIT_EVENTS,
  ROSTERS_ERROR_CODES,
  ROSTERS_ROUTES,
  ROSTERS_SECRET_FIELDS,
  ROW_SOURCES,
  SEPARATORS,
} from '../rosters.ts';
import type { RouteDefinition } from '../shared/index.ts';
import { id, issueCodes } from './helpers.ts';
import { extensibleEnumsIn } from './schema-walk.ts';

const routes = Object.entries(ROSTERS_ROUTES) as [string, RouteDefinition][];

describe('rosters routes', () => {
  it('are the six endpoints, by method and path', () => {
    expect(routes.map(([, route]) => `${route.method} ${route.path}`).sort()).toEqual([
      'GET /v1/rosters/sections/{sectionId}',
      'GET /v1/rosters/sections/{sectionId}/uploads',
      'PATCH /v1/rosters/rows/{rowId}',
      'POST /v1/rosters/sections/{sectionId}/apply',
      'POST /v1/rosters/sections/{sectionId}/preview',
      'POST /v1/rosters/sections/{sectionId}/rows',
    ]);
    for (const [key, route] of routes) {
      expect(route.name).toBe(key);
      expect(route.roles).toEqual(['lecturer']);
    }
  });
});

describe('rosters requests', () => {
  const preview = ROSTERS_ROUTES.previewUpload.request.body;
  const apply = ROSTERS_ROUTES.applyUpload.request.body;
  const row = (n: number) => ({
    fileRowNumber: n,
    studentNumber: '0123456789',
    fullName: 'Ad Soyad',
    sectionLabel: null,
    numberCell: false,
  });
  const rows = (count: number) => Array.from({ length: count }, (_, n) => row(n + 1));
  const xlsx = { type: 'XLSX', encoding: null, separator: null };
  const csv = { type: 'CSV', encoding: 'UTF_8', separator: 'SEMICOLON' };

  it('take 1 to 2,000 rows with distinct file row numbers', () => {
    expect(preview.safeParse({ file: xlsx, rows: rows(1) }).success).toBe(true);
    expect(preview.safeParse({ file: xlsx, rows: rows(2000) }).success).toBe(true);
    expect(preview.safeParse({ file: xlsx, rows: [] }).success).toBe(false);
    expect(preview.safeParse({ file: xlsx, rows: rows(2001) }).success).toBe(false);
    expect(preview.safeParse({ file: xlsx, rows: [row(1), row(1)] }).success).toBe(false);
    expect(preview.safeParse({ file: xlsx, rows: [row(0)] }).success).toBe(false);
  });

  it('set encoding and separator for CSV and only for CSV', () => {
    expect(preview.safeParse({ file: csv, rows: rows(1) }).success).toBe(true);
    expect(preview.safeParse({ file: { ...csv, encoding: null }, rows: rows(1) }).success).toBe(
      false,
    );
    expect(preview.safeParse({ file: { ...csv, separator: null }, rows: rows(1) }).success).toBe(
      false,
    );
    expect(preview.safeParse({ file: { ...xlsx, encoding: 'UTF_8' }, rows: rows(1) }).success).toBe(
      false,
    );
    expect(preview.safeParse({ file: { ...xlsx, separator: 'TAB' }, rows: rows(1) }).success).toBe(
      false,
    );
  });

  it('send the diff digest back as 43 canonical base64url characters', () => {
    const body = {
      file: xlsx,
      rows: rows(1),
      warningsConfirmed: false,
      largeChangeConfirmed: false,
      sectionChangeConfirmed: false,
    };
    const digest = '-_'.repeat(21);
    expect(apply.safeParse({ ...body, expectedDiffDigest: `${digest}w` }).success).toBe(true);
    expect(apply.safeParse({ ...body, expectedDiffDigest: digest }).success).toBe(false);
    expect(apply.safeParse({ ...body, expectedDiffDigest: `${digest}AA` }).success).toBe(false);
    expect(apply.safeParse({ ...body, expectedDiffDigest: `${digest}=` }).success).toBe(false);
    // The last letter of a 32-byte digest leaves two bits spare; a set spare bit is no digest.
    expect(apply.safeParse({ ...body, expectedDiffDigest: `${digest}_` }).success).toBe(false);
    const parsed = apply.safeParse({ ...body, expectedDiffDigest: `${digest}A` });
    expect(parsed.success && parsed.data.lateChoices).toEqual([]);
  });

  it('reject exemption and an empty change on a row, and a name with a control character', () => {
    const update = ROSTERS_ROUTES.updateRow.request.body;
    expect(update.safeParse({ expectedListVersion: 3, inactive: true }).success).toBe(true);
    expect(
      update.safeParse({ expectedListVersion: 3, lateChoice: 'PREVIOUS_ABSENT' }).success,
    ).toBe(true);
    expect(update.safeParse({ expectedListVersion: 3 }).success).toBe(false);
    // Exemption belongs to the absence module: dropped here, so it alone changes nothing.
    expect(update.safeParse({ expectedListVersion: 3, exempt: true }).success).toBe(false);
    const withExempt = update.safeParse({ expectedListVersion: 3, inactive: true, exempt: true });
    expect(withExempt.success && withExempt.data).toEqual({
      expectedListVersion: 3,
      inactive: true,
    });
    const add = ROSTERS_ROUTES.addRow.request.body;
    const person = {
      studentNumber: '012345678',
      fullName: 'Ada Yılmaz',
      expectedListVersion: 0,
      lateChoice: null,
    };
    expect(add.safeParse(person).success).toBe(true);
    for (const unit of [0x00, 0x1f, 0x7f, 0x9f]) {
      expect(
        add.safeParse({ ...person, fullName: `Ada${String.fromCharCode(unit)}` }).success,
      ).toBe(false);
    }
    expect(add.safeParse({ ...person, fullName: `Ada${String.fromCharCode(0xa0)}Y` }).success).toBe(
      true,
    );
    expect(add.safeParse({ ...person, studentNumber: '01234567' }).success).toBe(false);
  });

  it('close the enums of a request, the list part included', () => {
    const query = ROSTERS_ROUTES.getSection.request.query;
    const active = query.safeParse({});
    expect(active.success && active.data.part).toBe('ACTIVE');
    expect(query.safeParse({ part: 'INACTIVE' }).success).toBe(true);
    expect(query.safeParse({ part: 'DELETED' }).success).toBe(false);
  });
});

describe('rosters field bounds', () => {
  const preview = ROSTERS_ROUTES.previewUpload.request.body;
  const file = { type: 'XLSX', encoding: null, separator: null };
  const fileRow = {
    fileRowNumber: 1,
    studentNumber: '0123456789',
    fullName: 'Ad Soyad',
    sectionLabel: null,
    numberCell: false,
  };
  const withRow = (patch: Record<string, unknown>) =>
    preview.safeParse({ file, rows: [{ ...fileRow, ...patch }] }).success;

  it('bound the raw texts of a file row, before the server applies its rules', () => {
    for (const [field, max] of [
      ['studentNumber', 32],
      ['fullName', 300],
      ['sectionLabel', 40],
    ] as const) {
      expect(withRow({ [field]: 'x'.repeat(max) }), field).toBe(true);
      expect(withRow({ [field]: 'x'.repeat(max + 1) }), field).toBe(false);
    }
    expect(withRow({ fileRowNumber: 1.5 })).toBe(false);
  });

  it('take a name of 1 to 200 characters for a row added by hand', () => {
    const add = ROSTERS_ROUTES.addRow.request.body;
    const person = { studentNumber: '012345678', expectedListVersion: 0, lateChoice: null };
    expect(add.safeParse({ ...person, fullName: 'x'.repeat(200) }).success).toBe(true);
    expect(add.safeParse({ ...person, fullName: 'x'.repeat(201) }).success).toBe(false);
    expect(add.safeParse({ ...person, fullName: '' }).success).toBe(false);
  });

  it('take at most 2,000 late choices, and answer at most 2,000 active rows', () => {
    const apply = ROSTERS_ROUTES.applyUpload.request.body;
    const choices = (count: number) =>
      Array.from({ length: count }, (_, n) => ({
        studentNumber: String(100000000 + n),
        choice: 'PREVIOUS_ABSENT',
      }));
    const body = {
      file,
      rows: [fileRow],
      warningsConfirmed: false,
      largeChangeConfirmed: false,
      sectionChangeConfirmed: false,
      expectedDiffDigest: 'A'.repeat(43),
    };
    expect(apply.safeParse({ ...body, lateChoices: choices(2000) }).success).toBe(true);
    expect(apply.safeParse({ ...body, lateChoices: choices(2001) }).success).toBe(false);
    const activeCount = ROSTERS_ROUTES.getSection.response.schema.shape.activeCount;
    expect(activeCount.safeParse(2000).success).toBe(true);
    expect(activeCount.safeParse(2001).success).toBe(false);
  });

  it('carry the lock, the row source and the late choice of a row as extensible lists', () => {
    const lists = extensibleEnumsIn(ROSTERS_ROUTES.getSection.response.schema).map(
      (node) => node.meta()?.['x-extensible-enum'],
    );
    expect(lists).toContainEqual([...ROW_SOURCES]);
    expect(lists).toContainEqual([...LATE_CHOICES]);
    expect(lists.some((values) => (values as string[]).includes('TERM_LOCK'))).toBe(true);
    const added = extensibleEnumsIn(ROSTERS_ROUTES.addRow.response.schema);
    expect(added.length).toBeGreaterThan(0);
  });

  it('write a file addition through the upload event only, and name the upload there', () => {
    const added = ROSTERS_AUDIT_EVENTS['rosters.row_added'];
    expect(added.safeParse({ reason: 'MANUAL' }).success).toBe(true);
    expect(added.safeParse({ reason: 'SYSTEM' }).success).toBe(true);
    expect(added.safeParse({ reason: 'FILE' }).success).toBe(false);
    const applied = ROSTERS_AUDIT_EVENTS['rosters.upload_applied'];
    expect(applied.safeParse({ uploadId: id(9) }).success).toBe(true);
    expect(applied.safeParse({}).success).toBe(false);
  });
});

describe('rosters answers', () => {
  it('carry lock, source, finding codes and results as extensible values', () => {
    const answer = ROSTERS_ROUTES.previewUpload.response.schema;
    const base = {
      listVersion: 0,
      diffDigest: 'A'.repeat(43),
      applicable: true,
      rowLimitExceeded: false,
      lock: 'SOMETHING_NEW',
      largeChange: false,
      sectionChangeRequired: false,
      summary: {
        toAdd: 0,
        toDeactivate: 1,
        toReactivate: 0,
        toTrim: 0,
        nameChanges: 0,
        spellingFixes: 0,
        sectionChanges: 0,
        orderChanges: 0,
        unchanged: 0,
        leftOut: 0,
      },
      toAdd: [],
      toReactivate: [],
      toTrim: [],
      toDeactivate: [
        { rowId: id(1), studentNumber: '0123456789', fullName: 'Ad', source: 'NEW_SOURCE' },
      ],
      nameChanges: [],
      sectionChanges: [],
      findings: [{ fileRowNumber: 2, level: 'NEW_LEVEL', code: 'NEW_CODE' }],
      firstHeldAt: null,
      addDropEnd: null,
    };
    expect(answer.safeParse(base).success).toBe(true);
    const result = ROSTERS_ROUTES.applyUpload.response.schema;
    const applied = { result: 'NEW_RESULT', uploadId: null, listVersion: 2, summary: base.summary };
    expect(result.safeParse(applied).success).toBe(true);
  });
});

describe('rosters catalog, lists and audit events', () => {
  it('gives 404, 400 and 503 once each and 409 to the rest; busy retries after 2 seconds', () => {
    const statuses = Object.fromEntries(
      Object.entries(ROSTERS_ERROR_CODES).map(([code, d]) => [code, d.http]),
    );
    const named = { ROSTERS_NOT_FOUND: 404, ROSTERS_INVALID_ROWS: 400, ROSTERS_BUSY: 503 };
    expect(statuses).toMatchObject(named);
    // Every other code, an operational one included, would have to answer 409.
    const rest = Object.entries(statuses).filter(([code]) => !(code in named));
    expect(rest).toHaveLength(7);
    for (const [code, status] of rest) expect(status, code).toBe(409);
    expect(ROSTERS_ERROR_CODES.ROSTERS_BUSY.retry).toEqual({ fixed: 2 });
    const rowsDetails = ROSTERS_ERROR_CODES.ROSTERS_INVALID_ROWS.details;
    expect(rowsDetails.safeParse({ fileRowNumbers: [3, 7] }).success).toBe(true);
    expect(rowsDetails.safeParse({ fileRowNumbers: [0] }).success).toBe(false);
  });

  it('keep the CHECK lists unique upper case words', () => {
    for (const values of [ROW_SOURCES, LATE_CHOICES, FILE_TYPES, ENCODINGS, SEPARATORS]) {
      expect(new Set(values).size).toBe(values.length);
      for (const value of values) expect(value).toMatch(/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/);
    }
    expect(ROSTERS_SECRET_FIELDS).toEqual(['studentNumber', 'fullName', 'oldName', 'newName']);
    // D03-B12's two late choices, the list the absence scope in core reads too.
    expect(LATE_CHOICES).toEqual(['PREVIOUS_NOT_COUNTED', 'PREVIOUS_ABSENT']);
  });

  it('name seven strict audit events that carry no number or name', () => {
    const events = Object.entries(ROSTERS_AUDIT_EVENTS);
    expect(events).toHaveLength(7);
    for (const [type, schema] of events) {
      expect(type).toMatch(/^rosters\.[a-z]+(?:_[a-z]+)*$/);
      expect(issueCodes(schema.safeParse({ studentNumber: '0123456789' }))).toContain(
        'unrecognized_keys',
      );
    }
    const deactivated = ROSTERS_AUDIT_EVENTS['rosters.row_deactivated'];
    expect(deactivated.safeParse({ reason: 'FILE', uploadId: id(9) }).success).toBe(true);
    expect(deactivated.safeParse({ reason: 'FILE' }).success).toBe(false);
    expect(deactivated.safeParse({ reason: 'MANUAL' }).success).toBe(true);
    expect(deactivated.safeParse({ reason: 'MANUAL', uploadId: id(9) }).success).toBe(false);
    expect(deactivated.safeParse({ reason: 'SYSTEM', uploadId: id(9) }).success).toBe(false);
    expect(deactivated.safeParse({ reason: 'SECTION_CHANGE' }).success).toBe(true);
    expect(deactivated.safeParse({ reason: 'SECTION_CHANGE', uploadId: id(9) }).success).toBe(true);
    expect(deactivated.safeParse({ reason: 'LOST' }).success).toBe(false);
    // Changes made inside an upload name it.
    const trimmed = ROSTERS_AUDIT_EVENTS['rosters.row_trimmed'];
    expect(trimmed.safeParse({ reason: 'REACTIVATION', uploadId: id(9) }).success).toBe(true);
    expect(
      ROSTERS_AUDIT_EVENTS['rosters.name_changed'].safeParse({ uploadId: id(9) }).success,
    ).toBe(true);
  });

  it('write error texts without digits or placeholders (D13 catalog rule)', () => {
    const texts = Object.values(ROSTERS_ERROR_CODES)
      .flatMap((definition) => [definition.lecturer, definition.student])
      .flatMap((text) => Object.values(text));
    expect(texts).toHaveLength(Object.keys(ROSTERS_ERROR_CODES).length * 4);
    for (const text of texts) expect(text).not.toMatch(/[0-9{}]/);
  });

  it('take one late enrolment choice per student number', () => {
    const apply = ROSTERS_ROUTES.applyUpload.request.body;
    const body = {
      file: { type: 'XLSX', encoding: null, separator: null },
      rows: [
        {
          fileRowNumber: 1,
          studentNumber: '0123456789',
          fullName: 'Ad',
          sectionLabel: null,
          numberCell: false,
        },
      ],
      expectedDiffDigest: 'A'.repeat(43),
      warningsConfirmed: false,
      largeChangeConfirmed: false,
      sectionChangeConfirmed: false,
    };
    const choice = (choice: string) => ({ studentNumber: '0123456789', choice });
    expect(apply.safeParse({ ...body, lateChoices: [choice('PREVIOUS_ABSENT')] }).success).toBe(
      true,
    );
    expect(
      apply.safeParse({
        ...body,
        lateChoices: [choice('PREVIOUS_ABSENT'), choice('PREVIOUS_NOT_COUNTED')],
      }).success,
    ).toBe(false);
  });
});
