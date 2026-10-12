// Projection contract (D11): the seven routes of the lectern browser and the lecturer's
// phone, the PROJECTION_ error catalog, the display record queue item, the record evidence
// fields the attendance record text carries, the QR verification and delay result lists,
// the QR result, the settings schema with its defaults and the codes request form. This
// file never imports the verification contract: the verification module maps these result
// lists in its own code (one-way dictionary). Request and answer objects drop unknown keys
// (D13-B24); the audit schemas are strict.
import { BASE64_32_BYTES, KEY_ID } from '@iu-attendance/core/shared/formats';
import { z } from 'zod';
import { sessionIdSchema } from './courses.ts';
import {
  COOKIES,
  countSchema,
  defineErrorCodes,
  defineItemType,
  defineRoute,
  durationMsSchema,
  extensibleEnum,
  idSchema,
  instantSchema,
  sameText,
  v7IdSchema,
} from './shared/index.ts';

// Result dictionaries. The table CHECK lists, the result types and the documents'
// x-extensible-enum values all come from these two lists.

// How a QR or backup code verified.
export const QR_VERIFICATION_RESULTS = [
  'VALID',
  'MALFORMED',
  'VERSION_UNKNOWN',
  'SESSION_MISMATCH',
  'KEY_NOT_FOUND',
  'KEY_RETIRED',
  'KEY_COMPROMISED',
  'NO_DOWNLOAD_RECORD',
  'MAC_INVALID',
  'BACKUP_CODE_MISMATCH',
  'BACKUP_CODE_LIMIT',
  'NONE',
] as const;
// How late a scan came after the code was shown.
export const QR_DELAY_RESULTS = [
  'NORMAL',
  'IN_REVIEW',
  'REJECTED',
  'SCANNED_BEFORE',
  'OUTSIDE_DISPLAY',
  'PENDING',
  'CLOCK_UNVERIFIED',
  'NO_LECTURER_CLOCK',
  'LECTURER_ANCHORS_DIVERGE',
  'KEY_REVOKED',
  'ANCHORS_STALE',
] as const;
export type QrVerification = (typeof QR_VERIFICATION_RESULTS)[number];
export type QrDelay = (typeof QR_DELAY_RESULTS)[number];

export const EVIDENCE_KINDS = ['QR', 'BACKUP_CODE', 'NONE'] as const;
export const DISPLAY_SOURCES = ['PROJECTION', 'LECTURER_PHONE'] as const;
export const DISPLAY_KINDS = ['QR', 'BACKUP_CODE', 'BLUETOOTH'] as const;
export const BLUETOOTH_STATUSES = ['SCANNED', 'NO_BLUETOOTH'] as const;
export const LOCATION_STATUSES = ['RECEIVED', 'NO_LOCATION', 'APPROXIMATE_PERMISSION'] as const;
const BLUETOOTH_RESULTS = ['SEEN', 'NOT_SEEN', 'NO_BLUETOOTH', 'PENDING'] as const;
const LOCATION_RESULTS = ['NEAR', 'FAR', 'NO_LOCATION', 'PENDING'] as const;
// What the lectern page shows; an unknown value reads as waiting for the connection.
export const LECTERN_STATUSES = [
  'AWAITING_PAIRING',
  'CODE_EXPIRED',
  'ATTENDANCE_NOT_OPEN',
  'CONNECTED',
  'ATTENDANCE_CLOSED',
  'SERVER_CLOCK_BROKEN',
  'CLOSED',
] as const;
export const CONNECTION_STATUSES = ['OPEN', 'CLOSED'] as const;
export const CONNECTION_END_REASONS = [
  'LECTURER_ENDED',
  'BROWSER_CLOSED',
  'SECOND_USE',
  'REPLACED',
  'CLASS_ENDED',
  'SESSION_CANCELLED',
] as const;
export const BROWSER_KINDS = ['CHROME', 'EDGE', 'FIREFOX', 'SAFARI', 'OTHER'] as const;
export const OPERATING_SYSTEMS = [
  'WINDOWS',
  'MACOS',
  'LINUX',
  'CHROMEOS',
  'ANDROID',
  'IOS',
  'OTHER',
] as const;

// Identifiers.

const connectionIdSchema = v7IdSchema('ProjectionConnection');
const browserIdSchema = v7IdSchema('ProjectionBrowser');
const slotIdSchema = v7IdSchema('QrKeySlot');
const pairingCodeRowIdSchema = v7IdSchema('PairingCode');
const authSessionIdSchema = idSchema('AuthSession');

