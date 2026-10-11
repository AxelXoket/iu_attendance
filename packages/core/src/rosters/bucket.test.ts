import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BUCKET_COUNT, bucketNumber, ROSTER_BUCKET_KEY_PREFIX, rosterBucketKey } from './bucket.ts';

const RUNS = { numRuns: 1000 };
const studentNumbers = fc.stringMatching(/^[0-9]{9,10}$/);

const messageOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  return '';
};

// Uniform digits from a fixed seed (mulberry32), so the spread check is reproducible
// and free of the edge-case bias of property generators.
function randomStudentNumbers(count: number, seed: number): string[] {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const numbers: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const length = next() < 0.5 ? 9 : 10;
    let digits = '';
    for (let position = 0; position < length; position += 1) {
      digits += String(Math.floor(next() * 10));
    }
    numbers.push(digits);
  }
  return numbers;
}

describe('Bucket number is deterministic', () => {
  it('gives the same bucket from 0 to 255 for the same number: the first byte of SHA-256', () => {
    fc.assert(
      fc.property(studentNumbers, (number) => {
        const bucket = bucketNumber(number);
        expect(Number.isInteger(bucket)).toBe(true);
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(BUCKET_COUNT);
        expect(bucketNumber([...number].join(''))).toBe(bucket);
        expect(bucket).toBe(createHash('sha256').update(number, 'ascii').digest()[0]);
      }),
      RUNS,
    );
  });

  it('agrees with the SHA-256 test vector of 123456789', () => {
    // SHA-256('123456789') starts with byte 0x15.
    expect(bucketNumber('123456789')).toBe(0x15);
    expect(rosterBucketKey(bucketNumber('123456789'))).toBe(`${ROSTER_BUCKET_KEY_PREFIX}21`);
  });

  it('builds keys with the prefix that carry no digit run of the number', () => {
    fc.assert(
      fc.property(studentNumbers, (number) => {
        const bucket = bucketNumber(number);
        const key = rosterBucketKey(bucket);
        expect(key.startsWith(ROSTER_BUCKET_KEY_PREFIX)).toBe(true);
        expect(key.slice(ROSTER_BUCKET_KEY_PREFIX.length)).toBe(String(bucket));
        for (let start = 0; start + 4 <= number.length; start += 1) {
          expect(key).not.toContain(number.slice(start, start + 4));
        }
        // Positive control: the same check catches a key that embeds the number.
        expect(`${ROSTER_BUCKET_KEY_PREFIX}${number}`).toContain(number.slice(0, 4));
      }),
      RUNS,
    );
  });

  // That the module is on the shared module list is checked in packages/contracts:
  // core does not import contracts (D13 import rules).
  it('uses the shared key shape <module>:<rule>: with the module this file belongs to', () => {
    const [module, rule, rest] = ROSTER_BUCKET_KEY_PREFIX.split(':');
    const ownModule = path.basename(path.dirname(fileURLToPath(import.meta.url)));
    expect(module).toBe(ownModule);
    expect(rule).toMatch(/^[a-z][a-z_]*$/);
    expect(rest).toBe('');
  });

  it('throws for a bucket that is not an integer from 0 to 255', () => {
    for (const bad of [-1, BUCKET_COUNT, 1.5, -0.5, 255.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => rosterBucketKey(bad)).toThrow(RangeError);
    }
    const outside = fc.oneof(
      fc.integer({ max: -1 }),
      fc.integer({ min: BUCKET_COUNT }),
      fc.double().filter((value) => !Number.isInteger(value)),
    );
    fc.assert(
      fc.property(outside, (bad) => {
        expect(() => rosterBucketKey(bad)).toThrow(RangeError);
      }),
      RUNS,
    );
    // Ground control: every bucket gives a key, and the 256 keys differ.
    const keys = new Set(
      Array.from({ length: BUCKET_COUNT }, (_, bucket) => rosterBucketKey(bucket)),
    );
    expect(keys.size).toBe(BUCKET_COUNT);
  });

  it('spreads 100,000 random numbers so every bucket gets more than half and less than twice its share', () => {
    const sample = 100_000;
    const counts = new Array<number>(BUCKET_COUNT).fill(0);
    for (const number of randomStudentNumbers(sample, 20261011)) {
      const bucket = bucketNumber(number);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }
    // The share is sample / BUCKET_COUNT; compared without fractions.
    for (const count of counts) {
      expect(count * BUCKET_COUNT * 2).toBeGreaterThan(sample);
      expect(count * BUCKET_COUNT).toBeLessThan(sample * 2);
    }
  });

  // Agreement with the shared student number schema is checked in packages/contracts.
  it.each([
    ['nine digits', '123456789', true],
    ['ten digits', '1234567890', true],
    ['eight digits', '12345678', false],
    ['eleven digits', '12345678901', false],
    ['an empty text', '', false],
    ['a leading space', ' 123456789', false],
    ['a trailing space', '123456789 ', false],
    ['a trailing line break', '1234567890\n', false],
    ['a plus sign', '+123456789', false],
    ['fullwidth digits', '１２３４５６７８９', false],
    ['Arabic-Indic digits', '١٢٣٤٥٦٧٨٩', false],
  ])('reads %s (%j) as a valid student number: %s', (_name, candidate, valid) => {
    if (valid) expect(bucketNumber(candidate)).toBeGreaterThanOrEqual(0);
    else expect(() => bucketNumber(candidate)).toThrow(RangeError);
  });

  it('throws TypeError for a student number that is not a string', () => {
    // Number values, an array and objects that read as the digits, null and undefined.
    // Without the type check a number value passes the pattern as text and hashes as
    // zero bytes.
    const digits = '123456789';
    for (const bad of [
      123456789,
      1234567890,
      [digits],
      Object(digits),
      { toString: () => digits },
      null,
      undefined,
    ]) {
      expect(() => bucketNumber(bad as unknown as string)).toThrow(TypeError);
    }
    fc.assert(
      fc.property(
        fc.anything().filter((value) => typeof value !== 'string'),
        (value) => {
          expect(() => bucketNumber(value as string)).toThrow(TypeError);
        },
      ),
      RUNS,
    );
    // Ground control: the same digits as a string have a bucket.
    expect(bucketNumber(digits)).toBe(0x15);
  });

  it('never puts the input into an error message, which could reach a log', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^(?:[0-9]{3,8}|[0-9]{11,16})$/), (candidate) => {
        const message = messageOf(() => bucketNumber(candidate));
        expect(message).not.toBe('');
        expect(message).not.toContain(candidate);
      }),
      RUNS,
    );
    // A student number passed as a bucket by mistake is not echoed either.
    const message = messageOf(() => rosterBucketKey(123456789));
    expect(message).not.toBe('');
    expect(message).not.toContain('123456789');
    // Nor one held as a number value.
    const typeMessage = messageOf(() => bucketNumber(123456789 as unknown as string));
    expect(typeMessage).not.toBe('');
    expect(typeMessage).not.toContain('123456789');
  });
});
