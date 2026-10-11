import { sha256 } from './sha256.ts';

// HMAC-SHA256 (RFC 2104, FIPS 198-1) on the shared SHA-256, so shared code computes the
// same MAC as the server's node:crypto. Users: the arrival receipt (D06).

const BLOCK_SIZE = 64;

/** HMAC-SHA256 of a message under a key of any length; returns the 32-byte MAC. */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  // A key longer than one block is hashed first; a shorter one is padded with zeros.
  const block = new Uint8Array(BLOCK_SIZE);
  block.set(key.length > BLOCK_SIZE ? sha256(key) : key);
  const inner = new Uint8Array(BLOCK_SIZE + message.length);
  const outer = new Uint8Array(BLOCK_SIZE + 32);
  for (let index = 0; index < BLOCK_SIZE; index += 1) {
    const byte = block[index] as number;
    inner[index] = byte ^ 0x36;
    outer[index] = byte ^ 0x5c;
  }
  inner.set(message, BLOCK_SIZE);
  outer.set(sha256(inner), BLOCK_SIZE);
  return sha256(outer);
}

/**
 * True when two byte strings are equal. The time depends on the length only, not on
 * where the first difference is, so a MAC check does not leak how much of a guess was right.
 */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] as number) ^ (b[index] as number);
  }
  return difference === 0;
}