// Shared parts.

// A QR code shows a 5-second slice; slice numbers count from the Unix epoch.
export const DISPLAY_SLICE_MS = 5_000;
// 9999-12-31T23:59:59.999Z, the last instant the date schema allows.
const LAST_INSTANT_MS = 253_402_300_799_999;
// A lecturer's QR key slot, one of nine digits.
const slotSchema = z.number().int().min(1).max(9);
const PAIRING_CODE = /^[0-9]{6}$/;

// A location as the phone measured it (stage 3), in ten-thousandths of a degree.
const coordinates = {
  latitudeE4: z.number().int().min(-900_000).max(900_000),
  longitudeE4: z.number().int().min(-1_800_000).max(1_800_000),
  radiusM: z.number().int().min(0).max(100_000),
};
const locationFlags = {
  mockLocation: z.boolean(),
  simulated: z.boolean(),
  accessory: z.boolean(),
};
// The lecturer's location at approval or display: the reference for the students'.
export const locationReferenceSchema = z.object({ ...coordinates, ...locationFlags });

// The stage 2 and 3 fields of a signed attendance record text. The attendance contract
// adds them to its record text as optional fields; a field the phone does not send is
// absent. A sub-field that breaks its rule never drops the record: a broken code becomes
// the empty code, which verifies as MALFORMED (QR) or BACKUP_CODE_MISMATCH, and a broken
// scan or location reads as none (NO_BLUETOOTH, NO_LOCATION). The fallbacks are fresh
// objects per parse, so no caller shares one, and the document shows no default for them:
// an absent field is not its fallback.
const noScan = () => ({ status: 'NO_BLUETOOTH' as const, codes: [] });
const noLocation = () => ({ status: 'NO_LOCATION' as const });
const NO_DEFAULT = { default: undefined };
export const recordEvidenceFieldsSchema = z.object({
  qr: z.string().max(64).optional().catch('').meta(NO_DEFAULT),
  backupCode: z.string().max(16).optional().catch('').meta(NO_DEFAULT),
  qrCapable: z.boolean().optional().catch(undefined).meta(NO_DEFAULT),
  bluetooth: z
    .object({
      status: z.enum(BLUETOOTH_STATUSES),
      codes: z
        .array(
          z.object({
            code: z
              .string()
              .max(16)
              .regex(/^[0-9a-f]{16}$/),
            rssi: z.number().int().min(-127).max(20),
          }),
        )
        .max(32),
    })
    .refine((scan) => scan.status === 'SCANNED' || scan.codes.length === 0, {
      message: 'A phone without Bluetooth sends no codes',
      path: ['codes'],
    })
    .optional()
    .catch(noScan)
    .meta(NO_DEFAULT),
  location: z
    .object({
      status: z.enum(LOCATION_STATUSES),
      latitudeE4: coordinates.latitudeE4.optional(),
      longitudeE4: coordinates.longitudeE4.optional(),
      radiusM: coordinates.radiusM.optional(),
      mockLocation: locationFlags.mockLocation.optional(),
      simulated: locationFlags.simulated.optional(),
      accessory: locationFlags.accessory.optional(),
    })
    .refine(
      (location) =>
        [location.latitudeE4, location.longitudeE4, location.radiusM].every(
          (value) => (value !== undefined) === (location.status === 'RECEIVED'),
        ),
      { message: 'Coordinates come with RECEIVED, and only with it' },
    )
    .optional()
    .catch(noLocation)
    .meta(NO_DEFAULT),
});
export type RecordEvidenceFields = z.infer<typeof recordEvidenceFieldsSchema>;

// The QR result of one record, as the attendance answers carry it.
export const qrResultSchema = z.object({
  evidenceKind: extensibleEnum(EVIDENCE_KINDS),
  source: extensibleEnum(DISPLAY_SOURCES).nullable(),
  qrCapable: z.boolean(),
  verification: extensibleEnum(QR_VERIFICATION_RESULTS),
  delay: extensibleEnum(QR_DELAY_RESULTS).nullable(),
  slice: z.number().int().nullable(),
  delayLowMs: z.number().int().nullable(),
  delayHighMs: z.number().int().nullable(),
  studentMarginMs: z.number().int().nullable(),
  lecturerMarginMs: z.number().int().nullable(),
  bluetooth: z
    .object({ result: extensibleEnum(BLUETOOTH_RESULTS), bestRssi: z.number().int().nullable() })
    .nullable(),
  location: z
    .object({ result: extensibleEnum(LOCATION_RESULTS), weakSignal: z.boolean() })
    .nullable(),
});
export type QrResult = z.infer<typeof qrResultSchema>;

