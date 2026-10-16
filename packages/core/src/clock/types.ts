// Clock proof types shared by the phone, the server and the panel (D04).

// Brands of the same shape as the contract ids (Id<'Device'>, Id<'Person'>): core imports
// no contract, yet a sign-in session id cannot pass for the person (D04-B14).
export type DeviceId = string & { readonly __id: 'Device' };
export type PersonId = string & { readonly __id: 'Person' };

/**
 * Whom a clock document is issued to: a student's device, or a staff person (the person,
 * not the sign-in session, D04-B14). Written into the document as a kind byte (1, 2) and
 * a UUID. Ids are lowercase canonical UUID text.
 */
export type ClockSubject =
  | { readonly kind: 'STUDENT_DEVICE'; readonly deviceId: DeviceId }
  | { readonly kind: 'STAFF'; readonly personId: PersonId };

/** The signed fields of a clock document. */
export type DocumentFields = {
  /** Key id: 1 to 8 characters of [a-z0-9-], the name in the key file. */
  readonly kid: string;
  readonly subject: ClockSubject;
  /** The phone's one-time value, 16 bytes as unpadded base64url. */
  readonly value: string;
  /** Server time when the document was made, UTC epoch milliseconds. */
  readonly serverTimeMs: number;
};

/** A closed range of instants, UTC epoch milliseconds, low at most high. */
export type ClockRange = { readonly lowMs: number; readonly highMs: number };

/**
 * What the server's document check gives (D04 saatBelgesiDogrula): the signed fields and
 * whether the key it was signed with is marked compromised, or why it fails.
 */
export type DocumentVerification =
  | {
      readonly valid: true;
      readonly kid: string;
      readonly subject: ClockSubject;
      readonly value: string;
      readonly serverTimeMs: number;
      readonly keyCompromised: boolean;
    }
  | { readonly valid: false; readonly reason: 'FORMAT' | 'VERSION' | 'UNKNOWN_KID' | 'MAC' };
