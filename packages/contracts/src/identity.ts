// Identity contract (D01): the 29 routes with their request and answer schemas, the
// IDENTITY_ error catalog, the value lists the identity tables and the neighbours share,
// the numeric rules (IDENTITY_CONSTANTS), the audit event detail schemas and the identity
// event types its subscribers import. Request and answer objects drop unknown keys
// (D13-B24); requests use closed enums, answers carry values that may grow as extensible
// enums. Only the audit schemas are strict: the audit writer rejects an unknown field.
// Bytes travel as canonical unpadded base64url, except the App Attest key id, which is
// Apple's own base64 text of the key's digest and passes through unchanged.
import { CONFIRMATION_STATUSES, MATCH_STATUSES } from '@iu-attendance/core/identity/confirmation';
import { DEVICE_KEY_KINDS } from '@iu-attendance/core/identity/device-key';
import { DEVICE_STATUSES } from '@iu-attendance/core/identity/device-status';
import {
  CROCKFORD_ALPHABET,
  REGISTRATION_CODE_GROUP_LENGTH,
  REGISTRATION_CODE_LENGTH,
} from '@iu-attendance/core/identity/registration-code';
import { BASE64_32_BYTES } from '@iu-attendance/core/shared/formats';
import { PROOF_RESULTS, type ProofResult } from '@iu-attendance/core/verification/codes';
import { z } from 'zod';
import { PLATFORMS } from './api.ts';
import { courseIdSchema, departmentIdSchema } from './courses.ts';
import {
  ANONYMOUS_ACCESS,
  type AuthSessionId,
  addressedText,
  authSessionIdSchema,
  base64UrlBytesSchema,
  base64UrlMaxBytesSchema,
  countSchema,
  type DeviceId,
  defineErrorCodes,
  defineRoute,
  deviceIdSchema,
  deviceKeyIdSchema,
  extensibleEnum,
  fullListSchema,
  type Id,
  instantSchema,
  LANGUAGES,
  noDetailsSchema,
  OPERATIONAL_CODE,
  PERSON_ROLES,
  type PersonId,
  pageQuerySchema,
  pageSchema,
  personIdSchema,
  SESSION_SCOPES,
  sameText,
  sessionAccess,
  studentNumberSchema,
  textWithoutControlSchema,
  unitIdSchema,
  v7IdSchema,
} from './shared/index.ts';

// Value lists. The CHECK constraints of the identity tables are made from these; the
// neighbours import them and keep no copy.

export const PERSON_KINDS = ['staff', 'student'] as const;
// A student account is only active, rejected, closed or deleted; its confirmation is a
// separate status (CONFIRMATION_STATUSES).
export const ACCOUNT_STATUSES = [
  'code_pending',
  'approval_pending',
  'active',
  'inactive',
  'rejected',
  'closed',
  'deleted',
] as const;
export const APPLICATION_REJECTION_REASONS = [
  'not_lecturer',
  'wrong_department',
  'missing_information',
  'other',
] as const;
export const STAFF_ROLES = ['lecturer', 'admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const ROLE_SOURCES = [
  'application_approval',
  'admin_added',
  'command_line',
  'review_setup',
] as const;
export const ROLE_REVOKE_REASONS = ['admin', 'account_deleted'] as const;
// application_deletion is the code that deletes without a session: an unapproved
// application and an inactive staff account, the two that cannot sign in.
export const CODE_PURPOSES = ['login', 'application', 'application_deletion'] as const;
export const SESSION_CLIENTS = ['phone', 'panel'] as const;
// Why a session row was closed; written on the row.
export const SESSION_CLOSE_REASONS = [
  'logout',
  'closed_by_self',
  'admin',
  'oldest',
  'renewed',
  'inactive',
  'device_change',
  'change_rejected',
  'change_cancelled',
  'change_expired',
  'confirmation_rejected',
  'pending_ended',
  'review_ended',
  'incident_command',
  'restore',
] as const;
// Why a session no longer works: a close reason, or what the session check works out
// without writing the row (the end passed, the panel sat idle, the device closed).
export const SESSION_END_REASONS = [
  ...SESSION_CLOSE_REASONS,
  'expired',
  'idle',
  'device_closed',
] as const;
export const CONFIRMATION_REJECTION_REASONS = [
  'not_this_student',
  'number_elsewhere',
  'other',
] as const;
export const DEVICE_VERIFICATION_RESULTS = [
  'verified',
  'unverified',
] as const satisfies readonly ProofResult[];
// Why the verification result of a device changed after registration (D07 writes it).
export const VERIFICATION_CHANGE_REASONS = [
  'revocation_list',
  'reverification',
  'approval_fields',
] as const;
export const DEVICE_CLOSE_REASONS = [
  'change',
  'logout',
  'deletion',
  'confirmation_rejected',
  'pending_ended',
  'change_rejected',
  'change_cancelled',
  'change_expired',
  'review_ended',
] as const;
// An App Attest key is checked by D07 and gets its proof result.
export const APP_ATTEST_RESULTS = PROOF_RESULTS;
export { DEVICE_KEY_KINDS, DEVICE_STATUSES };
export const REGISTRATION_RESULTS = [
  'confirmation_pending',
  'confirmed',
  'change_pending',
] as const;
export const CHANGE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export const CHANGE_DECIDERS = [
  'lecturer',
  'student_old_device',
  'student_new_device',
  'system',
] as const;
export const CHANGE_DECISION_REASONS = [
  'identity_seen',
  'identity_mismatch',
  'student_rejected',
  'withdrawn',
  'other_request_approved',
  'expired',
  'account_closed',
] as const;
export const DELETION_SOURCES = ['phone', 'panel', 'lecturer_in_person', 'code'] as const;
export const DELETION_STATUSES = ['queued', 'done', 'cancelled'] as const;

export type PersonKind = (typeof PERSON_KINDS)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type SessionEndReason = (typeof SESSION_END_REASONS)[number];
export type DeviceCloseReason = (typeof DEVICE_CLOSE_REASONS)[number];

// The numeric rules of the module; the services and the tests read them from here.
export const IDENTITY_CONSTANTS = {
  codeValiditySeconds: 300,
  // Wrong tries shared by a person's candidate open codes before they die.
  codeWrongLimit: 3,
  backoffFirstSeconds: 30,
  backoffMaxSeconds: 900,
  // The least time these answers take: a code, application or deletion code request, and a
  // sign-in whose code is wrong, expired, used or unknown (one error code, one floor).
  fixedAnswerMs: 400,
  staffMaxSessions: 3,
  phoneSessionDays: 30,
  renewBeforeDays: 3,
  panelMaxHours: 24,
  panelIdleMinutes: 60,
  lastUseWriteSeconds: 60,
  changeQrValiditySeconds: 900,
  changeRequestHours: 72,
  // Open change requests with an unverified device per account.
  changeRequestLimit: 3,
  registrationCodeHours: 72,
  registrationCodeWrongLimit: 5,
  // Unconfirmed accounts with an active device per student number.
  pendingAccountLimit: 5,
  registrationsPerNumberPerDay: 10,
  pendingCloseDays: 30,
  pendingCloseTermLocks: 2,
  deletionWaitDays: 7,
  recentLoginMinutes: 15,
  sessionRowKeepDays: 30,
  deviceLabelMax: 60,
} as const;

