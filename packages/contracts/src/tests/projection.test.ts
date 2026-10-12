import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CODES_REQUEST,
  DISPLAY_RECORD_ITEM,
  DISPLAY_SLICE_MS,
  PROJECTION_AUDIT_EVENTS,
  PROJECTION_ERROR_CODES,
  PROJECTION_ROUTES,
  projectionSettingsSchema,
  QR_DELAY_RESULTS,
  QR_VERIFICATION_RESULTS,
  qrResultSchema,
  recordEvidenceFieldsSchema,
  SLOT_REVOKE_REASONS,
} from '../projection.ts';
import { COOKIES, defineRoute, type RouteDefinition } from '../shared/index.ts';
import { id, ok } from './helpers.ts';
import { extensibleEnumsIn, objectsIn, unknownKeys } from './schema-walk.ts';

const routes = Object.entries(PROJECTION_ROUTES) as [string, RouteDefinition][];
const at = '2026-10-12T08:00:00.000Z';

// The seven endpoints of the spec: method and path, auth, roles, rate class, errors.
const SPEC = {
  requestPairingCode: [
    'POST /v1/projection/pairing-code',
    ['anonymous', 'projection'],
    undefined,
    'anonymous',
    ['PROJECTION_BOUND', 'PROJECTION_BROWSER_UNKNOWN', 'PROJECTION_NEW_BROWSER_LIMIT'],
  ],
  getCodes: [
    'GET /v1/projection/codes',
    ['projection'],
    undefined,
    'projection',
    ['PROJECTION_BROWSER_UNKNOWN'],
  ],
  closeBrowser: [
    'DELETE /v1/projection/browser',
    ['projection'],
    undefined,
    'projection',
    ['PROJECTION_BROWSER_UNKNOWN'],
  ],
  approveConnection: [
    'POST /v1/projection/approval',
    ['session'],
    ['lecturer'],
    'session',
    [
      'PROJECTION_CODE_INVALID',
      'PROJECTION_CODE_USED',
      'PROJECTION_ATTEMPT_LIMIT',
      'PROJECTION_NOT_FOUND',
      'PROJECTION_OUT_OF_TIME',
      'PROJECTION_PHONE_ONLY',
    ],
  ],
  listConnections: ['GET /v1/projection/connections', ['session'], ['lecturer'], 'session', []],
  endConnection: [
    'DELETE /v1/projection/connections/{connectionId}',
    ['session'],
    ['lecturer'],
    'session',
    ['PROJECTION_NOT_FOUND'],
  ],
  issueQrKeys: [
    'POST /v1/projection/qr-keys',
    ['session'],
    ['lecturer'],
    'session',
    ['PROJECTION_NO_SLOT', 'PROJECTION_PHONE_ONLY'],
  ],
} as const;

