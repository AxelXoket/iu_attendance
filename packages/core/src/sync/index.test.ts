import { describe, expect, it } from 'vitest';
import { expectPublicFace } from '../testing/public-face.ts';
import * as sync from './index.ts';
import * as sendWindow from './send-window.ts';

// Every rule file in the folder, so a new one left out of the face fails here.
const FILES = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./*.test.ts'], {
  eager: true,
});

describe('the sync public face (index.ts)', () => {
  it('offers every value each rule file exports, and nothing else', () => {
    expectPublicFace(sync, FILES);
    // Ground control: the glob found the folder's seven rule files, and the face carries
    // this package's rule.
    expect(Object.keys(FILES).sort()).toEqual([
      './arrival-receipt.ts',
      './cursor.ts',
      './page.ts',
      './protocol.ts',
      './second-anchor-text.ts',
      './send-window.ts',
      './watermark.ts',
    ]);
    expect(sync.sendWindowEndAtMs).toBe(sendWindow.sendWindowEndAtMs);
  });
});