// Ids. Every identity row id is a UUIDv7 made by the database; the ones other modules
// refer to live in shared/identity.ts.
export type ChangeRequestId = Id<'ChangeRequest'>;
export const changeRequestIdSchema = v7IdSchema('ChangeRequest');

// Error catalog.

export const IDENTITY_ERROR_CODES = defineErrorCodes('identity', {
  // The session check's codes: a credential that matches no session, or a session that
  // no longer works. With no credential at all the api module's API_AUTH_REQUIRED answers.
  IDENTITY_SESSION_UNKNOWN: {
    http: 401,
    lecturer: {
      tr: 'Oturum bulunamadı. Yeniden giriş yapın.',
      en: 'Your session was not found. Sign in again.',
    },
    student: {
      tr: 'Bu telefondaki oturum bulunamadı.',
      en: 'The session on this phone was not found.',
    },
  },
  IDENTITY_SESSION_ENDED: {
    http: 401,
    lecturer: {
      tr: 'Oturumunuz kapandı. Yeniden giriş yapın.',
      en: 'Your session has ended. Sign in again.',
    },
    student: {
      tr: 'Bu telefondaki oturumun kapandı.',
      en: 'The session on this phone has ended.',
    },
    details: z.object({ reason: extensibleEnum(SESSION_END_REASONS) }),
  },
  // A panel login without an Origin header; an Origin of another site is cut earlier by
  // the api module's API_INVALID_ORIGIN.
  IDENTITY_INVALID_ORIGIN: {
    http: 403,
    ...sameText(
      'Giriş bu panelden gelmedi. Sayfayı yenileyip yeniden deneyin.',
      'This sign-in did not come from this panel. Refresh the page and try again.',
    ),
  },
  // A session waiting for a device change on a route that does not accept it. The api
  // module's declaration check answers it.
  IDENTITY_SCOPE_LIMITED: {
    http: 403,
    ...sameText(
      'Telefon değişikliği onaylanana kadar bu işlem yapılamaz.',
      'This cannot be done until the phone change is approved.',
    ),
  },
  IDENTITY_RECENT_LOGIN_REQUIRED: {
    http: 403,
    ...addressedText(
      'Hesabı silmek için yeniden giriş yapın.',
      'Hesabı silmek için yeniden giriş yap.',
      'Sign in again to delete the account.',
    ),
  },
  IDENTITY_ATTESTATION_REJECTED: {
    http: 403,
    ...addressedText(
      'Bu uygulama doğrulanamadı. Uygulamayı resmi kaynağından yeniden yükleyin.',
      'Bu uygulama doğrulanamadı. Uygulamayı resmi kaynağından yeniden yükle.',
      'This app could not be verified. Install it again from the official source.',
    ),
  },
  IDENTITY_REGISTRATION_CODE_DISABLED: {
    http: 403,
    ...sameText(
      'Bu numara için kayıt kodu üretilemez.',
      'A registration code cannot be issued for this number.',
    ),
  },
  IDENTITY_INVALID_EMAIL: {
    http: 400,
    ...sameText(
      'E-posta adresi geçersiz. Yalnız @istanbul.edu.tr adresleri kullanılabilir.',
      'The e-mail address is invalid. Only @istanbul.edu.tr addresses can be used.',
    ),
  },
  IDENTITY_INVALID_DEPARTMENT: {
    http: 400,
    ...sameText(
      'Seçilen bölüm bu birime ait değil.',
      'The selected department does not belong to this unit.',
    ),
  },
  IDENTITY_INVALID_CODE: {
    http: 400,
    ...addressedText(
      'Kod yanlış ya da süresi geçmiş. Yeni kod isteyin.',
      'Kod yanlış ya da süresi geçmiş. Yeni kod iste.',
      'The code is wrong or has expired. Ask for a new code.',
    ),
  },
  IDENTITY_INVALID_REGISTRATION_CODE: {
    http: 400,
    ...sameText(
      'Kayıt kodu yanlış ya da süresi geçmiş.',
      'The registration code is wrong or has expired.',
    ),
  },
  IDENTITY_INVALID_CHALLENGE: {
    http: 400,
    ...addressedText(
      'Doğrulama süresi doldu. Yeniden deneyin.',
      'Doğrulama süresi doldu. Yeniden dene.',
      'The verification has expired. Try again.',
    ),
  },
  IDENTITY_INVALID_SIGNATURE: {
    http: 400,
    ...sameText('Telefonun imzası doğrulanamadı.', "The phone's signature could not be verified."),
  },
  IDENTITY_INVALID_QR_VALUE: {
    http: 400,
    ...sameText(
      'Karekod geçersiz ya da süresi geçmiş. Öğrenciden yeni karekod isteyin.',
      'The QR code is invalid or has expired. Ask the student for a new one.',
    ),
  },
  // The address is backing off; the wait comes in the details and in Retry-After.
  IDENTITY_BACKOFF_ACTIVE: {
    http: 429,
    ...addressedText(
      'Çok fazla yanlış deneme oldu. Biraz bekleyip yeni kod isteyin.',
      'Çok fazla yanlış deneme oldu. Biraz bekleyip yeni kod iste.',
      'There were too many wrong tries. Wait a little and ask for a new code.',
    ),
    details: z.object({ waitSeconds: z.number().int().positive() }),
    retry: 'caller',
  },
  // The one code for a resource that is missing or outside the caller's reach.
  IDENTITY_NOT_FOUND: {
    http: 404,
    ...addressedText(
      'Kayıt bulunamadı ya da bu işlem için yetkiniz yok.',
      'Kayıt bulunamadı ya da bu işlem için yetkin yok.',
      'The record was not found or you have no access to it.',
    ),
  },
  IDENTITY_ACCOUNT_STATE_CONFLICT: {
    http: 409,
    ...sameText(
      'Hesabın şimdiki durumunda bu işlem yapılamaz.',
      "This cannot be done in the account's current state.",
    ),
  },
  IDENTITY_LAST_ADMIN: {
    http: 409,
    ...sameText(
      'Son tüm üniversite yöneticisi pasif yapılamaz ve rolü alınamaz.',
      'The last university-wide administrator cannot be deactivated or lose the role.',
    ),
  },
  IDENTITY_NUMBER_CONFIRMED: {
    http: 409,
    lecturer: {
      tr: 'Bu numaranın teyitli bir hesabı var.',
      en: 'This number already has a confirmed account.',
    },
    student: {
      tr: 'Bu numaranın teyitli bir hesabı var. Telefon değişikliği iste.',
      en: 'This number already has a confirmed account. Ask for a phone change.',
    },
  },
  IDENTITY_TOO_MANY_PENDING_ACCOUNTS: {
    http: 409,
    ...addressedText(
      'Bu numarayla çok fazla kayıt açıldı. Dersin hocasından kayıt kodu isteyin.',
      'Bu numarayla çok fazla kayıt açıldı. Dersin hocasından kayıt kodu iste.',
      'Too many registrations were made with this number. Ask the lecturer for a registration code.',
    ),
  },
  IDENTITY_TOO_MANY_CHANGE_REQUESTS: {
    http: 409,
    ...sameText(
      'Bu hesapta çok fazla açık telefon değişikliği isteği var.',
      'This account has too many open phone change requests.',
    ),
  },
  IDENTITY_DEVICE_BOUND: {
    http: 409,
    ...sameText(
      'Bu telefon başka bir öğrenci numarasına bağlı.',
      'This phone is bound to another student number.',
    ),
  },
  IDENTITY_DEVICE_CLOSED: {
    http: 409,
    ...addressedText(
      'Bu telefonun kaydı kapandı. Telefon değişikliği isteyin.',
      'Bu telefonun kaydı kapandı. Telefon değişikliği iste.',
      "This phone's registration has closed. Ask for a phone change.",
    ),
  },
  IDENTITY_REQUEST_CLOSED: {
    http: 409,
    ...sameText(
      'Bu telefon değişikliği isteği artık açık değil.',
      'This phone change request is no longer open.',
    ),
  },
  IDENTITY_CHANGE_NOT_NEEDED: {
    http: 409,
    ...addressedText(
      'Bu numaranın teyitli hesabı yok. Kayıt ekranını kullanın.',
      'Bu numaranın teyitli hesabı yok. Kayıt ekranını kullan.',
      'This number has no confirmed account. Use the registration screen.',
    ),
  },
  IDENTITY_UNSENT_RECORDS: {
    http: 409,
    ...addressedText(
      'Gönderilmemiş yoklama kayıtları var. Önce internete bağlanıp gönderin.',
      'Gönderilmemiş yoklama kayıtları var. Önce internete bağlanıp gönder.',
      'There are attendance records not sent yet. Connect to the internet and send them first.',
    ),
  },
  // Startup: a composition root did not set up all four identity event subscribers.
  IDENTITY_LISTENERS_MISSING: OPERATIONAL_CODE,
});

