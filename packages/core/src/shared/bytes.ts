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