// Settings. The operations module builds the projection section from these defaults
// (projectionSettingsSchema.parse({})); the stage 2 switch is not here.
const setting = (value: number) => z.number().int().positive().default(value);
export const projectionSettingsSchema = z.object({
  normalLimitMs: setting(10_000),
  backupCodeNormalLimitMs: setting(20_000),
  rejectLimitMs: setting(30_000),
  projectionToleranceMs: setting(1_000),
  pairingCodeLifetimeMs: setting(5 * 60_000),
  approvalLeadMs: setting(15 * 60_000),
  wrongPairingLimit: setting(5),
  wrongPairingWindowMs: setting(10 * 60_000),
  newBrowsersPerAddress: setting(100),
  newBrowserWindowMs: setting(10 * 60_000),
  unboundBrowserCap: setting(200_000),
  previousSecretMs: setting(60_000),
  backupCodeSearchMs: setting(60_000),
  backupCodeWrongPerSession: setting(3),
  backupCodeWrongPerCourseTerm: setting(10),
  // The plan's ranges: a 10 to 15 second slice, a 2 to 3 minute broadcast.
  bluetoothSliceMs: z.number().int().min(10_000).max(15_000).default(15_000),
  bluetoothBroadcastMs: z.number().int().min(120_000).max(180_000).default(180_000),
  locationMarginM: setting(50),
  radiusLimitM: setting(100),
  impossibleSpeedKmh: setting(300),
});
export type ProjectionSettings = z.infer<typeof projectionSettingsSchema>;

// Error catalog. The lectern page and the lecturer read the staff text; the four codes
// with http null are display record item codes.

export const PROJECTION_ERROR_CODES = defineErrorCodes('projection', {
  PROJECTION_BROWSER_UNKNOWN: {
    http: 401,
    ...sameText(
      'Bu tarayıcı tanınmıyor; sayfayı yeniden açın.',
      'This browser is not recognized; open the page again.',
    ),
  },
  PROJECTION_BOUND: {
    http: 409,
    ...sameText(
      'Bu tarayıcı zaten bir derse bağlı.',
      'This browser is already connected to a class.',
    ),
  },
  PROJECTION_NEW_BROWSER_LIMIT: {
    http: 429,
    ...sameText(
      'Bu ağdan çok sayıda yeni sayfa açıldı; biraz sonra yeniden deneyin.',
      'Too many new pages were opened from this network; try again shortly.',
    ),
    retry: { fixed: 60 },
  },
  PROJECTION_CODE_INVALID: {
    http: 404,
    ...sameText(
      'Eşleştirme kodu geçersiz ya da süresi dolmuş.',
      'The pairing code is invalid or has expired.',
    ),
  },
  PROJECTION_CODE_USED: {
    http: 409,
    ...sameText(
      'Bu eşleştirme kodu daha önce kullanıldı; perdedeki yeni kodu okutun.',
      'This pairing code was already used; scan the new code on the screen.',
    ),
  },
  PROJECTION_ATTEMPT_LIMIT: {
    http: 429,
    ...sameText(
      'Çok sayıda yanlış kod girildi; biraz sonra yeniden deneyin.',
      'Too many wrong codes were entered; try again shortly.',
    ),
    retry: 'caller',
  },
  PROJECTION_NOT_FOUND: {
    http: 404,
    ...sameText('Aranan kayıt bulunamadı.', 'The requested item was not found.'),
  },
  PROJECTION_OUT_OF_TIME: {
    http: 409,
    ...sameText(
      'Bu ders saati için şimdi bağlantı onaylanamaz.',
      'A connection cannot be approved for this class session now.',
    ),
  },
  PROJECTION_NO_SLOT: {
    http: 409,
    ...sameText(
      'QR anahtarı için boş yer kalmadı; eski bir telefondan çıkış yapın.',
      'No QR key slot is free; sign out on an old phone.',
    ),
  },
  PROJECTION_PHONE_ONLY: {
    http: 403,
    ...sameText('Bu işlem yalnız telefondan yapılır.', 'This can only be done from the phone.'),
  },
  PROJECTION_DISPLAY_INVALID: {
    http: null,
    ...sameText('Gösterim kaydı okunamadı.', 'The display record could not be read.'),
  },
  PROJECTION_DISPLAY_SESSION: {
    http: null,
    ...sameText(
      'Gösterim kaydının ders saati bulunamadı ya da sizin dersiniz değil.',
      'The class session of the display record was not found or is not your class.',
    ),
  },
  PROJECTION_DISPLAY_CONFLICT: {
    http: null,
    ...sameText(
      'Bu gösterim kaydı başka bir içerikle zaten gönderilmiş.',
      'This display record was already sent with different content.',
    ),
  },
  PROJECTION_DISABLED: {
    http: null,
    ...sameText(
      'QR gösterimi henüz açılmadı; kayıt telefonda bekliyor.',
      'QR display is not open yet; the record waits on the phone.',
    ),
  },
});