export type IdentityErrorCode = keyof typeof IDENTITY_ERROR_CODES;

// The codes any session route may answer, so no route lists them: the session check's
// two 401 codes and the change-pending refusal of the declaration check.
export const IDENTITY_SESSION_CODES = [
  'IDENTITY_SESSION_UNKNOWN',
  'IDENTITY_SESSION_ENDED',
  'IDENTITY_SCOPE_LIMITED',
] as const satisfies readonly IdentityErrorCode[];

// A route's error list, checked against the catalog when it compiles.
const errors = (...codes: IdentityErrorCode[]) => codes;

// Field schemas.

const EMAIL_MAX_LENGTH = 254;
// Bounds of the device evidence: a P-256 key is 91 bytes of SPKI and its ECDSA signature
// at most 72 bytes of DER; the bounds leave room without letting a body grow unbounded.
export const EVIDENCE_LIMITS = {
  spkiMaxBytes: 512,
  signatureMaxBytes: 256,
  certificateMaxBytes: 8 * 1024,
  certificateChainMax: 10,
  appAttestMaxBytes: 16 * 1024,
} as const;
// Ten largest certificates in base64url fit; the default 64 KiB would not.
const EVIDENCE_BODY_LIMIT = 128 * 1024;

// The server reads the address through normalizeEmail and answers IDENTITY_INVALID_EMAIL
// for a bad one, without telling whether an account exists.
const emailSchema = z.string().max(EMAIL_MAX_LENGTH);
// An e-mailed code: six ASCII digits.
const emailCodeSchema = z
  .string()
  .max(6)
  .regex(/^[0-9]{6}$/);
// A person's name as typed: 2 to 120 characters in NFC with a letter among them, well
// formed (no lone surrogate) and without control, format or invisible characters (zero
// width, bidirectional overrides, Hangul fillers), so it reads on a lecturer's screen as
// it was typed. A decomposed name is taken in its NFC form, as the plan's student
// registration says; the raw text may be longer by its combining marks.
const PERSON_NAME_MAX = 120;
const isPersonName = (name: string) =>
  /\p{L}/u.test(name) && !/[\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}]/u.test(name);
const personNameSchema = z
  .string()
  .max(4 * PERSON_NAME_MAX)
  .transform((name) => name.normalize('NFC'))
  .pipe(
    textWithoutControlSchema(PERSON_NAME_MAX)
      .min(2)
      .refine(isPersonName, { message: 'A name with a letter and no format characters' }),
  );
const deviceModelSchema = textWithoutControlSchema(IDENTITY_CONSTANTS.deviceLabelMax);
// A registration code in its canonical form; the phone parses what the student typed
// (parseRegistrationCode) before sending it. The lecturer sees it grouped 4 and 4.
const CROCKFORD_SYMBOL = `[${CROCKFORD_ALPHABET}]`;
const registrationCodeSchema = z
  .string()
  .max(REGISTRATION_CODE_LENGTH)
  .regex(new RegExp(`^${CROCKFORD_SYMBOL}{${REGISTRATION_CODE_LENGTH}}$`));
const groupedRegistrationCodeSchema = z
  .string()
  .regex(
    new RegExp(
      `^${CROCKFORD_SYMBOL}{${REGISTRATION_CODE_GROUP_LENGTH}}-${CROCKFORD_SYMBOL}{${REGISTRATION_CODE_GROUP_LENGTH}}$`,
    ),
  );
// The value the verification module handed out for this registration (D07).
const challengeSchema = base64UrlBytesSchema(32);
const sessionTokenSchema = base64UrlBytesSchema(32);
const qrValueSchema = base64UrlBytesSchema(16);
// Apple's key id: the standard base64 text of the key's SHA-256.
const appAttestKeyIdSchema = z.string().max(44).regex(BASE64_32_BYTES);
const signatureSchema = base64UrlMaxBytesSchema(EVIDENCE_LIMITS.signatureMaxBytes);
const spkiSchema = base64UrlMaxBytesSchema(EVIDENCE_LIMITS.spkiMaxBytes);
const appAttestEvidenceSchema = base64UrlMaxBytesSchema(EVIDENCE_LIMITS.appAttestMaxBytes);

