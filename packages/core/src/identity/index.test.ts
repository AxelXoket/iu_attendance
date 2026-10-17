import { describe, expect, it } from 'vitest';
import { expectPublicFace } from '../testing/public-face.ts';
import * as backoff from './backoff.ts';
import * as identity from './index.ts';

// Every rule file in the folder, so a new one left out of the face fails here.
const FILES = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./*.test.ts'], {
  eager: true,
});

describe('the identity public face (index.ts)', () => {
  it('offers every value each rule file exports, and nothing else', () => {
    expectPublicFace(identity, FILES);
    // Ground control: the glob found the folder's eight rule files, and the face carries
    // the backoff rule.
    expect(Object.keys(FILES).sort()).toEqual([
      './backoff.ts',
      './confirmation.ts',
      './device-key.ts',
      './device-label.ts',
      './device-status.ts',
      './email.ts',
      './registration-code.ts',
      './session-rules.ts',
    ]);
    expect(identity.backoffSeconds).toBe(backoff.backoffSeconds);
  });
});
