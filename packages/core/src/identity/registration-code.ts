// Registration code (D01): 8 Crockford base32 symbols carrying 40 random bits. The
// server draws the bits (crypto.randomBytes(REGISTRATION_CODE_BYTES)) and keeps
// only a keyed digest of the canonical code; the lecturer reads it out grouped 4 and
// 4; the student types or pastes it on the phone, where case, O for 0, I and L for
// 1, hyphens and white space at either end are forgiven.

// Crockford base32: digits, then the capital letters without I, L, O and U.
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const REGISTRATION_CODE_BYTES = 5;
export const REGISTRATION_CODE_LENGTH = 8;
export const REGISTRATION_CODE_GROUP_LENGTH = 4;

export type ParseRegistrationCodeResult = { ok: true; code: string } | { ok: false };

const REJECTED: ParseRegistrationCodeResult = Object.freeze({ ok: false });

const BITS_PER_SYMBOL = 5;
const SYMBOL_MASK = 0x1f;
const HYPHEN = 0x2d;

// The code is never e-mailed: it is shown to the lecturer on screen (panel or phone)
// and read out or copied from there. What a copy brings along, ASCII space, tab, CR
// and LF, is trimmed at either end only; inside a code it is rejected like any other
// character.
const TRIMMED_UNITS: ReadonlySet<number> = new Set([0x09, 0x0a, 0x0d, 0x20]);

// Typed code unit -> canonical symbol. Each symbol stands for itself and, for a
// letter, its small form; then the Crockford aliases (O for 0, I and L for 1) with
// the Turkish keyboard's İ and ı, which are the capital i and the small I there.
const SYMBOL_BY_UNIT: ReadonlyMap<number, string> = (() => {
  const table = new Map<number, string>();
  for (let index = 0; index < CROCKFORD_ALPHABET.length; index += 1) {
    const symbol = CROCKFORD_ALPHABET.charAt(index);
    const unit = symbol.charCodeAt(0);
    table.set(unit, symbol);
    if (unit >= 0x41 && unit <= 0x5a) table.set(unit + 0x20, symbol);
  }
  const aliases: ReadonlyArray<readonly [string, string]> = [
    ['O', '0'],
    ['o', '0'],
    ['I', '1'],
    ['i', '1'],
    ['L', '1'],
    ['l', '1'],
    ['\u{130}', '1'], // İ
    ['\u{131}', '1'], // ı
  ];
  for (const [alias, symbol] of aliases) table.set(alias.charCodeAt(0), symbol);
  return table;
})();

function isCanonical(code: string): boolean {
  if (code.length !== REGISTRATION_CODE_LENGTH) return false;
  for (let index = 0; index < code.length; index += 1) {
    if (CROCKFORD_ALPHABET.indexOf(code.charAt(index)) < 0) return false;
  }
  return true;
}

function requireCanonical(code: string): void {
  if (!isCanonical(code)) {
    throw new RangeError('Expected a canonical registration code (8 Crockford symbols).');
  }
}

// Turns exactly REGISTRATION_CODE_BYTES random bytes into the canonical code,
// big-endian, 5 bits per symbol, so the 40 bits map one to one onto the 8 symbols.
export function encodeRegistrationCode(bytes: Uint8Array): string {
  if (bytes.length !== REGISTRATION_CODE_BYTES) {
    throw new RangeError(
      `A registration code is made of exactly ${REGISTRATION_CODE_BYTES} bytes.`,
    );
  }
  let code = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= BITS_PER_SYMBOL) {
      bits -= BITS_PER_SYMBOL;
      code += CROCKFORD_ALPHABET.charAt((buffer >>> bits) & SYMBOL_MASK);
    }
    buffer &= (1 << bits) - 1;
  }
  return code;
}

// The inverse of encodeRegistrationCode, for a canonical code only.
export function decodeRegistrationCode(code: string): Uint8Array {
  requireCanonical(code);
  const bytes = new Uint8Array(REGISTRATION_CODE_BYTES);
  let buffer = 0;
  let bits = 0;
  let next = 0;
  for (let index = 0; index < code.length; index += 1) {
    buffer = (buffer << BITS_PER_SYMBOL) | CROCKFORD_ALPHABET.indexOf(code.charAt(index));
    bits += BITS_PER_SYMBOL;
    if (bits >= 8) {
      bits -= 8;
      bytes[next] = (buffer >>> bits) & 0xff;
      next += 1;
      buffer &= (1 << bits) - 1;
    }
  }
  return bytes;
}

// Reads a typed code: trims ASCII space, tab, CR and LF at either end, then drops
// hyphens, folds case, reads O as 0 and I, L (and the Turkish İ, ı) as 1. Anything
// else, U and white space inside the code included, or a symbol count other than 8
// gives { ok: false }. The result is the canonical code the digest is taken of.
export function parseRegistrationCode(raw: string): ParseRegistrationCodeResult {
  let start = 0;
  let end = raw.length;
  while (start < end && TRIMMED_UNITS.has(raw.charCodeAt(start))) start += 1;
  while (end > start && TRIMMED_UNITS.has(raw.charCodeAt(end - 1))) end -= 1;
  let code = '';
  for (let index = start; index < end; index += 1) {
    const unit = raw.charCodeAt(index);
    if (unit === HYPHEN) continue;
    const symbol = SYMBOL_BY_UNIT.get(unit);
    if (symbol === undefined) return REJECTED;
    code += symbol;
  }
  return code.length === REGISTRATION_CODE_LENGTH ? { ok: true, code } : REJECTED;
}

// The form shown to the lecturer: two groups of 4 joined by a hyphen (ABCD-EFGH).
export function formatRegistrationCode(code: string): string {
  requireCanonical(code);
  return `${code.slice(0, REGISTRATION_CODE_GROUP_LENGTH)}-${code.slice(REGISTRATION_CODE_GROUP_LENGTH)}`;
}
