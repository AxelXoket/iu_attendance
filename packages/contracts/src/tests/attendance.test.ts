import {
  buildEnvelope,
  ENVELOPE_MAX_BYTES,
  parseEnvelope,
  recordTextOf,
  SIGNATURE_KINDS,
  scanBodyOf,
} from '@iu-attendance/core/attendance/envelope';
import { DOCUMENT_CHARS } from '@iu-attendance/core/clock/constants';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ATTENDANCE_AUDIT_EVENTS,
  ATTENDANCE_ERROR_CODES,
  ATTENDANCE_ITEM_CODES,
  ATTENDANCE_RECORD_ITEM,
  ATTENDANCE_REJECT_CODES,
  ATTENDANCE_RETRY_CODES,
  ATTENDANCE_ROUTES,
  attendancePairKey,
  RECEIPT_SCAN_ITEM,
  RECORD_LABELS,
  recordItemDetailsSchema,
  recordTextSchema,
  SCAN_RESULTS,
  SIGNATURE_KIND_LIST,
  scanItemDetailsSchema,
  studentRecordSchema,
  TIME_ZONE_MAX_LENGTH,
} from '../attendance.ts';
import { FIRST_ANCHOR_PHONE_REPORTS } from '../clock.ts';
import {
  defineRoute,
  ITEM_RESULTS,
  type RouteDefinition,
  RUNTIME_VERSION_MAX_LENGTH,
  VERSION_MAX_LENGTH,
} from '../shared/index.ts';
import { id, ok } from './helpers.ts';

const at = '2026-10-12T08:00:00.000Z';

const recordText = {
  kind: 'record',
  v: 1,
  id: id(1),
  device: id(2),
  key: id(3),
  sequence: 7,
  session: id(4),
  student: id(5),
  document: 'A'.repeat(110),
  documentRequestMs: 180,
  documentToRecordMs: 3_600_000,
  firstAnchor: null,
  phoneTime: '2026-10-06T07:03:21.000Z',
  timeZone: 'Europe/Istanbul',
  appVersion: '1.4.0',
  runtimeVersion: '1.4',
  updateId: null,
};

describe('the attendance route', () => {
  it('is the session records list for the lecturer, rated heavy', () => {
    const route = ATTENDANCE_ROUTES.listSessionRecords as RouteDefinition;
    expect(defineRoute(route)).toBe(route);
    expect(`${route.method} ${route.path}`).toBe('GET /v1/attendance/sessions/{sessionId}/records');
    expect([route.auth, route.roles, route.rate]).toEqual([['session'], ['lecturer'], 'heavy']);
    expect(route.errors).toEqual(['ATTENDANCE_NOT_FOUND']);
    expect(Object.keys(ATTENDANCE_ROUTES)).toEqual(['listSessionRecords']);
  });

  it('answers the roster with counted records, or nothing while the head count is pending', () => {
    const answer = ATTENDANCE_ROUTES.listSessionRecords.response.schema;
    const record = {
      termId: id(10),
      recordId: id(1),
      computedAt: at,
      clockStatus: 'VERIFIED',
      clockSource: 'BOTH_ANCHORS',
      labels: ['VERIFIED'],
      decision: 'PRESENT',
      decisionReason: null,
      decisionSource: 'AUTOMATIC',
      arrivalPath: 'PHONE',
      arrivedAt: at,
    };
    const student = {
      rowId: id(20),
      sectionId: id(21),
      studentIds: [id(5)],
      studentNumber: '0123456789',
      fullName: 'Ada Yılmaz',
      rowStatus: 'ACTIVE',
      exempt: false,
      record,
      rawRecordCount: 1,
      finalStatus: 'PRESENT',
    };
    const counts = {
      students: 1,
      present: 1,
      absent: 0,
      rejectedRecords: 0,
      inReviewAndPending: { total: 0, inReview: 0, pending: 0 },
      correctionsAndExempt: 0,
    };
    const base = {
      sessionId: id(4),
      held: true,
      headCountEntered: true,
      recordsMayArrive: false,
      sendWindowEndAt: at,
    };
    const visible = {
      ...base,
      visibility: 'VISIBLE',
      students: [student],
      offRosterRecordCount: 0,
      counts,
    };
    expect(ok(answer, visible)).toBe(true);
    const pending = {
      ...base,
      held: null,
      headCountEntered: false,
      visibility: 'HEAD_COUNT_PENDING',
      students: [],
      offRosterRecordCount: null,
      counts: null,
    };
    expect(ok(answer, pending)).toBe(true);
    // An exempt student shows the exempt status; a value added later still parses.
    const exempt = { ...student, exempt: true, record: null, finalStatus: 'EXEMPT' };
    expect(ok(answer, { ...visible, students: [exempt], visibility: 'NEW_STATE' })).toBe(true);
    expect(ok(answer, { ...visible, students: [{ ...student, rawRecordCount: -1 }] })).toBe(false);
  });
});