const roleGrantSchema = z.object({
  role: extensibleEnum(PERSON_ROLES),
  scopeUnitId: unitIdSchema.nullable(),
});

// What a new phone sends to register or to ask for a phone change: the student's number
// and name, the verification value and the device evidence of its platform (D07 checks
// it); the key it proves is the device's primary key.
const deviceEvidenceBody = <S extends z.ZodRawShape>(extra: S) => {
  const common = {
    ...extra,
    studentNumber: studentNumberSchema,
    fullName: personNameSchema,
    model: deviceModelSchema.optional(),
    challenge: challengeSchema,
  };
  return z.discriminatedUnion('platform', [
    z.object({
      ...common,
      platform: z.literal('android'),
      evidence: z.object({
        publicKey: spkiSchema,
        certificateChain: z
          .array(base64UrlMaxBytesSchema(EVIDENCE_LIMITS.certificateMaxBytes))
          .max(EVIDENCE_LIMITS.certificateChainMax)
          .optional(),
        isSystemUser: z.boolean(),
        bindingSignature: signatureSchema,
      }),
    }),
    z.object({
      ...common,
      platform: z.literal('ios'),
      evidence: z.object({
        secureEnclavePublicKey: spkiSchema,
        bindingSignature: signatureSchema,
        appAttest: z
          .object({ attestation: appAttestEvidenceSchema, keyId: appAttestKeyIdSchema })
          .optional(),
      }),
    }),
  ]);
};

const deviceKeysSchema = z.array(
  z.object({ keyId: deviceKeyIdSchema, kind: extensibleEnum(DEVICE_KEY_KINDS) }),
);
// A change request as its new phone sees it: the QR value shows once.
const newChangeRequestSchema = z.object({
  requestId: changeRequestIdSchema,
  qrValue: qrValueSchema,
  qrExpiresAt: instantSchema,
  requestExpiresAt: instantSchema,
});
const codeSentSchema = z.object({ validitySeconds: z.number().int() });

// A session waiting for a device change sees only its own request: every field about the
// account is null for it.
const meSchema = z.object({
  personId: personIdSchema.nullable(),
  kind: extensibleEnum(PERSON_KINDS),
  status: extensibleEnum(ACCOUNT_STATUSES).nullable(),
  reviewAccount: z.boolean().nullable(),
  // The language of the person's e-mails.
  language: extensibleEnum(LANGUAGES).nullable(),
  roles: z.array(roleGrantSchema),
  session: z.object({
    authSessionId: authSessionIdSchema,
    client: extensibleEnum(SESSION_CLIENTS),
    scope: extensibleEnum(SESSION_SCOPES),
    // A student session has no end.
    expiresAt: instantSchema.nullable(),
  }),
  staff: z
    .object({
      fullName: z.string(),
      email: z.string(),
      unitId: unitIdSchema.nullable(),
      departmentId: departmentIdSchema.nullable(),
    })
    .nullable(),
  student: z
    .union([
      z.object({
        studentNumber: z.string(),
        matchStatus: extensibleEnum(MATCH_STATUSES),
        confirmationStatus: extensibleEnum(CONFIRMATION_STATUSES),
        device: z.object({
          deviceId: deviceIdSchema,
          status: extensibleEnum(DEVICE_STATUSES),
          verified: z.boolean(),
          secondProfile: z.boolean(),
        }),
        // Requests other phones opened on this account; the student rejects a stranger's
        // from the active device.
        openChangeRequests: z.array(
          z.object({
            requestId: changeRequestIdSchema,
            createdAt: instantSchema,
            status: extensibleEnum(CHANGE_REQUEST_STATUSES),
            requestExpiresAt: instantSchema,
            newDevicePlatform: extensibleEnum(PLATFORMS),
          }),
        ),
      }),
      // A session waiting for a device change sees only its own request.
      z.object({
        changeRequest: z.object({
          requestId: changeRequestIdSchema,
          status: extensibleEnum(CHANGE_REQUEST_STATUSES),
          qrExpiresAt: instantSchema,
          requestExpiresAt: instantSchema,
        }),
      }),
    ])
    .nullable(),
  deletion: z
    .object({
      status: extensibleEnum(['none', 'queued']),
      requestedAt: instantSchema.nullable(),
      executeBy: instantSchema.nullable(),
      waitingPhoneCount: countSchema.nullable(),
    })
    .nullable(),
});

// Route presets.
const anonymous = ANONYMOUS_ACCESS;
const signedIn = { auth: ['session'], roles: ['student', 'staff'], rate: 'session' } as const;
const student = sessionAccess('student');
const staff = sessionAccess('staff');
const lecturer = sessionAccess('lecturer');
const admin = sessionAccess('admin');
const personParams = z.object({ personId: personIdSchema });
const requestParams = z.object({ requestId: changeRequestIdSchema });

// Routes. The key is the route name.

