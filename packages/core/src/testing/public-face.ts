// Test helper, never shipped: checks a folder's public face (its index.ts) against the
// folder's rule files, which the test finds with import.meta.glob (Vite fills the call in
// within the test file itself, so the call stays there).
import { expect } from 'vitest';

// import.meta.glob's type is in vite/client, which this package does not load.
declare global {
  interface ImportMeta {
    glob<T>(patterns: readonly string[], options: { eager: true }): Record<string, T>;
  }
}

/** The face offers every value each rule file exports, the same value, and nothing else. */
export function expectPublicFace(
  face: Record<string, unknown>,
  files: Record<string, Record<string, unknown>>,
): void {
  const expected: Record<string, unknown> = {};
  for (const [file, module] of Object.entries(files)) {
    for (const [name, value] of Object.entries(module)) {
      expect(Object.hasOwn(expected, name), `${file}.${name} exported twice`).toBe(false);
      expected[name] = value;
    }
  }
  expect(Object.keys(face).sort()).toEqual(Object.keys(expected).sort());
  for (const [name, value] of Object.entries(expected)) expect(face[name], name).toBe(value);
}
