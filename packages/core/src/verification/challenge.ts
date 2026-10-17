// The device challenge and binding texts (D07-B10): one byte layout for the phone that
// signs and the server that checks, frozen in the shared samples (sample-evidence.json).
// The challenge text has six lines joined by LF (0x0A), with no LF at the end:
//   iu-yoklama-mo/1
//   purpose (registration, device_change or app_attest_renewal)
//   value (the 32-byte verification value, base64url without padding)
//   student number
//   isSystemUser (1, 0, or - on an iPhone)
//   Secure Enclave key (SPKI, base64url without padding, or - on Android)
// The challenge is the SHA-256 of these bytes: Android's setAttestationChallenge and the
// iPhone's attestKey clientDataHash take it. The device id is not part of it, since the
// identity module gives it only when the request arrives. The binding text, which the
// phone signs with its device key, puts iu-yoklama-bi/1 and the platform line before the
// same six lines.

import { isStudentNumber } from '../rosters/number.ts';
import { encodeBase64Url } from '../shared/base64url.ts';
import { sha256 } from '../shared/sha256.ts';
import { utf8Bytes } from '../shared/utf8.ts';
import { VERIFICATION_PURPOSES, type VerificationPurpose } from './codes.ts';
import { VERIFICATION_VALUE_BYTES } from './constants.ts';

export const CHALLENGE_TAG = 'iu-yoklama-mo/1';
export const BINDING_TAG = 'iu-yoklama-bi/1';
// The line of a field the platform does not have.
const ABSENT = '-';

export type ChallengeFields = {
  readonly purpose: VerificationPurpose;
  /** The verification value's 32 bytes: the request's challenge field, decoded. */
  readonly value: Uint8Array;
  readonly studentNumber: string;
  /** Android's isSystemUser; null on an iPhone. */
  readonly isSystemUser: boolean | null;
  /** The Secure Enclave key's SPKI on an iPhone; null on Android. */
  readonly secureEnclaveKey: Uint8Array | null;
};

// Each platform sends exactly one of the two fields: Android isSystemUser, an iPhone its
// Secure Enclave key; the platform of the fields is the one that sent them.
const platformOf = (fields: ChallengeFields) => (fields.isSystemUser !== null ? 'android' : 'ios');

function challengeLines(fields: ChallengeFields): string[] {
  if (!(VERIFICATION_PURPOSES as readonly string[]).includes(fields.purpose)) {
    throw new RangeError('the purpose is one of the verification purposes');
  }
  if (fields.value.length !== VERIFICATION_VALUE_BYTES) {
    throw new RangeError(`the verification value is ${VERIFICATION_VALUE_BYTES} bytes`);
  }
  if (!isStudentNumber(fields.studentNumber)) {
    throw new RangeError('the student number is 9 or 10 digits');
  }
  if ((fields.isSystemUser === null) === (fields.secureEnclaveKey === null)) {
    throw new RangeError('exactly one of isSystemUser and the Secure Enclave key is set');
  }
  if (fields.secureEnclaveKey !== null && fields.secureEnclaveKey.length === 0) {
    throw new RangeError('a Secure Enclave key is not empty');
  }
  return [
    CHALLENGE_TAG,
    fields.purpose,
    encodeBase64Url(fields.value),
    fields.studentNumber,
    fields.isSystemUser === null ? ABSENT : fields.isSystemUser ? '1' : '0',
    fields.secureEnclaveKey === null ? ABSENT : encodeBase64Url(fields.secureEnclaveKey),
  ];
}

/**
 * The challenge text's bytes. Throws RangeError for a purpose not in the list, a value
 * that is not 32 bytes, a student number that is not 9 or 10 digits, both or neither of
 * isSystemUser and the Secure Enclave key, or an empty Secure Enclave key.
 */
export function challengeText(fields: ChallengeFields): Uint8Array {
  return utf8Bytes(challengeLines(fields).join('\n'));
}

/** The challenge: the SHA-256 of the challenge text. */
export function challenge(fields: ChallengeFields): Uint8Array {
  return sha256(challengeText(fields));
}

/**
 * The binding text's bytes, which the phone signs with its device key. Throws RangeError as
 * challengeText does, and for a platform other than the one the fields come from.
 */
export function bindingText(platform: 'android' | 'ios', fields: ChallengeFields): Uint8Array {
  const lines = challengeLines(fields);
  if (platform !== platformOf(fields)) {
    throw new RangeError('the binding platform is the one the fields come from');
  }
  return utf8Bytes([BINDING_TAG, platform, ...lines].join('\n'));
}
