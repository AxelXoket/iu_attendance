// API contract (D13): the api module's own error catalog, the version route, the routes a
// session waiting for a device change may use, the platform, channel and threshold
// decision lists, the version answer and the release info file. The release info is
// strict on purpose, against the strip rule of requests: CI writes the file (D15) and the
// server only reads it, so a wrong or old field name must fail at startup and in D15's
// source check rather than be dropped.
import { z } from 'zod';
import {
  compareVersions,
  defineErrorCodes,
  defineRoute,
  HEADERS,
  instantSchema,
  parseVersion,
  sameText,
  UUID_LENGTH,
  versionSchema,
} from './shared/index.ts';

// Error catalog. Every route may answer these codes, so no route lists them. The texts
// are the same for staff and students. The name is the spec's; the plain list of these
// codes for the error envelope is the shared API_ERROR_CODES.

const BUSY = { range: [15, 45] } as const;

export const API_ERRORS = defineErrorCodes('api', {
  API_INVALID_REQUEST: {
    http: 400,
    ...sameText('İstekteki bazı alanlar geçersiz.', 'Some fields in the request are invalid.'),
  },
  API_INVALID_JSON: {
    http: 400,
    ...sameText('İstek okunamadı.', 'The request could not be read.'),
  },
  API_AUTH_REQUIRED: {
    http: 401,
    ...sameText('Bu işlem için giriş gerekiyor.', 'You need to sign in for this action.'),
  },
  API_ROLE_FORBIDDEN: {
    http: 403,
    ...sameText('Bu işlem için yetkiniz yok.', 'You are not allowed to do this.'),
  },
  API_INVALID_ORIGIN: {
    http: 403,
    ...sameText(
      'İstek bu panelden gelmedi; sayfayı yenileyip yeniden deneyin.',
      'This request did not come from this panel; refresh the page and try again.',
    ),
  },
  API_ENDPOINT_NOT_FOUND: {
    http: 404,
    ...sameText(
      'İstenen adres bulunamadı; sayfayı yenileyin.',
      'The requested address was not found; refresh the page.',
    ),
  },
  API_BODY_TOO_LARGE: {
    http: 413,
    ...sameText('Gönderilen veri çok büyük.', 'The data sent is too large.'),
  },
  API_UNSUPPORTED_CONTENT_TYPE: {
    http: 415,
    ...sameText('İstek biçimi desteklenmiyor.', 'This request format is not supported.'),
  },
  API_RESULT_TOO_LARGE: {
    http: 422,
    ...sameText('Sonuç çok büyük; aralığı daraltın.', 'The result is too large; narrow the range.'),
  },
  // The rest of the rate window, which the thrower supplies.
  API_RATE_LIMIT: {
    http: 429,
    ...sameText(
      'Çok sık istek gönderildi; biraz sonra yeniden deneyin.',
      'Too many requests were sent; try again shortly.',
    ),
    retry: 'caller',
  },
  API_SERVER_ERROR: {
    http: 500,
    ...sameText('Beklenmeyen bir hata oldu.', 'An unexpected error occurred.'),
  },
  API_SERVER_BUSY: {
    http: 503,
    ...sameText(
      'Sunucu şu an yoğun; birazdan yeniden denenecek.',
      'The server is busy right now; it will be retried shortly.',
    ),
    retry: BUSY,
  },
  API_QUERY_TIMEOUT: {
    http: 503,
    ...sameText(
      'İşlem çok uzun sürdü; aralığı daraltıp yeniden deneyin.',
      'The operation took too long; narrow the range and try again.',
    ),
    retry: BUSY,
  },
  API_VERSION_INFO_MISSING: {
    http: 503,
    ...sameText(
      'Sürüm bilgisi şu an alınamıyor.',
      'Version information is not available right now.',
    ),
    retry: { fixed: 60 },
  },
});

export type ApiErrorCode = keyof typeof API_ERRORS;

// Platforms and channels: android ships on play and github, ios on appstore and
// testflight. The thresholds table's CHECKs use the same lists.
export const PLATFORMS = ['android', 'ios'] as const;
export const CHANNELS = ['play', 'github', 'appstore', 'testflight'] as const;
export type Platform = (typeof PLATFORMS)[number];
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_PLATFORMS = {
  play: 'android',
  github: 'android',
  appstore: 'ios',
  testflight: 'ios',
} as const satisfies Record<Channel, Platform>;
// A threshold row: applied, or written ahead and deferred until its shared term break.
export const THRESHOLD_DECISIONS = ['applied', 'deferred'] as const;

// The routes a session waiting for a device change may use; only identity routes can
// declare it, and the route table test compares this set with theirs.
export const CHANGE_PENDING_ROUTES = [
  { method: 'GET', path: '/v1/identity/me' },
  { method: 'POST', path: '/v1/identity/logout' },
  { method: 'POST', path: '/v1/identity/device-change' },
  { method: 'POST', path: '/v1/identity/device-change/{requestId}/reject' },
] as const satisfies readonly { method: 'GET' | 'POST'; path: string }[];

