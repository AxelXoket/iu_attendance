import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decideGeneration } from './generation.ts';

const hex8 = (value: number) => value.toString(16).toUpperCase().padStart(8, '0');
// A 64-bit system identifier as PostgreSQL prints it.
const systemIds = fc.bigInt({ min: 1n, max: (1n << 64n) - 1n }).map(String);
const timelines = fc.integer({ min: 1, max: 0xffff_ffff });
const segments = fc.tuple(fc.nat({ max: 0xffff_ffff }), fc.nat({ max: 0xffff_ffff }));

describe('decideGeneration', () => {
  it('returns the generation when both timelines agree, and is uncertain otherwise', () => {
    fc.assert(
      fc.property(
        systemIds,
        timelines,
        fc.option(timelines, { nil: undefined, freq: 2 }),
        segments,
        (systemId, controlTimeline, otherTimeline, [log, segment]) => {
          // About half of the cases share the timeline; the rest draw another one.
          const walTimeline = otherTimeline ?? controlTimeline;
          const walFile = `${hex8(walTimeline)}${hex8(log)}${hex8(segment)}`;
          const generation = decideGeneration(systemId, controlTimeline, walFile);
          if (walTimeline === controlTimeline) {
            expect(generation).toEqual({
              systemId,
              timeline: controlTimeline,
              text: `${systemId}.${controlTimeline}`,
            });
            expect(generation?.text).toMatch(/^[0-9]+\.[0-9]+$/);
          } else {
            expect(generation).toBeNull();
          }
        },
      ),
      { numRuns: 10_000 },
    );
  });

  it('reads the timeline from the first eight hex digits of a well-formed WAL name only', () => {
    expect(decideGeneration('7', 2, '000000020000000000000001')).toEqual({
      systemId: '7',
      timeline: 2,
      text: '7.2',
    });
    for (const walFile of [
      '00000002000000000000001',
      '0000000200000000000000011',
      '00000002000000000000000g',
      '00000002000000000000000a',
      '',
    ]) {
      expect(decideGeneration('7', 2, walFile), walFile).toBeNull();
    }
  });
});