export const IDENTITY_ROUTES = {
  requestCode: defineRoute({
    module: 'identity',
    name: 'requestCode',
    method: 'POST',
    path: '/v1/identity/code',
    ...anonymous,
    request: {
      body: z.object({
        email: emailSchema,
        purpose: z.enum(CODE_PURPOSES).exclude(['application']).default('login'),
      }),
    },
    response: { statuses: [202], schema: codeSentSchema },
    errors: errors('IDENTITY_INVALID_EMAIL'),
    summary:
      'Sends a login or deletion code when the account state calls for one; the answer and its time never depend on the account.',
  }),
  login: defineRoute({
    module: 'identity',
    name: 'login',
    method: 'POST',
    path: '/v1/identity/login',
    // A phone may send its current token to renew its session.
    auth: ['anonymous', 'session'],
    roles: ['staff'],
    rate: { unauthenticated: 'anonymous', authenticated: 'session' },
    request: {
      body: z
        .object({
          email: emailSchema,
          code: emailCodeSchema,
          client: z.enum(SESSION_CLIENTS),
          device: z.object({ platform: z.enum(PLATFORMS) }).optional(),
        })
        .refine((body) => (body.device !== undefined) === (body.client === 'phone'), {
          message: 'device is given on the phone and only there',
          path: ['device'],
        }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        // approval_pending: an application code typed into the login form; no session
        // opens and every other field is null.
        status: extensibleEnum(['signed_in', 'approval_pending']),
        authSessionId: authSessionIdSchema.nullable(),
        // Phone only; the panel gets the session cookie instead.
        sessionToken: sessionTokenSchema.nullable(),
        expiresAt: instantSchema.nullable(),
        closedSession: z
          .object({ client: extensibleEnum(SESSION_CLIENTS), deviceLabel: z.string() })
          .nullable(),
        person: z.object({ personId: personIdSchema, roles: z.array(roleGrantSchema) }).nullable(),
      }),
    },
    errors: errors(
      'IDENTITY_INVALID_EMAIL',
      'IDENTITY_INVALID_CODE',
      'IDENTITY_BACKOFF_ACTIVE',
      'IDENTITY_INVALID_ORIGIN',
    ),
    summary: 'Opens a staff session with an e-mailed code, or verifies an application code.',
  }),
  logout: defineRoute({
    module: 'identity',
    name: 'logout',
    method: 'POST',
    path: '/v1/identity/logout',
    ...signedIn,
    acceptsChangePending: true,
    request: {
      // Required from a student phone, ignored for staff.
      body: z.object({ pendingItemCount: countSchema.optional() }),
    },
    response: { statuses: [200], schema: z.object({ loggedOut: z.literal(true) }) },
    errors: errors('IDENTITY_UNSENT_RECORDS'),
    summary: 'Closes the session; a student phone with unsent items is refused.',
  }),
  listSessions: defineRoute({
    module: 'identity',
    name: 'listSessions',
    method: 'GET',
    path: '/v1/identity/sessions',
    ...staff,
    request: {},
    response: {
      statuses: [200],
      schema: z.object({
        sessions: fullListSchema(
          z.object({
            authSessionId: authSessionIdSchema,
            client: extensibleEnum(SESSION_CLIENTS),
            deviceLabel: z.string(),
            createdAt: instantSchema,
            lastUsedAt: instantSchema,
            expiresAt: instantSchema,
            current: z.boolean(),
          }),
        ),
      }),
    },
    errors: errors(),
    summary: "The caller's open sessions, newest first.",
  }),
  closeSession: defineRoute({
    module: 'identity',
    name: 'closeSession',
    method: 'DELETE',
    path: '/v1/identity/sessions/{authSessionId}',
    ...staff,
    request: { params: z.object({ authSessionId: authSessionIdSchema }) },
    response: { statuses: [204], schema: null },
    errors: errors('IDENTITY_NOT_FOUND'),
    summary: "Closes one of the caller's own sessions; someone else's is not found.",
  }),
  getMe: defineRoute({
    module: 'identity',
    name: 'getMe',
    method: 'GET',
    path: '/v1/identity/me',
    ...signedIn,
    acceptsChangePending: true,
    request: {},
    response: { statuses: [200], schema: meSchema },
    errors: errors(),
    summary: "The caller's account, roles, session, device and deletion state.",
  }),
  setLanguage: defineRoute({
    module: 'identity',
    name: 'setLanguage',
    method: 'PUT',
    path: '/v1/identity/me/language',
    ...signedIn,
    request: { body: z.object({ language: z.enum(LANGUAGES) }) },
    response: {
      statuses: [200],
      schema: z.object({ language: extensibleEnum(LANGUAGES), changed: z.boolean() }),
    },
    errors: errors(),
    summary: "Sets the language of the caller's e-mails; the same value writes nothing.",
  }),
  apply: defineRoute({
    module: 'identity',
    name: 'apply',
    method: 'POST',
    path: '/v1/identity/application',
    ...anonymous,
    request: {
      body: z.object({
        fullName: personNameSchema,
        email: emailSchema,
        unitId: unitIdSchema,
        departmentId: departmentIdSchema,
      }),
    },
    response: { statuses: [202], schema: codeSentSchema },
    errors: errors('IDENTITY_INVALID_EMAIL', 'IDENTITY_INVALID_DEPARTMENT'),
    summary:
      'Starts a staff application and e-mails what its state calls for; the answer never depends on the account.',
  }),
  verifyApplication: defineRoute({
    module: 'identity',
    name: 'verifyApplication',
    method: 'POST',
    path: '/v1/identity/application/verify',
    ...anonymous,
    request: { body: z.object({ email: emailSchema, code: emailCodeSchema }) },
    response: {
      statuses: [200],
      schema: z.object({ status: extensibleEnum(['approval_pending']) }),
    },
    errors: errors('IDENTITY_INVALID_EMAIL', 'IDENTITY_INVALID_CODE', 'IDENTITY_BACKOFF_ACTIVE'),
    summary: 'Verifies the application code; the application then waits for an admin.',
  }),
  deleteWithCode: defineRoute({
    module: 'identity',
    name: 'deleteWithCode',
    method: 'POST',
    path: '/v1/identity/application/deletion',
    ...anonymous,
    request: { body: z.object({ email: emailSchema, code: emailCodeSchema }) },
    response: { statuses: [200], schema: z.object({ deleted: z.literal(true) }) },
    errors: errors('IDENTITY_INVALID_EMAIL', 'IDENTITY_INVALID_CODE', 'IDENTITY_BACKOFF_ACTIVE'),
    summary: 'Deletes an unapproved application or an inactive staff account with a deletion code.',
  }),
  registerStudent: defineRoute({
    module: 'identity',
    name: 'registerStudent',
    method: 'POST',
    path: '/v1/identity/student/registration',
    ...anonymous,
    audience: 'student',
    bodyLimit: EVIDENCE_BODY_LIMIT,
    request: {
      body: deviceEvidenceBody({ registrationCode: registrationCodeSchema.optional() }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        status: extensibleEnum(REGISTRATION_RESULTS),
        // Null on a change request: only a new account or one bound again has it.
        personId: personIdSchema.nullable(),
        deviceId: deviceIdSchema,
        // Shows only in this answer.
        sessionToken: sessionTokenSchema,
        keys: deviceKeysSchema,
        // Null on a change request.
        match: extensibleEnum(MATCH_STATUSES).nullable(),
        deviceVerified: z.boolean(),
        changeRequest: newChangeRequestSchema.nullable(),
      }),
    },
    errors: errors(
      'IDENTITY_INVALID_CHALLENGE',
      'IDENTITY_ATTESTATION_REJECTED',
      'IDENTITY_DEVICE_BOUND',
      'IDENTITY_DEVICE_CLOSED',
      'IDENTITY_TOO_MANY_PENDING_ACCOUNTS',
      'IDENTITY_TOO_MANY_CHANGE_REQUESTS',
      'IDENTITY_INVALID_REGISTRATION_CODE',
      'IDENTITY_NUMBER_CONFIRMED',
    ),
    summary:
      'Registers a student phone; a number with a confirmed account gets a phone change request instead.',
  }),
  renewAppAttest: defineRoute({
    module: 'identity',
    name: 'renewAppAttest',
    method: 'POST',
    path: '/v1/identity/device/app-attest-renewal',
    ...student,
    request: {
      body: z.object({
        challenge: challengeSchema,
        attestation: appAttestEvidenceSchema,
        appAttestKeyId: appAttestKeyIdSchema,
        // Over the SHA-256 of the value and the new key id, with the account's Secure
        // Enclave key.
        secureEnclaveSignature: signatureSchema,
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        // Null when the evidence did not verify.
        keyId: deviceKeyIdSchema.nullable(),
        verification: extensibleEnum(APP_ATTEST_RESULTS),
      }),
    },
    errors: errors(
      'IDENTITY_INVALID_CHALLENGE',
      'IDENTITY_INVALID_SIGNATURE',
      'IDENTITY_ATTESTATION_REJECTED',
      'IDENTITY_ACCOUNT_STATE_CONFLICT',
    ),
    summary: "Renews an iPhone's App Attest key; a failed renewal is recorded and kept.",
  }),
  requestDeviceChange: defineRoute({
    module: 'identity',
    name: 'requestDeviceChange',
    method: 'POST',
    path: '/v1/identity/device-change',
    // A new phone with no session opens a request; its waiting session renews the QR.
    auth: ['anonymous', 'session'],
    roles: ['student'],
    acceptsChangePending: true,
    audience: 'student',
    rate: { unauthenticated: 'anonymous', authenticated: 'session' },
    bodyLimit: EVIDENCE_BODY_LIMIT,
    // The waiting session sends no body.
    request: { body: deviceEvidenceBody({}).optional() },
    response: {
      statuses: [200],
      schema: newChangeRequestSchema.extend({
        deviceId: deviceIdSchema,
        // Null when the waiting phone only renews the QR value.
        sessionToken: sessionTokenSchema.nullable(),
        keys: deviceKeysSchema.nullable(),
      }),
    },
    errors: errors(
      'IDENTITY_INVALID_CHALLENGE',
      'IDENTITY_ATTESTATION_REJECTED',
      'IDENTITY_DEVICE_BOUND',
      'IDENTITY_DEVICE_CLOSED',
      'IDENTITY_TOO_MANY_CHANGE_REQUESTS',
      'IDENTITY_CHANGE_NOT_NEEDED',
      'IDENTITY_ACCOUNT_STATE_CONFLICT',
    ),
    summary: 'Opens a phone change request, or renews its QR value from the waiting phone.',
  }),
  getChangeRequest: defineRoute({
    module: 'identity',
    name: 'getChangeRequest',
    method: 'GET',
    path: '/v1/identity/device-change/{requestId}',
    ...lecturer,
    request: { params: requestParams },
    response: {
      statuses: [200],
      schema: z.object({
        requestId: changeRequestIdSchema,
        status: extensibleEnum(CHANGE_REQUEST_STATUSES),
        studentNumber: z.string(),
        // The name on the roster row of the lecturer's course.
        rosterFullName: z.string(),
        oldDevice: z
          .object({ platform: extensibleEnum(PLATFORMS), lastSeenAt: instantSchema.nullable() })
          .nullable(),
        newDevice: z.object({ platform: extensibleEnum(PLATFORMS), verified: z.boolean() }),
        // More than one: the screen says other phones asked too; approving cancels them.
        openRequestCount: countSchema,
        createdAt: instantSchema,
        qrExpiresAt: instantSchema,
      }),
    },
    errors: errors('IDENTITY_NOT_FOUND'),
    summary: "A phone change request for a lecturer of one of the student's courses.",
  }),
  approveChangeRequest: defineRoute({
    module: 'identity',
    name: 'approveChangeRequest',
    method: 'POST',
    path: '/v1/identity/device-change/{requestId}/approve',
    ...lecturer,
    request: {
      params: requestParams,
      body: z.object({ qrValue: qrValueSchema, identitySeen: z.literal(true) }),
    },
    response: { statuses: [200], schema: z.object({ status: extensibleEnum(['approved']) }) },
    errors: errors('IDENTITY_NOT_FOUND', 'IDENTITY_INVALID_QR_VALUE', 'IDENTITY_REQUEST_CLOSED'),
    summary:
      "Approves a phone change after seeing the student's identity and scanning the new phone's QR.",
  }),
  rejectChangeRequest: defineRoute({
    module: 'identity',
    name: 'rejectChangeRequest',
    method: 'POST',
    path: '/v1/identity/device-change/{requestId}/reject',
    // A lecturer, the account's active phone, or the waiting new phone withdrawing.
    auth: ['session'],
    roles: ['lecturer', 'student'],
    acceptsChangePending: true,
    rate: 'session',
    request: {
      params: requestParams,
      body: z.object({
        reason: z
          .enum(CHANGE_DECISION_REASONS)
          .extract(['identity_mismatch', 'student_rejected', 'withdrawn']),
      }),
    },
    response: {
      statuses: [200],
      schema: z.object({ status: extensibleEnum(['rejected', 'cancelled']) }),
    },
    errors: errors('IDENTITY_NOT_FOUND', 'IDENTITY_REQUEST_CLOSED'),
    summary: 'Rejects a phone change request, or withdraws it from the new phone.',
  }),
  requestDeletion: defineRoute({
    module: 'identity',
    name: 'requestDeletion',
    method: 'POST',
    path: '/v1/identity/account-deletion',
    ...signedIn,
    request: {
      // Required from a phone, absent on the panel.
      body: z.object({ pendingItemCount: countSchema.optional() }),
    },
    response: {
      statuses: [200],
      schema: z.object({
        status: extensibleEnum(['queued', 'done']),
        // When queued: the latest moment it runs, and the open phone sessions that have
        // not yet reported an empty queue; null when done.
        executeBy: instantSchema.nullable(),
        waitingPhoneCount: countSchema.nullable(),
      }),
    },
    errors: errors('IDENTITY_RECENT_LOGIN_REQUIRED'),
    summary: "Deletes the caller's account, or queues it until every phone has sent its items.",
  }),
  cancelDeletion: defineRoute({
    module: 'identity',
    name: 'cancelDeletion',
    method: 'DELETE',
    path: '/v1/identity/account-deletion',
    ...signedIn,
    request: {},
    response: { statuses: [200], schema: z.object({ status: extensibleEnum(['cancelled']) }) },
    errors: errors('IDENTITY_NOT_FOUND'),
    summary: "Cancels the caller's queued account deletion.",
  }),
  deleteStudentAccount: defineRoute({
    module: 'identity',
    name: 'deleteStudentAccount',
    method: 'POST',
    path: '/v1/identity/students/{personId}/account-deletion',
    ...lecturer,
    rate: 'heavy',
    request: {
      params: personParams,
      body: z.object({ courseId: courseIdSchema, identitySeen: z.literal(true) }),
    },
    response: { statuses: [200], schema: z.object({ status: extensibleEnum(['done']) }) },
    errors: errors('IDENTITY_NOT_FOUND', 'IDENTITY_ACCOUNT_STATE_CONFLICT'),
    summary:
      "Deletes, in person, the account of a student on the lecturer's course that has no active phone.",
  }),
  issueRegistrationCode: defineRoute({
    module: 'identity',
    name: 'issueRegistrationCode',
    method: 'POST',
    path: '/v1/identity/registration-codes',
    ...lecturer,
    request: { body: z.object({ studentNumber: studentNumberSchema }) },
    response: {
      statuses: [200],
      schema: z.object({
        // Shown once.
        code: groupedRegistrationCodeSchema,
        expiresAt: instantSchema,
      }),
    },
    errors: errors(
      'IDENTITY_REGISTRATION_CODE_DISABLED',
      'IDENTITY_NOT_FOUND',
      'IDENTITY_NUMBER_CONFIRMED',
    ),
    summary: "Issues a registration code for a student number on the lecturer's course.",
  }),
  listApplications: defineRoute({
    module: 'identity',
    name: 'listApplications',
    method: 'GET',
    path: '/v1/identity/admin/applications',
    ...admin,
    request: {
      query: pageQuerySchema.extend({
        status: z
          .enum(ACCOUNT_STATUSES)
          .extract(['approval_pending', 'rejected'])
          .default('approval_pending'),
      }),
    },
    response: {
      statuses: [200],
      schema: pageSchema(
        z.object({
          personId: personIdSchema,
          fullName: z.string(),
          email: z.string(),
          unitId: unitIdSchema,
          departmentId: departmentIdSchema,
          appliedAt: instantSchema,
          lastRejectedAt: instantSchema.nullable(),
          lastRejectionReason: extensibleEnum(APPLICATION_REJECTION_REASONS).nullable(),
        }),
      ),
    },
    errors: errors(),
    summary: "Staff applications in the admin's scope.",
  }),
  approveApplication: defineRoute({
    module: 'identity',
    name: 'approveApplication',
    method: 'POST',
    path: '/v1/identity/admin/applications/{personId}/approve',
    ...admin,
    request: { params: personParams },
    response: { statuses: [200], schema: z.object({ status: extensibleEnum(['active']) }) },
    errors: errors('IDENTITY_NOT_FOUND', 'IDENTITY_ACCOUNT_STATE_CONFLICT'),
    summary: 'Approves an application: the account becomes active with the lecturer role.',
  }),
  rejectApplication: defineRoute({
    module: 'identity',
    name: 'rejectApplication',
    method: 'POST',
    path: '/v1/identity/admin/applications/{personId}/reject',
    ...admin,
    request: {
      params: personParams,
      body: z.object({ reason: z.enum(APPLICATION_REJECTION_REASONS) }),
    },
    response: { statuses: [200], schema: z.object({ status: extensibleEnum(['rejected']) }) },
    errors: errors('IDENTITY_NOT_FOUND', 'IDENTITY_ACCOUNT_STATE_CONFLICT'),
    summary: 'Rejects an application with a reason; no e-mail goes out.',
  }),
  listAccounts: defineRoute({
    module: 'identity',
    name: 'listAccounts',
    method: 'GET',
    path: '/v1/identity/admin/accounts',
    ...admin,
    request: {
      query: pageQuerySchema.extend({
        status: z.enum(ACCOUNT_STATUSES).exclude(['closed']).optional(),
        role: z.enum(STAFF_ROLES).optional(),
        unitId: unitIdSchema.optional(),
      }),
    },
    response: {
      statuses: [200],
      schema: pageSchema(
        z.object({
          personId: personIdSchema,
          // Null once an unapproved application is deleted.
          fullName: z.string().nullable(),
          // Null once the account is deleted.
          email: z.string().nullable(),
          unitId: unitIdSchema.nullable(),
          departmentId: departmentIdSchema.nullable(),
          status: extensibleEnum(ACCOUNT_STATUSES),
          roles: z.array(roleGrantSchema),
          activeSessionCount: countSchema,
          reviewAccount: z.boolean(),
        }),
      ),
    },
    errors: errors(),
    summary: "Staff accounts in the admin's scope; name search happens on the panel.",
  }),
  closeAccountSessions: defineRoute({
    module: 'identity',
    name: 'closeAccountSessions',
    method: 'POST',
    path: '/v1/identity/admin/accounts/{personId}/close-sessions',
    ...admin,
    request: { params: personParams },
    response: { statuses: [200], schema: z.object({ closed: countSchema }) },
    errors: errors('IDENTITY_NOT_FOUND'),
    summary: "Closes every session of a staff account in the admin's scope.",
  }),
  deactivateAccount: defineRoute({
    module: 'identity',
    name: 'deactivateAccount',
    method: 'POST',
    path: '/v1/identity/admin/accounts/{personId}/deactivate',
    ...admin,
    request: { params: personParams },
    response: { statuses: [200], schema: z.object({ status: extensibleEnum(['inactive']) }) },
    errors: errors('IDENTITY_NOT_FOUND', 'IDENTITY_ACCOUNT_STATE_CONFLICT', 'IDENTITY_LAST_ADMIN'),
    summary: 'Makes a staff account inactive and closes its sessions.',
  }),
  activateAccount: defineRoute({
    module: 'identity',
    name: 'activateAccount',
    method: 'POST',
    path: '/v1/identity/admin/accounts/{personId}/activate',
    ...admin,
    request: { params: personParams },
    response: { statuses: [200], schema: z.object({ status: extensibleEnum(['active']) }) },
    errors: errors('IDENTITY_NOT_FOUND', 'IDENTITY_ACCOUNT_STATE_CONFLICT'),
    summary: 'Makes an inactive staff account active again; it signs in with a new code.',
  }),
  grantRole: defineRoute({
    module: 'identity',
    name: 'grantRole',
    method: 'POST',
    path: '/v1/identity/admin/admins',
    ...admin,
    request: {
      body: z
        .object({
          email: emailSchema,
          // Required for a new account.
          fullName: personNameSchema.optional(),
          unitId: unitIdSchema.optional(),
          departmentId: departmentIdSchema.optional(),
          role: z.enum(STAFF_ROLES).default('admin'),
          // The admin role's scope: a unit, or null for the whole university.
          scopeUnitId: unitIdSchema.nullable().optional(),
        })
        .refine((body) => (body.role === 'admin') === (body.scopeUnitId !== undefined), {
          message: 'scopeUnitId is given with the admin role and only there',
          path: ['scopeUnitId'],
        }),
    },
    response: {
      statuses: [200],
      schema: z.object({ personId: personIdSchema, newAccount: z.boolean() }),
    },
    errors: errors(
      'IDENTITY_INVALID_EMAIL',
      'IDENTITY_INVALID_DEPARTMENT',
      'IDENTITY_ACCOUNT_STATE_CONFLICT',
      'IDENTITY_NOT_FOUND',
    ),
    summary: 'Adds an admin, or gives the lecturer role to a staff account, within the scope.',
  }),
  revokeRole: defineRoute({
    module: 'identity',
    name: 'revokeRole',
    method: 'DELETE',
    path: '/v1/identity/admin/admins/{personId}',
    ...admin,
    request: {
      params: personParams,
      query: z.object({ role: z.enum(STAFF_ROLES).default('admin') }),
    },
    response: { statuses: [204], schema: null },
    errors: errors('IDENTITY_NOT_FOUND', 'IDENTITY_LAST_ADMIN'),
    summary: 'Takes the admin or the lecturer role back.',
  }),
} as const;

