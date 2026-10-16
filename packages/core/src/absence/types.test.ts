import { describe, expect, it } from 'vitest';
import { HOUR_TYPES, RULE_VERSION } from './types.ts';

describe('absence types (D08)', () => {
  it('has the two hour types, theory first', () => {
    expect(HOUR_TYPES).toEqual(['THEORY', 'PRACTICE']);
  });

  it('starts the rule version at 1', () => {
    expect(RULE_VERSION).toBe(1);
  });
});
