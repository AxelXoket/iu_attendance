import { describe, expect, it } from 'vitest';
import * as absence from './index.ts';
import * as makeup from './makeup.ts';
import * as phone from './phone.ts';
import * as texts from './texts.ts';

// Vite, which runs these tests, fills import.meta.glob in when it loads the file; its
// type is in vite/client, which this package does not load.
declare global {
  interface ImportMeta {
    glob<T>(patterns: readonly string[], options: { eager: true }): Record<string, T>;
  }
}

// Every rules file in the folder, so a new one left out of the face fails here.
const FILES = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./*.test.ts'], {
  eager: true,
});

describe('the absence public face (index.ts)', () => {
  it('offers every value each rules file exports, and nothing else', () => {
    const expected: Record<string, unknown> = {};
    for (const [file, module] of Object.entries(FILES)) {
      for (const [name, value] of Object.entries(module)) {
        expect(name in expected, `${file}.${name} exported twice`).toBe(false);
        expected[name] = value;
      }
    }
    const face: Record<string, unknown> = { ...absence };
    expect(Object.keys(face).sort()).toEqual(Object.keys(expected).sort());
    for (const [name, value] of Object.entries(expected)) expect(face[name], name).toBe(value);
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
