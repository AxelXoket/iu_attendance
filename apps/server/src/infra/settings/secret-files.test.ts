import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import {
  AT,
  BYTE_ORDER_MARK,
  envFor,
  key32,
  keySetFile,
  memoryMaxFile,
  removeDir,
  secretsDirFor,
} from '../../../test/support/settings.ts';
import { bindRootLogger } from '../monitoring/index.ts';
import {
  loadSettings,
  type Process,
  SettingsError,
  secretKey,
  secretKeySet,
  unloadSettings,
} from './index.ts';
import {
  keySetDigest,
  type SecretKey,
  type SecretKeySet,
  type SecretKeyStatus,
} from './secret-files.ts';

const PURPOSE = 'clock_document';
const dir = secretsDirFor('api');
const memory = memoryMaxFile('max');
const dirs: string[] = [];
afterEach(() => {
  unloadSettings();
  for (const extra of dirs.splice(0)) removeDir(extra);
});
afterAll(() => {
  removeDir(dir);
  removeDir(memory.dir);
});

const load = () =>
  loadSettings({ process: 'api', env: envFor(), secretsDir: dir, memoryMaxPath: memory.path });
const loadFresh = (kind: Process, write: Record<string, string> = {}) => {
  const secretsDir = secretsDirFor(kind);
  dirs.push(secretsDir);
  for (const [name, text] of Object.entries(write)) writeFileSync(join(secretsDir, name), text);
  return loadSettings({ process: kind, env: envFor(), secretsDir, memoryMaxPath: memory.path });
};

type Key = {
  kid: string;
  value: string;
  status: SecretKeyStatus;
  createdAt: string;
  compromisedAt?: string;
};
type KeyFile = { activeKid: string; keys: Key[] };

const keyOf = (kid: string, status: SecretKeyStatus, byte = 7): Key => ({
  kid,
  value: key32(byte),
  status,
  createdAt: AT,
  ...(status === 'COMPROMISED' ? { compromisedAt: AT } : {}),
});

// A key set the rules allow: one to four keys with distinct kids, one ACTIVE that activeKid
// names, at most one READY, a compromise instant exactly on a compromised key.
const allowedSet: fc.Arbitrary<KeyFile> = fc
  .uniqueArray(fc.stringMatching(/^[a-z0-9-]{1,8}$/), { minLength: 1, maxLength: 4 })
  .chain((kids) =>
    fc.record({
      kids: fc.constant(kids),
      activeAt: fc.nat({ max: kids.length - 1 }),
      readyAt: fc.option(fc.nat({ max: kids.length - 1 }), { nil: null }),
      others: fc.array(fc.constantFrom<SecretKeyStatus>('VERIFY_ONLY', 'COMPROMISED'), {
        minLength: kids.length,
        maxLength: kids.length,
      }),
      byte: fc.integer({ min: 0, max: 255 }),
    }),
  )
  .map(({ kids, activeAt, readyAt, others, byte }) => ({
    activeKid: kids[activeAt] ?? '',
    keys: kids.map((kid, at) =>
      keyOf(
        kid,
        at === activeAt ? 'ACTIVE' : at === readyAt ? 'READY' : (others[at] ?? 'VERIFY_ONLY'),
        (byte + at) % 256,
      ),
    ),
  }));

// One change that may break a rule; none at all leaves the set allowed.
const MUTATIONS = [
  'none',
  'repeatKid',
  'secondActive',
  'noActive',
  'activeKidElsewhere',
  'secondReady',
  'fifthKey',
  'badKid',
  'shortValue',
  'compromiseUndated',
  'activeDatedAsCompromised',
] as const;

