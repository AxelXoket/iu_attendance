// A certificate serial number as Google's attestation status list spells it (D07-B09): lower
// case hexadecimal without leading zeros, a negative one (which RFC 5280 forbids but a
// certificate can still carry) with a minus sign, as Java's BigInteger.toString(16) writes
// it. Node's X509Certificate.serialNumber writes whole bytes in upper case, so a serial
// whose first byte is under 0x10 gains a leading zero, and a negative one is '-01';
// without this step the revocation check would miss such a certificate.

const HEX = /^-?[0-9A-Fa-f]+$/;

/** The serial in the list's spelling; RangeError for text that is not hexadecimal. */
export function normalizeSerialNumber(serial: string): string {
  if (!HEX.test(serial)) throw new RangeError('a serial number is hexadecimal');
  const spelled = serial.toLowerCase().replace(/^(-?)0+(?=.)/, '$1');
  // Zero has no sign.
  return spelled === '-0' ? '0' : spelled;
}
