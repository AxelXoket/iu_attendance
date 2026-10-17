// The projection tests' HMAC: a fixed 32-byte key (bytes 0x00 to 0x1f) under node:crypto's
// HMAC-SHA256, the primitive the server signs with. mac.test.ts keeps its own copy: its
// package comes before this file in the roadmap.

import { createHmac } from 'node:crypto';
import type { Hmac } from '../projection/mac.ts';

const KEY = Buffer.from('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', 'hex');

export const hmac: Hmac = (message) =>
  new Uint8Array(createHmac('sha256', KEY).update(message).digest());