describe('projection routes', () => {
  it('are the seven spec endpoints with their auth, roles, rate classes and error answers', () => {
    expect(routes.map(([key]) => key)).toEqual(Object.keys(SPEC));
    for (const [key, route] of routes) {
      const [endpoint, auth, roles, rate, routeErrors] = SPEC[key as keyof typeof SPEC];
      expect(defineRoute(route)).toBe(route);
      expect(route.name).toBe(key);
      expect(route.module).toBe('projection');
      expect(`${route.method} ${route.path}`, key).toBe(endpoint);
      expect(route.auth, key).toEqual(auth);
      expect(route.roles, key).toEqual(roles);
      expect(route.rate, key).toBe(rate);
      expect(route.errors, key).toEqual(routeErrors);
    }
    // 201 for a new code or connection, 200 for its repeat; 204 when the page closes.
    const statuses = Object.fromEntries(
      routes.map(([key, route]) => [key, route.response.statuses]),
    );
    expect(statuses).toEqual({
      requestPairingCode: [201, 200],
      getCodes: [200],
      closeBrowser: [204],
      approveConnection: [201, 200],
      listConnections: [200],
      endConnection: [200],
      issueQrKeys: [200],
    });
  });

  it('take an empty body or a secret renewal for a pairing code, and answer either', () => {
    const route = PROJECTION_ROUTES.requestPairingCode;
    expect(ok(route.request.body, {})).toBe(true);
    expect(ok(route.request.body, { rotateSecret: true })).toBe(true);
    expect(ok(route.request.body, { rotateSecret: false })).toBe(false);
    expect(route.response.statuses).toEqual([201, 200]);
    const code = { code: '482913', qrContent: 'IUY:E1:482913', expiresAt: at, serverTime: at };
    expect(ok(route.response.schema, code)).toBe(true);
    expect(ok(route.response.schema, { secretRotated: true, serverTime: at })).toBe(true);
    for (const bad of [
      { ...code, code: '48291' },
      { ...code, qrContent: 'IUY:E2:482913' },
    ]) {
      expect(ok(route.response.schema, bad)).toBe(false);
    }
  });

  it('take a six-digit pairing code and an optional location reference for an approval', () => {
    const body = PROJECTION_ROUTES.approveConnection.request.body;
    const approval = { pairingCode: '012345', sessionId: id(1) };
    expect(ok(body, approval)).toBe(true);
    for (const pairingCode of ['12345', '1234567', 'IUY:E1:012345', '01234a']) {
      expect(ok(body, { ...approval, pairingCode }), pairingCode).toBe(false);
    }
    const reference = {
      latitudeE4: 410_000,
      longitudeE4: 289_000,
      radiusM: 15,
      mockLocation: false,
      simulated: false,
      accessory: false,
    };
    expect(ok(body, { ...approval, reference })).toBe(true);
    expect(ok(body, { ...approval, reference: { ...reference, latitudeE4: 900_001 } })).toBe(false);
    expect(ok(body, { ...approval, reference: { ...reference, radiusM: 100_001 } })).toBe(false);
  });

  it('answer the codes, a connection and the QR keys in their shapes', () => {
    const codes = PROJECTION_ROUTES.getCodes.response.schema;
    const state = {
      status: 'CONNECTED',
      closeReason: null,
      secretRotationNeeded: false,
      serverTime: at,
      nextRequestMs: 10_000,
      course: { code: 'FIZ 101', name: 'Fizik', room: null },
      window: { openAt: at, closeAt: at, classEndAt: at },
      codes: [{ slice: 352_003_200, startAt: at, content: '1'.repeat(41) }],
    };
    expect(ok(codes, state)).toBe(true);
    expect(ok(codes, { ...state, codes: [{ ...state.codes[0], content: '1'.repeat(40) }] })).toBe(
      false,
    );
    expect(
      ok(codes, { ...state, status: 'A_STATUS_ADDED_LATER', course: null, window: null }),
    ).toBe(true);
    const connection = {
      id: id(5),
      sessionId: id(1),
      course: { code: 'FIZ 101', name: 'Fizik' },
      room: 'D-101',
      browser: { kind: 'CHROME', operatingSystem: 'WINDOWS' },
      approvedAt: at,
      status: 'OPEN',
      endAt: null,
      endReason: null,
    };
    expect(
      ok(PROJECTION_ROUTES.listConnections.response.schema, { connections: [connection] }),
    ).toBe(true);
    // A connection in a room-less session, and the page's next request right away.
    expect(
      ok(PROJECTION_ROUTES.endConnection.response.schema, {
        connection: { ...connection, room: null },
      }),
    ).toBe(true);
    expect(ok(codes, { ...state, nextRequestMs: 0 })).toBe(true);
    expect(ok(codes, { ...state, nextRequestMs: -1 })).toBe(false);
    const list = (count: number) => Array.from({ length: count }, () => connection);
    const connections = PROJECTION_ROUTES.listConnections.response.schema;
    expect(ok(connections, { connections: list(50) })).toBe(true);
    expect(ok(connections, { connections: list(51) })).toBe(false);
    const keys = PROJECTION_ROUTES.issueQrKeys.response.schema;
    const key = { day: 20_738, dayStartAt: at, slot: 3, key: `${'A'.repeat(43)}=` };
    expect(ok(keys, { slot: 3, keys: [key], serverTime: at })).toBe(true);
    expect(ok(keys, { slot: 10, keys: [key], serverTime: at })).toBe(false);
    // Today and four days ahead; the current slice and six ahead.
    const fiveDays = Array.from({ length: 5 }, () => key);
    expect(ok(keys, { slot: 3, keys: fiveDays, serverTime: at })).toBe(true);
    expect(ok(keys, { slot: 3, keys: [...fiveDays, key], serverTime: at })).toBe(false);
    const sevenCodes = Array.from({ length: 7 }, () => state.codes[0]);
    expect(ok(codes, { ...state, codes: sevenCodes })).toBe(true);
    expect(ok(codes, { ...state, codes: [...sevenCodes, state.codes[0]] })).toBe(false);
    expect(ok(keys, { slot: 3, keys: [{ ...key, key: 'A'.repeat(44) }], serverTime: at })).toBe(
      false,
    );
    expect(PROJECTION_ROUTES.closeBrowser.response).toEqual({ statuses: [204], schema: null });
  });
});

