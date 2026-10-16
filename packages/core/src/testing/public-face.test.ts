import { describe, expect, it } from 'vitest';
import { expectPublicFace } from './public-face.ts';

const rule = () => 1;
const other = () => 2;
const FILES = { './a.ts': { rule, LIMIT: 3 }, './b.ts': { other } };

describe('expectPublicFace', () => {
  it('passes a face that offers exactly the files’ values', () => {
    expect(() => expectPublicFace({ rule, LIMIT: 3, other }, FILES)).not.toThrow();
  });

  it('fails a face with a missing name, an extra name or another value under a name', () => {
    expect(() => expectPublicFace({ rule, LIMIT: 3 }, FILES)).toThrow();
    expect(() => expectPublicFace({ rule, LIMIT: 3, other, extra: 4 }, FILES)).toThrow();
    expect(() => expectPublicFace({ rule, LIMIT: 3, other: () => 2 }, FILES)).toThrow();
    expect(() => expectPublicFace({ rule, LIMIT: 4, other }, FILES)).toThrow();
  });

  it('fails when two files export the same name', () => {
    const twice = { ...FILES, './c.ts': { rule } };
    expect(() => expectPublicFace({ rule, LIMIT: 3, other }, twice)).toThrow('exported twice');
  });
});
