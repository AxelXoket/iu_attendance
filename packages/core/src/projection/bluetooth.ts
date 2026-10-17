// The Bluetooth code and its check (D11-B26, stage 3). The lecturer's phone broadcasts the
// first 8 bytes of the HMAC over the message with purpose 0x03 as 16 hex digits, the slice
// field being the Bluetooth slice, floor(Unix ms / slice length); the slice length is the
// display record's (bt_dilim_sn, 10 to 15 s). The broadcast carries no slice, so the server
// draws each candidate lecturer's codes for the slices whose start lies within one slice
// length plus the student's and the lecturer's clock margins of the record's instant, and
// looks for one of them among the codes the student's phone saw. The result is measured
// and stored only; it never enters the decision (D11-A05).

import { isWholeFromOne, isWholeFromZero } from '../shared/number.ts';
import { type BluetoothResult, SLICE_MAX } from './constants.ts';
import { codeMessage, codeSourceBytes, type Hmac } from './mac.ts';
import type { CodeFields } from './qr-content.ts';

/**
 * The Bluetooth slice of an instant. RangeError for an instant that is not whole
 * milliseconds, a length under 1, or a slice past the layout's nine digits.
 */
export function bluetoothSlice(instantMs: number, sliceMs: number): number {
  if (!isWholeFromZero(instantMs) || !isWholeFromOne(sliceMs)) {
    throw new RangeError('bluetoothSlice expects whole milliseconds and a positive length');
  }
  const slice = Math.floor(instantMs / sliceMs);
  if (slice > SLICE_MAX) throw new RangeError('the Bluetooth slice is past the layout');
  return slice;
}

/** The first 8 digest bytes as 16 lowercase hex digits; RangeError for a digest under 8 bytes. */
export function bluetoothCode(digest: Uint8Array): string {
  let hex = '';
  for (const byte of codeSourceBytes(digest, 'Bluetooth code')) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/** The Bluetooth code of the fields (their slice a Bluetooth slice) under one key. */
export function bluetoothCodeFor(fields: CodeFields, hmac: Hmac): string {
  return bluetoothCode(hmac(codeMessage('BLUETOOTH', fields)));
}

export type BluetoothWindow = {
  /** The display record's Bluetooth slice length: its bt_dilim_sn times 1,000. */
  readonly sliceMs: number;
  /** The student's clock margin (the clock result's). */
  readonly studentMarginMs: number;
  /** The lecturer's clock margin (the display record's). */
  readonly lecturerMarginMs: number;
};

/**
 * The slices, in order, whose start is within sliceMs + studentMarginMs + lecturerMarginMs
 * of the record's instant. RangeError for a value that is not whole milliseconds, a
 * negative margin, a slice length under 1 or a slice past the layout's nine digits.
 */
export function bluetoothCandidateSlices(recordAtMs: number, window: BluetoothWindow): number[] {
  const { sliceMs, studentMarginMs, lecturerMarginMs } = window;
  if (
    ![recordAtMs, studentMarginMs, lecturerMarginMs].every(isWholeFromZero) ||
    !isWholeFromOne(sliceMs)
  ) {
    throw new RangeError('bluetoothCandidateSlices expects whole milliseconds');
  }
  const reachMs = sliceMs + studentMarginMs + lecturerMarginMs;
  const first = Math.max(0, Math.ceil((recordAtMs - reachMs) / sliceMs));
  const last = Math.floor((recordAtMs + reachMs) / sliceMs);
  if (last > SLICE_MAX) throw new RangeError('a candidate slice is past the layout');
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

/** A code the student's phone saw, with its signal strength in dBm. */
export type SeenCode = { readonly code: string; readonly rssi: number };

/** The Bluetooth result of a record; only a seen code has a strongest signal. */
export type BluetoothOutcome =
  | { readonly result: Extract<BluetoothResult, 'SEEN'>; readonly bestRssi: number }
  | { readonly result: Exclude<BluetoothResult, 'SEEN'>; readonly bestRssi: null };

/**
 * The Bluetooth result of a record: NO_BLUETOOTH without a scan (seen null), PENDING while
 * no BLUETOOTH display record covers the record's instant, SEEN when a seen code is one of
 * the expected codes (with the strongest signal among those that matched), NOT_SEEN
 * otherwise.
 */
export function bluetoothResult(input: {
  readonly seen: readonly SeenCode[] | null;
  readonly displayCovers: boolean;
  readonly expected: ReadonlySet<string>;
}): BluetoothOutcome {
  if (input.seen === null) return { result: 'NO_BLUETOOTH', bestRssi: null };
  if (!input.displayCovers) return { result: 'PENDING', bestRssi: null };
  const matched = input.seen.filter((seen) => input.expected.has(seen.code));
  if (matched.length === 0) return { result: 'NOT_SEEN', bestRssi: null };
  return { result: 'SEEN', bestRssi: Math.max(...matched.map((seen) => seen.rssi)) };
}
