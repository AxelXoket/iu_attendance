import { sha256 } from '../shared/sha256.ts';
import { utf8Bytes } from '../shared/utf8.ts';

// Student buckets (D03-B19): a roster write takes the advisory keys of at most 256
// buckets instead of one key per student, and a key never carries the number. Pure:
// callers in other modules collect the keys up front and take them in one
// D12 advisory lock call (layer 2 of the shared advisory layers).

/** Number of buckets; a bucket is an integer from 0 to BUCKET_COUNT - 1. */
export const BUCKET_COUNT = 256;

/** Advisory key text '<module>:<rule>:' followed by the bucket in decimal. */
export const ROSTER_BUCKET_KEY_PREFIX = 'rosters:bucket:';

const STUDENT_NUMBER = /^[0-9]{9,10}$/;

/**
 * The bucket of a student number: the first byte of SHA-256 over its ASCII digits.
 * Throws TypeError for anything that is not a string (a number value would pass the
 * pattern as text and hash as zero bytes) and RangeError for a string that is not 9 or
 * 10 ASCII digits. The input is never echoed: an error message can reach a log.
 */
export function bucketNumber(studentNumber: string): number {
  if (typeof studentNumber !== 'string') {
    throw new TypeError('bucketNumber expects the student number as a string');
  }
  if (!STUDENT_NUMBER.test(studentNumber)) {
    throw new RangeError('bucketNumber expects a student number of 9 or 10 ASCII digits');
  }
  return sha256(utf8Bytes(studentNumber))[0] as number;
}

/** The advisory lock key of a bucket, 'rosters:bucket:<bucket>'. Throws outside 0 to 255. */
export function rosterBucketKey(bucket: number): `${typeof ROSTER_BUCKET_KEY_PREFIX}${number}` {
  if (!Number.isInteger(bucket) || bucket < 0 || bucket >= BUCKET_COUNT) {
    throw new RangeError(`rosterBucketKey expects an integer bucket from 0 to ${BUCKET_COUNT - 1}`);
  }
  return `${ROSTER_BUCKET_KEY_PREFIX}${bucket}`;
}