function mutate({ activeKid, keys }: KeyFile, mutation: (typeof MUTATIONS)[number]): KeyFile {
  const next = keys.map((key) => ({ ...key }));
  const active = next.find((key) => key.kid === activeKid) as Key;
  const others = next.filter((key) => key !== active);
  const extra = (status: SecretKeyStatus, at: number) => next.push(keyOf(`x-${at}`, status));
  switch (mutation) {
    case 'repeatKid':
      next.push({ ...keyOf(active.kid, 'VERIFY_ONLY') });
      break;
    case 'secondActive':
      if (others[0]) Object.assign(others[0], keyOf(others[0].kid, 'ACTIVE'));
      else extra('ACTIVE', 1);
      break;
    case 'noActive':
      Object.assign(active, keyOf(active.kid, 'VERIFY_ONLY'));
      break;
    case 'activeKidElsewhere':
      return { activeKid: others[0]?.kid ?? 'x-none', keys: next };
    case 'secondReady':
      for (const [at, key] of others.entries()) {
        if (key.status !== 'READY') Object.assign(key, keyOf(key.kid, 'READY', at));
      }
      while (next.filter((key) => key.status === 'READY').length < 2) extra('READY', next.length);
      break;
    case 'fifthKey':
      while (next.length < 5) extra('VERIFY_ONLY', next.length);
      break;
    case 'badKid':
      active.kid = 'BAD_kid';
      return { activeKid: 'BAD_kid', keys: next };
    case 'shortValue':
      active.value = Buffer.alloc(31, 1).toString('base64');
      break;
    case 'compromiseUndated':
      active.compromisedAt = undefined;
      if (others[0]) Object.assign(others[0], { status: 'COMPROMISED', compromisedAt: undefined });
      else next.push({ ...keyOf('x-1', 'VERIFY_ONLY'), status: 'COMPROMISED' });
      break;
    case 'activeDatedAsCompromised':
      active.compromisedAt = AT;
      break;
  }
  return { activeKid, keys: next.map((key) => JSON.parse(JSON.stringify(key)) as Key) };
}

// The spec's rules for a key file, written out apart from the schema that enforces them.
function brokenRules({ activeKid, keys }: KeyFile): string[] {
  const rules: Record<string, boolean> = {
    count: keys.length >= 1 && keys.length <= 4,
    oneActive: keys.filter((key) => key.status === 'ACTIVE').length === 1,
    activeKid: keys.some((key) => key.kid === activeKid && key.status === 'ACTIVE'),
    oneReady: keys.filter((key) => key.status === 'READY').length <= 1,
    uniqueKids: new Set(keys.map((key) => key.kid)).size === keys.length,
    kidShape: keys.every((key) => /^[a-z0-9-]{1,8}$/.test(key.kid)),
    bytes: keys.every((key) => Buffer.from(key.value, 'base64').length === 32),
    compromise: keys.every(
      (key) => (key.status === 'COMPROMISED') === (key.compromisedAt !== undefined),
    ),
  };
  return Object.keys(rules).filter((rule) => !rules[rule]);
}

