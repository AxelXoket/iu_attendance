import { encodeBase64Url } from '@iu-attendance/core/shared/base64url';
import { utf8Bytes } from '@iu-attendance/core/shared/utf8';
import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_LIMITS,
  IDENTITY_AUDIT_EVENTS,
  IDENTITY_CONSTANTS,
  IDENTITY_ERROR_CODES,
  IDENTITY_ROUTES,
  IDENTITY_SESSION_CODES,
  SESSION_CLOSE_REASONS,
  SESSION_END_REASONS,
} from '../identity.ts';
import { BODY_LIMIT_DEFAULT_BYTES } from '../shared/index.ts';
import { id, ok } from './helpers.ts';

const {
  approveChangeRequest,
  deleteStudentAccount,
  grantRole,
  issueRegistrationCode,
  listAccounts,
  listApplications,
  login,
  registerStudent,
  rejectChangeRequest,
  requestCode,
  requestDeviceChange,
} = IDENTITY_ROUTES;

const bytes = (length: number, fill = 7) => encodeBase64Url(new Uint8Array(length).fill(fill));
const androidBody = {
  studentNumber: '1234567890',
  fullName: 'Ada Yılmaz',
  challenge: bytes(32),
  platform: 'android',
  evidence: { publicKey: bytes(91), isSystemUser: true, bindingSignature: bytes(70) },
};
const iosBody = {
  ...androidBody,
  platform: 'ios',
  evidence: { secureEnclavePublicKey: bytes(91), bindingSignature: bytes(70) },
};
const registers = (body: object) => ok(registerStudent.request.body, body);
const char = (codePoint: number) => String.fromCodePoint(codePoint);

