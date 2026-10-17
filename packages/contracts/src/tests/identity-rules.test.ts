// The core identity rules with the identity contract's own numbers (D01-P03): core takes
// the limits as input, so this is where the contract's values meet the rules.
import { backoffSeconds } from '@iu-attendance/core/identity/backoff';
import {
  DEVICE_LABELS,
  PHONE_DEVICE_LABELS,
  panelDeviceLabel,
} from '@iu-attendance/core/identity/device-label';
import { type ActiveSession, sessionsToClose } from '@iu-attendance/core/identity/session-rules';
import { encodeBase64Url } from '@iu-attendance/core/shared/base64url';
import { VERIFICATION_VALUE_BYTES } from '@iu-attendance/core/verification/constants';
import { describe, expect, it } from 'vitest';
import { PLATFORMS } from '../api.ts';
import { IDENTITY_CONSTANTS, IDENTITY_ROUTES, SESSION_CLIENTS } from '../identity.ts';
import { ok } from './helpers.ts';

const id = (last: string) => `0190a000-0000-7000-8000-${last.padStart(12, '0')}`;

describe('the identity rules with the contract numbers', () => {
  it('walks the backoff of D01-B07: from the 3rd wrong code 30, 60, 120 s and so on, at most 900 s', () => {
    // The contract's constants go in as they are: the limits carry its names.
    const walk = Array.from({ length: 10 }, (_, wrong) =>
      backoffSeconds(wrong, IDENTITY_CONSTANTS),
    );
    expect(walk).toEqual([0, 0, 0, 30, 60, 120, 240, 480, 900, 900]);
  });

  it('closes the oldest panel at the 4th staff sign-in and none at the 3rd', () => {
    const rules = { ...IDENTITY_CONSTANTS, reviewAccount: false };
    const phone: ActiveSession = { id: id('a'), client: 'phone', createdAtMs: 100 };
    const panels: ActiveSession[] = [
      { id: id('c'), client: 'panel', createdAtMs: 300 },
      { id: id('b'), client: 'panel', createdAtMs: 200 },
    ];
    expect(sessionsToClose([phone, ...panels], rules)).toEqual([id('b')]);
    expect(sessionsToClose([phone, ...panels.slice(1)], rules)).toEqual([]);
  });

  it("takes every session client of the contract, and the panel's goes first", () => {
    const clients: readonly ActiveSession['client'][] = SESSION_CLIENTS;
    expect([...clients].sort()).toEqual(['panel', 'phone']);
    const sessions = clients.map(
      (client, index): ActiveSession => ({ id: id(String(index + 1)), client, createdAtMs: 1 }),
    );
    const closed = sessionsToClose(sessions, { staffMaxSessions: 2, reviewAccount: false });
    expect(closed).toEqual([sessions[clients.indexOf('panel')]?.id]);
  });

  it("takes a verification value of core's size and no other", () => {
    const bytes = (length: number) => encodeBase64Url(new Uint8Array(length).fill(7));
    const body = {
      studentNumber: '1234567890',
      fullName: 'Ada Yılmaz',
      platform: 'android',
      evidence: { publicKey: bytes(91), isSystemUser: true, bindingSignature: bytes(70) },
    };
    const registers = (length: number) =>
      ok(IDENTITY_ROUTES.registerStudent.request.body, { ...body, challenge: bytes(length) });
    expect(registers(VERIFICATION_VALUE_BYTES)).toBe(true);
    for (const length of [VERIFICATION_VALUE_BYTES - 1, VERIFICATION_VALUE_BYTES + 1]) {
      expect(registers(length), String(length)).toBe(false);
    }
  });

  it('keeps every device label within the contract length, one label per platform', () => {
    for (const label of DEVICE_LABELS) {
      expect(label.length, label).toBeLessThanOrEqual(IDENTITY_CONSTANTS.deviceLabelMax);
    }
    expect(Object.keys(PHONE_DEVICE_LABELS).sort()).toEqual([...PLATFORMS].sort());
    // Ground control: a real header gives a label of the list.
    expect(DEVICE_LABELS).toContain(
      panelDeviceLabel('Mozilla/5.0 (Windows NT 10.0) Firefox/121.0'),
    );
  });
});