export type IdentityRouteName = keyof typeof IDENTITY_ROUTES;

// Audit events. The detail schemas are registered once with the corrections module,
// which rejects an unknown detail field. Details carry only internal ids and codes: no
// student number, name, address, code or key. The envelope carries the rest: the
// applicant as target { PERSON, personId } (studentId empty), a student account as
// studentId, the request's operationId on the confirmation events, and unitId with every
// courseId (the in-person deletion and the registration code events).

// A role and its scope, which only an admin grant has.
const roleScope = { role: z.enum(STAFF_ROLES), scopeUnitId: unitIdSchema.nullable() };
const isGrantScope = (detail: { role: string; scopeUnitId: string | null }) =>
  detail.role === 'admin' || detail.scopeUnitId === null;
const ONLY_ADMIN_SCOPE = { message: 'Only an admin grant has a scope', path: ['scopeUnitId'] };

export const IDENTITY_AUDIT_EVENTS = {
  'identity.application_submitted': noDetailsSchema,
  'identity.application_verified': noDetailsSchema,
  'identity.application_approved': noDetailsSchema,
  'identity.application_rejected': z.strictObject({
    reason: z.enum(APPLICATION_REJECTION_REASONS),
  }),
  'identity.application_deleted': noDetailsSchema,
  // Target the new session.
  'identity.login_succeeded': z.strictObject({ client: z.enum(SESSION_CLIENTS) }),
  'identity.review_login': z.strictObject({ client: z.enum(SESSION_CLIENTS) }),
  'identity.review_wrong_attempt': noDetailsSchema,
  'identity.review_removed': noDetailsSchema,
  // The login notice e-mail did not go out.
  'identity.notification_failed': noDetailsSchema,
  // Target the session.
  'identity.session_closed': z.strictObject({ reason: z.enum(SESSION_CLOSE_REASONS) }),
  'identity.role_granted': z
    .strictObject({ ...roleScope, source: z.enum(ROLE_SOURCES) })
    .refine(isGrantScope, ONLY_ADMIN_SCOPE),
  'identity.role_revoked': z
    .strictObject({ ...roleScope, reason: z.enum(ROLE_REVOKE_REASONS) })
    .refine(isGrantScope, ONLY_ADMIN_SCOPE),
  'identity.account_deactivated': noDetailsSchema,
  'identity.account_activated': noDetailsSchema,
  'identity.student_registered': z.strictObject({
    deviceId: deviceIdSchema,
    confirmationStatus: z.enum(CONFIRMATION_STATUSES),
    matchStatus: z.enum(MATCH_STATUSES),
    deviceVerified: z.boolean(),
  }),
  'identity.confirmed': z.strictObject({ path: z.enum(['bulk', 'single']) }),
  'identity.confirmation_rejected': z.strictObject({
    reason: z.enum(CONFIRMATION_REJECTION_REASONS),
  }),
  // Target the request.
  'identity.device_change_requested': z.strictObject({
    newDeviceId: deviceIdSchema,
    deviceVerified: z.boolean(),
  }),
  'identity.device_change_approved': z.strictObject({
    oldDeviceId: deviceIdSchema.nullable(),
    newDeviceId: deviceIdSchema,
    cancelledRequests: countSchema,
  }),
  'identity.device_change_rejected': z.strictObject({
    decider: z.enum(CHANGE_DECIDERS),
    reason: z.enum(CHANGE_DECISION_REASONS),
  }),
  'identity.device_change_expired': noDetailsSchema,
  'identity.device_logout': z.strictObject({
    deviceId: deviceIdSchema,
    accountClosed: z.boolean(),
  }),
  'identity.app_attest_renewed': z.strictObject({
    deviceId: deviceIdSchema,
    keyId: deviceKeyIdSchema.nullable(),
    result: z.enum(APP_ATTEST_RESULTS),
  }),
  'identity.device_verification_changed': z.strictObject({
    deviceId: deviceIdSchema,
    result: z.enum(DEVICE_VERIFICATION_RESULTS),
    reason: z.enum(VERIFICATION_CHANGE_REASONS),
  }),
  'identity.registration_code_issued': noDetailsSchema,
  'identity.registration_code_used': noDetailsSchema,
  'identity.registration_code_wrong': z.strictObject({ wrongCount: countSchema }),
  'identity.deletion_requested': z.strictObject({
    source: z.enum(DELETION_SOURCES),
    status: z.enum(DELETION_STATUSES).exclude(['cancelled']),
  }),
  'identity.deletion_cancelled': noDetailsSchema,
  'identity.account_deleted': z.strictObject({ personKind: z.enum(PERSON_KINDS) }),
  'identity.pending_account_closed': noDetailsSchema,
  'identity.command_line_admin': z.strictObject({ newAccount: z.boolean() }),
  'identity.incident_command_sessions': z.strictObject({ closedSessions: countSchema }),
} as const satisfies Readonly<Record<string, z.ZodObject>>;