describe('the attendance error catalog', () => {
  const codes = Object.entries(ATTENDANCE_ERROR_CODES);

  it('has one HTTP code and seventeen item codes, each reached from an item type', () => {
    expect(codes).toHaveLength(18);
    expect(ATTENDANCE_ERROR_CODES.ATTENDANCE_NOT_FOUND.http).toBe(404);
    const itemOnly = codes.filter(([, definition]) => definition.http === null).map(([c]) => c);
    expect(itemOnly).toHaveLength(17);
    const reached = new Set<string>(Object.values(ATTENDANCE_ITEM_CODES).flat());
    expect([...reached].sort()).toEqual([...itemOnly].sort());
    // The scan alone checks the lecturer; the phone path alone checks sender and item id.
    const { attendance_record: phone, receipt_scan: scan } = ATTENDANCE_ITEM_CODES;
    for (const code of [
      'ATTENDANCE_NOT_LECTURERS_COURSE',
      'ATTENDANCE_ACCOUNT_MISMATCH',
    ] as const) {
      expect([phone.includes(code as never), scan.includes(code as never)], code).toEqual([
        false,
        true,
      ]);
    }
    for (const code of [
      'ATTENDANCE_ITEM_ID_MISMATCH',
      'ATTENDANCE_SENDER_MISMATCH',
      'ATTENDANCE_SECOND_ANCHOR_REQUIRED',
    ] as const) {
      expect([phone.includes(code as never), scan.includes(code as never)], code).toEqual([
        true,
        false,
      ]);
    }
  });

  it('gives every code texts in both languages, without digits or placeholders', () => {
    for (const [code, definition] of codes) {
      for (const text of [definition.lecturer, definition.student]) {
        expect(Object.keys(text ?? {}), code).toEqual(['tr', 'en']);
        for (const value of Object.values(text ?? {})) expect(value, code).not.toMatch(/[0-9{}]/);
      }
    }
  });
});

