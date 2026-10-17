import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BASE64_32_BYTES } from '../shared/formats.ts';
import { decodeUtf8 } from '../shared/utf8.ts';
import { type ChallengeSample, sampleEvidence } from '../testing/sample-evidence.ts';
import {
  BINDING_TAG,
  bindingText,
  CHALLENGE_TAG,
  type ChallengeFields,
  challenge,
  challengeText,
} from './challenge.ts';
import { VERIFICATION_PURPOSES } from './codes.ts';

// The shared samples the phone tests run too (D07-B10).
const { challenges, appAttest } = sampleEvidence;

const fieldsOf = (sample: ChallengeSample): ChallengeFields => ({
  purpose: sample.purpose,
  value: Buffer.from(sample.value, 'base64url'),
  studentNumber: sample.studentNumber,
  isSystemUser: sample.isSystemUser,
  secureEnclaveKey:
    sample.secureEnclaveKey === null ? null : Buffer.from(sample.secureEnclaveKey, 'base64url'),
});
const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const lines = (bytes: Uint8Array) => (decodeUtf8(bytes) as string).split('\n');
const [android, iphone] = challenges as [ChallengeSample, ChallengeSample, ChallengeSample];

describe('Meydan okuma ve bağlama metni bayt bayt sabit (the challenge and binding texts are fixed)', () => {
  it('keeps the App Attest key id in the spelling the identity contract takes', () => {
    // Apple's standard base64 with padding, which BASE64_32_BYTES (the contract's key id
    // pattern) reads; the base64url spelling of the same bytes is refused.
    for (const sample of appAttest) {
      expect(sample.keyId, sample.name).toMatch(BASE64_32_BYTES);
      expect(Buffer.from(sample.keyId, 'base64')).toHaveLength(32);
      const url = Buffer.from(sample.keyId, 'base64').toString('base64url');
      expect(url).not.toMatch(BASE64_32_BYTES);
    }
    expect(appAttest).toHaveLength(1);
  });

  it('reads the three frozen samples', () => {
    expect(challenges.map((sample) => sample.name)).toEqual([
      'android-registration',
      'iphone-registration',
      'iphone-app-attest-renewal',
    ]);
  });

  it.each(challenges.map((sample) => [sample.name, sample] as const))(
    'gives the frozen bytes and digests of %s',
    (_name, sample) => {
      const fields = fieldsOf(sample);
      expect(hex(challengeText(fields))).toBe(sample.challengeText);
      expect(hex(challenge(fields))).toBe(sample.challenge);
      expect(hex(bindingText(sample.platform, fields))).toBe(sample.bindingText);
      expect(createHash('sha256').update(bindingText(sample.platform, fields)).digest('hex')).toBe(
        sample.bindingDigest,
      );
      // The challenge is the SHA-256 of the text.
      expect(hex(challenge(fields))).toBe(
        createHash('sha256').update(challengeText(fields)).digest('hex'),
      );
    },
  );

  it('writes six LF lines with none at the end, a dash for the field the platform lacks', () => {
    const androidLines = lines(challengeText(fieldsOf(android)));
    expect(androidLines).toHaveLength(6);
    expect(androidLines[0]).toBe(CHALLENGE_TAG);
    expect(androidLines[4]).toBe('1');
    expect(androidLines[5]).toBe('-');
    const iphoneLines = lines(challengeText(fieldsOf(iphone)));
    expect(iphoneLines[4]).toBe('-');
    expect(iphoneLines[5]).toBe(iphone.secureEnclaveKey);
    // base64url without padding, as frozen.
    expect(iphoneLines[2]).toBe(iphone.value);
    expect(iphoneLines[2]).not.toContain('=');
    expect(decodeUtf8(challengeText(fieldsOf(android)))).not.toMatch(/\n$|\r/);
    expect(lines(challengeText({ ...fieldsOf(android), isSystemUser: false }))[4]).toBe('0');
  });

  it('puts the binding tag and the platform before the same six lines', () => {
    for (const sample of challenges) {
      const fields = fieldsOf(sample);
      expect(lines(bindingText(sample.platform, fields))).toEqual([
        BINDING_TAG,
        sample.platform,
        ...lines(challengeText(fields)),
      ]);
    }
  });

  it('changes with the purpose, which every purpose writes as itself', () => {
    const texts = VERIFICATION_PURPOSES.map((purpose) =>
      hex(challengeText({ ...fieldsOf(android), purpose })),
    );
    expect(new Set(texts).size).toBe(VERIFICATION_PURPOSES.length);
    for (const purpose of VERIFICATION_PURPOSES) {
      expect(lines(challengeText({ ...fieldsOf(android), purpose }))[1]).toBe(purpose);
    }
  });

  it('rejects a purpose, a value, a student number or a key the layout cannot carry', () => {
    const cases: [ChallengeSample, Partial<Record<keyof ChallengeFields, unknown>>][] = [
      [android, { purpose: 'kayit' }],
      [android, { purpose: 'registration\nAAAA' }],
      [android, { purpose: '' }],
      [android, { value: new Uint8Array(31) }],
      [android, { value: new Uint8Array(33) }],
      [android, { studentNumber: '12345678' }],
      [android, { studentNumber: '2301234567\n1' }],
      [android, { studentNumber: '23O1234567' }],
      // Arabic-Indic and full-width digits are digits to Unicode, not to the roster.
      [android, { studentNumber: '\u0662\u0663\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667' }],
      [android, { studentNumber: '\uff12\uff13\uff10\uff11\uff12\uff13\uff14\uff15\uff16\uff17' }],
      // Each platform sends exactly one of the two fields.
      [android, { isSystemUser: null }],
      [android, { secureEnclaveKey: new Uint8Array([1]) }],
      [iphone, { isSystemUser: false }],
      [iphone, { secureEnclaveKey: null }],
      [iphone, { secureEnclaveKey: new Uint8Array(0) }],
    ];
    for (const [sample, bad] of cases) {
      const fields = { ...fieldsOf(sample), ...bad } as ChallengeFields;
      const what = `${sample.name} ${JSON.stringify(bad)}`;
      expect(() => challengeText(fields), what).toThrow(RangeError);
      expect(() => challenge(fields), what).toThrow(RangeError);
      expect(() => bindingText(sample.platform, fields), what).toThrow(RangeError);
    }
    // Ground control: each sample's own fields are taken.
    for (const sample of [android, iphone]) {
      expect(hex(challengeText(fieldsOf(sample)))).toBe(sample.challengeText);
    }
  });

  it('binds the fields only to the platform they come from', () => {
    expect(() => bindingText('ios', fieldsOf(android))).toThrow(RangeError);
    expect(() => bindingText('android', fieldsOf(iphone))).toThrow(RangeError);
    expect(() => bindingText('Android' as 'android', fieldsOf(android))).toThrow(RangeError);
    // Ground control: the same fields with their own platform are taken.
    expect(hex(bindingText('android', fieldsOf(android)))).toBe(android.bindingText);
    expect(hex(bindingText('ios', fieldsOf(iphone)))).toBe(iphone.bindingText);
  });
});
