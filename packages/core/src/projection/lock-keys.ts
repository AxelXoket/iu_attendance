// The advisory keys a stage 2 or 3 record takes before the attendance module handles it
// (D11 qrKilitAnahtarlari); the sync module takes them for the whole package in one call,
// before any group runs. Both keys are in layer 3 ('projection:*').
// - The session's display key, shared: the record may wait for the lecturer's display
//   record, or take its result from it or from a connection. Students of one session never
//   wait for each other; only the display record and the recount, which hold it exclusive,
//   queue with them.
// - The student's key, exclusive: the backup code count and the neighbour flag.
// Keys carry internal ids in lower case only, never a number or a name. The input is
// structural, so the record text's fields fit it without the contracts package.

import type { AdvisoryKey } from '../shared/advisory-key.ts';
import { idKey } from '../shared/uuid.ts';
import { type BluetoothStatus, PROJECTION_SLOT, QR_DIGITS, SLOT_AT } from './constants.ts';

/** The session's display key; the display record and the recount take it exclusive. */
export const projectionDisplayKey = (sessionId: string) => `projection:display:${idKey(sessionId)}`;
/** The student's key: the backup code count and the neighbour flag. */
export const projectionStudentKey = (studentId: string) => `projection:student:${idKey(studentId)}`;

export type LockKeyRecord = {
  readonly sessionId: string;
  readonly studentId: string;
  /** The record text's stage 2 and 3 fields; a field the phone did not send is absent. */
  readonly fields: {
    readonly qr?: string | undefined;
    readonly backupCode?: string | undefined;
    readonly bluetooth?: { readonly status: BluetoothStatus } | undefined;
    readonly location?: object | undefined;
  };
};

// A lecturer phone's QR: 41 digits whose slot digit is not the projection's.
const isLecturerQr = (qr: string | undefined) =>
  qr !== undefined && QR_DIGITS.test(qr) && qr[SLOT_AT] !== String(PROJECTION_SLOT);

export function projectionLockKeys(record: LockKeyRecord): readonly AdvisoryKey[] {
  const { fields } = record;
  // An empty backup code counts too: it verifies as a mismatch.
  const counts = fields.backupCode !== undefined || fields.location !== undefined;
  const waits = counts || isLecturerQr(fields.qr) || fields.bluetooth?.status === 'SCANNED';
  const keys: AdvisoryKey[] = [];
  if (waits) keys.push({ key: projectionDisplayKey(record.sessionId), mode: 'shared' });
  if (counts) keys.push(projectionStudentKey(record.studentId));
  return keys;
}
