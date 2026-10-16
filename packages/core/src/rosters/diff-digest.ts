import { encodeBase64Url } from '../shared/base64url.ts';
import { canonicalJson } from '../shared/canonical-json.ts';
import { sha256 } from '../shared/sha256.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import type { RosterDiff } from './diff.ts';

// Diff digest (D03-B03): the preview returns it and the apply request sends it back; the
// server recomputes the diff under its locks and applies it only when the digest is the
// same, so the lecturer never confirms a diff they did not see. The canonical diff is one
// record per change: the row id or student number, the kind of change, the old and the
// target section, the new name and order, and whether a new row is a late addition. The
// records are sorted, so the digest does not depend on the order of the rows. The apply
// instant is left out: a moving student's old row ends then, and it differs between
// preview and apply. A cut keeps its new end, which comes from the rows' own starts. Each
// record is canonical JSON, so a number that is not a safe integer throws.

type CanonicalRecord = readonly (string | number | boolean | null)[];

function canonicalRecords(sectionId: string, diff: RosterDiff): CanonicalRecord[] {
  return [
    ...diff.toAdd.map((add) => [
      'add',
      add.studentNumber,
      sectionId,
      add.fullName,
      add.order,
      add.lateAdded,
    ]),
    ...diff.toReactivate.map((back) => [
      'reactivate',
      back.rowId,
      sectionId,
      back.fullName,
      back.order,
    ]),
    ...diff.sectionChanges.map((move) => [
      'move',
      move.studentNumber,
      move.oldRowId,
      move.oldSectionId,
      sectionId,
      move.targetRowId,
      move.fullName,
      move.order,
    ]),
    ...diff.toDeactivate.map((row) => ['deactivate', row.rowId]),
    ...diff.toTrim.map((cut) => ['trim', cut.rowId, cut.sectionId, cut.newInactiveAtMs]),
    ...diff.nameChanges.map((change) => ['rename', change.rowId, change.newName]),
    ...diff.spellingFixes.map((fix) => ['spelling', fix.rowId, fix.newName]),
    ...diff.orderChanges.map((change) => ['order', change.rowId, change.order]),
    ...diff.sourceChanges.map((change) => ['source', change.rowId]),
  ];
}

/** The 43-character base64url SHA-256 of the canonical diff of one section's upload. */
export function diffDigest(sectionId: string, diff: RosterDiff): string {
  const records = canonicalRecords(sectionId, diff).map((record, index) =>
    canonicalJson(record, `record[${index}]`),
  );
  records.sort();
  return encodeBase64Url(sha256(utf8Bytes(`[${records.join(',')}]`)));
}
