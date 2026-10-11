import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  BULK_CONFIRMATION_BLOCKERS,
  type BulkConfirmationBlocker,
  type BulkConfirmationInput,
  CONFIRMATION_STATUSES,
  getBulkConfirmationBlocker,
  isBulkConfirmationEligible,
  MATCH_STATUSES,
} from './confirmation.ts';

const inputArb: fc.Arbitrary<BulkConfirmationInput> = fc.record({
  confirmationStatus: fc.constantFrom(...CONFIRMATION_STATUSES),
  matchStatus: fc.constantFrom(...MATCH_STATUSES),
  deviceVerified: fc.boolean(),
  otherUnconfirmedAccountOnSameNumber: fc.boolean(),
});

// The whole input space, 3 x 3 x 2 x 2, so "every input" is checked literally.
const ALL_INPUTS: BulkConfirmationInput[] = CONFIRMATION_STATUSES.flatMap((confirmationStatus) =>
  MATCH_STATUSES.flatMap((matchStatus) =>
    [false, true].flatMap((deviceVerified) =>
      [false, true].map((otherUnconfirmedAccountOnSameNumber) => ({
        confirmationStatus,
        matchStatus,
        deviceVerified,
        otherUnconfirmedAccountOnSameNumber,
      })),
    ),
  ),
);

// The rule as the spec words it: pending, matched, verified device, and no other
// unconfirmed account on the same number.
const specEligible = (input: BulkConfirmationInput) =>
  input.confirmationStatus === 'pending' &&
  input.matchStatus === 'matched' &&
  input.deviceVerified &&
  !input.otherUnconfirmedAccountOnSameNumber;

// Each blocker's condition, in the order of the D09 confirmation groups (same number,
// then name, then device), after the account that is not pending at all.
const BLOCKER_CONDITIONS: ReadonlyArray<
  readonly [BulkConfirmationBlocker, (input: BulkConfirmationInput) => boolean]
> = [
  ['not_pending', (input) => input.confirmationStatus !== 'pending'],
  ['same_number', (input) => input.otherUnconfirmedAccountOnSameNumber],
  ['name_mismatch', (input) => input.matchStatus === 'name_mismatch'],
  ['not_on_roster', (input) => input.matchStatus === 'not_on_roster'],
  ['device_not_verified', (input) => !input.deviceVerified],
];

const ELIGIBLE: BulkConfirmationInput = {
  confirmationStatus: 'pending',
  matchStatus: 'matched',
  deviceVerified: true,
  otherUnconfirmedAccountOnSameNumber: false,
};

describe('Bulk confirmation rule in one place', () => {
  it('keeps the value sets the spec gives the two status columns', () => {
    // Written out on purpose: the tests below take their input space from the
    // exported lists, so only literals notice a value added or lost. These are also
    // wire and database values.
    expect([...CONFIRMATION_STATUSES]).toEqual(['pending', 'confirmed', 'rejected']);
    expect([...MATCH_STATUSES]).toEqual(['matched', 'name_mismatch', 'not_on_roster']);
  });

  it('gives a null blocker exactly when the account is eligible, on random account states', () => {
    let eligible = 0;
    let blocked = 0;
    fc.assert(
      fc.property(inputArb, (input) => {
        const isEligible = isBulkConfirmationEligible(input);
        expect(getBulkConfirmationBlocker(input) === null).toBe(isEligible);
        if (isEligible) eligible += 1;
        else blocked += 1;
      }),
      { numRuns: 500 },
    );
    // Positive control: both outcomes came up.
    expect(eligible).toBeGreaterThan(0);
    expect(blocked).toBeGreaterThan(0);
  });

  it('gives a null blocker exactly when the account is eligible, on every input', () => {
    expect(ALL_INPUTS).toHaveLength(CONFIRMATION_STATUSES.length * MATCH_STATUSES.length * 2 * 2);
    for (const input of ALL_INPUTS) {
      expect(getBulkConfirmationBlocker(input) === null).toBe(isBulkConfirmationEligible(input));
    }
  });

  it('is true only for a pending, matched account with a verified device and no rival account', () => {
    for (const input of ALL_INPUTS) {
      expect(isBulkConfirmationEligible(input)).toBe(specEligible(input));
    }
    // Ground control: exactly one combination of the four facts is eligible.
    expect(ALL_INPUTS.filter(isBulkConfirmationEligible)).toEqual([ELIGIBLE]);
  });

  it('names the first blocker that applies, in the published order', () => {
    expect(BLOCKER_CONDITIONS.map(([blocker]) => blocker)).toEqual([...BULK_CONFIRMATION_BLOCKERS]);
    for (const input of ALL_INPUTS) {
      const expected = BLOCKER_CONDITIONS.find(([, applies]) => applies(input))?.[0] ?? null;
      expect(getBulkConfirmationBlocker(input)).toBe(expected);
    }
  });

  it.each([
    ['not_pending', { confirmationStatus: 'confirmed' }],
    ['not_pending', { confirmationStatus: 'rejected' }],
    ['same_number', { otherUnconfirmedAccountOnSameNumber: true }],
    ['name_mismatch', { matchStatus: 'name_mismatch' }],
    ['not_on_roster', { matchStatus: 'not_on_roster' }],
    ['device_not_verified', { deviceVerified: false }],
  ] as const)('blocks with %s when only that fact fails', (blocker, change) => {
    // Ground control: the unchanged account is eligible and has no blocker.
    expect(getBulkConfirmationBlocker(ELIGIBLE)).toBeNull();
    expect(isBulkConfirmationEligible(ELIGIBLE)).toBe(true);
    const input = { ...ELIGIBLE, ...change };
    expect(getBulkConfirmationBlocker(input)).toBe(blocker);
    expect(isBulkConfirmationEligible(input)).toBe(false);
  });

  it('puts the same number before the name and the name before the device, as D09 groups them', () => {
    // Pending, but every other fact fails at once.
    const failing: BulkConfirmationInput = {
      confirmationStatus: 'pending',
      matchStatus: 'name_mismatch',
      deviceVerified: false,
      otherUnconfirmedAccountOnSameNumber: true,
    };
    expect(getBulkConfirmationBlocker(failing)).toBe('same_number');
    expect(
      getBulkConfirmationBlocker({ ...failing, otherUnconfirmedAccountOnSameNumber: false }),
    ).toBe('name_mismatch');
    expect(
      getBulkConfirmationBlocker({
        ...failing,
        otherUnconfirmedAccountOnSameNumber: false,
        matchStatus: 'matched',
      }),
    ).toBe('device_not_verified');
    expect(getBulkConfirmationBlocker({ ...failing, confirmationStatus: 'confirmed' })).toBe(
      'not_pending',
    );
  });
});
