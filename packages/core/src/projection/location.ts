// The location comparison (D11-B28, D11-B29, stage 3), on the server only. A student's
// location is near the lecturer's reference when their distance is at most the two
// accuracy radii plus a margin (50 m); a radius past the limit (100 m) makes the location
// unusable. Two located records of one student imply an impossible movement when the
// distance beyond the two radii, over the time between them, is faster than the limit
// (300 km/h). Distances are whole metres on a sphere, by Vincenty's formula, which stays
// exact to the metre for every pair, antipodes included (haversine does not near them).
// The limits are the projection settings', under their names; the results are measured
// and stored only (D11-A05).

import { MINUTE_MS } from '../clock/constants.ts';
import { isWholeFromOne, isWholeFromZero, isWholeIn } from '../shared/number.ts';
import {
  LATITUDE_E4_MAX,
  LONGITUDE_E4_MAX,
  type LocationResult,
  RADIUS_M_MAX,
} from './constants.ts';

/** A location as the phone sends it: degrees times 10,000 and an accuracy radius in metres. */
export type LocationFix = {
  readonly latitudeE4: number;
  readonly longitudeE4: number;
  readonly radiusM: number;
};

/** The flags a phone sets on a location it doubts. */
export type LocationFlags = {
  readonly mockLocation?: boolean;
  readonly simulated?: boolean;
  readonly accessory?: boolean;
};

/** The IUGG mean Earth radius. */
export const EARTH_RADIUS_M = 6_371_008.8;
const E4_TO_RADIANS = Math.PI / 180 / 10_000;
const HOUR_MS = 60 * MINUTE_MS;
const M_PER_KM = 1_000;

function checkFix(fix: LocationFix): void {
  if (
    !isWholeIn(fix.latitudeE4, -LATITUDE_E4_MAX, LATITUDE_E4_MAX) ||
    !isWholeIn(fix.longitudeE4, -LONGITUDE_E4_MAX, LONGITUDE_E4_MAX) ||
    !isWholeIn(fix.radiusM, 0, RADIUS_M_MAX)
  ) {
    throw new RangeError('a location is whole ten-thousandths of a degree and whole metres');
  }
}

/** The distance in whole metres between two locations. */
export function distanceM(a: LocationFix, b: LocationFix): number {
  checkFix(a);
  checkFix(b);
  const latA = a.latitudeE4 * E4_TO_RADIANS;
  const latB = b.latitudeE4 * E4_TO_RADIANS;
  const lon = (b.longitudeE4 - a.longitudeE4) * E4_TO_RADIANS;
  const across = Math.hypot(
    Math.cos(latB) * Math.sin(lon),
    Math.cos(latA) * Math.sin(latB) - Math.sin(latA) * Math.cos(latB) * Math.cos(lon),
  );
  const along = Math.sin(latA) * Math.sin(latB) + Math.cos(latA) * Math.cos(latB) * Math.cos(lon);
  return Math.round(EARTH_RADIUS_M * Math.atan2(across, along));
}

/** The projection settings' location limits. */
export type LocationLimits = { readonly radiusLimitM: number; readonly locationMarginM: number };

/**
 * The location result of a record: NO_LOCATION without a usable student location (none,
 * approximate only, or a radius past the limit), PENDING while the session has no
 * reference, NO_LOCATION for a reference past the radius limit, then NEAR or FAR. Throws
 * RangeError for a limit that is not whole metres or a location outside its bounds.
 */
export function locationResult(
  input: { readonly student: LocationFix | null; readonly reference: LocationFix | null },
  limits: LocationLimits,
): LocationResult {
  const { student, reference } = input;
  if (![limits.radiusLimitM, limits.locationMarginM].every(isWholeFromZero)) {
    throw new RangeError('locationResult expects whole metres');
  }
  if (student === null) return 'NO_LOCATION';
  checkFix(student);
  if (student.radiusM > limits.radiusLimitM) return 'NO_LOCATION';
  if (reference === null) return 'PENDING';
  checkFix(reference);
  if (reference.radiusM > limits.radiusLimitM) return 'NO_LOCATION';
  const reachM = student.radiusM + reference.radiusM + limits.locationMarginM;
  return distanceM(student, reference) <= reachM ? 'NEAR' : 'FAR';
}

/**
 * Whether two located records of one student are farther apart, beyond their two radii,
 * than impossibleSpeedKmh allows in the time between them. Compared in whole numbers:
 * metres times 3,600 against km/h times milliseconds. Throws RangeError for an instant
 * that is not whole milliseconds or a speed under 1.
 */
export function impossibleMovement(
  a: { readonly fix: LocationFix; readonly atMs: number },
  b: { readonly fix: LocationFix; readonly atMs: number },
  limits: { readonly impossibleSpeedKmh: number },
): boolean {
  const speedKmh = limits.impossibleSpeedKmh;
  if (![a.atMs, b.atMs].every(Number.isSafeInteger) || !isWholeFromOne(speedKmh)) {
    throw new RangeError('impossibleMovement expects whole milliseconds and a speed from 1');
  }
  const beyondM = distanceM(a.fix, b.fix) - a.fix.radiusM - b.fix.radiusM;
  const elapsedMs = Math.abs(b.atMs - a.atMs);
  return beyondM * (HOUR_MS / M_PER_KM) > speedKmh * elapsedMs;
}

/**
 * A weak signal (plan, Stage 3 location): the phone flagged the location mocked (Android),
 * simulated or from an external accessory (iPhone). An impossible movement is the server's
 * own check and its own flag, not one of these.
 */
export function weakSignal(flags: LocationFlags): boolean {
  return flags.mockLocation === true || flags.simulated === true || flags.accessory === true;
}
