// Byte string helpers shared code uses.

/**
 * True when two byte strings are equal. The time depends on the length only, not on
 * where the first difference is, so a MAC check does not leak how much of a guess was right.
 */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] as number) ^ (b[index] as number);
  }
  return difference === 0;
}

const TWO_TO_32 = 2 ** 32;
// The high 32-bit word of a safe integer is below 2^21.
const SAFE_HIGH_LIMIT = 2 ** 21;

/** Writes a safe whole number from 0 as 8 big-endian bytes: its high and low 32-bit words. */
export function writeUint64(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, Math.floor(value / TWO_TO_32));
  view.setUint32(offset + 4, value % TWO_TO_32);
}

/** Reads 8 big-endian bytes as a number; null when the value is above the safe integers. */
export function readUint64(view: DataView, offset: number): number | null {
  const high = view.getUint32(offset);
  if (high >= SAFE_HIGH_LIMIT) return null;
  return high * TWO_TO_32 + view.getUint32(offset + 4);
}