describe('projection error catalog', () => {
  const codes = Object.entries(PROJECTION_ERROR_CODES);

  it('has fourteen codes, retries the two limits and keeps the four item codes off the routes', () => {
    expect(codes).toHaveLength(14);
    expect(Object.fromEntries(codes.map(([code, definition]) => [code, definition.http]))).toEqual({
      PROJECTION_BROWSER_UNKNOWN: 401,
      PROJECTION_BOUND: 409,
      PROJECTION_NEW_BROWSER_LIMIT: 429,
      PROJECTION_CODE_INVALID: 404,
      PROJECTION_CODE_USED: 409,
      PROJECTION_ATTEMPT_LIMIT: 429,
      PROJECTION_NOT_FOUND: 404,
      PROJECTION_OUT_OF_TIME: 409,
      PROJECTION_NO_SLOT: 409,
      PROJECTION_PHONE_ONLY: 403,
      PROJECTION_DISPLAY_INVALID: null,
      PROJECTION_DISPLAY_SESSION: null,
      PROJECTION_DISPLAY_CONFLICT: null,
      PROJECTION_DISABLED: null,
    });
    expect(PROJECTION_ERROR_CODES.PROJECTION_NEW_BROWSER_LIMIT).toMatchObject({
      http: 429,
      retry: { fixed: 60 },
    });
    expect(PROJECTION_ERROR_CODES.PROJECTION_ATTEMPT_LIMIT).toMatchObject({
      http: 429,
      retry: 'caller',
    });
    const itemCodes = codes.filter(([, definition]) => definition.http === null).map(([c]) => c);
    expect(itemCodes.sort()).toEqual(
      [
        'PROJECTION_DISABLED',
        'PROJECTION_DISPLAY_CONFLICT',
        'PROJECTION_DISPLAY_INVALID',
        'PROJECTION_DISPLAY_SESSION',
      ].sort(),
    );
  });

  it('gives every code texts in both languages, without digits or placeholders', () => {
    for (const [code, definition] of codes) {
      for (const text of [definition.lecturer, definition.student]) {
        for (const value of Object.values(text ?? {})) expect(value, code).not.toMatch(/[0-9{}]/);
        expect(Object.keys(text ?? {}), code).toEqual(['tr', 'en']);
      }
    }
  });
});