describe('identity contract', () => {
  it('keeps the numeric rules of the spec', () => {
    expect(IDENTITY_CONSTANTS).toEqual({
      codeValiditySeconds: 300,
      codeWrongLimit: 3,
      backoffFirstSeconds: 30,
      backoffMaxSeconds: 900,
      fixedAnswerMs: 400,
      staffMaxSessions: 3,
      phoneSessionDays: 30,
      renewBeforeDays: 3,
      panelMaxHours: 24,
      panelIdleMinutes: 60,
      lastUseWriteSeconds: 60,
      changeQrValiditySeconds: 900,
      changeRequestHours: 72,
      changeRequestLimit: 3,
      registrationCodeHours: 72,
      registrationCodeWrongLimit: 5,
      pendingAccountLimit: 5,
      registrationsPerNumberPerDay: 10,
      pendingCloseDays: 30,
      pendingCloseTermLocks: 2,
      deletionWaitDays: 7,
      recentLoginMinutes: 15,
      sessionRowKeepDays: 30,
      deviceLabelMax: 60,
    });
  });

  it('has one 404 code, and session codes any session route may answer', () => {
    const notFound = Object.entries(IDENTITY_ERROR_CODES).filter(([, code]) => code.http === 404);
    expect(notFound.map(([code]) => code)).toEqual(['IDENTITY_NOT_FOUND']);
    expect(IDENTITY_SESSION_CODES.map((code) => IDENTITY_ERROR_CODES[code].http)).toEqual([
      401, 401, 403,
    ]);
    // An ended session names its reason; a backing-off address its wait.
    const ended = IDENTITY_ERROR_CODES.IDENTITY_SESSION_ENDED.details;
    expect(ok(ended, { reason: 'device_closed' })).toBe(true);
    expect(ok(ended, {})).toBe(false);
    const backoff = IDENTITY_ERROR_CODES.IDENTITY_BACKOFF_ACTIVE.details;
    expect(ok(backoff, { waitSeconds: 30 })).toBe(true);
    expect(ok(backoff, { waitSeconds: 0 })).toBe(false);
  });

  it('ends a session for any close reason, and for three no session row is closed with', () => {
    const computed = SESSION_END_REASONS.filter(
      (reason) => !(SESSION_CLOSE_REASONS as readonly string[]).includes(reason),
    );
    expect(computed).toEqual(['expired', 'idle', 'device_closed']);
    expect(SESSION_END_REASONS).toEqual(expect.arrayContaining([...SESSION_CLOSE_REASONS]));
  });

  it('takes a device on a phone login and only there', () => {
    const body = { email: 'ada.yilmaz@istanbul.edu.tr', code: '012345' };
    const logs = (extra: object) => ok(login.request.body, { ...body, ...extra });
    expect(logs({ client: 'phone', device: { platform: 'ios' } })).toBe(true);
    expect(logs({ client: 'panel' })).toBe(true);
    expect(logs({ client: 'phone' })).toBe(false);
    expect(logs({ client: 'panel', device: { platform: 'ios' } })).toBe(false);
    // A code is six ASCII digits.
    for (const code of ['01234', '0123456', '01234a', '٠١٢٣٤٥']) {
      expect(logs({ client: 'panel', code }), code).toBe(false);
    }
  });

  it('takes an admin scope with the admin role and only there', () => {
    const grants = (extra: object) =>
      ok(grantRole.request.body, { email: 'a@istanbul.edu.tr', ...extra });
    expect(grants({ scopeUnitId: null })).toBe(true);
    expect(grants({ role: 'admin', scopeUnitId: id(1) })).toBe(true);
    expect(grants({ role: 'lecturer' })).toBe(true);
    // The admin role is the default and needs its scope spelled out.
    expect(grants({})).toBe(false);
    expect(grants({ role: 'lecturer', scopeUnitId: null })).toBe(false);
  });

  it('records a scope only on an admin grant', () => {
    for (const event of ['identity.role_granted', 'identity.role_revoked'] as const) {
      const extra =
        event === 'identity.role_granted' ? { source: 'admin_added' } : { reason: 'admin' };
      const schema = IDENTITY_AUDIT_EVENTS[event];
      expect(ok(schema, { role: 'admin', scopeUnitId: id(1), ...extra })).toBe(true);
      expect(ok(schema, { role: 'lecturer', scopeUnitId: null, ...extra })).toBe(true);
      expect(ok(schema, { role: 'lecturer', scopeUnitId: id(1), ...extra })).toBe(false);
    }
  });

  it('takes a typed name of 2 to 120 characters, with a letter, nothing invisible', () => {
    const named = (fullName: string) => registers({ ...androidBody, fullName });
    expect(named('Ay')).toBe(true);
    expect(named('İ'.repeat(120))).toBe(true);
    expect(named('İlker')).toBe(true);
    // A decomposed name counts and arrives in NFC: İ as I and a combining dot.
    const decomposed = 'İ'.normalize('NFD');
    expect(decomposed).toHaveLength(2);
    const parsed = registerStudent.request.body.parse({
      ...androidBody,
      fullName: `${decomposed}lker`,
    });
    expect(parsed.fullName).toBe('İlker');
    expect(named(decomposed.repeat(120))).toBe(true);
    for (const name of [
      'A',
      'İ'.repeat(121),
      decomposed.repeat(121),
      '  ',
      '1.',
      `Ada${char(0)}Y`,
      // Zero width spaces, a bidirectional override, Hangul fillers, a lone surrogate.
      `${char(0x200b)}${char(0x200b)}`,
      `Ada${char(0x200b)}Can`,
      `${char(0x202e)}${char(0x202e)}ab`,
      `${char(0x3164)}${char(0x3164)}`,
      // An interlinear annotation anchor: a format character that is not default ignorable.
      `Ada${char(0xfff9)}Can`,
      `Ad${String.fromCharCode(0xd800)}`,
      // One emoji is two UTF-16 units but no letter.
      char(0x1f600),
    ]) {
      expect(named(name), JSON.stringify(name)).toBe(false);
    }
  });

  it('takes a device model of up to 60 characters without control characters', () => {
    const modelled = (model: string) => registers({ ...androidBody, model });
    expect(modelled('x'.repeat(IDENTITY_CONSTANTS.deviceLabelMax))).toBe(true);
    expect(modelled('x'.repeat(IDENTITY_CONSTANTS.deviceLabelMax + 1))).toBe(false);
    expect(modelled(`Pixel${char(0)}`)).toBe(false);
  });

  it('pairs the device evidence with its platform', () => {
    expect(registers(androidBody)).toBe(true);
    expect(registers(iosBody)).toBe(true);
    expect(registers({ ...androidBody, evidence: iosBody.evidence })).toBe(false);
    expect(registers({ ...iosBody, evidence: androidBody.evidence })).toBe(false);
    const chain = (count: number) => ({
      ...androidBody,
      evidence: { ...androidBody.evidence, certificateChain: Array(count).fill(bytes(1500)) },
    });
    expect(registers(chain(EVIDENCE_LIMITS.certificateChainMax))).toBe(true);
    expect(registers(chain(EVIDENCE_LIMITS.certificateChainMax + 1))).toBe(false);
    const appAttest = (keyId: string) => ({
      ...iosBody,
      evidence: { ...iosBody.evidence, appAttest: { attestation: bytes(4000), keyId } },
    });
    // Apple's key id is standard base64 of 32 bytes.
    expect(registers(appAttest(`${'A'.repeat(42)}A=`))).toBe(true);
    expect(registers(appAttest(bytes(32)))).toBe(false);
  });

  it('fits the largest valid evidence body, which the default limit would refuse', () => {
    const largest = {
      ...androidBody,
      // Two bytes a letter in UTF-8.
      fullName: 'ş'.repeat(120),
      model: 'ş'.repeat(IDENTITY_CONSTANTS.deviceLabelMax),
      registrationCode: '0123ABCZ',
      evidence: {
        publicKey: bytes(EVIDENCE_LIMITS.spkiMaxBytes),
        certificateChain: Array(EVIDENCE_LIMITS.certificateChainMax).fill(
          bytes(EVIDENCE_LIMITS.certificateMaxBytes),
        ),
        isSystemUser: false,
        bindingSignature: bytes(EVIDENCE_LIMITS.signatureMaxBytes),
      },
    };
    expect(registers(largest)).toBe(true);
    const size = utf8Bytes(JSON.stringify(largest)).length;
    expect(size).toBeGreaterThan(BODY_LIMIT_DEFAULT_BYTES);
    expect(size).toBeLessThanOrEqual(registerStudent.bodyLimit);
    expect(requestDeviceChange.bodyLimit).toBe(registerStudent.bodyLimit);
  });

  it('takes the verification value as 32 canonical base64url bytes', () => {
    expect(registers({ ...androidBody, challenge: bytes(32, 255) })).toBe(true);
    expect(registers({ ...androidBody, challenge: bytes(31) })).toBe(false);
    expect(registers({ ...androidBody, challenge: `${bytes(32).slice(0, 42)}B` })).toBe(false);
  });

  it('takes a registration code in its canonical Crockford form only', () => {
    const coded = (registrationCode: string) => registers({ ...androidBody, registrationCode });
    expect(coded('0123ABCZ')).toBe(true);
    for (const code of ['0123abcz', '0123-ABCZ', '0123ABCI', '0123ABC', '0123ABCZ0']) {
      expect(coded(code), code).toBe(false);
    }
  });

  it('opens a phone change with the evidence, and renews its QR with no body', () => {
    expect(ok(requestDeviceChange.request.body, undefined)).toBe(true);
    expect(ok(requestDeviceChange.request.body, androidBody)).toBe(true);
    expect(ok(requestDeviceChange.request.body, {})).toBe(false);
    // No registration code on the change path: the field is dropped, not used.
    const parsed = requestDeviceChange.request.body.parse({
      ...androidBody,
      registrationCode: 'X',
    });
    expect(parsed).not.toHaveProperty('registrationCode');
  });

  it('keeps the request routes to the values each caller may send', () => {
    const rejects = (reason: string) => ok(rejectChangeRequest.request.body, { reason });
    expect(['identity_mismatch', 'student_rejected', 'withdrawn'].every(rejects)).toBe(true);
    expect(rejects('identity_seen')).toBe(false);
    expect(ok(requestCode.request.body, { email: 'a', purpose: 'application' })).toBe(false);
    expect(ok(requestCode.request.body, { email: 'a', purpose: 'application_deletion' })).toBe(
      true,
    );
    expect(requestCode.request.body.parse({ email: 'a' }).purpose).toBe('login');
    const applications = listApplications.request.query;
    expect(applications.parse({}).status).toBe('approval_pending');
    expect(ok(applications, { status: 'rejected' })).toBe(true);
    expect(ok(applications, { status: 'active' })).toBe(false);
    expect(ok(listAccounts.request.query, { status: 'closed' })).toBe(false);
    expect(ok(listAccounts.request.query, { status: 'inactive' })).toBe(true);
  });

  it('acts in person only with the identity seen', () => {
    const approve = { qrValue: bytes(16) };
    expect(ok(approveChangeRequest.request.body, { ...approve, identitySeen: true })).toBe(true);
    expect(ok(approveChangeRequest.request.body, { ...approve, identitySeen: false })).toBe(false);
    const remove = { courseId: id(1) };
    expect(ok(deleteStudentAccount.request.body, { ...remove, identitySeen: true })).toBe(true);
    expect(ok(deleteStudentAccount.request.body, { ...remove, identitySeen: false })).toBe(false);
  });

  it('shows a registration code grouped four and four', () => {
    const answer = issueRegistrationCode.response.schema;
    const at = '2026-10-16T07:00:00.000Z';
    expect(ok(answer, { code: '0123-ABCZ', expiresAt: at })).toBe(true);
    expect(ok(answer, { code: '0123ABCZ', expiresAt: at })).toBe(false);
  });

  it('records a deletion request as queued or done, never as cancelled', () => {
    const requested = IDENTITY_AUDIT_EVENTS['identity.deletion_requested'];
    expect(ok(requested, { source: 'phone', status: 'queued' })).toBe(true);
    expect(ok(requested, { source: 'phone', status: 'cancelled' })).toBe(false);
  });
});
