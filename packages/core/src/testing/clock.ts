// A clock document as D04's verifier reads it, for the tests of the clock rule and of its
// callers: valid, signed by key k1, not compromised unless the fields say so.

import type { ClockSubject, DocumentVerification } from '../clock/types.ts';

export const clockDocument = (fields: {
  readonly subject: ClockSubject;
  readonly serverTimeMs: number;
  readonly keyCompromised?: boolean;
}): DocumentVerification => ({
  valid: true,
  kid: 'k1',
  value: 'AAAAAAAAAAAAAAAAAAAAAA',
  keyCompromised: false,
  ...fields,
});