describe('projection result dictionaries', () => {
  it('are unique upper case codes, the source of the QR result values', () => {
    expect(QR_VERIFICATION_RESULTS).toHaveLength(12);
    expect(QR_DELAY_RESULTS).toHaveLength(11);
    for (const values of [QR_VERIFICATION_RESULTS, QR_DELAY_RESULTS]) {
      expect(new Set(values).size).toBe(values.length);
      for (const value of values) expect(value).toMatch(/^[A-Z]+(?:_[A-Z]+)*$/);
    }
    // Each field carries its own list.
    const known = (schema: z.ZodType) =>
      extensibleEnumsIn(schema)[0]?.meta()?.['x-extensible-enum'];
    expect(known(qrResultSchema.shape.verification)).toEqual([...QR_VERIFICATION_RESULTS]);
    expect(known(qrResultSchema.shape.delay)).toEqual([...QR_DELAY_RESULTS]);
  });

  it('never imports the verification contract: the dictionary runs one way', () => {
    const imports = (source: string) =>
      ts.preProcessFile(source, true, true).importedFiles.map((file) => file.fileName);
    // The verification contract in any spelling the resolvers accept: relative, or through
    // the package's own name.
    const isVerification = (path: string) =>
      /^(?:\.{1,2}\/(?:.*\/)?|@iu-attendance\/contracts\/)verification(?:\/index)?(?:\.(?:ts|js|mts|mjs))?$/.test(
        path,
      );
    for (const spelling of [
      './verification',
      './verification.ts',
      './verification.js',
      './verification/index.ts',
      '../src/verification.mjs',
      '@iu-attendance/contracts/verification',
    ]) {
      expect(isVerification(spelling), spelling).toBe(true);
    }
    expect(isVerification('./verification-notes.ts')).toBe(false);
    // The file next to this test, wherever the tests run from; TypeScript reads it, since
    // the contracts package carries no Node types.
    const path = decodeURIComponent(new URL('../projection.ts', import.meta.url).pathname);
    const source = ts.sys.readFile(path.replace(/^\/([A-Za-z]:)/, '$1')) ?? '';
    // Ground control: the parser sees the file's real imports.
    expect(imports(source)).toContain('./shared/index.ts');
    expect(imports(source).filter(isVerification)).toEqual([]);
    // Positive control: an added import of the verification contract is caught.
    const added = `import { DECISIONS } from './verification.ts';\n${source}`;
    expect(imports(added).filter(isVerification)).toEqual(['./verification.ts']);
  });

  it('parse a QR result with values added later', () => {
    const result = {
      evidenceKind: 'QR',
      source: 'PROJECTION',
      qrCapable: true,
      verification: 'VALID',
      delay: 'NORMAL',
      slice: 352_003_200,
      delayLowMs: 1_200,
      delayHighMs: 2_400,
      studentMarginMs: 300,
      lecturerMarginMs: 200,
      bluetooth: null,
      location: { result: 'NEAR', weakSignal: false },
    };
    expect(ok(qrResultSchema, result)).toBe(true);
    expect(ok(qrResultSchema, { ...result, verification: 'A_RESULT_ADDED_LATER' })).toBe(true);
    // A record without QR evidence: no source, slice, delay or margins.
    const none = {
      ...result,
      evidenceKind: 'NONE',
      source: null,
      verification: 'NONE',
      delay: null,
      slice: null,
      delayLowMs: null,
      delayHighMs: null,
      studentMarginMs: null,
      lecturerMarginMs: null,
      bluetooth: { result: 'PENDING', bestRssi: null },
      location: null,
    };
    expect(ok(qrResultSchema, none)).toBe(true);
  });
});

describe('projection settings and the codes request', () => {
  it('fill every setting with the spec default', () => {
    expect(projectionSettingsSchema.parse({})).toEqual({
      normalLimitMs: 10_000,
      backupCodeNormalLimitMs: 20_000,
      rejectLimitMs: 30_000,
      projectionToleranceMs: 1_000,
      pairingCodeLifetimeMs: 300_000,
      approvalLeadMs: 900_000,
      wrongPairingLimit: 5,
      wrongPairingWindowMs: 600_000,
      newBrowsersPerAddress: 100,
      newBrowserWindowMs: 600_000,
      unboundBrowserCap: 200_000,
      previousSecretMs: 60_000,
      backupCodeSearchMs: 60_000,
      backupCodeWrongPerSession: 3,
      backupCodeWrongPerCourseTerm: 10,
      bluetoothSliceMs: 15_000,
      bluetoothBroadcastMs: 180_000,
      locationMarginM: 50,
      radiusLimitM: 100,
      impossibleSpeedKmh: 300,
    });
    expect(
      projectionSettingsSchema.parse({ newBrowsersPerAddress: 500 }).newBrowsersPerAddress,
    ).toBe(500);
    for (const bad of [0, -1, 1.5])
      expect(ok(projectionSettingsSchema, { rejectLimitMs: bad })).toBe(false);
    // The Bluetooth slice and broadcast stay in the plan's ranges.
    for (const [field, low, high] of [
      ['bluetoothSliceMs', 10_000, 15_000],
      ['bluetoothBroadcastMs', 120_000, 180_000],
    ] as const) {
      expect(ok(projectionSettingsSchema, { [field]: low }), field).toBe(true);
      expect(ok(projectionSettingsSchema, { [field]: high }), field).toBe(true);
      expect(ok(projectionSettingsSchema, { [field]: low - 1 }), field).toBe(false);
      expect(ok(projectionSettingsSchema, { [field]: high + 1 }), field).toBe(false);
    }
  });

  it('call the codes route with the projection cookie and no body', () => {
    expect(CODES_REQUEST).toEqual({
      method: 'GET',
      path: '/v1/projection/codes',
      cookieName: COOKIES.projection,
      body: null,
      nextRequestField: 'nextRequestMs',
    });
    const answer = PROJECTION_ROUTES.getCodes.response.schema;
    expect(Object.keys(answer.shape)).toContain(CODES_REQUEST.nextRequestField);
  });
});

