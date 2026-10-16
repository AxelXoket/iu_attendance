import { createHmac } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hmacSha256 } from './hmac-sha256.ts';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const ascii = (text: string) => Uint8Array.from(text, (letter) => letter.charCodeAt(0));

describe('HMAC-SHA256', () => {
  // RFC 4231 test cases 1, 2, 4 and 6 (6: a key longer than one block).
  it.each([
    [
      'case 1',
      new Uint8Array(20).fill(0x0b),
      ascii('Hi There'),
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    ],
    [
      'case 2',
      ascii('Jefe'),
      ascii('what do ya want for nothing?'),
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    ],
    [
      'case 4',
      Uint8Array.from({ length: 25 }, (_, index) => index + 1),
      new Uint8Array(50).fill(0xcd),
      '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b',
    ],
    [
      'case 6',
      new Uint8Array(131).fill(0xaa),
      ascii('Test Using Larger Than Block-Size Key - Hash Key First'),
      '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
    ],
  ])('matches RFC 4231 %s', (_name, key, message, expected) => {
    expect(hex(hmacSha256(key, message))).toBe(expected);
  });

  it('agrees with node:crypto for keys around the block size and any message', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ maxLength: 150 }),
        fc.uint8Array({ maxLength: 300 }),
        (key, message) => {
          const expected = createHmac('sha256', key).update(message).digest('hex');
          expect(hex(hmacSha256(key, message))).toBe(expected);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('agrees with node:crypto at every key length from 0 to 130 bytes', () => {
    const message = ascii('esitleme.ulasma.1');
    for (let length = 0; length <= 130; length += 1) {
      const key = Uint8Array.from({ length }, (_, index) => (index * 7 + length) & 0xff);
      const expected = createHmac('sha256', key).update(message).digest('hex');
      expect(hex(hmacSha256(key, message))).toBe(expected);
    }
  });
});
