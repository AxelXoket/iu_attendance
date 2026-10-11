// Staff e-mail address rule (D01). This is the only place an address is normalized:
// the server, the phone, the panel and the e-mail send limit (D14) all call it.

export const EMAIL_DOMAIN = 'istanbul.edu.tr';
export const EMAIL_LOCAL_PART_MAX_LENGTH = 64;

export type NormalizeEmailResult = { ok: true; address: string } | { ok: false };

const REJECTED: NormalizeEmailResult = Object.freeze({ ok: false });

// ECMAScript WhiteSpace and LineTerminator code points, written out so that the
// phone (Hermes) and the server (V8) trim exactly the same set, whatever Unicode
// tables the engine ships. The tests compare it with String.prototype.trim.
const TRIMMED_UNITS: ReadonlySet<number> = new Set([
  0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, 0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003,
  0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
  0xfeff,
]);

const CAPITAL_A = 0x41;
const CAPITAL_Z = 0x5a;
const SMALL_I = 0x69;
const CAPITAL_I_WITH_DOT = 0x130;
const SMALL_DOTLESS_I = 0x131;

// Explicit case table instead of toLowerCase: 'İ'.toLowerCase() is 'i' plus a
// combining dot (U+0307), and toLowerCase also folds look-alikes such as the Kelvin
// sign into ASCII. Only A to Z and the Turkish İ and ı change; I is already in A to Z.
function foldCase(unit: number): number {
  if (unit >= CAPITAL_A && unit <= CAPITAL_Z) return unit + 0x20;
  if (unit === CAPITAL_I_WITH_DOT || unit === SMALL_DOTLESS_I) return SMALL_I;
  return unit;
}

// Dot-separated runs of a-z, 0-9, underscore and hyphen: no plus sign, no
// consecutive dots, and no dot at either end (RFC 5321 dot-string).
const LOCAL_PART = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/;

// Trims leading and trailing white space, lowers A to Z, maps İ, I and ı to i, then
// accepts only <local part>@istanbul.edu.tr with a local part of 1 to 64 characters.
// Every other address, including a subdomain, gives { ok: false } and nothing more.
export function normalizeEmail(raw: string): NormalizeEmailResult {
  let start = 0;
  let end = raw.length;
  while (start < end && TRIMMED_UNITS.has(raw.charCodeAt(start))) start += 1;
  while (end > start && TRIMMED_UNITS.has(raw.charCodeAt(end - 1))) end -= 1;

  let folded = '';
  for (let index = start; index < end; index += 1) {
    folded += String.fromCharCode(foldCase(raw.charCodeAt(index)));
  }

  // Exactly one @: a second one fits neither the local part's characters nor the
  // fixed domain, so splitting at the first is enough.
  const at = folded.indexOf('@');
  if (at < 0) return REJECTED;
  const local = folded.slice(0, at);
  if (folded.slice(at + 1) !== EMAIL_DOMAIN) return REJECTED;
  if (local.length > EMAIL_LOCAL_PART_MAX_LENGTH || !LOCAL_PART.test(local)) return REJECTED;
  return { ok: true, address: `${local}@${EMAIL_DOMAIN}` };
}
