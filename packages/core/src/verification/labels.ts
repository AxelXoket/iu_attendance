// The seven labels of a record (D07, Etiketler), set once when the record arrives and never
// computed again: a later decision reads the stored ones. The decision rule reads two of
// them for the shared limit (clock unverified, backup code).

import type { ClockResult } from '../clock/result.ts';
import type { EvidenceKind, QrDelay, QrVerification } from '../projection/constants.ts';
import type { Labels } from './codes.ts';

/**
 * The record's QR evidence as D11 read it (qrResultSchema's evidenceKind, verification and
 * delay): none, a scanned QR code or a typed backup code.
 */
export type QrEvidence =
  | { readonly evidenceKind: Extract<EvidenceKind, 'NONE'> }
  | {
      readonly evidenceKind: Exclude<EvidenceKind, 'NONE'>;
      readonly verification: Exclude<QrVerification, 'NONE'>;
      /** The delay result; null when the verification is not VALID (D11 then computes none). */
      readonly delay: QrDelay | null;
    };

/** What the labels read when the record arrives. */
export type LabelFacts = {
  readonly qr: QrEvidence;
  readonly clock: Pick<ClockResult, 'status'>;
  /** D04's windowChosen when the record was taken (pencereSonucu kayitAnindaSureSecildi). */
  readonly window: { readonly windowChosenAtRecord: boolean };
  readonly device: {
    /** The signing key's proof verified and the key was not on the revocation list at arrival. */
    readonly verified: boolean;
    /** Android: the device row's isSystemUser is false. */
    readonly secondProfile: boolean;
  };
};

/** The labels of a record when it arrives. */
export function computeLabels(facts: LabelFacts): Labels {
  return {
    NO_QR: facts.qr.evidenceKind === 'NONE',
    SELF_DECLARED: !facts.window.windowChosenAtRecord,
    CLOCK_UNVERIFIED: facts.clock.status === 'UNVERIFIED',
    DEVICE_UNVERIFIED: !facts.device.verified,
    SECOND_PROFILE: facts.device.secondProfile,
    BACKUP_CODE: facts.qr.evidenceKind === 'BACKUP_CODE',
    // A QR code the lecturer's key verified for this session; delay and display records
    // decide the decision only.
    VERIFIED: facts.qr.evidenceKind === 'QR' && facts.qr.verification === 'VALID',
  };
}