describe('record evidence fields', () => {
  const parse = (fields: Record<string, unknown>) => recordEvidenceFieldsSchema.parse(fields);

  it('are all optional and dropped when unknown, at every depth', () => {
    expect(parse({ extra: 1 })).toEqual({});
    const objects = objectsIn(recordEvidenceFieldsSchema);
    // Ground control: the walk reaches the scan, its codes and the location.
    expect(objects).toHaveLength(4);
    for (const object of objects) expect(unknownKeys(object)).toBe('strip');
    // A newer phone's extra field inside a scan is dropped, the scan kept.
    const scan = { status: 'SCANNED', codes: [{ code: '0123456789abcdef', rssi: -1, tx: 4 }] };
    expect(parse({ bluetooth: { ...scan, rate: 2 } })).toEqual({
      bluetooth: { status: 'SCANNED', codes: [{ code: '0123456789abcdef', rssi: -1 }] },
    });
  });

  it('document no fallback as a default: an absent field is not its fallback', () => {
    const json = z.toJSONSchema(recordEvidenceFieldsSchema, { io: 'input' });
    expect(JSON.stringify(json)).not.toContain('"default"');
    // Ground control: the fields are documented.
    expect(Object.keys(json.properties ?? {})).toEqual([
      'qr',
      'backupCode',
      'qrCapable',
      'bluetooth',
      'location',
    ]);
  });

  it('keep a broken code as the empty code, so the record stays and the code fails', () => {
    expect(parse({ qr: '1'.repeat(64), backupCode: 'x'.repeat(16) })).toEqual({
      qr: '1'.repeat(64),
      backupCode: 'x'.repeat(16),
    });
    // A malformed code that fits the bounds is kept as sent; the verification reads it.
    expect(parse({ qr: 'not digits' })).toEqual({ qr: 'not digits' });
    for (const qr of ['1'.repeat(65), 41, null]) expect(parse({ qr })).toEqual({ qr: '' });
    for (const backupCode of ['x'.repeat(17), 123456]) {
      expect(parse({ backupCode })).toEqual({ backupCode: '' });
    }
    expect(parse({ qrCapable: 'yes' })).toEqual({});
    expect(parse({ qrCapable: true })).toEqual({ qrCapable: true });
  });

  it('read a broken Bluetooth scan as no Bluetooth', () => {
    const code = { code: '0123456789abcdef', rssi: -60 };
    const scan = (status: string, codes: unknown[]) => parse({ bluetooth: { status, codes } });
    const none = { bluetooth: { status: 'NO_BLUETOOTH', codes: [] } };
    expect(scan('SCANNED', [code])).toEqual({ bluetooth: { status: 'SCANNED', codes: [code] } });
    const full = Array.from({ length: 32 }, () => code);
    expect(scan('SCANNED', full)).toEqual({ bluetooth: { status: 'SCANNED', codes: full } });
    expect(scan('SCANNED', [...full, code])).toEqual(none);
    expect(scan('NO_BLUETOOTH', [])).toEqual(none);
    expect(scan('NO_BLUETOOTH', [code])).toEqual(none);
    for (const good of [
      { ...code, rssi: -127 },
      { ...code, rssi: 20 },
    ]) {
      expect(scan('SCANNED', [good])).toEqual({ bluetooth: { status: 'SCANNED', codes: [good] } });
    }
    for (const bad of [
      { ...code, code: '0123456789ABCDEF' },
      { ...code, code: '0123456789abcde' },
      { ...code, code: '0123456789abcdef0' },
      { ...code, rssi: -128 },
      { ...code, rssi: 21 },
    ]) {
      expect(scan('SCANNED', [bad])).toEqual(none);
    }
  });

  it('read a broken location as no location, with coordinates only when received', () => {
    const coordinates = { latitudeE4: 410_000, longitudeE4: 289_000, radiusM: 20 };
    const location = (value: Record<string, unknown>) => parse({ location: value });
    const none = { location: { status: 'NO_LOCATION' } };
    const received = { status: 'RECEIVED', ...coordinates, mockLocation: false };
    expect(location(received)).toEqual({ location: received });
    // Each coordinate is required with RECEIVED and refused without it.
    for (const field of ['latitudeE4', 'longitudeE4', 'radiusM'] as const) {
      const { [field]: _left, ...missingOne } = coordinates;
      expect(location({ status: 'RECEIVED', ...missingOne }), field).toEqual(none);
      expect(location({ status: 'NO_LOCATION', [field]: coordinates[field] }), field).toEqual(none);
    }
    expect(location({ status: 'APPROXIMATE_PERMISSION' })).toEqual({
      location: { status: 'APPROXIMATE_PERMISSION' },
    });
    // The bounds hold on both sides.
    for (const [field, low, high] of [
      ['latitudeE4', -900_000, 900_000],
      ['longitudeE4', -1_800_000, 1_800_000],
      ['radiusM', 0, 100_000],
    ] as const) {
      for (const value of [low, high]) {
        const fit = { ...received, [field]: value };
        expect(location(fit), `${field} ${value}`).toEqual({ location: fit });
      }
      for (const value of [low - 1, high + 1]) {
        expect(location({ ...received, [field]: value }), `${field} ${value}`).toEqual(none);
      }
    }
  });
});

