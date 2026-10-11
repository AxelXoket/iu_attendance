import { bucketNumber, ROSTER_BUCKET_KEY_PREFIX } from '@iu-attendance/core/rosters/bucket';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { studentNumberSchema } from '../identity.ts';
import { MODULES } from '../modules.ts';

// Core may not import contracts at run time (D13 import rules), so the checks that the two
// packages agree live here, on the side that depends on the other.
describe('contracts and core agree', () => {
  it('names a module of the shared list in the roster bucket key', () => {
    const [module] = ROSTER_BUCKET_KEY_PREFIX.split(':');
    expect(MODULES).toContain(module);
    expect(module).toBe('rosters');
  });

  it('lets bucketNumber accept exactly the student numbers of the shared schema', () => {
    const candidates = fc.oneof(
      fc.stringMatching(/^[0-9]{9,10}$/),
      fc.stringMatching(/^[0-9]{0,12}$/),
      fc.string(),
      fc.string({ unit: 'binary', maxLength: 12 }),
      fc.constantFrom(
        ' 123456789',
        '123456789 ',
        '1234567890\n',
        '+123456789',
        // Fullwidth and Arabic-Indic digits: digits, but not ASCII.
        '１２３４５６７８９',
        '١٢٣٤٥٦٧٨٩',
      ),
    );
    let accepted = 0;
    fc.assert(
      fc.property(candidates, (candidate) => {
        if (studentNumberSchema.safeParse(candidate).success) {
          accepted += 1;
          expect(() => bucketNumber(candidate)).not.toThrow();
        } else {
          expect(() => bucketNumber(candidate)).toThrow(RangeError);
        }
      }),
      { numRuns: 1000 },
    );
    // Ground control: valid numbers were among the candidates too.
    expect(accepted).toBeGreaterThan(100);
  });
});
