import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sha256 } from './sha256.ts';
import { utf8Bytes } from './utf8.ts';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

describe('SHA-256 matches Node', () => {
  it('matches the FIPS 180-4 test vectors', () => {
    expect(hex(sha256(utf8Bytes('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(hex(sha256(new Uint8Array()))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(hex(sha256(utf8Bytes('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('agrees with node:crypto for any bytes', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 300 }), (bytes) => {
        expect(hex(sha256(bytes))).toBe(createHash('sha256').update(bytes).digest('hex'));
      }),
      { numRuns: 1000 },
    );
  });

  // Every length from 0 to 200 bytes: the one-block limit (55), the first two-block
  // message (56), whole blocks (64, 128) and the three-block step (120) are all in it.
  it('agrees with node:crypto at every length across the block boundaries', () => {
    for (let length = 0; length <= 200; length += 1) {
      const bytes = Uint8Array.from({ length }, (_, index) => (index * 31 + length) & 0xff);
      expect(hex(sha256(bytes))).toBe(createHash('sha256').update(bytes).digest('hex'));
    }
  });
});
