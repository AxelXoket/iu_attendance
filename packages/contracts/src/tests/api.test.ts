import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  API_ERRORS,
  API_ROUTES,
  CHANGE_PENDING_ROUTES,
  CHANNEL_PLATFORMS,
  CHANNELS,
  type Channel,
  PLATFORMS,
  type Platform,
  THRESHOLD_DECISIONS,
  versionAnswerSchema,
} from '../api.ts';
import { DATABASE_ERROR_CODES } from '../database.ts';
import {
  API_ERROR_CODES,
  type ClientInfo,
  defineRoute,
  HEADERS,
  type RouteDefinition,
} from '../shared/index.ts';

describe('the api error catalog', () => {
  it('holds the fourteen codes of the shared list, with their status and retry rule', () => {
    expect(Object.keys(API_ERRORS)).toEqual([...API_ERROR_CODES]);
    expect(
      Object.fromEntries(Object.entries(API_ERRORS).map(([code, { http }]) => [code, http])),
    ).toEqual({
      API_INVALID_REQUEST: 400,
      API_INVALID_JSON: 400,
      API_AUTH_REQUIRED: 401,
      API_ROLE_FORBIDDEN: 403,
      API_INVALID_ORIGIN: 403,
      API_ENDPOINT_NOT_FOUND: 404,
      API_BODY_TOO_LARGE: 413,
      API_UNSUPPORTED_CONTENT_TYPE: 415,
      API_RESULT_TOO_LARGE: 422,
      API_RATE_LIMIT: 429,
      API_SERVER_ERROR: 500,
      API_SERVER_BUSY: 503,
      API_QUERY_TIMEOUT: 503,
      API_VERSION_INFO_MISSING: 503,
    });
    const retries = Object.entries(API_ERRORS).flatMap(([code, definition]) =>
      'retry' in definition ? [[code, definition.retry]] : [],
    );
    expect(Object.fromEntries(retries)).toEqual({
      API_RATE_LIMIT: 'caller',
      API_SERVER_BUSY: { range: [15, 45] },
      API_QUERY_TIMEOUT: { range: [15, 45] },
      API_VERSION_INFO_MISSING: { fixed: 60 },
    });
  });

  it('writes texts in both languages without digits or placeholders', () => {
    for (const [code, definition] of Object.entries(API_ERRORS)) {
      for (const text of [definition.lecturer, definition.student]) {
        expect(Object.keys(text), code).toEqual(['tr', 'en']);
        for (const value of Object.values(text)) expect(value, code).not.toMatch(/[0-9{}]/);
      }
    }
    expect(API_ERRORS.API_INVALID_REQUEST.lecturer.en).toBe(
      'Some fields in the request are invalid.',
    );
  });

  it("lends its busy text and wait to the database module's transient codes", () => {
    const busy = API_ERRORS.API_SERVER_BUSY;
    for (const code of [
      'DATABASE_CONTENTION',
      'DATABASE_POOL_FULL',
      'DATABASE_UNAVAILABLE',
      'DATABASE_TIMEOUT',
      'DATABASE_GENERATION_UNCERTAIN',
    ] as const) {
      expect(DATABASE_ERROR_CODES[code]).toMatchObject({
        lecturer: busy.lecturer,
        student: busy.student,
        retry: busy.retry,
      });
    }
  });
});

describe('platforms, channels and threshold decisions', () => {
  it('give android play and github, and ios appstore and testflight', () => {
    expect(PLATFORMS).toEqual(['android', 'ios']);
    expect(CHANNELS).toEqual(['play', 'github', 'appstore', 'testflight']);
    expect(CHANNEL_PLATFORMS).toEqual({
      play: 'android',
      github: 'android',
      appstore: 'ios',
      testflight: 'ios',
    });
    expect(THRESHOLD_DECISIONS).toEqual(['applied', 'deferred']);
    // The root hook's client info uses the same lists.
    expectTypeOf<NonNullable<ClientInfo['platform']>>().toEqualTypeOf<Platform>();
    expectTypeOf<NonNullable<ClientInfo['channel']>>().toEqualTypeOf<Channel>();
  });

  it('name the four routes a session waiting for a device change may use', () => {
    expect(CHANGE_PENDING_ROUTES.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'GET /v1/identity/me',
      'POST /v1/identity/logout',
      'POST /v1/identity/device-change',
      'POST /v1/identity/device-change/{requestId}/reject',
    ]);
  });
});