describe('the display record item', () => {
  const base = 1_760_256_000_000;
  const display = {
    sessionId: id(1),
    kind: 'QR',
    slot: 3,
    labelBaseMs: base,
    displayDurationMs: 60_000,
    firstSlice: Math.floor(base / DISPLAY_SLICE_MS),
    lastSlice: Math.floor((base + 60_000) / DISPLAY_SLICE_MS),
    bluetoothSliceSeconds: null,
    reference: null,
  };
  const body = DISPLAY_RECORD_ITEM.body;

  it('is the projection module item with slices that follow from the base and duration', () => {
    expect([DISPLAY_RECORD_ITEM.type, DISPLAY_RECORD_ITEM.module]).toEqual([
      'display_record',
      'projection',
    ]);
    expect(ok(body, display)).toBe(true);
    expect(ok(body, { ...display, firstSlice: display.firstSlice + 1 })).toBe(false);
    expect(ok(body, { ...display, lastSlice: display.lastSlice - 1 })).toBe(false);
    expect(
      ok(body, { ...display, displayDurationMs: 14_400_000, lastSlice: display.firstSlice + 2880 }),
    ).toBe(true);
    expect(ok(body, { ...display, displayDurationMs: 14_400_001 })).toBe(false);
    // Consistent slices, so only the duration bound can refuse it.
    const negative = {
      ...display,
      displayDurationMs: -1,
      lastSlice: Math.floor((base - 1) / 5000),
    };
    expect(ok(body, negative)).toBe(false);
    expect(ok(body, { ...display, displayDurationMs: 0, lastSlice: display.firstSlice })).toBe(
      true,
    );
    for (const slot of [1, 9]) expect(ok(body, { ...display, slot }), String(slot)).toBe(true);
    for (const slot of [0, 10]) expect(ok(body, { ...display, slot }), String(slot)).toBe(false);
    // The label base runs from the epoch to the last instant of year 9999.
    const at = (labelBaseMs: number) => ({
      ...display,
      labelBaseMs,
      firstSlice: Math.floor(labelBaseMs / DISPLAY_SLICE_MS),
      lastSlice: Math.floor((labelBaseMs + display.displayDurationMs) / DISPLAY_SLICE_MS),
    });
    expect(ok(body, at(0))).toBe(true);
    expect(ok(body, at(253_402_300_799_999))).toBe(true);
    expect(ok(body, at(253_402_300_800_000))).toBe(false);
    expect(ok(body, at(-1))).toBe(false);
    // A wrong last slice is named as such.
    const wrongLast = body.safeParse({ ...display, lastSlice: display.lastSlice + 1 });
    expect(wrongLast.error?.issues.map((issue) => issue.path)).toEqual([['lastSlice']]);
    // The lecturer's location travels with the display (stage 3).
    const reference = {
      latitudeE4: 410_000,
      longitudeE4: 289_000,
      radiusM: 15,
      mockLocation: false,
      simulated: false,
      accessory: true,
    };
    expect(ok(body, { ...display, reference })).toBe(true);
    expect(ok(body, { ...display, reference: { ...reference, radiusM: -1 } })).toBe(false);
  });

  it('carries a Bluetooth slice only for a Bluetooth display', () => {
    for (const seconds of [10, 15]) {
      expect(ok(body, { ...display, kind: 'BLUETOOTH', bluetoothSliceSeconds: seconds })).toBe(
        true,
      );
    }
    expect(ok(body, { ...display, kind: 'BLUETOOTH' })).toBe(false);
    expect(ok(body, { ...display, bluetoothSliceSeconds: 15 })).toBe(false);
    for (const seconds of [9, 16]) {
      expect(ok(body, { ...display, kind: 'BLUETOOTH', bluetoothSliceSeconds: seconds })).toBe(
        false,
      );
    }
  });
});

