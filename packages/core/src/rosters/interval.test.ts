import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { isEmptySpan, isMemberAt, trimmedInactiveAtMs } from './interval.ts';

describe('isMemberAt', () => {
  it('includes the start, excludes the end, and has no end while active', () => {
    const span = { addedAtMs: 100, inactiveAtMs: 200 };
    expect(isMemberAt(span, 99)).toBe(false);
    expect(isMemberAt(span, 100)).toBe(true);
    expect(isMemberAt(span, 199)).toBe(true);
    expect(isMemberAt(span, 200)).toBe(false);
    expect(isMemberAt({ addedAtMs: 100, inactiveAtMs: null }, 100)).toBe(true);
    expect(isMemberAt({ addedAtMs: 100, inactiveAtMs: null }, Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(isMemberAt({ addedAtMs: 100, inactiveAtMs: null }, 99)).toBe(false);
  });

  it('never holds a member in a zero-length span', () => {
    expect(isMemberAt({ addedAtMs: 100, inactiveAtMs: 100 }, 100)).toBe(false);
  });
});

describe('isEmptySpan', () => {
  it('is true exactly when the span holds no instant', () => {
    expect(isEmptySpan({ addedAtMs: 100, inactiveAtMs: 100 })).toBe(true);
    expect(isEmptySpan({ addedAtMs: 100, inactiveAtMs: 99 })).toBe(true);
    expect(isEmptySpan({ addedAtMs: 100, inactiveAtMs: 101 })).toBe(false);
    expect(isEmptySpan({ addedAtMs: 100, inactiveAtMs: null })).toBe(false);
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.option(fc.integer({ min: 0, max: 20 })),
        (addedAtMs, inactiveAtMs) => {
          const span = { addedAtMs, inactiveAtMs };
          const holdsAnInstant = Array.from({ length: 22 }, (_, at) => at).some((at) =>
            isMemberAt(span, at),
          );
          expect(isEmptySpan(span)).toBe(!holdsAnInstant);
        },
      ),
    );
  });
});

describe('trimmedInactiveAtMs', () => {
  it('cuts an earlier overlapping span at the reactivated start', () => {
    expect(trimmedInactiveAtMs({ addedAtMs: 10, inactiveAtMs: 50 }, 30)).toBe(30);
  });

  it('shrinks a span that starts at or after the reactivated start to zero length', () => {
    expect(trimmedInactiveAtMs({ addedAtMs: 40, inactiveAtMs: 50 }, 30)).toBe(40);
    expect(trimmedInactiveAtMs({ addedAtMs: 30, inactiveAtMs: 50 }, 30)).toBe(30);
  });

  it('leaves spans that do not overlap: one that ends at the start, before it, or an empty one', () => {
    expect(trimmedInactiveAtMs({ addedAtMs: 10, inactiveAtMs: 30 }, 30)).toBeNull();
    expect(trimmedInactiveAtMs({ addedAtMs: 10, inactiveAtMs: 20 }, 30)).toBeNull();
    expect(trimmedInactiveAtMs({ addedAtMs: 40, inactiveAtMs: 40 }, 30)).toBeNull();
    expect(trimmedInactiveAtMs({ addedAtMs: 31, inactiveAtMs: 31 }, 30)).toBeNull();
  });

  it('leaves no instant in both spans and never lengthens a span', () => {
    let trimmed = 0;
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (start, length, reactivatedAt) => {
          const span = { addedAtMs: start, inactiveAtMs: start + length };
          const end = trimmedInactiveAtMs(span, reactivatedAt) ?? span.inactiveAtMs;
          if (end !== span.inactiveAtMs) trimmed += 1;
          expect(end).toBeLessThanOrEqual(span.inactiveAtMs);
          expect(end).toBeGreaterThanOrEqual(start);
          for (let at = start; at < span.inactiveAtMs; at += 1) {
            const member = isMemberAt({ addedAtMs: start, inactiveAtMs: end }, at);
            expect(member && at >= reactivatedAt).toBe(false);
            // Only the part from the reactivated start on is cut.
            expect(member).toBe(at < reactivatedAt);
          }
        },
      ),
      { numRuns: 2000 },
    );
    // Ground control: the property met spans that needed a cut.
    expect(trimmed).toBeGreaterThan(100);
  });
});