describe('secret key files', () => {
  it('load only a key set the rules allow, and never hand out a ready key unasked', () => {
    const soleCauses = new Set<string>();
    let readyServed = 0;
    fc.assert(
      fc.property(allowedSet, fc.constantFrom(...MUTATIONS), (allowed, mutation) => {
        const file = mutate(allowed, mutation);
        writeFileSync(join(dir, PURPOSE), JSON.stringify({ format: 1, purpose: PURPOSE, ...file }));
        unloadSettings();
        const broken = brokenRules(file);
        if (broken.length === 1) soleCauses.add(broken[0] as string);
        let error: SettingsError | null = null;
        try {
          load();
        } catch (thrown) {
          if (!(thrown instanceof SettingsError)) throw thrown;
          error = thrown;
        }
        expect(error === null, `${mutation} ${broken}`).toBe(broken.length === 0);
        if (error !== null) {
          expect(error.names).toEqual([PURPOSE]);
          return;
        }
        const active = secretKey(PURPOSE);
        expect([active.status, active.kid]).toEqual(['ACTIVE', file.activeKid]);
        for (const key of file.keys) {
          const found = secretKey(PURPOSE, key.kid);
          expect(found?.status).toBe(key.status);
          expect(found?.value).toEqual(new Uint8Array(Buffer.from(key.value, 'base64')));
          expect(found?.compromisedAt?.toISOString() ?? null).toBe(key.compromisedAt ?? null);
          if (key.status === 'READY') readyServed += 1;
        }
        expect(secretKey(PURPOSE, 'nokid-x')).toBeNull();
      }),
      { numRuns: 2000 },
    );
    // Ground controls: every rule alone refuses a set somewhere, and allowed sets with a
    // ready key were loaded, so "never the ready one" was put to the test.
    expect([...soleCauses].sort()).toEqual([
      'activeKid',
      'bytes',
      'compromise',
      'count',
      'kidShape',
      'oneActive',
      'oneReady',
      'uniqueKids',
    ]);
    expect(readyServed).toBeGreaterThan(50);
  }, 180_000);

  it('give copies: changing one leaves the loaded keys as they were', () => {
    const compromised = { ...keyOf('old-1', 'COMPROMISED', 3) };
    const file = { activeKid: 'sb27b', keys: [keyOf('sb27b', 'ACTIVE', 9), compromised] };
    writeFileSync(join(dir, PURPOSE), JSON.stringify({ format: 1, purpose: PURPOSE, ...file }));
    load();
    secretKey(PURPOSE).value.fill(0);
    secretKeySet(PURPOSE).keys[0]?.value.fill(0);
    secretKey(PURPOSE, 'old-1')?.compromisedAt?.setTime(0);
    expect(secretKey(PURPOSE).value).toEqual(new Uint8Array(32).fill(9));
    expect(secretKey(PURPOSE, 'old-1')?.compromisedAt?.toISOString()).toBe(AT);
    const set = secretKeySet(PURPOSE);
    expect(set.activeKid).toBe('sb27b');
    expect(set.keys).toHaveLength(2);
    expect([Object.isFrozen(set), Object.isFrozen(set.keys), Object.isFrozen(set.keys[0])]).toEqual(
      [true, true, true],
    );
    expect(Object.isFrozen(secretKey(PURPOSE))).toBe(true);
  });

  it('refuse a file of another purpose or one that is not JSON, and read one with a BOM', () => {
    for (const text of [keySetFile('qr_key_source'), '{not json']) {
      writeFileSync(join(dir, PURPOSE), text);
      unloadSettings();
      expect(() => load()).toThrow(SettingsError);
    }
    writeFileSync(join(dir, PURPOSE), `${BYTE_ORDER_MARK}${keySetFile(PURPOSE, 'bom-1')}\r\n`);
    unloadSettings();
    load();
    expect(secretKey(PURPOSE).kid).toBe('bom-1');
  });

  it('digest a key set by kid order, kid, status and key, never the key itself', () => {
    const entry = (kid: string, status: SecretKey['status'], byte: number): SecretKey => ({
      purpose: PURPOSE,
      kid,
      value: new Uint8Array(32).fill(byte),
      status,
      compromisedAt: null,
    });
    const set = (...keys: SecretKey[]): SecretKeySet => ({ activeKid: 'a1', keys });
    const digest = keySetDigest(set(entry('a1', 'ACTIVE', 1), entry('b2', 'READY', 2)));
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(keySetDigest(set(entry('b2', 'READY', 2), entry('a1', 'ACTIVE', 1)))).toBe(digest);
    for (const changed of [
      set(entry('a1', 'ACTIVE', 1), entry('b2', 'ACTIVE', 2)),
      set(entry('a1', 'ACTIVE', 1), entry('b2', 'READY', 3)),
      set(entry('a1', 'ACTIVE', 1), entry('b3', 'READY', 2)),
    ]) {
      expect(keySetDigest(changed)).not.toBe(digest);
    }
  });

  it('log one keys_loaded line per purpose with the digest and without the key', () => {
    // A stand-in root that keeps each line. It stays bound for the rest of this file: a
    // child of the root follows any binding, so the old root cannot be taken back, and
    // vitest gives every test file its own module instances.
    const raw: string[] = [];
    const keeping = {
      info: (line: Record<string, unknown>) => void raw.push(JSON.stringify(line)),
    } as unknown as Parameters<typeof bindRootLogger>[0];
    bindRootLogger(keeping);
    writeFileSync(join(dir, PURPOSE), keySetFile(PURPOSE, 'k1', 5));
    unloadSettings();
    load();
    const lines = raw
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.event === 'operations.keys_loaded');
    const purposes = lines.map((line) => line.purpose);
    expect(purposes).toEqual([
      'clock_document',
      'qr_key_source',
      'sign_in_code_digest',
      'email_digest',
      'arrival_receipt',
    ]);
    const clock = lines.find((line) => line.purpose === PURPOSE);
    expect(clock?.setDigest).toBe(keySetDigest(secretKeySet(PURPOSE)));
    // Ground control: the key's text is in its file, never in a line.
    expect(keySetFile(PURPOSE, 'k1', 5)).toContain(key32(5));
    for (const line of raw) {
      expect(line).not.toContain(key32(5));
      expect(line).not.toContain(Buffer.alloc(32, 5).toString('hex'));
    }
  });
});

