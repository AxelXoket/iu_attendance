import { describe, expect, it } from 'vitest';
import { expectPublicFace } from '../testing/public-face.ts';
import * as finalStatus from './final-status.ts';
import * as corrections from './index.ts';

// Every rule file in the folder, so a new one left out of the face fails here.
const FILES = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./*.test.ts'], {
  eager: true,
});

describe('the corrections public face (index.ts)', () => {
  it('offers every value each rule file exports, and nothing else', () => {
    expectPublicFace(corrections, FILES);
    // Ground control: the glob found the folder's seven rule files, and the face carries
    // the final status rule.
    expect(Object.keys(FILES).sort()).toEqual([
      './batch.ts',
      './catalog.ts',
      './chain.ts',
      './document-number.ts',
      './final-status.ts',
      './issue-window.ts',
      './request-digest.ts',
    ]);
    expect(corrections.resolveFinalStatus).toBe(finalStatus.resolveFinalStatus);
  });
});