describe('projection audit events', () => {
  const samples: Record<string, unknown> = {
    'projection.connection_opened': {
      connectionId: id(1),
      browserId: id(2),
      previousConnectionId: null,
    },
    'projection.connection_closed': { connectionId: id(1), reason: 'CLASS_ENDED' },
    'projection.second_use': {
      pairingCodeRowId: id(3),
      connectionId: id(1),
      firstAuthSessionId: id(4),
      secondAuthSessionId: id(5),
    },
    'projection.browser_secret_rotated': { browserId: id(2), connectionId: id(1), repeat: true },
    'projection.slot_assigned': {
      slotId: id(6),
      slot: 9,
      authSessionId: id(4),
      releasedSlotId: null,
    },
    'projection.slot_revoked': { slotId: id(6), reason: 'SLOT_REASSIGNED' },
    'projection.slot_transferred': {
      slotId: id(6),
      oldAuthSessionId: id(4),
      newAuthSessionId: id(5),
    },
    'projection.key_downloaded': {
      slotId: id(6),
      firstDay: 20_738,
      lastDay: 20_742,
      kid: 'k-2026',
      newDayCount: 1,
    },
    'projection.attempt_limit': { authSessionId: id(4), windowAt: at, wrongCount: 5 },
  };

  it('name nine strict events, each accepting its detail and refusing an extra field', () => {
    expect(Object.keys(PROJECTION_AUDIT_EVENTS).sort()).toEqual(Object.keys(samples).sort());
    for (const [type, schema] of Object.entries(PROJECTION_AUDIT_EVENTS)) {
      const sample = samples[type] as Record<string, unknown>;
      expect(ok(schema, sample), type).toBe(true);
      expect(ok(schema, { ...sample, extra: 1 }), type).toBe(false);
    }
    const revoked = PROJECTION_AUDIT_EVENTS['projection.slot_revoked'];
    for (const reason of SLOT_REVOKE_REASONS) {
      expect(ok(revoked, { slotId: id(6), reason }), reason).toBe(true);
    }
    for (const reason of ['logout', 'FOO']) {
      expect(ok(revoked, { slotId: id(6), reason }), reason).toBe(false);
    }
    const downloaded = PROJECTION_AUDIT_EVENTS['projection.key_downloaded'];
    const sample = samples['projection.key_downloaded'] as Record<string, unknown>;
    for (const kid of ['', 'QR_27B', 'abcdefghi']) {
      expect(ok(downloaded, { ...sample, kid }), kid).toBe(false);
    }
  });

  it('keep the audit writer forbidden names out of every detail', () => {
    const forbidden = [
      'studentNumber',
      'number',
      'fullName',
      'name',
      'email',
      'code',
      'key',
      'token',
      'documentNumber',
    ];
    const fields = Object.values(PROJECTION_AUDIT_EVENTS).flatMap((schema) =>
      Object.keys(schema.shape),
    );
    expect(fields).toContain('pairingCodeRowId');
    for (const field of fields) expect(forbidden).not.toContain(field);
  });
});