describe('the version route', () => {
  const route = API_ROUTES.getVersion;
  const headers = route.request.headers;
  // Header names as the server reads them: lower case.
  const name = {
    platform: HEADERS.platform.toLowerCase(),
    channel: HEADERS.channel.toLowerCase(),
    appVersion: HEADERS.appVersion.toLowerCase(),
    installId: HEADERS.installId.toLowerCase(),
    updateId: HEADERS.updateId.toLowerCase(),
  };
  const valid: Record<string, string> = {
    [name.platform]: 'android',
    [name.channel]: 'github',
    [name.appVersion]: '1.4.0',
    [name.installId]: '01890a5d-ac96-7000-8000-000000000001',
    [name.updateId]: '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e',
  };

  it('is the anonymous GET /v1/version that may write on read', () => {
    expect(defineRoute(route as RouteDefinition)).toBe(route);
    expect(`${route.method} ${route.path}`).toBe('GET /v1/version');
    expect([route.auth, route.rate, route.writesOnRead, route.errors]).toEqual([
      ['anonymous'],
      'anonymous',
      true,
      [],
    ]);
    expect(Object.keys(API_ROUTES)).toEqual(['getVersion']);
  });

  it('reads the phone headers, refusing a channel of another platform', () => {
    expect(headers.parse({ ...valid, 'x-other': '1' })).toEqual(valid);
    for (const [platform, channel] of [
      ['ios', 'appstore'],
      ['ios', 'testflight'],
      ['android', 'play'],
    ] as const) {
      const pair = { ...valid, [name.platform]: platform, [name.channel]: channel };
      expect(headers.safeParse(pair).success, channel).toBe(true);
    }
    const mismatch = headers.safeParse({ ...valid, [name.platform]: 'ios' });
    expect(mismatch.error?.issues.map((issue) => issue.path)).toEqual([[name.channel]]);
    for (const required of [name.platform, name.channel, name.appVersion]) {
      const missing = Object.fromEntries(Object.entries(valid).filter(([key]) => key !== required));
      expect(headers.safeParse(missing).success, required).toBe(false);
    }
    for (const [header, value] of [
      [name.appVersion, '1.4'],
      [name.platform, 'web'],
      [name.channel, 'store'],
    ] as const) {
      expect(headers.safeParse({ ...valid, [header]: value }).success, `${header} ${value}`).toBe(
        false,
      );
    }
  });

  it('treats a missing or broken installation or update id as absent, never as a refusal', () => {
    const required = Object.fromEntries(
      Object.entries(valid).filter(([header]) => ![name.installId, name.updateId].includes(header)),
    );
    expect(headers.parse(required)).toEqual(required);
    const read = (value: Record<string, string>) =>
      headers.parse(value) as Record<string, string | undefined>;
    const broken = read({ ...valid, [name.installId]: 'x', [name.updateId]: 'y' });
    expect([broken[name.installId], broken[name.updateId]]).toEqual([undefined, undefined]);
    // A UUID of another version is no installation id.
    const v4 = read({ ...valid, [name.installId]: '0192f5c4-7d2a-4b3c-8d4e-5f6a7b8c9d0e' });
    expect(v4[name.installId]).toBeUndefined();
  });

  it('answers the versions and links, with the migration link only when there is one', () => {
    const answer = {
      latestVersion: '1.4.1',
      minimumVersion: '1.2.0',
      updateAvailable: true,
      updateRequired: false,
      storeLink: 'https://github.com/example/attendance/releases/latest',
      migrationLink: null,
    };
    expect(versionAnswerSchema.parse({ ...answer, later: 1 })).toEqual(answer);
    expect(
      versionAnswerSchema.safeParse({ ...answer, migrationLink: 'https://apps.apple.com/app/id1' })
        .success,
    ).toBe(true);
    for (const link of [
      'http://example.com',
      'HTTPS://example.com',
      'https:example.com',
      'https:/example.com',
      'https:///example.com',
      'https://user:pw@example.com',
      'https://example.com/a b',
      ' https://example.com',
      'https://example.com\n',
      'https://',
      `https://example.com/${'a'.repeat(2048)}`,
    ]) {
      expect(versionAnswerSchema.safeParse({ ...answer, storeLink: link }).success, link).toBe(
        false,
      );
      expect(versionAnswerSchema.safeParse({ ...answer, migrationLink: link }).success, link).toBe(
        false,
      );
    }
  });

  it('documents every header text with its maximum length', () => {
    const document = z.toJSONSchema(headers, { io: 'input' }) as {
      properties: Record<string, { maxLength?: number; enum?: unknown }>;
    };
    for (const [header, property] of Object.entries(document.properties)) {
      expect(property.maxLength !== undefined || property.enum !== undefined, header).toBe(true);
    }
    expect(document.properties[name.installId]?.maxLength).toBe(36);
    expect(document.properties[name.updateId]?.maxLength).toBe(36);
  });
});
