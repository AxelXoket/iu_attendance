import { z } from 'zod';
import { printableAsciiSchema } from './text.ts';

// An app version MAJOR.MINOR.PATCH, each part at most four digits. A part has no leading
// zero, so two texts of the same version are the same text and the order below is total.
const VERSION = /^(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})$/;
export const VERSION_MAX_LENGTH = 14;

export const versionSchema = z.string().max(VERSION_MAX_LENGTH).regex(VERSION);

export type VersionParts = readonly [number, number, number];

/** The three parts of a version, or null when the text is not one. */
export function parseVersion(text: string): VersionParts | null {
  const match = VERSION.exec(text);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

const sign = (left: number, right: number) => Math.sign(left - right) as -1 | 0 | 1;

/**
 * Orders two versions part by part as numbers (1.10.0 > 1.9.0). Throws RangeError for a
 * text that is not a version: the caller parses first, an invalid text is never compared.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (left === null || right === null) {
    throw new RangeError('compareVersions expects two versions');
  }
  return sign(left[0], right[0]) || sign(left[1], right[1]) || sign(left[2], right[2]);
}

// The Expo runtime version a phone reports: a note, never compared.
export const RUNTIME_VERSION_MAX_LENGTH = 32;
export const runtimeVersionSchema = printableAsciiSchema(RUNTIME_VERSION_MAX_LENGTH);