describe('the record text', () => {
  it('parses a version 1 record and drops a field it does not know', () => {
    expect(recordTextSchema.parse({ ...recordText, laterField: 1 })).toEqual(recordText);
  });

  it('round-trips through the envelope the phone signs', () => {
    const envelope = buildEnvelope(recordTextOf(recordText), 'APP_ATTEST', new Uint8Array([1]));
    const parsed = parseEnvelope(envelope);
    if ('error' in parsed) throw new Error(parsed.error);
    expect(recordTextSchema.parse(parsed.record)).toEqual(recordText);
  });

  it('refuses another kind or version, a wrong id and fields outside their bounds', () => {
    const nul = String.fromCharCode(0);
    for (const [field, value] of [
      ['kind', 'package'],
      ['v', 2],
      ['v', 0],
      ['v', '1'],
      ['v', 1.5],
      ['id', '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e'],
      ['device', 'not-a-uuid'],
      ['key', ''],
      ['session', 'x'],
      // A student number in place of the internal id.
      ['student', '0123456789'],
      ['sequence', 0],
      ['sequence', 1.5],
      ['sequence', Number.MAX_SAFE_INTEGER + 1],
      ['document', 'A'.repeat(ENVELOPE_MAX_BYTES + 1)],
      ['documentRequestMs', 1.5],
      ['documentToRecordMs', Number.MAX_SAFE_INTEGER + 1],
      ['firstAnchor', 'VALID'],
      ['phoneTime', '2026-10-06T07:03:21Z'],
      ['phoneTime', 1_760_256_000_000],
      ['timeZone', 'x'.repeat(TIME_ZONE_MAX_LENGTH + 1)],
      ['timeZone', `Europe/Istanbul${nul}`],
      ['timeZone', 'Avrupa/İstanbul'],
      ['appVersion', ''],
      ['appVersion', '1.4'],
      ['appVersion', '1.04.0'],
      ['runtimeVersion', 'x'.repeat(RUNTIME_VERSION_MAX_LENGTH + 1)],
      ['runtimeVersion', `1.4${String.fromCharCode(0x7f)}`],
      ['updateId', 'x'],
    ] as const) {
      expect(ok(recordTextSchema, { ...recordText, [field]: value }), `${field} ${value}`).toBe(
        false,
      );
    }
    const { v: _v, ...noVersion } = recordText;
    expect(ok(recordTextSchema, noVersion)).toBe(false);
    for (const firstAnchor of FIRST_ANCHOR_PHONE_REPORTS) {
      expect(ok(recordTextSchema, { ...recordText, document: null, firstAnchor })).toBe(true);
    }
    expect(ok(recordTextSchema, { ...recordText, sequence: Number.MAX_SAFE_INTEGER })).toBe(true);
  });

  it('leaves the clock fields to the clock module, which stores what it cannot verify', () => {
    for (const [field, value] of [
      ['document', 'A'.repeat(DOCUMENT_CHARS - 1)],
      ['document', ''],
      ['documentRequestMs', -1],
      ['documentToRecordMs', -Number.MAX_SAFE_INTEGER],
      ['documentToRecordMs', 8 * 24 * 60 * 60_000],
      // Notes only: an empty time zone and a missing runtime version.
      ['timeZone', ''],
      ['runtimeVersion', null],
    ] as const) {
      expect(ok(recordTextSchema, { ...recordText, [field]: value }), `${field} ${value}`).toBe(
        true,
      );
    }
  });

  it('carries the evidence fields, where a broken one never drops the record', () => {
    const withEvidence = {
      ...recordText,
      qr: '1'.repeat(41),
      bluetooth: { status: 'SCANNED', codes: [{ code: 'XYZ', rssi: -60 }] },
    };
    expect(recordTextSchema.parse(withEvidence)).toMatchObject({
      qr: '1'.repeat(41),
      bluetooth: { status: 'NO_BLUETOOTH', codes: [] },
    });
  });

  it('comes back field for field through the envelope, an unknown field dropped', () => {
    const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const ascii = (max: number) =>
      fc.string({
        unit: fc.integer({ min: 0x20, max: 0x7e }).map((c) => String.fromCharCode(c)),
        maxLength: max,
      });
    const part = fc.oneof(fc.constant(0), fc.integer({ min: 1, max: 9999 }));
    const validRecords = fc.record({
      kind: fc.constant('record'),
      v: fc.constant(1),
      id: fc.uuid({ version: 7 }),
      device: fc.uuid(),
      key: fc.uuid(),
      sequence: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
      session: fc.uuid({ version: 7 }),
      student: fc.uuid({ version: 7 }),
      document: fc.option(
        fc.string({
          unit: fc.constantFrom(...BASE64URL),
          minLength: DOCUMENT_CHARS,
          maxLength: DOCUMENT_CHARS,
        }),
      ),
      documentRequestMs: fc.option(fc.maxSafeInteger()),
      documentToRecordMs: fc.option(fc.maxSafeInteger()),
      firstAnchor: fc.constantFrom(null, ...FIRST_ANCHOR_PHONE_REPORTS),
      phoneTime: fc
        .date({ min: new Date(0), max: new Date('2099-12-31T23:59:59.999Z'), noInvalidDate: true })
        .map((date) => date.toISOString()),
      timeZone: ascii(TIME_ZONE_MAX_LENGTH),
      appVersion: fc.tuple(part, part, part).map((parts) => parts.join('.')),
      runtimeVersion: fc.option(ascii(RUNTIME_VERSION_MAX_LENGTH)),
      updateId: fc.option(fc.uuid()),
    });
    fc.assert(
      fc.property(
        validRecords,
        fc.constantFrom(...SIGNATURE_KIND_LIST),
        fc.uint8Array({ minLength: 1, maxLength: 142 }),
        fc.oneof(fc.integer(), fc.boolean(), fc.string({ maxLength: 8 })),
        (record, kind, signature, later) => {
          const envelope = buildEnvelope(
            recordTextOf({ ...record, laterField: later }),
            kind,
            signature,
          );
          const parsed = parseEnvelope(envelope);
          if ('error' in parsed) throw new Error(parsed.error);
          expect(parsed.record).toHaveProperty('laterField');
          const text = recordTextSchema.parse(parsed.record);
          expect(text).not.toHaveProperty('laterField');
          expect(text).toEqual(record);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('fits the envelope at its largest in stage 1, with the largest signature of each kind', () => {
    // DER ECDSA P-256 is at most 72 bytes; an App Attest assertion is the CBOR map
    // { signature: DER, authenticatorData: 37 bytes }, at most 142 bytes.
    const signatureMaxBytes = { ANDROID_P256: 72, SECURE_ENCLAVE: 72, APP_ATTEST: 142 } as const;
    const longest = FIRST_ANCHOR_PHONE_REPORTS.reduce((a, b) => (b.length > a.length ? b : a));
    const largest = {
      ...recordText,
      sequence: Number.MAX_SAFE_INTEGER,
      document: 'A'.repeat(DOCUMENT_CHARS),
      documentRequestMs: -Number.MAX_SAFE_INTEGER,
      documentToRecordMs: -Number.MAX_SAFE_INTEGER,
      firstAnchor: longest,
      timeZone: '~'.repeat(TIME_ZONE_MAX_LENGTH),
      appVersion: '9999.9999.9999',
      runtimeVersion: '~'.repeat(RUNTIME_VERSION_MAX_LENGTH),
      updateId: id(9),
    };
    // Ground control: the schema takes this record, and its version is the longest one.
    expect(recordTextSchema.parse(largest)).toEqual(largest);
    expect(largest.appVersion).toHaveLength(VERSION_MAX_LENGTH);
    for (const kind of SIGNATURE_KIND_LIST) {
      const signature = new Uint8Array(signatureMaxBytes[kind]).fill(255);
      const length =
        `IUY1.${recordTextOf(largest)}.i.`.length + Math.ceil((signature.length * 4) / 3);
      expect(length, kind).toBeLessThanOrEqual(ENVELOPE_MAX_BYTES);
      expect(buildEnvelope(recordTextOf(largest), kind, signature)).toHaveLength(length);
    }
  });
});

describe('the attendance queue items', () => {
  it('carry the envelope as the record body, up to its 1273 bytes', () => {
    expect([ATTENDANCE_RECORD_ITEM.type, ATTENDANCE_RECORD_ITEM.module]).toEqual([
      'attendance_record',
      'attendance',
    ]);
    const body = ATTENDANCE_RECORD_ITEM.body;
    expect(ok(body, 'IUY1.abc.a.def')).toBe(true);
    // A newer format reaches the codec, which answers VERSION_UNKNOWN.
    expect(ok(body, 'IUY2.abc')).toBe(true);
    expect(ok(body, `IUY1.${'A'.repeat(ENVELOPE_MAX_BYTES - 5)}`)).toBe(true);
    expect(ok(body, `IUY1.${'A'.repeat(ENVELOPE_MAX_BYTES - 4)}`)).toBe(false);
    for (const broken of ['XUY1.abc.a.def', 'XIUY1.abc', 'IUY1abc', 'IUY.abc', 'IUYx.abc']) {
      expect(ok(body, broken), broken).toBe(false);
    }
  });

  it("carry a receipt scan as the core's version 1 JSON with the lecturer", () => {
    expect([RECEIPT_SCAN_ITEM.type, RECEIPT_SCAN_ITEM.module]).toEqual([
      'receipt_scan',
      'attendance',
    ]);
    const scan = JSON.parse(scanBodyOf('IUY1.abc.a.def', id(9)));
    expect(scan).toEqual({ v: 1, envelope: 'IUY1.abc.a.def', lecturerId: id(9) });
    expect(ok(RECEIPT_SCAN_ITEM.body, scan)).toBe(true);
    expect(ok(RECEIPT_SCAN_ITEM.body, { ...scan, v: 2 })).toBe(false);
    const over = `IUY1.${'A'.repeat(ENVELOPE_MAX_BYTES - 4)}`;
    expect(ok(RECEIPT_SCAN_ITEM.body, { ...scan, envelope: over })).toBe(false);
    expect(ok(RECEIPT_SCAN_ITEM.body, { ...scan, envelope: 'not a receipt' })).toBe(false);
  });

  it('answer an accepted item with its decision and labels, values extensible', () => {
    const details = {
      decision: 'PRESENT',
      decisionReason: null,
      decisionVersion: 1,
      labels: ['VERIFIED', 'A_LABEL_ADDED_LATER'],
      decidedAt: at,
      counted: true,
    };
    expect(ok(recordItemDetailsSchema, details)).toBe(true);
    expect(ok(recordItemDetailsSchema, { ...details, decisionVersion: 0 })).toBe(false);
    const { decidedAt: _at, counted: _counted, ...decision } = details;
    const scanned = { record: { termId: id(10), recordId: id(1), studentId: id(5), ...decision } };
    expect(ok(scanItemDetailsSchema, scanned)).toBe(true);
    expect(ok(recordItemDetailsSchema, { ...details, decisionReason: 'x'.repeat(65) })).toBe(false);
  });

  it('split the item codes into retry and reject, and name the scan row results', () => {
    const itemCodes = Object.entries(ATTENDANCE_ERROR_CODES)
      .filter(([, definition]) => definition.http === null)
      .map(([code]) => code);
    expect([ATTENDANCE_REJECT_CODES.length, ATTENDANCE_RETRY_CODES.length]).toEqual([15, 2]);
    expect([...ATTENDANCE_REJECT_CODES, ...ATTENDANCE_RETRY_CODES].sort()).toEqual(
      itemCodes.sort(),
    );
    expect(ATTENDANCE_REJECT_CODES).not.toContain('ATTENDANCE_NOT_FOUND');
    // A retry writes no scan row, so the row results are the other three.
    expect(SCAN_RESULTS).toEqual(ITEM_RESULTS.filter((result) => result !== 'RETRY'));
  });

  it("give the student's phone its own records without envelope, device or key", () => {
    const record = {
      termId: id(10),
      recordId: id(1),
      sessionId: id(4),
      computedAt: at,
      clockStatus: 'VERIFIED',
      arrivedAt: at,
      decision: 'PRESENT',
      decisionReason: null,
      decisionVersion: 1,
      labels: ['VERIFIED'],
      decidedAt: at,
      arrivalPath: 'PHONE',
      counted: true,
    };
    expect(studentRecordSchema.parse({ ...record, envelope: 'IUY1.x', deviceId: id(2) })).toEqual(
      record,
    );
    const later = { ...record, clockStatus: 'LATER', arrivalPath: 'LATER', decision: 'LATER' };
    expect(ok(studentRecordSchema, later)).toBe(true);
    const { counted: _counted, ...uncounted } = record;
    expect(ok(studentRecordSchema, uncounted)).toBe(false);
  });
});

describe('attendance lists, key and audit events', () => {
  it('name the signature kinds of the core codec and seven labels', () => {
    expect(SIGNATURE_KIND_LIST).toEqual(Object.values(SIGNATURE_KINDS));
    expect(RECORD_LABELS).toHaveLength(7);
    expect(new Set(RECORD_LABELS).size).toBe(7);
  });

  it('write the pair lock key in one place', () => {
    expect(attendancePairKey('s1', 'p1')).toBe('attendance:pair:s1:p1');
  });

  it('name three strict events with internal ids and the envelope digest only', () => {
    const base = { recordId: id(1), deviceId: id(2), envelopeDigest: 'A'.repeat(43) };
    const samples: Record<string, unknown> = {
      'attendance.id_conflict': { ...base, storedTermId: id(10) },
      'attendance.student_device_mismatch': base,
      'attendance.sender_mismatch': { ...base, senderId: id(6) },
    };
    expect(Object.keys(ATTENDANCE_AUDIT_EVENTS).sort()).toEqual(Object.keys(samples).sort());
    for (const [type, schema] of Object.entries(ATTENDANCE_AUDIT_EVENTS)) {
      const sample = samples[type] as Record<string, unknown>;
      expect(ok(schema, sample), type).toBe(true);
      expect(ok(schema, { ...sample, studentNumber: '0123456789' }), type).toBe(false);
      expect(ok(schema, { ...sample, envelopeDigest: 'A'.repeat(42) }), type).toBe(false);
    }
  });
});