export type ProjectionErrorCode = keyof typeof PROJECTION_ERROR_CODES;
const errors = (...codes: ProjectionErrorCode[]) => codes;

// Routes.

const connectionSummarySchema = z.object({
  id: connectionIdSchema,
  sessionId: sessionIdSchema,
  course: z.object({ code: z.string(), name: z.string() }),
  room: z.string().nullable(),
  browser: z.object({
    kind: extensibleEnum(BROWSER_KINDS),
    operatingSystem: extensibleEnum(OPERATING_SYSTEMS),
  }),
  approvedAt: instantSchema,
  status: extensibleEnum(CONNECTION_STATUSES),
  // Both null while the connection is open.
  endAt: instantSchema.nullable(),
  endReason: extensibleEnum(CONNECTION_END_REASONS).nullable(),
});

const lectern = { auth: ['projection'], rate: 'projection' } as const;
const lecturer = { auth: ['session'], roles: ['lecturer'], rate: 'session' } as const;

export const PROJECTION_ROUTES = {
  requestPairingCode: defineRoute({
    module: 'projection',
    name: 'requestPairingCode',
    method: 'POST',
    path: '/v1/projection/pairing-code',
    // A known browser cookie makes the caller that browser; otherwise a new one opens.
    auth: ['anonymous', 'projection'],
    rate: 'anonymous',
    request: {
      // {} asks for a new code; rotateSecret renews the browser's cookie secret.
      body: z.object({ rotateSecret: z.literal(true).optional() }),
    },
    response: {
      statuses: [201, 200],
      schema: z.union([
        z.object({
          code: z.string().regex(PAIRING_CODE),
          // The pairing QR's text: IUY:E1: and the six digits.
          qrContent: z.string().regex(/^IUY:E1:[0-9]{6}$/),
          expiresAt: instantSchema,
          serverTime: instantSchema,
        }),
        z.object({ secretRotated: z.literal(true), serverTime: instantSchema }),
      ]),
    },
    errors: errors(
      'PROJECTION_BOUND',
      'PROJECTION_BROWSER_UNKNOWN',
      'PROJECTION_NEW_BROWSER_LIMIT',
    ),
    summary: 'A new pairing code for the lectern page (201), or a renewed cookie secret (200).',
  }),
  getCodes: defineRoute({
    module: 'projection',
    name: 'getCodes',
    method: 'GET',
    path: '/v1/projection/codes',
    ...lectern,
    request: {},
    response: {
      statuses: [200],
      schema: z.object({
        status: extensibleEnum(LECTERN_STATUSES),
        closeReason: extensibleEnum(CONNECTION_END_REASONS).nullable(),
        // Connected and the secret not yet renewed on this connection: renew it now.
        secretRotationNeeded: z.boolean(),
        serverTime: instantSchema,
        // The page asks again no sooner than this.
        nextRequestMs: durationMsSchema,
        course: z
          .object({ code: z.string(), name: z.string(), room: z.string().nullable() })
          .nullable(),
        window: z
          .object({ openAt: instantSchema, closeAt: instantSchema, classEndAt: instantSchema })
          .nullable(),
        // Only while connected: from the current slice up to six ahead, before the close.
        codes: z
          .array(
            z.object({
              slice: z.number().int(),
              startAt: instantSchema,
              content: z.string().regex(/^[0-9]{41}$/),
            }),
          )
          .max(7),
      }),
    },
    errors: errors('PROJECTION_BROWSER_UNKNOWN'),
    summary: "The lectern page's state and the QR codes of the coming slices; read only.",
  }),
  closeBrowser: defineRoute({
    module: 'projection',
    name: 'closeBrowser',
    method: 'DELETE',
    path: '/v1/projection/browser',
    ...lectern,
    request: {},
    response: { statuses: [204], schema: null },
    errors: errors('PROJECTION_BROWSER_UNKNOWN'),
    summary: 'The lectern page closes its browser and the connection; the cookie is cleared.',
  }),
  approveConnection: defineRoute({
    module: 'projection',
    name: 'approveConnection',
    method: 'POST',
    path: '/v1/projection/approval',
    ...lecturer,
    request: {
      body: z.object({
        // The phone strips the IUY:E1: prefix; the code can also be typed.
        pairingCode: z.string().max(6).regex(PAIRING_CODE),
        sessionId: sessionIdSchema,
        // Stage 3 only: the lecturer's location at approval.
        reference: locationReferenceSchema.optional(),
      }),
    },
    response: {
      statuses: [201, 200],
      schema: z.object({ connection: connectionSummarySchema }),
    },
    errors: errors(
      'PROJECTION_CODE_INVALID',
      'PROJECTION_CODE_USED',
      'PROJECTION_ATTEMPT_LIMIT',
      'PROJECTION_NOT_FOUND',
      'PROJECTION_OUT_OF_TIME',
      'PROJECTION_PHONE_ONLY',
    ),
    summary: 'The lecturer approves a lectern page for a class session (201); a repeat gets 200.',
  }),
  listConnections: defineRoute({
    module: 'projection',
    name: 'listConnections',
    method: 'GET',
    path: '/v1/projection/connections',
    ...lecturer,
    request: {},
    response: {
      statuses: [200],
      // Open ones and those closed in the last 24 hours, newest approval first.
      schema: z.object({ connections: z.array(connectionSummarySchema).max(50) }),
    },
    errors: errors(),
    summary: "The lecturer's lectern connections.",
  }),
  endConnection: defineRoute({
    module: 'projection',
    name: 'endConnection',
    method: 'DELETE',
    path: '/v1/projection/connections/{connectionId}',
    ...lecturer,
    request: { params: z.object({ connectionId: connectionIdSchema }) },
    response: { statuses: [200], schema: z.object({ connection: connectionSummarySchema }) },
    errors: errors('PROJECTION_NOT_FOUND'),
    summary: 'The lecturer ends a connection; an ended one answers as it is.',
  }),
  issueQrKeys: defineRoute({
    module: 'projection',
    name: 'issueQrKeys',
    method: 'POST',
    path: '/v1/projection/qr-keys',
    ...lecturer,
    // The slot comes from the sign-in session, the days from the server clock.
    request: { body: z.object({}) },
    response: {
      statuses: [200],
      schema: z.object({
        slot: slotSchema,
        // Today and the next four UTC days.
        keys: z
          .array(
            z.object({
              day: z.number().int(),
              dayStartAt: instantSchema,
              slot: slotSchema,
              // A 32-byte HMAC-SHA256 key, base64.
              key: z.string().regex(BASE64_32_BYTES),
            }),
          )
          .max(5),
        serverTime: instantSchema,
      }),
    },
    errors: errors('PROJECTION_NO_SLOT', 'PROJECTION_PHONE_ONLY'),
    summary: "The phone's QR key slot and the day keys it derives the codes from.",
  }),
};

