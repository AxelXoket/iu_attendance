import { X509Certificate } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sampleEvidence } from '../testing/sample-evidence.ts';
import { normalizeSerialNumber } from './serial-number.ts';

// The shared samples: real Android chains and a list in the format of Google's status list.
const { androidChains, revocationList } = sampleEvidence;

// Node's spelling of each certificate's serial, as the server reads it.
const nodeSerials = (name: string) =>
  (androidChains.find((chain) => chain.name === name)?.certificates ?? []).map(
    (pem) => new X509Certificate(pem).serialNumber,
  );
const revoked = (serials: readonly string[]) =>
  serials.some((serial) => Object.hasOwn(revocationList.entries, normalizeSerialNumber(serial)));
// The oracle, in the test file only: the serial as a BigInt in lower-case hex, as Java's
// BigInteger.toString(16) writes it.
const bigIntHex = (serial: string) =>
  (serial.startsWith('-') ? -BigInt(`0x${serial.slice(1)}`) : BigInt(`0x${serial}`)).toString(16);
// Node's spelling of a serial: the sign, then the magnitude in whole upper-case bytes.
const nodeSpelling = (serial: bigint) => {
  const magnitude = (serial < 0n ? -serial : serial).toString(16).toUpperCase();
  return `${serial < 0n ? '-' : ''}${magnitude.length % 2 === 0 ? '' : '0'}${magnitude}`;
};

describe('Seri numarası biçimi (the serial number format)', () => {
  it('reads chains that hold at their validAt: each certificate signed by the next, all in date', () => {
    const holdsAt = (certificates: X509Certificate[], at: number) =>
      certificates.every(
        (certificate, i) =>
          Date.parse(certificate.validFrom) <= at &&
          at <= Date.parse(certificate.validTo) &&
          certificate.verify((certificates[i + 1] ?? certificate).publicKey),
      );
    for (const chain of androidChains) {
      const certificates = chain.certificates.map((pem) => new X509Certificate(pem));
      expect(holdsAt(certificates, Date.parse(chain.validAt)), chain.name).toBe(true);
      // The window the file states is the chain's own.
      expect(holdsAt(certificates, Date.parse(chain.validFrom)), chain.name).toBe(true);
      expect(holdsAt(certificates, Date.parse(chain.validFrom) - 1), chain.name).toBe(false);
      expect(holdsAt(certificates, Date.parse(chain.validTo)), chain.name).toBe(true);
      expect(holdsAt(certificates, Date.parse(chain.validTo) + 1), chain.name).toBe(false);
    }
    // Positive control: the TEE chain's root certificate ran out on 2026-05-24, so a check
    // at today's date would fail it; the validAt is what keeps the sample usable.
    const tee = androidChains.find((chain) => chain.name === 'ec-tee');
    const teeCertificates = (tee?.certificates ?? []).map((pem) => new X509Certificate(pem));
    expect(holdsAt(teeCertificates, Date.parse('2026-10-17T00:00:00Z'))).toBe(false);
  });

  it('spells a real chain serial as the status list does, so the revocation check catches it', () => {
    const strongBox = nodeSerials('ec-strongbox');
    expect(strongBox).toHaveLength(4);
    // Node writes whole bytes in upper case: this intermediate gains a leading zero.
    expect(strongBox).toContain('069697604437448081A2');
    expect(normalizeSerialNumber('069697604437448081A2')).toBe('69697604437448081a2');
    expect(revoked(strongBox)).toBe(true);
    // Ground control: Node's own spelling is not a key of the list.
    expect(strongBox.some((serial) => Object.hasOwn(revocationList.entries, serial))).toBe(false);
    // Positive control: the TEE chain shares no listed serial.
    expect(revoked(nodeSerials('ec-tee'))).toBe(false);
  });

  it('agrees with the number every serial of the sample chains stands for', () => {
    const all = androidChains.flatMap((chain) => nodeSerials(chain.name));
    expect(all).toHaveLength(8);
    for (const serial of all) expect(normalizeSerialNumber(serial)).toBe(bigIntHex(serial));
  });

  it('keeps the list spelling of any hex text: lower case, no leading zero, idempotent', () => {
    fc.assert(
      fc.property(fc.nat(6), fc.stringMatching(/^[0-9A-Fa-f]{1,40}$/), (zeros, digits) => {
        const serial = `${'0'.repeat(zeros)}${digits}`;
        const spelled = normalizeSerialNumber(serial);
        expect(spelled).toBe(bigIntHex(serial));
        expect(spelled).toMatch(/^(?:0|[1-9a-f][0-9a-f]*)$/);
        expect(normalizeSerialNumber(spelled)).toBe(spelled);
      }),
      { numRuns: 2000 },
    );
    expect(normalizeSerialNumber('0000')).toBe('0');
    expect(normalizeSerialNumber('-0000')).toBe('0');
    // The live list's keys keep this spelling, letters or not.
    for (const key of Object.keys(revocationList.entries)) {
      expect(normalizeSerialNumber(key)).toBe(key);
    }
  });

  it('spells a negative serial with a minus sign, as the list keys it', () => {
    // Node's spelling of certificates made with openssl req -set_serial -1, -128, -10,
    // -256 and -65535, read back with X509Certificate.
    const read = { '-01': '-1', '-80': '-80', '-0A': '-a', '-0100': '-100', '-FFFF': '-ffff' };
    for (const [node, list] of Object.entries(read)) {
      expect(normalizeSerialNumber(node), node).toBe(list);
    }
    fc.assert(
      fc.property(fc.bigInt({ min: -(2n ** 160n), max: 2n ** 160n }), (serial) => {
        expect(normalizeSerialNumber(nodeSpelling(serial))).toBe(serial.toString(16));
        expect(normalizeSerialNumber(nodeSpelling(serial))).toBe(bigIntHex(nodeSpelling(serial)));
      }),
      { numRuns: 2000 },
    );
    // Ground control: the model gives Node's spelling of the real certificates.
    expect(Object.keys(read)).toEqual([-1n, -128n, -10n, -256n, -65535n].map(nodeSpelling));
  });

  it('rejects text that is not hexadecimal', () => {
    for (const bad of ['', '0x12', '12:34', 'xyz', ' 12', '12\n', '-', '--1', '+1', '1-', '-x']) {
      expect(() => normalizeSerialNumber(bad), JSON.stringify(bad)).toThrow(RangeError);
    }
    expect(normalizeSerialNumber('0A')).toBe('a');
  });
});