export type IdentityAuditEvent = keyof typeof IDENTITY_AUDIT_EVENTS;

// Identity events. Each goes, inside the transaction that caused it, to the four
// subscribers (courses, sync, projection, operations) in that order; a subscriber that
// throws rolls the whole transaction back. Each is also one structured log line with the
// same fields. They carry only internal ids, kinds, reasons and the moment: no number,
// name or address.
export type IdentityEvent =
  | {
      type: 'auth_session_closed';
      authSessionId: AuthSessionId;
      personId: PersonId;
      reason: SessionEndReason;
      at: Date;
    }
  | {
      type: 'auth_session_renewed';
      oldAuthSessionId: AuthSessionId;
      newAuthSessionId: AuthSessionId;
      personId: PersonId;
      at: Date;
    }
  | {
      type: 'device_closed';
      deviceId: DeviceId;
      personId: PersonId;
      reason: DeviceCloseReason;
      at: Date;
    }
  | {
      type: 'account_status_changed';
      personId: PersonId;
      from: AccountStatus;
      to: AccountStatus;
      at: Date;
    }
  | { type: 'account_deleted'; personId: PersonId; personKind: PersonKind; at: Date };

// A subscriber's listener. The contract has no database types, so the caller names its
// transaction type (the server's Transaction); subscribers import this type from here,
// never from the identity module.
export type IdentityListener<Tx> = (tx: Tx, event: IdentityEvent) => Promise<void>;
