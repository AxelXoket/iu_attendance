import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LATITUDE_E4_MAX, LOCATION_RESULTS, LONGITUDE_E4_MAX, RADIUS_M_MAX } from './constants.ts';
import {
  distanceM,
  EARTH_RADIUS_M,
  impossibleMovement,
  type LocationFix,
  type LocationLimits,
  locationResult,
  weakSignal,
} from './location.ts';

const fix = (latitudeE4: number, longitudeE4: number, radiusM = 0): LocationFix => ({
  latitudeE4,
  longitudeE4,
  radiusM,
});
// Stand-ins in the shape of the projection settings; the server passes the settings.
const LIMITS: LocationLimits = { radiusLimitM: 100, locationMarginM: 50 };
const SPEED = { impossibleSpeedKmh: 300 };

// Anywhere on Earth, and a second point a few hundred metres from the first, so both near
// and far pairs come up; radii run past the limits the tests use.
const anywhereArb = fc.record({
  latitudeE4: fc.integer({ min: -LATITUDE_E4_MAX, max: LATITUDE_E4_MAX }),
  longitudeE4: fc.integer({ min: -LONGITUDE_E4_MAX, max: LONGITUDE_E4_MAX }),
  radiusM: fc.integer({ min: 0, max: 150 }),
});
const pairArb = fc
  .tuple(
    anywhereArb.filter((point) => Math.abs(point.latitudeE4) <= LATITUDE_E4_MAX - 1_000),
    fc.integer({ min: -40, max: 40 }),
    fc.integer({ min: -40, max: 40 }),
    fc.integer({ min: 0, max: 150 }),
  )
  .map(([first, dLat, dLon, radiusM]): [LocationFix, LocationFix] => [
    first,
    fix(
      first.latitudeE4 + dLat,
      Math.max(-LONGITUDE_E4_MAX, Math.min(LONGITUDE_E4_MAX, first.longitudeE4 + dLon)),
      radiusM,
    ),
  ]);
const limitsArb: fc.Arbitrary<LocationLimits> = fc.record({
  radiusLimitM: fc.integer({ min: 20, max: 150 }),
  locationMarginM: fc.integer({ min: 0, max: 100 }),
});

// The oracle, in the test file only: the angle between the two points' unit vectors from
// atan2 of their cross and dot products, well conditioned everywhere, antipodes included.
function vectorDistanceM(a: LocationFix, b: LocationFix): number {
  const unit = (point: LocationFix) => {
    const lat = (point.latitudeE4 / 10_000) * (Math.PI / 180);
    const lon = (point.longitudeE4 / 10_000) * (Math.PI / 180);
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)] as const;
  };
  const [ax, ay, az] = unit(a);
  const [bx, by, bz] = unit(b);
  const cross = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  return EARTH_RADIUS_M * Math.atan2(cross, ax * bx + ay * by + az * bz);
}