export type ProjectionRouteName = keyof typeof PROJECTION_ROUTES;

// The codes request as the load test calls it: a cookie, no body, and the answer field
// that sets the next request's delay.
export const CODES_REQUEST = {
  method: PROJECTION_ROUTES.getCodes.method,
  path: PROJECTION_ROUTES.getCodes.path,
  cookieName: COOKIES.projection,
  body: null,
  nextRequestField: 'nextRequestMs',
} as const;

// The display record queue item: the lecturer's phone reports when it showed the codes.
// The lecturer, the sign-in session, the arrival and the two anchors come from the queue
// package, not from the body.
export const DISPLAY_RECORD_ITEM = defineItemType(
  'display_record',
  z
    .object({
      sessionId: sessionIdSchema,
      kind: z.enum(DISPLAY_KINDS),
      slot: slotSchema,
      // The phone's estimate of the display start, Unix milliseconds, at most the last
      // millisecond of year 9999: within that range a timestamp column holds it and the
      // slice arithmetic below is exact.
      labelBaseMs: z.number().int().nonnegative().max(LAST_INSTANT_MS),
      // The phone's own counter, at most four hours.
      displayDurationMs: z
        .number()
        .int()
        .min(0)
        .max(4 * 60 * 60_000),
      firstSlice: z.number().int(),
      lastSlice: z.number().int(),
      // Only for Bluetooth: the broadcast slice in seconds.
      bluetoothSliceSeconds: z.number().int().min(10).max(15).nullable(),
      reference: locationReferenceSchema.nullable(),
    })
    .refine(
      (display) => display.firstSlice === Math.floor(display.labelBaseMs / DISPLAY_SLICE_MS),
      { message: 'The first slice follows from the label base', path: ['firstSlice'] },
    )
    .refine(
      (display) =>
        display.lastSlice ===
        Math.floor((display.labelBaseMs + display.displayDurationMs) / DISPLAY_SLICE_MS),
      { message: 'The last slice follows from the base and the duration', path: ['lastSlice'] },
    )
    .refine(
      (display) => (display.kind === 'BLUETOOTH') === (display.bluetoothSliceSeconds !== null),
      {
        message: 'A Bluetooth display has its slice, another has none',
        path: ['bluetoothSliceSeconds'],
      },
    ),
  { module: 'projection' },
);

