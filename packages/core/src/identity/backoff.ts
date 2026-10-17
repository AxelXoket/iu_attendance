// The sign-in backoff (D01-B07): from the wrong code in a row that starts it (the 3rd), an
// address waits backoffFirstSeconds, and every further wrong code doubles the wait up to
// backoffMaxSeconds. The limits carry the identity contract's names, so the server passes
// IDENTITY_CONSTANTS as it is; core never imports the contract, so they are an input.

import { isWholeFromZero } from '../shared/number.ts';

export type BackoffLimits = {
  /** The wrong code in a row that starts the wait (the 3rd). */
  readonly backoffStartWrong: number;
  /** The first wait (30 s). */
  readonly backoffFirstSeconds: number;
  /** The longest wait (900 s). */
  readonly backoffMaxSeconds: number;
};

/**
 * The wait in seconds after consecutiveWrong wrong codes in a row: 0 before
 * backoffStartWrong, then backoffFirstSeconds doubling with each wrong code up to
 * backoffMaxSeconds. Throws RangeError for a count or a limit that is not a whole number,
 * a wait that starts at 0 wrong codes, or a first wait of 0 or past the longest.
 */
export function backoffSeconds(consecutiveWrong: number, limits: BackoffLimits): number {
  const { backoffStartWrong, backoffFirstSeconds, backoffMaxSeconds } = limits;
  if (
    ![consecutiveWrong, backoffStartWrong, backoffFirstSeconds, backoffMaxSeconds].every(
      isWholeFromZero,
    )
  ) {
    throw new RangeError('backoffSeconds expects whole numbers');
  }
  if (
    backoffStartWrong === 0 ||
    backoffFirstSeconds === 0 ||
    backoffFirstSeconds > backoffMaxSeconds
  ) {
    throw new RangeError(
      'backoffSeconds expects backoffStartWrong > 0 and 0 < backoffFirstSeconds <= backoffMaxSeconds',
    );
  }
  if (consecutiveWrong < backoffStartWrong) return 0;
  // A long run overflows the power to Infinity, which the cap still turns into backoffMaxSeconds.
  return Math.min(
    backoffMaxSeconds,
    backoffFirstSeconds * 2 ** (consecutiveWrong - backoffStartWrong),
  );
}
