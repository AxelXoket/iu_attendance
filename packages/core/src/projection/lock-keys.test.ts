import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BLUETOOTH_STATUSES } from './constants.ts';
import {
  type LockKeyRecord,
  projectionDisplayKey,
  projectionLockKeys,
  projectionStudentKey,
} from './lock-keys.ts';
import { formatQrContent } from './qr-content.ts';

const SESSION = '0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e';
const STUDENT = '0192f5c4-7d2a-7b3c-8d4e-000000000001';
const DISPLAY = { key: projectionDisplayKey(SESSION), mode: 'shared' } as const;
const COUNT = projectionStudentKey(STUDENT);
const qrOfSlot = (slot: number) =>
  formatQrContent({ version: 1, slot, shortCode: 42, slice: 7, verificationCode: '0'.repeat(20) });
const keys = (fields: LockKeyRecord['fields']) =>
  projectionLockKeys({ sessionId: SESSION, studentId: STUDENT, fields });

describe('projection key builders', () => {
  it("write the spec's key form with the id in lower case, never a number or a name", () => {
    expect(projectionDisplayKey('0192F5C4-7D2A-7B3C-8D4E-5F6A7B8C9D0E')).toBe(
      'projection:display:0192f5c4-7d2a-7b3c-8d4e-5f6a7b8c9d0e',
    );
    expect(projectionStudentKey(STUDENT.toUpperCase())).toBe(
      'projection:student:0192f5c4-7d2a-7b3c-8d4e-000000000001',
    );
  });
});

describe('projectionLockKeys (D11 qrKilitAnahtarlari)', () => {
  it('takes no key for a record without fields, or with a projection code alone', () => {
    expect(keys({})).toEqual([]);
    expect(keys({ qr: qrOfSlot(0) })).toEqual([]);
    expect(keys({ qr: '' })).toEqual([]);
    expect(keys({ bluetooth: { status: 'NO_BLUETOOTH' } })).toEqual([]);
  });

  it("takes the session's display key, shared, for a lecturer QR or a Bluetooth scan", () => {
    for (const slot of [1, 9])
      expect(keys({ qr: qrOfSlot(slot) }), String(slot)).toEqual([DISPLAY]);
    expect(keys({ bluetooth: { status: 'SCANNED' } })).toEqual([DISPLAY]);
    // 41 characters that are not all digits are no lecturer QR.
    expect(keys({ qr: `${qrOfSlot(3).slice(0, 40)}x` })).toEqual([]);
    expect(keys({ qr: qrOfSlot(3).slice(1) })).toEqual([]);
    // Digits with a lecturer slot, but one too many or too few.
    expect(keys({ qr: `${qrOfSlot(3)}0` })).toEqual([]);
    expect(keys({ qr: qrOfSlot(3).slice(0, 40) })).toEqual([]);
  });

  it("takes the student's key, exclusive, with the display key for a backup code or a location", () => {
    expect(keys({ backupCode: '123456' })).toEqual([DISPLAY, COUNT]);
    // An empty backup code still counts as a wrong one.
    expect(keys({ backupCode: '' })).toEqual([DISPLAY, COUNT]);
    expect(keys({ location: { status: 'NO_LOCATION' } })).toEqual([DISPLAY, COUNT]);
  });

  it('writes the ids in lower case and nothing else, whatever case the record uses', () => {
    const upper = projectionLockKeys({
      sessionId: SESSION.toUpperCase(),
      studentId: STUDENT.toUpperCase(),
      fields: { backupCode: '1' },
    });
    expect(upper).toEqual([DISPLAY, COUNT]);
  });

  it('locks only what is needed, the same way every time (5,000 runs)', () => {
    // The record's scan statuses (TARANDI, BLUETOOTH_YOK), both drawn below.
    expect(BLUETOOTH_STATUSES).toEqual(['SCANNED', 'NO_BLUETOOTH']);
    const field = <T>(value: fc.Arbitrary<T>) => fc.option(value, { nil: undefined });
    const fieldsArbitrary = fc.record({
      qr: field(
        fc.oneof(fc.integer({ min: 0, max: 9 }).map(qrOfSlot), fc.string({ maxLength: 64 })),
      ),
      backupCode: field(fc.string({ maxLength: 16 })),
      bluetooth: field(fc.record({ status: fc.constantFrom(...BLUETOOTH_STATUSES) })),
      location: field(
        fc.record({ status: fc.constantFrom('RECEIVED', 'NO_LOCATION', 'APPROXIMATE_PERMISSION') }),
      ),
    });
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), fieldsArbitrary, (sessionId, studentId, fields) => {
        const of = (only: LockKeyRecord['fields']) =>
          projectionLockKeys({ sessionId, studentId, fields: only });
        const got = of(fields);
        const display = { key: projectionDisplayKey(sessionId), mode: 'shared' };
        const student = projectionStudentKey(studentId);
        // Each field alone, as the spec lists it: a lecturer QR (41 digits, slot 1 to 9)
        // and a Bluetooth scan wait for the display; a backup code or a location also counts.
        const alone = [
          of({ qr: fields.qr }),
          of({ bluetooth: fields.bluetooth }),
          of({ backupCode: fields.backupCode }),
          of({ location: fields.location }),
        ];
        expect(alone[0]).toEqual(
          fields.qr !== undefined && /^[0-9][1-9][0-9]{39}$/.test(fields.qr) ? [display] : [],
        );
        expect(alone[1]).toEqual(fields.bluetooth?.status === 'SCANNED' ? [display] : []);
        expect(alone[2]).toEqual(fields.backupCode === undefined ? [] : [display, student]);
        expect(alone[3]).toEqual(fields.location === undefined ? [] : [display, student]);
        // The whole record takes each key any one field needs, once, the display key first.
        const needed = alone.flat();
        expect(got).toEqual([
          ...(needed.length > 0 ? [display] : []),
          ...(needed.includes(student) ? [student] : []),
        ]);
        expect(of(fields)).toEqual(got);
      }),
      { numRuns: 5_000 },
    );
  });
});