// Audit events. The connection events name the session's term, unit, course and session in
// the envelope; the slot events name no course.

// Why a QR key slot ended: the sign-in session's close reasons (the identity module's,
// written here until its contract exists), DELETED, or SLOT_REASSIGNED when its digit
// went to another session.
export const SLOT_REVOKE_REASONS = [
  'LOGOUT',
  'SELF_CLOSED',
  'ADMIN',
  'OLDEST',
  'INACTIVE',
  'DELETED',
  'INCIDENT_COMMAND',
  'RESTORE',
  'REVIEW_ENDED',
  'SLOT_REASSIGNED',
] as const;
// The clock document's key id form.

export const PROJECTION_AUDIT_EVENTS = {
  'projection.connection_opened': z.strictObject({
    connectionId: connectionIdSchema,
    browserId: browserIdSchema,
    previousConnectionId: connectionIdSchema.nullable(),
  }),
  'projection.connection_closed': z.strictObject({
    connectionId: connectionIdSchema,
    reason: z.enum(CONNECTION_END_REASONS),
  }),
  'projection.second_use': z.strictObject({
    pairingCodeRowId: pairingCodeRowIdSchema,
    connectionId: connectionIdSchema,
    firstAuthSessionId: authSessionIdSchema,
    secondAuthSessionId: authSessionIdSchema,
  }),
  // repeat: a second renewal on the same connection, which also raises an alert.
  'projection.browser_secret_rotated': z.strictObject({
    browserId: browserIdSchema,
    connectionId: connectionIdSchema,
    repeat: z.boolean(),
  }),
  'projection.slot_assigned': z.strictObject({
    slotId: slotIdSchema,
    slot: slotSchema,
    authSessionId: authSessionIdSchema,
    releasedSlotId: slotIdSchema.nullable(),
  }),
  'projection.slot_revoked': z.strictObject({
    slotId: slotIdSchema,
    reason: z.enum(SLOT_REVOKE_REASONS),
  }),
  'projection.slot_transferred': z.strictObject({
    slotId: slotIdSchema,
    oldAuthSessionId: authSessionIdSchema,
    newAuthSessionId: authSessionIdSchema,
  }),
  // Only when a new day or key id was handed out.
  'projection.key_downloaded': z.strictObject({
    slotId: slotIdSchema,
    firstDay: z.number().int(),
    lastDay: z.number().int(),
    kid: z.string().max(8).regex(KEY_ID),
    newDayCount: countSchema,
  }),
  // The first time a sign-in session reaches the wrong pairing code limit.
  'projection.attempt_limit': z.strictObject({
    authSessionId: authSessionIdSchema,
    windowAt: instantSchema,
    wrongCount: z.number().int().positive(),
  }),
} as const satisfies Readonly<Record<string, z.ZodObject>>;

export type ProjectionAuditEvent = keyof typeof PROJECTION_AUDIT_EVENTS;
