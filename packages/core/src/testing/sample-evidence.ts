// The device verification samples the phone tests run too (D07-B10), read from the server's
// test folder for the core tests: the challenge and binding texts, Apple's App Attest key
// id, real Android chains and a list in the format of Google's status list.

import { readFileSync } from 'node:fs';
import type { bindingText, ChallengeFields } from '../verification/challenge.ts';

export type ChallengeSample = {
  readonly name: string;
  readonly platform: Parameters<typeof bindingText>[0];
  readonly purpose: ChallengeFields['purpose'];
  readonly value: string;
  readonly studentNumber: string;
  readonly isSystemUser: boolean | null;
  readonly secureEnclaveKey: string | null;
  readonly challengeText: string;
  readonly challenge: string;
  readonly bindingText: string;
  readonly bindingDigest: string;
};

type AndroidChainSample = {
  readonly name: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly validAt: string;
  readonly certificates: readonly string[];
};

type SampleEvidence = {
  readonly challenges: readonly ChallengeSample[];
  readonly appAttest: readonly { readonly name: string; readonly keyId: string }[];
  readonly androidChains: readonly AndroidChainSample[];
  readonly revocationList: {
    readonly entries: Readonly<
      Record<string, { readonly status: string; readonly reason: string }>
    >;
  };
};

const SAMPLES_URL = new URL(
  '../../../../apps/server/test/features/verification/sample-evidence.json',
  import.meta.url,
);

export const sampleEvidence = JSON.parse(readFileSync(SAMPLES_URL, 'utf8')) as SampleEvidence;
