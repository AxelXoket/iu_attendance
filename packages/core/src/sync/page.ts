// Page cutting for the download (D06 rule "Sayfa kesme", invariant 10) and the decimal
// text arithmetic it needs. Versions are 64-bit, so shared code carries them as canonical
// decimal text (no sign, no leading zero): comparison is by length, then by code unit, and
// "one less" is borrow arithmetic on the digits. BigInt is not used (Hermes rule); tests
// use it only as an oracle.

const CANONICAL_DECIMAL = /^(?:0|[1-9][0-9]*)$/;

/** The largest version: PostgreSQL bigint, 2^63 - 1. */
export const MAX_VERSION = '9223372036854775807';

/** True for canonical decimal text: '0', or ASCII digits without a leading zero. */
export function isCanonicalDecimal(text: unknown): text is string {
  return typeof text === 'string' && CANONICAL_DECIMAL.test(text);
}

/**
 * Orders two canonical decimal texts: negative when a < b, zero when equal, positive when
 * a > b. The caller checks the texts; any other text gives a meaningless order.
 */
export function compareDecimal(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/** True for a canonical decimal text from 0 to MAX_VERSION. */
export function isVersion(text: unknown): text is string {
  return isCanonicalDecimal(text) && compareDecimal(text, MAX_VERSION) <= 0;
}

/** One less, with borrow: '1000' -> '999', '1' -> '0'. Throws RangeError for '0' or a non-canonical text. */
export function decrementDecimal(text: string): string {
  if (!isCanonicalDecimal(text) || text === '0') {
    throw new RangeError('decrementDecimal expects a canonical decimal text above 0');
  }
  // Trailing zeros borrow; the digit before them is not zero, since the text is not '0'.
  let index = text.length - 1;
  while (text.charCodeAt(index) === 0x30) index -= 1;
  const result =
    text.slice(0, index) +
    String.fromCharCode(text.charCodeAt(index) - 1) +
    '9'.repeat(text.length - 1 - index);
  // Only '1' followed by zeros loses a digit: '1000' gives '0999'.
  return result.length > 1 && result.charCodeAt(0) === 0x30 ? result.slice(1) : result;
}

/** One more, with carry: '999' -> '1000', '0' -> '1'. Throws RangeError for a non-canonical text. */
export function incrementDecimal(text: string): string {
  if (!isCanonicalDecimal(text)) {
    throw new RangeError('incrementDecimal expects a canonical decimal text');
  }
  let index = text.length - 1;
  while (index >= 0 && text.charCodeAt(index) === 0x39) index -= 1;
  if (index < 0) return `1${'0'.repeat(text.length)}`;
  return (
    text.slice(0, index) +
    String.fromCharCode(text.charCodeAt(index) + 1) +
    '0'.repeat(text.length - 1 - index)
  );
}

export type PageInput = {
  /** The cursor's general version; null for a full download. */
  readonly from: string | null;
  /** S: the counter value read for this request. */
  readonly to: string;
  /** adet: the most rows one source call returns. */
  readonly limit: number;
  /** The versions of the rows each source returned, in the order it returned them. */
  readonly sources: readonly (readonly string[])[];
};

export type SourcePlan = {
  /**
   * The source returned `limit` rows or more, so it may hold more rows in range. A source
   * whose rows all fall outside the range, one of them above `to`, has nothing left in range
   * and is not cut.
   */
  readonly cut: boolean;
  /** Highest version up to which this page holds every row of a cut source; null when not cut. */
  readonly bound: string | null;
  /** Rows outside (from, to]: left out of the page and logged by the caller. A correct source returns none. */
  readonly dropped: number;
  /**
   * Set when the page needs every row of this one version from the source: its returned
   * rows in range all carry this version and the page reaches it. The caller fetches the
   * version again without the limit and uses those rows in place of the returned ones.
   */
  readonly refetchVersion: string | null;
};

export type PagePlan = {
  /** U: the page holds the rows with from < version <= upper; the next page starts above it. */
  readonly upper: string;
  readonly sources: readonly SourcePlan[];
};

type SourceBound = {
  readonly bound: string | null;
  readonly single: boolean;
  readonly dropped: number;
};

function sourceBound(
  versions: readonly string[],
  from: string | null,
  to: string,
  limit: number,
): SourceBound {
  let dropped = 0;
  let aboveTo = false;
  let low: string | null = null;
  let high: string | null = null;
  for (const version of versions) {
    if (!isVersion(version)) {
      throw new RangeError('cutPage expects every row version as canonical decimal text');
    }
    if (compareDecimal(version, to) > 0) aboveTo = true;
    if ((from !== null && compareDecimal(version, from) <= 0) || compareDecimal(version, to) > 0) {
      dropped += 1;
      continue;
    }
    if (low === null || compareDecimal(version, low) < 0) low = version;
    if (high === null || compareDecimal(version, high) > 0) high = version;
  }
  if (versions.length < limit) return { bound: null, single: false, dropped };
  // Cut, but nothing in range: the source broke its contract. Rows come in version order,
  // so a row above `to` shows the source has nothing left in range and need not hold the
  // page back. With rows only at or below `from`, it may still hold rows in range: the page
  // moves on by the smallest step, so it does not skip far past rows the source failed to
  // return.
  if (low === null || high === null) {
    if (aboveTo) return { bound: null, single: false, dropped };
    // from is set here: in a full download every row outside the range is above `to`.
    const next = incrementDecimal(from as string);
    return { bound: compareDecimal(next, to) < 0 ? next : to, single: false, dropped };
  }
  // One version: it may continue past the limit, so the caller fetches all of it.
  if (low === high) return { bound: high, single: true, dropped };
  // Several versions: the last may be split at the limit; every lower one is whole.
  return { bound: decrementDecimal(high), single: false, dropped };
}

/**
 * Plans one download page from what each general source returned for (from, to] with the
 * limit. U is the smallest bound of the cut sources, or `to` when none is cut; U > from
 * whenever from < to, so every page advances. Throws RangeError for a text that is not a
 * version, from above to, or a limit that is not a positive whole number.
 */
export function cutPage(input: PageInput): PagePlan {
  const { from, to, limit, sources } = input;
  if (!isVersion(to)) throw new RangeError('cutPage expects to as canonical decimal text');
  if (from !== null && (!isVersion(from) || compareDecimal(from, to) > 0)) {
    throw new RangeError('cutPage expects from as canonical decimal text not above to, or null');
  }
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError('cutPage expects the limit as a positive whole number');
  }
  const bounds = sources.map((versions) => sourceBound(versions, from, to, limit));
  let upper = to;
  for (const { bound } of bounds) {
    if (bound !== null && compareDecimal(bound, upper) < 0) upper = bound;
  }
  return {
    upper,
    sources: bounds.map(({ bound, single, dropped }) => ({
      cut: bound !== null,
      bound,
      dropped,
      refetchVersion: single && bound === upper ? bound : null,
    })),
  };
}

/** True when a row of this version belongs to the page: from < version <= upper. */
export function inPage(version: string, from: string | null, upper: string): boolean {
  return (
    isVersion(version) &&
    (from === null || compareDecimal(version, from) > 0) &&
    compareDecimal(version, upper) <= 0
  );
}