describe('secret value files', () => {
  it('give each process the passwords it reads, behind the wrapper', () => {
    const migration = loadFresh('migration');
    for (const [login, name] of [
      ['api', 'attendance_api_password'],
      ['retention', 'attendance_retention_password'],
      ['postgres', 'postgres_password'],
      ['xprem', 'xprem_password'],
    ] as const) {
      expect(migration.database.passwords[login]?.reveal(), login).toBe(`${name}-value`);
    }
    expect(JSON.stringify(migration)).not.toContain('-value');
    unloadSettings();
    const worker = loadFresh('worker');
    expect(worker.database.passwords.retention?.reveal()).toBe(
      'attendance_retention_password-value',
    );
    expect(worker.database.passwords.postgres).toBeNull();
  });

  it('read the heartbeat addresses, and refuse one that is not https', () => {
    const urls = { normalUrl: 'https://hc.example.edu/ok', problemUrl: 'https://hc.example.edu/x' };
    const worker = loadFresh('worker', { heartbeat: JSON.stringify(urls) });
    expect(worker.operations.heartbeat?.problemUrl?.reveal()).toBe(urls.problemUrl);
    expect(worker.operations.heartbeat?.normalUrl.reveal()).toBe(urls.normalUrl);
    expect(JSON.stringify(worker)).not.toContain('hc.example.edu');
    unloadSettings();
    const plain = JSON.stringify({ ...urls, normalUrl: 'http://hc.example.edu/ok' });
    const error = (() => {
      try {
        loadFresh('worker', { heartbeat: plain });
      } catch (thrown) {
        return thrown as SettingsError;
      }
      throw new Error('expected a settings error');
    })();
    expect(error.names).toEqual(['heartbeat']);
  });

  it("take an empty or blank required value as missing, and the worker's empty review code as absent", () => {
    for (const blank of ['', '\r\n', ' \n', '\n\n']) {
      unloadSettings();
      expect(
        () => loadFresh('worker', { attendance_worker_password: blank }),
        JSON.stringify(blank),
      ).toThrow(SettingsError);
    }
    unloadSettings();
    expect(loadFresh('worker', { review_fixed_code: '' }).identity.reviewFixedCodePresent).toBe(
      false,
    );
    // Ground control: a written value is read.
    unloadSettings();
    expect(
      loadFresh('worker', {
        attendance_worker_password: 'pw\r\n',
      }).database.workerConnectionUrl?.reveal(),
    ).toContain(':pw@');
  });
});