describe('Konum karşılaştırması ve imkânsız yer değiştirme (location comparison)', () => {
  it('measures whole metres, the same both ways, the true distance rounded', () => {
    fc.assert(
      fc.property(fc.oneof(pairArb, fc.tuple(anywhereArb, anywhereArb)), ([a, b]) => {
        const distance = distanceM(a, b);
        expect(Number.isSafeInteger(distance)).toBe(true);
        expect(distance).toBe(distanceM(b, a));
        // Rounded to the nearest metre: within half a metre of the true distance.
        expect(Math.abs(distance - vectorDistanceM(a, b))).toBeLessThanOrEqual(0.5 + 1e-6);
        expect(distanceM(a, a)).toBe(0);
      }),
      { numRuns: 5000 },
    );
  });

  it('gives the known lengths on the IUGG mean radius', () => {
    // A degree on the equator, 2 pi R / 360; a ten-thousandth of a degree of latitude.
    expect(distanceM(fix(0, 0), fix(0, 10_000))).toBe(111_195);
    expect(distanceM(fix(410_000, 289_000), fix(410_001, 289_000))).toBe(11);
    // Half the world round, pi R with R = 6,371,008.8 m (6,371,000 m would give 20,015,087).
    expect(distanceM(fix(0, 0), fix(0, LONGITUDE_E4_MAX))).toBe(20_015_114);
    // Antipodes and near-antipodes, where haversine loses the metre: exact to the metre here.
    // The expected values are the 60-digit distances rounded (20,015,105.50057 and so on).
    expect(distanceM(fix(-880_208, 0), fix(880_208, -LONGITUDE_E4_MAX))).toBe(20_015_114);
    expect(distanceM(fix(-364_742, 596), fix(364_742, -1_799_405))).toBe(20_015_106);
    expect(distanceM(fix(899_992, 1_670_970), fix(-899_991, 0))).toBe(20_015_091);
    expect(distanceM(fix(-899_992, -665_168), fix(899_993, 1_799_991))).toBe(20_015_023);
    // 55.6 m rounds up: 5 ten-thousandths of a degree on the equator.
    expect(distanceM(fix(0, 0), fix(0, 5))).toBe(56);
  });

  it('is near up to the two radii plus the margin and far past them, both radii within the limit', () => {
    fc.assert(
      fc.property(pairArb, limitsArb, ([student, reference], limits) => {
        const result = locationResult({ student, reference }, limits);
        expect(LOCATION_RESULTS).toContain(result);
        if (student.radiusM > limits.radiusLimitM || reference.radiusM > limits.radiusLimitM) {
          expect(result).toBe('NO_LOCATION');
        } else {
          const reach = student.radiusM + reference.radiusM + limits.locationMarginM;
          expect(result).toBe(distanceM(student, reference) <= reach ? 'NEAR' : 'FAR');
        }
      }),
      { numRuns: 5000 },
    );
  });

  it('is near at exactly the reach and far a metre short of it', () => {
    fc.assert(
      fc.property(pairArb, ([student, reference]) => {
        const radii = student.radiusM + reference.radiusM;
        const locationMarginM = distanceM(student, reference) - radii;
        fc.pre(locationMarginM >= 1);
        const radiusLimitM = Math.max(student.radiusM, reference.radiusM);
        const both = { student, reference };
        expect(locationResult(both, { radiusLimitM, locationMarginM })).toBe('NEAR');
        expect(locationResult(both, { radiusLimitM, locationMarginM: locationMarginM - 1 })).toBe(
          'FAR',
        );
        // A radius one metre past the limit makes either location unusable.
        if (radiusLimitM > 0) {
          expect(locationResult(both, { radiusLimitM: radiusLimitM - 1, locationMarginM })).toBe(
            'NO_LOCATION',
          );
        }
      }),
    );
  });

  it('waits for a reference only with a usable student location', () => {
    const here = (radiusM: number) => fix(410_000, 289_000, radiusM);
    expect(locationResult({ student: here(30), reference: null }, LIMITS)).toBe('PENDING');
    expect(locationResult({ student: null, reference: null }, LIMITS)).toBe('NO_LOCATION');
    expect(locationResult({ student: null, reference: here(30) }, LIMITS)).toBe('NO_LOCATION');
    expect(locationResult({ student: here(101), reference: null }, LIMITS)).toBe('NO_LOCATION');
    // The limit itself is still usable.
    expect(locationResult({ student: here(100), reference: here(100) }, LIMITS)).toBe('NEAR');
  });

  it('flags a movement faster than the limit beyond the two radii, either order', () => {
    // 5 km beyond the radii in 60 s is exactly 300 km/h: not past it; a millisecond less is.
    const a = { fix: fix(0, 0, 0), atMs: 0 };
    let longitudeE4 = 0;
    while (distanceM(fix(0, 0), fix(0, longitudeE4)) < 5_000) longitudeE4 += 1;
    const b = fix(0, longitudeE4);
    // At 300 km/h a metre takes 12 ms.
    const atLimitMs = distanceM(fix(0, 0), b) * 12;
    expect(impossibleMovement(a, { fix: b, atMs: atLimitMs }, SPEED)).toBe(false);
    expect(impossibleMovement(a, { fix: b, atMs: atLimitMs - 1 }, SPEED)).toBe(true);
    expect(impossibleMovement({ fix: b, atMs: atLimitMs - 1 }, a, SPEED)).toBe(true);
    expect(impossibleMovement({ fix: b, atMs: atLimitMs }, a, SPEED)).toBe(false);
    // The radii count against the distance: the same move with wide radii is possible.
    const wide = { fix: fix(0, 0, 100), atMs: 0 };
    expect(
      impossibleMovement(wide, { fix: { ...b, radiusM: 100 }, atMs: atLimitMs - 1 }, SPEED),
    ).toBe(false);
  });

  it('flags any distance beyond the radii at the same instant, and none within them', () => {
    const here = { fix: fix(410_000, 289_000, 10), atMs: 5 };
    const far = { fix: fix(410_010, 289_000, 10), atMs: 5 };
    const overlapping = { fix: fix(410_001, 289_000, 10), atMs: 5 };
    expect(impossibleMovement(here, far, SPEED)).toBe(true);
    expect(impossibleMovement(here, overlapping, SPEED)).toBe(false);
  });

  it('agrees with the exact speed comparison for any two records', () => {
    fc.assert(
      fc.property(
        pairArb,
        fc.integer({ min: 0, max: 4_102_444_800_000 }),
        fc.integer({ min: 0, max: 600_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        ([first, second], atMs, elapsedMs, impossibleSpeedKmh) => {
          const beyondM = BigInt(distanceM(first, second) - first.radiusM - second.radiusM);
          // metres per millisecond against km/h: 1 km/h is 1 / 3,600 m per ms.
          const exact = beyondM * 3_600n > BigInt(impossibleSpeedKmh) * BigInt(elapsedMs);
          const later = { fix: second, atMs: atMs + elapsedMs };
          expect(impossibleMovement({ fix: first, atMs }, later, { impossibleSpeedKmh })).toBe(
            exact,
          );
        },
      ),
      { numRuns: 5000 },
    );
  });

  it('calls a mocked, simulated or accessory location a weak signal', () => {
    expect(weakSignal({})).toBe(false);
    expect(weakSignal({ mockLocation: false, simulated: false, accessory: false })).toBe(false);
    for (const flag of ['mockLocation', 'simulated', 'accessory'] as const) {
      expect(weakSignal({ [flag]: true }), flag).toBe(true);
    }
  });

  it('rejects locations, limits, instants and speeds the rule does not take', () => {
    const good = fix(410_000, 289_000, 10);
    for (const bad of [
      fix(0.5, 0),
      fix(0, Number.NaN),
      fix(0, 0, -1),
      fix(0, 0, 1.5),
      fix(0, 0, Number.POSITIVE_INFINITY),
      fix(LATITUDE_E4_MAX + 1, 0),
      fix(0, -LONGITUDE_E4_MAX - 1),
      fix(0, 0, RADIUS_M_MAX + 1),
    ]) {
      const what = JSON.stringify(bad);
      expect(() => distanceM(bad, good), what).toThrow(RangeError);
      expect(() => distanceM(good, bad), what).toThrow(RangeError);
      expect(() => locationResult({ student: bad, reference: good }, LIMITS), what).toThrow(
        RangeError,
      );
      expect(() => locationResult({ student: bad, reference: null }, LIMITS), what).toThrow(
        RangeError,
      );
      expect(() => locationResult({ student: good, reference: bad }, LIMITS), what).toThrow(
        RangeError,
      );
    }
    for (const bad of [
      { radiusLimitM: -1 },
      { locationMarginM: 0.5 },
      { locationMarginM: Number.NaN },
    ]) {
      const limits = { ...LIMITS, ...bad };
      expect(() => locationResult({ student: good, reference: good }, limits)).toThrow(RangeError);
      // The limits are checked before any early answer.
      expect(() => locationResult({ student: null, reference: null }, limits)).toThrow(RangeError);
    }
    const at = (atMs: number) => ({ fix: good, atMs });
    expect(() => impossibleMovement(at(0.5), at(0), SPEED)).toThrow(RangeError);
    expect(() => impossibleMovement(at(0), at(0.5), SPEED)).toThrow(RangeError);
    expect(() => impossibleMovement(at(0), at(0), { impossibleSpeedKmh: 0 })).toThrow(RangeError);
    expect(() => impossibleMovement(at(0), at(0), { impossibleSpeedKmh: 1.5 })).toThrow(RangeError);
    // Ground control: the same values in range are taken, the bounds themselves too.
    expect(locationResult({ student: good, reference: good }, LIMITS)).toBe('NEAR');
    const corner = fix(LATITUDE_E4_MAX, LONGITUDE_E4_MAX, RADIUS_M_MAX);
    expect(distanceM(corner, good)).toBeGreaterThan(0);
    expect(impossibleMovement(at(0), at(1_000), SPEED)).toBe(false);
  });
});
