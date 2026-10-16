import { describe, expect, it } from 'vitest';
import { expectPublicFace } from '../testing/public-face.ts';
import * as absence from './index.ts';
import * as makeup from './makeup.ts';
import * as phone from './phone.ts';
import * as texts from './texts.ts';

// Every rules file in the folder, so a new one left out of the face fails here.
const FILES = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./*.test.ts'], {
  eager: true,
});

describe('the absence public face (index.ts)', () => {
  it('offers every value each rules file exports, and nothing else', () => {
    expectPublicFace(absence, FILES);
    // Ground control: the glob found the rules files, and the face carries this package's
    // three rules.
    expect(Object.keys(FILES)).toContain('./makeup.ts');
    expect(Object.keys(FILES).length).toBeGreaterThanOrEqual(10);
    expect([absence.makeupDebt, absence.phoneCorrection, absence.levelMessageText]).toEqual([
      makeup.makeupDebt,
      phone.phoneCorrection,
      texts.levelMessageText,
    ]);
  });
});