// An https address with a host and no user part, taken exactly as written: the text is
// checked, never trimmed or repaired, because the phone opens it as it is.
export const httpsUrlSchema = z
  .string()
  .max(2048)
  .regex(/^https:\/\/[^\s/?#@]+(?:[/?#]\S*)?$/);
const lower = <const T extends string>(name: T) => name.toLowerCase() as Lowercase<T>;

// The version route. The phone asks at most once a day, with the update check. The two
// ids are only noted: a broken one reads as absent, never a refusal.
const versionHeadersSchema = z
  .object({
    [lower(HEADERS.platform)]: z.enum(PLATFORMS),
    [lower(HEADERS.channel)]: z.enum(CHANNELS),
    [lower(HEADERS.appVersion)]: versionSchema,
    // Without it (before sign-in) or broken, the phone is outside the github stages.
    [lower(HEADERS.installId)]: z.uuidv7().max(UUID_LENGTH).optional().catch(undefined),
    // Written to the request log only.
    [lower(HEADERS.updateId)]: z.uuid().max(UUID_LENGTH).optional().catch(undefined),
  })
  .refine(
    (headers) =>
      CHANNEL_PLATFORMS[headers[lower(HEADERS.channel)]] === headers[lower(HEADERS.platform)],
    { message: 'The channel is not one of the platform', path: [lower(HEADERS.channel)] },
  );

export const versionAnswerSchema = z.object({
  latestVersion: versionSchema,
  // The minimum applied; a deferred raise does not show here.
  minimumVersion: versionSchema,
  // The phone is in the stage and the latest version is newer than its own.
  updateAvailable: z.boolean(),
  // Its version is below the minimum, whatever the stage.
  updateRequired: z.boolean(),
  storeLink: httpsUrlSchema,
  // TestFlight only.
  migrationLink: httpsUrlSchema.nullable(),
});
export type VersionAnswer = z.infer<typeof versionAnswerSchema>;

export const API_ROUTES = {
  getVersion: defineRoute({
    module: 'api',
    name: 'getVersion',
    method: 'GET',
    path: '/v1/version',
    auth: ['anonymous'],
    rate: 'anonymous',
    // Reading may apply a deferred threshold whose term break has come.
    writesOnRead: true,
    request: { headers: versionHeadersSchema },
    response: { statuses: [200], schema: versionAnswerSchema },
    // Its codes are this module's own, which every route may answer.
    errors: [],
    summary: 'The latest and minimum app version for the phone, and whether it must update.',
  }),
};

// The release info file.

const stageSchema = z.strictObject({
  start: instantSchema,
  percent: z.number().int().min(0).max(100),
});

const channelEntrySchema = z
  .strictObject({
    platform: z.enum(PLATFORMS),
    channel: z.enum(CHANNELS),
    latestVersion: versionSchema,
    minimumVersion: versionSchema,
    storeLink: httpsUrlSchema,
    migrationLink: httpsUrlSchema.nullable(),
    // A github rollout: from each start, the percent of installations that get the latest.
    stages: z.array(stageSchema).max(10),
  })
  .refine((entry) => CHANNEL_PLATFORMS[entry.channel] === entry.platform, {
    message: 'The channel is not one of the platform',
    path: ['channel'],
  })
  // A version that is no version has its own issue already and is never compared.
  .refine(
    (entry) =>
      parseVersion(entry.minimumVersion) === null ||
      parseVersion(entry.latestVersion) === null ||
      compareVersions(entry.minimumVersion, entry.latestVersion) <= 0,
    { message: 'The minimum version is above the latest', path: ['minimumVersion'] },
  )
  .refine((entry) => entry.channel === 'testflight' || entry.migrationLink === null, {
    message: 'Only testflight has a migration link',
    path: ['migrationLink'],
  })
  .refine((entry) => entry.channel === 'github' || entry.stages.length === 0, {
    message: 'Only github has stages',
    path: ['stages'],
  })
  .refine(
    (entry) =>
      entry.stages.every((stage, index) => {
        const previous = entry.stages[index - 1];
        return (
          previous === undefined ||
          (previous.start < stage.start && previous.percent <= stage.percent)
        );
      }),
    { message: 'Stage starts increase and percents never fall', path: ['stages'] },
  );

const faultyVersionSchema = z.strictObject({
  platform: z.enum(PLATFORMS),
  appVersion: versionSchema,
  updateId: z.uuid().nullable(),
  startAt: instantSchema,
  reason: z.string().min(1).max(200),
});

export const releaseInfoSchema = z.strictObject({
  format: z.literal(1),
  sequence: z.number().int().min(1),
  createdAt: instantSchema,
  // Each of the four platform and channel pairs exactly once.
  channels: z
    .array(channelEntrySchema)
    .length(CHANNELS.length)
    .refine((entries) => new Set(entries.map((entry) => entry.channel)).size === CHANNELS.length, {
      message: 'Each channel exactly once',
    }),
  faultyVersions: z.array(faultyVersionSchema).max(100),
  // What the values mean is the verification module's (D07).
  iosBundleVersions: z.array(z.string().min(1).max(64)).max(500),
  iosDistributionKinds: z
    .array(
      z
        .string()
        .max(32)
        .regex(/^[a-z-]+$/),
    )
    .max(10),
});

export type ReleaseInfo = z.infer<typeof releaseInfoSchema>;
export type ChannelEntry = z.infer<typeof channelEntrySchema>;
export type FaultyVersion = z.infer<typeof faultyVersionSchema>;
