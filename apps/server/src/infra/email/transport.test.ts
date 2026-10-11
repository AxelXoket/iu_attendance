import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import { LANGUAGES } from '@iu-attendance/contracts/shared/language';
import fc from 'fast-check';
import { createTransport } from 'nodemailer';
import { SMTPServer, type SMTPServerOptions } from 'smtp-server';
import { afterAll, afterEach, beforeAll, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { fakeMailbox, type PlannedReply } from '../../../test/support/fake-mail.ts';
import {
  FIXED_WARNING_SENTENCE,
  IF_NOT_YOU_SENTENCE,
  JOBS_GENERIC_ERROR_TEXT,
} from './fixed-texts.ts';
import {
  SMTP_CONNECTION_SETTINGS,
  SMTP_TLS_SETTINGS,
  type SmtpSettings,
  smtpTransport,
  smtpTransportOptions,
} from './transport.ts';
import {
  classifyTransportFailure,
  DEVICE_LABEL_MAX_LENGTH,
  type DeliveryErrorKind,
  EMAIL_ERROR_KINDS,
  EMAIL_TYPES,
  type EmailData,
  type EmailTransport,
  type EmailType,
  type LimitedEmailType,
  type OutgoingEmail,
  PLAIN_TEXT_CONTENT_TYPE,
  PRODUCT_RECIPIENT_DOMAIN,
  type ProductEmailType,
  parseOutgoingEmail,
  TRANSPORT_HEADERS,
  type TransportResult,
} from './types.ts';

// ---------------------------------------------------------------------------------
// Test certificates: a small DER writer and an EC P-256 key made at run time, so no
// key file is committed. The "trusted" one joins the default CA list of this worker.

function tlv(tag: number, ...parts: Buffer[]): Buffer {
  const body = Buffer.concat(parts);
  const length: number[] = [];
  for (let rest = body.length; rest > 0; rest = Math.floor(rest / 256)) length.unshift(rest % 256);
  const header = body.length < 0x80 ? [body.length] : [0x80 | length.length, ...length];
  return Buffer.concat([Buffer.from([tag, ...header]), body]);
}

const sequence = (...parts: Buffer[]) => tlv(0x30, ...parts);

function objectId(dotted: string): Buffer {
  const [first = 0, second = 0, ...rest] = dotted.split('.').map(Number);
  const bytes = [40 * first + second];
  for (const value of rest) {
    const chunk = [value % 128];
    for (let high = Math.floor(value / 128); high > 0; high = Math.floor(high / 128)) {
      chunk.unshift(0x80 | (high % 128));
    }
    bytes.push(...chunk);
  }
  return tlv(0x06, Buffer.from(bytes));
}

function utcTime(at: Date): Buffer {
  const two = (n: number) => String(n).padStart(2, '0');
  const text = `${two(at.getUTCFullYear() % 100)}${two(at.getUTCMonth() + 1)}${two(at.getUTCDate())}${two(at.getUTCHours())}${two(at.getUTCMinutes())}${two(at.getUTCSeconds())}Z`;
  return tlv(0x17, Buffer.from(text, 'ascii'));
}

type TestCertificate = { readonly cert: string; readonly key: string };

// Self-signed for localhost and 127.0.0.1, valid from yesterday to tomorrow.
function selfSignedCertificate(commonName: string): TestCertificate {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const ecdsaWithSha256 = sequence(objectId('1.2.840.10045.4.3.2'));
  const name = sequence(
    tlv(0x31, sequence(objectId('2.5.4.3'), tlv(0x0c, Buffer.from(commonName, 'utf8')))),
  );
  const serial = crypto.randomBytes(16);
  serial[0] = (serial[0] ?? 0) & 0x7f;
  const day = 86_400_000;
  const basicConstraints = sequence(
    objectId('2.5.29.19'),
    tlv(0x01, Buffer.from([0xff])),
    tlv(0x04, sequence(tlv(0x01, Buffer.from([0xff])))),
  );
  const subjectAltName = sequence(
    objectId('2.5.29.17'),
    tlv(
      0x04,
      sequence(tlv(0x82, Buffer.from('localhost')), tlv(0x87, Buffer.from([127, 0, 0, 1]))),
    ),
  );
  const toBeSigned = sequence(
    tlv(0xa0, tlv(0x02, Buffer.from([2]))),
    tlv(0x02, serial),
    ecdsaWithSha256,
    name,
    sequence(utcTime(new Date(Date.now() - day)), utcTime(new Date(Date.now() + day))),
    name,
    publicKey.export({ type: 'spki', format: 'der' }),
    tlv(0xa3, sequence(basicConstraints, subjectAltName)),
  );
  const signature = crypto.sign('sha256', toBeSigned, privateKey);
  const der = sequence(toBeSigned, ecdsaWithSha256, tlv(0x03, Buffer.from([0]), signature));
  const lines = der.toString('base64').match(/.{1,64}/g) ?? [];
  return {
    cert: `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`,
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

const trusted = selfSignedCertificate('trusted test server');
const untrusted = selfSignedCertificate('untrusted test server');
const defaultCertificates = tls.getCACertificates('default');

beforeAll(() => {
  tls.setDefaultCACertificates([...defaultCertificates, trusted.cert]);
});

afterAll(() => {
  tls.setDefaultCACertificates(defaultCertificates);
});

// ---------------------------------------------------------------------------------
// Test SMTP servers and transports, all closed after each test (transports first).

const cleanups: Array<() => Promise<void>> = [];

// Every cleanup runs even when one fails; the first failure fails the test.
afterEach(async () => {
  const failures: unknown[] = [];
  for (const cleanup of cleanups.splice(0).reverse()) {
    try {
      await cleanup();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) throw failures[0];
});

const CLOSE_DEADLINE_MS = 2000;

// A close that never resolves fails the test here instead of stalling the run.
function track<T extends EmailTransport>(transport: T): T {
  cleanups.push(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<'late'>((resolve) => {
      timer = setTimeout(() => resolve('late'), CLOSE_DEADLINE_MS);
    });
    const outcome = await Promise.race([transport.close().then(() => 'closed' as const), late]);
    clearTimeout(timer);
    if (outcome === 'late') throw new Error(`close() did not resolve in ${CLOSE_DEADLINE_MS} ms`);
  });
  return transport;
}

type TestServer = {
  readonly port: number;
  // The TLS state of every AUTH and of every delivered message the server saw.
  readonly authentications: boolean[];
  readonly deliveries: Array<{ readonly raw: string; readonly secure: boolean }>;
  readonly recipients: string[][];
  // DATA answers held back when holdData is set; calling one answers 250.
  readonly held: Array<() => void>;
  openConnections(): number;
  peakOpenConnections(): number;
};

async function startSmtpServer(
  options: SMTPServerOptions & { holdData?: boolean } = {},
): Promise<TestServer> {
  const { holdData = false, ...serverOptions } = options;
  const authentications: boolean[] = [];
  const deliveries: Array<{ raw: string; secure: boolean }> = [];
  const recipients: string[][] = [];
  const held: Array<() => void> = [];
  let open = 0;
  let peak = 0;
  const server = new SMTPServer({
    logger: false,
    closeTimeout: 200,
    disableReverseLookup: true,
    // Plain-text AUTH is accepted, so a missing AUTH means the client held it back.
    allowInsecureAuth: true,
    onConnect(_session, callback) {
      open += 1;
      peak = Math.max(peak, open);
      callback();
    },
    onClose() {
      open -= 1;
    },
    onAuth(auth, session, callback) {
      authentications.push(session.secure);
      callback(null, { user: auth.username });
    },
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        deliveries.push({ raw: Buffer.concat(chunks).toString('utf8'), secure: session.secure });
        recipients.push(session.envelope.rcptTo.map((address) => address.address));
        if (holdData) held.push(() => callback());
        else callback();
      });
    },
    ...serverOptions,
  });
  // Refused handshakes are part of several tests.
  server.on('error', () => {});
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.server.address();
  if (address === null || typeof address === 'string') throw new Error('no port');
  cleanups.push(() => new Promise<void>((resolve) => server.close(() => resolve())));
  return {
    port: address.port,
    authentications,
    deliveries,
    recipients,
    held,
    openConnections: () => open,
    peakOpenConnections: () => peak,
  };
}

type HeloOnlyServer = {
  readonly port: number;
  // The command verbs the server received, in order.
  readonly commands: string[];
  deliveries(): number;
};

// A server that knows only HELO: it answers EHLO with ehloReply, so it cannot advertise
// STARTTLS, and takes a message after HELO.
async function startHeloOnlyServer(ehloReply: string): Promise<HeloOnlyServer> {
  const commands: string[] = [];
  const sockets = new Set<net.Socket>();
  let deliveries = 0;
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let buffer = '';
    let inData = false;
    // Takes one command line, or one whole message after DATA; false when input is short.
    const step = (): boolean => {
      const end = buffer.indexOf(inData ? '\r\n.\r\n' : '\r\n');
      if (end < 0) return false;
      if (inData) {
        buffer = buffer.slice(end + 5);
        inData = false;
        deliveries += 1;
        socket.write('250 2.0.0 Accepted\r\n');
        return true;
      }
      const verb = (buffer.slice(0, end).split(' ')[0] ?? '').toUpperCase();
      buffer = buffer.slice(end + 2);
      commands.push(verb);
      if (verb === 'EHLO') socket.write(`${ehloReply}\r\n`);
      else if (verb === 'DATA') {
        inData = true;
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (verb === 'QUIT') socket.end('221 Bye\r\n');
      else socket.write('250 OK\r\n');
      return true;
    };
    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('latin1');
      let more = true;
      while (more) more = step();
    });
    socket.write('220 helo-only.example ESMTP\r\n');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanups.push(
    () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  );
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port');
  return { port: address.port, commands, deliveries: () => deliveries };
}

// A port on which nothing listens any more.
async function closedPort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  if (address === null || typeof address === 'string') throw new Error('no port');
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return address.port;
}

function refuseRecipients(responseCode: number): SMTPServerOptions['onRcptTo'] {
  return (address, _session, callback) => {
    callback(Object.assign(new Error(`Mailbox ${address.address} refused`), { responseCode }));
  };
}

const RECIPIENT = 'lecturer@istanbul.edu.tr';

const EMAIL: OutgoingEmail = {
  from: { name: 'Attendance', address: 'noreply@example.org' },
  to: RECIPIENT,
  subject: 'Attendance sign-in code',
  text: 'Your sign-in code: 123456',
};

// What every transport returns for a send once close has been called: the code Nodemailer
// gives a closed pool.
const CLOSED_RESULT: TransportResult = {
  sent: false,
  errorKind: 'connection',
  responseCode: null,
  errorCode: 'ECONNECTION',
};

// The modes that demand TLS carry credentials, as in production.
function settingsFor(port: number, security: 'tls' | 'starttls'): SmtpSettings {
  return { host: '127.0.0.1', port, security, user: 'mailer', password: 'test-password' };
}

// 'none' takes no credentials.
function plainSettingsFor(port: number): SmtpSettings {
  return { host: '127.0.0.1', port, security: 'none' };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function until(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condition not met in time');
    await sleep(10);
  }
}

function errorMessageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return String(error);
  }
  return '';
}

// A header of a raw message, unfolded: a line break followed by a space or a tab goes.
function headerOf(raw: string, name: string): string | null {
  const head = (raw.split('\r\n\r\n')[0] ?? '').replace(/\r\n(?=[ \t])/g, '');
  for (const line of head.split('\r\n')) {
    const colon = line.indexOf(':');
    if (colon > 0 && line.slice(0, colon).toLowerCase() === name.toLowerCase()) {
      return line.slice(colon + 1).trim();
    }
  }
  return null;
}

// A bare TLS handshake that uses the process defaults, for the positive controls.
function tlsHandshake(
  port: number,
): Promise<{ ok: true; protocol: string | null } | { ok: false }> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: '127.0.0.1', port, servername: 'localhost' }, () => {
      resolve({ ok: true, protocol: socket.getProtocol() });
      socket.destroy();
    });
    socket.once('error', () => resolve({ ok: false }));
  });
}

// Turns certificate checks off for the whole process, as a careless host might. Node warns
// about that switch once per process; only that one warning is kept off the test output.
async function withCertificateChecksOff(run: () => Promise<void>) {
  const name = 'NODE_TLS_REJECT_UNAUTHORIZED';
  const previous = process.env[name];
  const emitWarning = process.emitWarning;
  process.env[name] = '0';
  Reflect.set(process, 'emitWarning', (...args: unknown[]) => {
    if (!String(args[0]).includes(name)) Reflect.apply(emitWarning, process, args);
  });
  try {
    await run();
  } finally {
    Reflect.set(process, 'emitWarning', emitWarning);
    if (previous === undefined) Reflect.deleteProperty(process.env, name);
    else process.env[name] = previous;
  }
}

// Lets the process accept TLS 1.0 and 1.1 by default, as a weakened host might.
async function withWeakTlsDefaults(run: () => Promise<void>) {
  const minVersion = tls.DEFAULT_MIN_VERSION;
  const ciphers = tls.DEFAULT_CIPHERS;
  Reflect.set(tls, 'DEFAULT_MIN_VERSION', 'TLSv1');
  Reflect.set(tls, 'DEFAULT_CIPHERS', `${ciphers}:@SECLEVEL=0`);
  try {
    await run();
  } finally {
    Reflect.set(tls, 'DEFAULT_MIN_VERSION', minVersion);
    Reflect.set(tls, 'DEFAULT_CIPHERS', ciphers);
  }
}

const TLS_1_1_ONLY = {
  minVersion: 'TLSv1',
  maxVersion: 'TLSv1.1',
  ciphers: 'DEFAULT@SECLEVEL=0',
} as const;

// ---------------------------------------------------------------------------------

describe('No message reaches a server that does not advertise STARTTLS', () => {
  it('sends neither AUTH nor DATA and fails as a connection failure', async () => {
    const server = await startSmtpServer({ disabledCommands: ['STARTTLS'] });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));

    const result = await transport.send(EMAIL);

    expect(result).toMatchObject({ sent: false, errorKind: 'connection', errorCode: 'ETLS' });
    expect(server.authentications).toEqual([]);
    expect(server.deliveries).toEqual([]);
  });

  it('positive control: that server takes AUTH and DATA in plain text from a client that does not demand TLS', async () => {
    const server = await startSmtpServer({ disabledCommands: ['STARTTLS'] });
    const raw = createTransport({
      host: '127.0.0.1',
      port: server.port,
      ignoreTLS: true,
      auth: { user: 'mailer', pass: 'test-password' },
    });
    cleanups.push(() => Promise.resolve(raw.close()));

    await raw.sendMail({ ...EMAIL });

    expect(server.authentications).toEqual([false]);
    expect(server.deliveries.map((delivery) => delivery.secure)).toEqual([false]);
  });

  it('ground control: a server that advertises STARTTLS gets AUTH and the message over TLS', async () => {
    const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));

    expect(await transport.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
    expect(server.authentications).toEqual([true]);
    expect(server.deliveries.map((delivery) => delivery.secure)).toEqual([true]);
  });

  it('implicit TLS delivers over TLS as well', async () => {
    const server = await startSmtpServer({ secure: true, key: trusted.key, cert: trusted.cert });
    const transport = track(smtpTransport(settingsFor(server.port, 'tls')));

    expect(await transport.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
    expect(server.authentications).toEqual([true]);
    expect(server.deliveries.map((delivery) => delivery.secure)).toEqual([true]);
  });

  it.each([
    ['502 5.5.2 Error: command not recognized', 502, 'connection'],
    ['500 5.5.1 Unrecognized command', 500, 'connection'],
    ['451 4.3.0 Try again later', 451, 'transient'],
  ] as const)(
    'a HELO-only server answering EHLO with "%s" gets nothing after EHLO; reply %i is a %s failure',
    async (ehloReply, responseCode, errorKind) => {
      const server = await startHeloOnlyServer(ehloReply);
      const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));

      expect(await transport.send(EMAIL)).toEqual({
        sent: false,
        errorKind,
        responseCode,
        errorCode: 'ECONNECTION',
      });
      expect(server.commands).toEqual(['EHLO']);
      expect(server.deliveries()).toBe(0);
    },
  );

  it('positive control: the HELO-only server takes the message from a client that does not demand TLS', async () => {
    const server = await startHeloOnlyServer('502 5.5.2 Error: command not recognized');
    const transport = track(smtpTransport(plainSettingsFor(server.port)));

    expect(await transport.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
    expect(server.commands.slice(0, 5)).toEqual(['EHLO', 'HELO', 'MAIL', 'RCPT', 'DATA']);
    expect(server.deliveries()).toBe(1);
  });
});

describe('The TLS settings cannot be weakened', () => {
  it.each(['tls', 'starttls'] as const)('%s uses a copy of SMTP_TLS_SETTINGS', (security) => {
    const options = smtpTransportOptions(settingsFor(587, security));

    expect(options.tls).toEqual(SMTP_TLS_SETTINGS);
    expect(options.tls).not.toBe(SMTP_TLS_SETTINGS);
    expect(options.ignoreTLS).toBeUndefined();
    if (security === 'tls') expect(options.secure).toBe(true);
    else expect(options).toMatchObject({ secure: false, requireTLS: true });
  });

  it('none is the only mode without TLS', () => {
    const options = smtpTransportOptions(plainSettingsFor(1025));

    expect(options).toMatchObject({ secure: false, ignoreTLS: true });
    expect(options.tls).toBeUndefined();
    expect(options.requireTLS).toBeUndefined();
    expect(options.auth).toBeUndefined();
  });

  it('SMTP_TLS_SETTINGS is frozen', () => {
    expect(Object.isFrozen(SMTP_TLS_SETTINGS)).toBe(true);
    expect(() => {
      (SMTP_TLS_SETTINGS as { rejectUnauthorized: boolean }).rejectUnauthorized = false;
    }).toThrow(TypeError);
  });

  it.each<[string, unknown]>([
    ['tls', { rejectUnauthorized: false }],
    ['rejectUnauthorized', false],
    ['minVersion', 'TLSv1'],
    ['secure', false],
    ['requireTLS', false],
    ['ignoreTLS', true],
  ])('settings with an extra %s key are refused', (key, value) => {
    const settings = { ...settingsFor(587, 'starttls'), [key]: value } as SmtpSettings;

    expect(() => smtpTransportOptions(settings)).toThrow(TypeError);
    expect(() => smtpTransport(settings)).toThrow(TypeError);
  });

  it('ground control: the same settings without the extra key are accepted', () => {
    expect(() => track(smtpTransport(settingsFor(587, 'starttls')))).not.toThrow();
  });

  it('credentials reach the pool together or not at all', () => {
    const withCredentials = smtpTransportOptions(settingsFor(587, 'starttls'));
    const withoutCredentials = smtpTransportOptions({
      host: '127.0.0.1',
      port: 587,
      security: 'starttls',
    });

    expect(withCredentials.auth).toEqual({ user: 'mailer', pass: 'test-password' });
    expect(withoutCredentials.auth).toBeUndefined();
  });

  it.each<[string, Record<string, unknown>]>([
    ['a user without a password', { password: undefined }],
    ['a password without a user', { user: undefined }],
    ['an empty user', { user: '' }],
    ['an empty host', { host: '' }],
    ['a host with a space', { host: 'smtp example.org' }],
    ['port 0', { port: 0 }],
    ['port 65536', { port: 65_536 }],
    ['an unknown security mode', { security: 'ssl' }],
    // Without TLS the password would cross the network in plain text.
    ["credentials in the 'none' mode", { security: 'none' }],
  ])('settings with %s are refused without echoing the password', (_case, change) => {
    const settings = { ...settingsFor(587, 'starttls'), ...change } as SmtpSettings;

    const message = errorMessageOf(() => smtpTransportOptions(settings));
    expect(message).toMatch(/^TypeError: Invalid SMTP settings: \w+ \(\w+\)/);
    expect(message).not.toContain('test-password');
    expect(() => smtpTransport(settings)).toThrow(TypeError);
  });

  it.each([
    ['tls', true],
    ['starttls', false],
  ] as const)(
    '%s refuses a certificate nobody trusts, even with NODE_TLS_REJECT_UNAUTHORIZED=0',
    async (security, implicit) => {
      const server = await startSmtpServer({
        secure: implicit,
        key: untrusted.key,
        cert: untrusted.cert,
      });
      const transport = track(smtpTransport(settingsFor(server.port, security)));

      await withCertificateChecksOff(async () => {
        expect(await transport.send(EMAIL)).toMatchObject({ sent: false, errorKind: 'connection' });
      });
      expect(server.authentications).toEqual([]);
      expect(server.deliveries).toEqual([]);
    },
  );

  it('positive control: that switch alone makes a plain TLS client accept the certificate', async () => {
    const server = await startSmtpServer({
      secure: true,
      key: untrusted.key,
      cert: untrusted.cert,
    });

    expect(await tlsHandshake(server.port)).toEqual({ ok: false });
    await withCertificateChecksOff(async () => {
      expect(await tlsHandshake(server.port)).toMatchObject({ ok: true });
    });
  });

  it.each([
    ['tls', true],
    ['starttls', false],
  ] as const)(
    '%s refuses a server limited to TLS 1.1, even when the process default allows it',
    async (security, implicit) => {
      const server = await startSmtpServer({
        secure: implicit,
        key: trusted.key,
        cert: trusted.cert,
        ...TLS_1_1_ONLY,
      });
      const transport = track(smtpTransport(settingsFor(server.port, security)));

      await withWeakTlsDefaults(async () => {
        expect(await transport.send(EMAIL)).toMatchObject({ sent: false, errorKind: 'connection' });
      });
      expect(server.authentications).toEqual([]);
      expect(server.deliveries).toEqual([]);
    },
  );

  it('positive control: with those defaults a plain TLS client gets TLS 1.1 from that server', async () => {
    const server = await startSmtpServer({
      secure: true,
      key: trusted.key,
      cert: trusted.cert,
      ...TLS_1_1_ONLY,
    });

    await withWeakTlsDefaults(async () => {
      expect(await tlsHandshake(server.port)).toEqual({ ok: true, protocol: 'TLSv1.1' });
    });
  });
});

describe('The SMTP transport', () => {
  it('sends one plain-text UTF-8 part with the transport headers to exactly one recipient', async () => {
    const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));

    await transport.send(EMAIL);

    const raw = server.deliveries[0]?.raw ?? '';
    expect(headerOf(raw, 'Content-Type')).toBe(PLAIN_TEXT_CONTENT_TYPE);
    for (const [name, value] of Object.entries(TRANSPORT_HEADERS)) {
      expect(headerOf(raw, name)).toBe(value);
    }
    expect(headerOf(raw, 'To')).toBe(RECIPIENT);
    expect(raw).toContain(EMAIL.text);
    expect(raw).not.toMatch(/text\/html|multipart/i);
    expect(server.recipients).toEqual([[RECIPIENT]]);
  });

  it.each([
    [451, 'transient'],
    [421, 'transient'],
    [550, 'permanent'],
  ] as const)(
    'a recipient refused with %i is a %s failure reported without the server text',
    async (responseCode, errorKind) => {
      const server = await startSmtpServer({
        key: trusted.key,
        cert: trusted.cert,
        onRcptTo: refuseRecipients(responseCode),
      });
      const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));

      const result = await transport.send(EMAIL);

      expect(result).toEqual({ sent: false, errorKind, responseCode, errorCode: 'EENVELOPE' });
      expect(server.deliveries).toEqual([]);
    },
  );

  it('positive control: the server text of such a refusal carries the address', async () => {
    const server = await startSmtpServer({
      key: trusted.key,
      cert: trusted.cert,
      onRcptTo: refuseRecipients(550),
    });
    const raw = createTransport({
      host: '127.0.0.1',
      port: server.port,
      tls: { ...SMTP_TLS_SETTINGS },
      auth: { user: 'mailer', pass: 'test-password' },
    });
    cleanups.push(() => Promise.resolve(raw.close()));

    await expect(raw.sendMail({ ...EMAIL })).rejects.toThrow(RECIPIENT);
  });

  it('a refused login is an authentication failure and nothing is delivered', async () => {
    const server = await startSmtpServer({
      key: trusted.key,
      cert: trusted.cert,
      onAuth(_auth, _session, callback) {
        callback(new Error('Invalid credentials'));
      },
    });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));

    expect(await transport.send(EMAIL)).toEqual({
      sent: false,
      errorKind: 'authentication',
      responseCode: 535,
      errorCode: 'EAUTH',
    });
    expect(server.deliveries).toEqual([]);
  });

  // The send table keeps reply codes in 200-599 (CHECK).
  it.each([600, 199])('a reply code of %i is not reported as a reply code', async (code) => {
    const server = await startSmtpServer({
      key: trusted.key,
      cert: trusted.cert,
      onRcptTo: refuseRecipients(code),
    });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));

    expect(await transport.send(EMAIL)).toEqual({
      sent: false,
      errorKind: 'connection',
      responseCode: null,
      errorCode: 'EENVELOPE',
    });
  });

  it('a closed port is a connection failure', async () => {
    const transport = track(smtpTransport(settingsFor(await closedPort(), 'starttls')));

    expect(await transport.send(EMAIL)).toEqual({
      sent: false,
      errorKind: 'connection',
      responseCode: null,
      errorCode: 'ESOCKET',
    });
  });

  it('a connection dropped before the greeting is one attempt, not requeued', async () => {
    let connections = 0;
    const dropper = net.createServer((socket) => {
      connections += 1;
      socket.destroy();
    });
    await new Promise<void>((resolve) => dropper.listen(0, '127.0.0.1', resolve));
    cleanups.push(() => new Promise<void>((resolve) => dropper.close(() => resolve())));
    const address = dropper.address();
    if (address === null || typeof address === 'string') throw new Error('no port');
    const transport = track(smtpTransport(settingsFor(address.port, 'starttls')));

    expect(await transport.send(EMAIL)).toMatchObject({ sent: false, errorKind: 'connection' });
    await sleep(150);
    expect(connections).toBe(1);
  });

  it('after close a send fails as a connection failure and reaches no server', async () => {
    const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));
    expect(await transport.send(EMAIL)).toMatchObject({ sent: true });

    await transport.close();

    expect(await transport.send(EMAIL)).toEqual(CLOSED_RESULT);
    expect(server.deliveries).toHaveLength(1);
  });

  it('close waits for a send started in the same tick, and both closes resolve', async () => {
    const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));

    const pending = transport.send(EMAIL);
    await Promise.all([transport.close(), transport.close()]);

    expect(server.deliveries).toHaveLength(1);
    expect(await pending).toEqual({ sent: true, responseCode: 250 });
    expect(await transport.send(EMAIL)).toEqual(CLOSED_RESULT);
    expect(server.deliveries).toHaveLength(1);
  });

  it('close waits for queued sends while every connection is busy and refuses new ones meanwhile', async () => {
    const { maxConnections } = SMTP_CONNECTION_SETTINGS;
    const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert, holdData: true });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));
    const total = maxConnections + 2;
    const pending = Array.from({ length: total }, (_, index) =>
      transport.send({ ...EMAIL, subject: `Message ${index}` }),
    );
    await until(() => server.held.length === maxConnections);
    let closed = false;
    const closing = transport.close().then(() => {
      closed = true;
    });

    expect(await transport.send(EMAIL)).toEqual(CLOSED_RESULT);
    await sleep(50);
    expect(closed).toBe(false);
    await until(() => {
      for (const answer of server.held.splice(0)) answer();
      return server.deliveries.length === total && server.held.length === 0;
    });
    await closing;

    expect(await Promise.all(pending)).toEqual(
      Array.from({ length: total }, () => ({ sent: true, responseCode: 250 })),
    );
    expect(server.deliveries).toHaveLength(total);
  });

  it('once the sends have settled, close shuts the pool connections', async () => {
    const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));
    expect(await transport.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
    await sleep(50);
    // Ground: the pool keeps its connection open between sends.
    expect(server.openConnections()).toBe(1);

    await transport.close();

    await until(() => server.openConnections() === 0, 2000);
  });

  it('opens at most SMTP_CONNECTION_SETTINGS.maxConnections connections and sends the rest after', async () => {
    const { maxConnections } = SMTP_CONNECTION_SETTINGS;
    const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert, holdData: true });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));
    const total = maxConnections + 2;

    const pending = Array.from({ length: total }, (_, index) =>
      transport.send({ ...EMAIL, subject: `Message ${index}` }),
    );
    await until(() => server.held.length === maxConnections);
    await sleep(150);
    expect(server.peakOpenConnections()).toBe(maxConnections);
    expect(server.held).toHaveLength(maxConnections);

    await until(() => {
      for (const answer of server.held.splice(0)) answer();
      return server.deliveries.length === total && server.held.length === 0;
    });
    for (const answer of server.held.splice(0)) answer();
    const results = await Promise.all(pending);
    expect(results.every((result) => result.sent)).toBe(true);
    expect(server.deliveries).toHaveLength(total);
  });

  it('uses a pool of 5, 10 s to connect, greet and resolve, 30 s of socket silence, one attempt, no transcript', () => {
    expect(smtpTransportOptions(settingsFor(587, 'starttls'))).toMatchObject({
      pool: true,
      maxConnections: 5,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      dnsTimeout: 10_000,
      maxRequeues: 0,
      logger: false,
      debug: false,
      transactionLog: false,
    });
  });

  it('writes nothing about the conversation to the console', async () => {
    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
    try {
      const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert });
      const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));
      expect(await transport.send(EMAIL)).toMatchObject({ sent: true });

      const printed = spies.flatMap((spy) => spy.mock.calls.flat().map(String)).join('\n');
      expect(printed).not.toContain('istanbul.edu.tr');
      expect(printed).not.toContain('123456');
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  it('positive control: a Nodemailer pool with its logger on prints the recipient there', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert });
      const raw = createTransport({
        pool: true,
        host: '127.0.0.1',
        port: server.port,
        tls: { ...SMTP_TLS_SETTINGS },
        auth: { user: 'mailer', pass: 'test-password' },
        logger: true,
      });
      cleanups.push(() => Promise.resolve(raw.close()));
      await raw.sendMail({ ...EMAIL });

      expect(spy.mock.calls.flat().map(String).join('\n')).toContain(RECIPIENT);
    } finally {
      spy.mockRestore();
    }
  });
});

// Each name takes another path through Nodemailer's From encoding: as it is, quoted, a Q
// encoded word, a B encoded word, several encoded words folded on the wire.
const SENDER_NAMES: Array<[name: string, from: string]> = [
  ['Attendance', 'Attendance <noreply@example.org>'],
  ['Attendance "Office" \\ IU', '"Attendance \\"Office\\" \\\\ IU" <noreply@example.org>'],
  ['İÜ Yoklama', '=?UTF-8?Q?=C4=B0=C3=9C_Yoklama?= <noreply@example.org>'],
  ['İÜ', '=?UTF-8?B?xLDDnA==?= <noreply@example.org>'],
  [
    'İstanbul Üniversitesi Öğrenci İşleri Daire Başkanlığı Yoklama Sistemi Bildirimleri',
    '=?UTF-8?Q?=C4=B0stanbul_=C3=9Cniversitesi_=C3=96?= =?UTF-8?Q?=C4=9Frenci_=C4=B0=C5=9Fleri_Daire_Ba?= =?UTF-8?Q?=C5=9Fkanl=C4=B1=C4=9F=C4=B1_Yoklama_Sis?= =?UTF-8?Q?temi_Bildirimleri?= <noreply@example.org>',
  ],
];

describe('The fake mailbox keeps the transport contract', () => {
  it('records a delivered message with the Auto-Submitted, Content-Type and From the SMTP transport writes', async () => {
    const mailbox = fakeMailbox();

    expect(await mailbox.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
    expect(mailbox.messages()).toEqual([
      {
        to: RECIPIENT,
        subject: EMAIL.subject,
        text: EMAIL.text,
        headers: {
          'Auto-Submitted': 'auto-generated',
          'Content-Type': 'text/plain; charset=utf-8',
          From: 'Attendance <noreply@example.org>',
        },
      },
    ]);
    expect(Object.isFrozen(mailbox.messages())).toBe(true);
  });

  it('records each header exactly as the SMTP transport writes it, From in its encoded form', async () => {
    const server = await startSmtpServer({ key: trusted.key, cert: trusted.cert });
    const transport = track(smtpTransport(settingsFor(server.port, 'starttls')));
    const mailbox = fakeMailbox();
    for (const [name] of SENDER_NAMES) {
      const email = { ...EMAIL, from: { ...EMAIL.from, name } };
      expect(await transport.send(email)).toMatchObject({ sent: true });
      expect(await mailbox.send(email)).toMatchObject({ sent: true });
    }

    const recorded = mailbox.messages();
    expect(recorded.map((message) => message.headers.From)).toEqual(
      SENDER_NAMES.map(([, from]) => from),
    );
    expect(server.deliveries).toHaveLength(SENDER_NAMES.length);
    server.deliveries.forEach((delivery, index) => {
      const headers = recorded[index]?.headers ?? {};
      expect(Object.keys(headers).sort()).toEqual(['Auto-Submitted', 'Content-Type', 'From']);
      for (const [header, value] of Object.entries(headers)) {
        expect(headerOf(delivery.raw, header)).toBe(value);
      }
    });
    // The long name is folded on the wire and still compares equal.
    expect(server.deliveries.at(-1)?.raw).toMatch(/^From: [^\r\n]*\r\n[ \t]/m);
  });

  it('lists the messages of one address', async () => {
    const mailbox = fakeMailbox();
    const other = 'student@istanbul.edu.tr';
    await mailbox.send(EMAIL);
    await mailbox.send({ ...EMAIL, to: other, subject: 'Second' });

    expect(mailbox.messages()).toHaveLength(2);
    expect(mailbox.messages(other).map((message) => message.subject)).toEqual(['Second']);
    expect(mailbox.messages(RECIPIENT).map((message) => message.subject)).toEqual([EMAIL.subject]);
    expect(mailbox.messages('nobody@istanbul.edu.tr')).toEqual([]);
  });

  it('uses planned replies in call order, then delivers again', async () => {
    const mailbox = fakeMailbox();
    mailbox.planErrors({ responseCode: 451 }, { responseCode: 250 });

    expect(await mailbox.send(EMAIL)).toEqual({
      sent: false,
      errorKind: 'transient',
      responseCode: 451,
      errorCode: 'EMESSAGE',
    });
    expect(await mailbox.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
    expect(await mailbox.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
    expect(mailbox.messages()).toHaveLength(2);
    expect(mailbox.sendCount()).toBe(3);
  });

  it.each<[PlannedReply, string]>([
    [{ responseCode: 421 }, 'transient'],
    [{ responseCode: 550 }, 'permanent'],
    [{ responseCode: 535 }, 'authentication'],
    [{ connectionError: 'ETIMEDOUT' }, 'timeout'],
    [{ connectionError: 'ECONNREFUSED' }, 'connection'],
  ])('a planned %o fails as %s and delivers nothing', async (reply, errorKind) => {
    const mailbox = fakeMailbox();
    mailbox.planErrors(reply);

    expect(await mailbox.send(EMAIL)).toMatchObject({ sent: false, errorKind });
    expect(mailbox.messages()).toEqual([]);
    expect(await mailbox.send(EMAIL)).toMatchObject({ sent: true });
    expect(mailbox.messages()).toHaveLength(1);
  });

  it('fails exactly like the SMTP transport for the same server reply', async () => {
    for (const responseCode of [451, 550]) {
      const server = await startSmtpServer({
        key: trusted.key,
        cert: trusted.cert,
        onRcptTo: refuseRecipients(responseCode),
      });
      const real = await track(smtpTransport(settingsFor(server.port, 'starttls'))).send(EMAIL);
      const mailbox = fakeMailbox();
      mailbox.planErrors({ responseCode });
      const fake = await mailbox.send(EMAIL);

      expect(fake.sent).toBe(false);
      expect(real.sent).toBe(false);
      if (!fake.sent && !real.sent) {
        expect([fake.errorKind, fake.responseCode]).toEqual([real.errorKind, real.responseCode]);
      }
    }
    const authServer = await startSmtpServer({
      key: trusted.key,
      cert: trusted.cert,
      onAuth(_auth, _session, callback) {
        callback(new Error('Invalid credentials'));
      },
    });
    const refusedLogin = await track(smtpTransport(settingsFor(authServer.port, 'starttls'))).send(
      EMAIL,
    );
    const refused = await track(smtpTransport(settingsFor(await closedPort(), 'starttls'))).send(
      EMAIL,
    );
    const mailbox = fakeMailbox();
    mailbox.planErrors({ responseCode: 535 }, { connectionError: 'ECONNREFUSED' });

    expect(await mailbox.send(EMAIL)).toEqual(refusedLogin);
    expect(await mailbox.send(EMAIL)).toEqual(refused);
  });

  it('after close a send fails exactly as on the SMTP transport', async () => {
    const transport = track(smtpTransport(settingsFor(587, 'starttls')));
    const mailbox = fakeMailbox();
    await Promise.all([transport.close(), mailbox.close()]);

    const real = await transport.send(EMAIL);

    expect(await mailbox.send(EMAIL)).toEqual(real);
    expect(real).toEqual(CLOSED_RESULT);
  });

  it('settles every send after the set delay, driven by fake timers', async () => {
    vi.useFakeTimers();
    try {
      const mailbox = fakeMailbox();
      mailbox.delay(10_000);
      mailbox.planErrors({ connectionError: 'ECONNREFUSED' });
      let settled = false;
      const pending = mailbox.send(EMAIL).then((result) => {
        settled = true;
        return result;
      });

      await vi.advanceTimersByTimeAsync(9_999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(settled).toBe(true);
      expect(await pending).toMatchObject({ sent: false, errorKind: 'connection' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('clear gives a fresh mailbox: no messages, plans or delay, count zero, open again', async () => {
    const mailbox = fakeMailbox();
    await mailbox.send(EMAIL);
    mailbox.planErrors({ responseCode: 550 });
    mailbox.delay(60_000);
    await mailbox.close();

    mailbox.clear();

    expect(mailbox.messages()).toEqual([]);
    expect(mailbox.sendCount()).toBe(0);
    expect(await mailbox.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
    expect(mailbox.messages()).toHaveLength(1);
  });

  it('a send in flight when the mailbox is cleared does not appear afterwards', async () => {
    vi.useFakeTimers();
    try {
      const cleared = fakeMailbox();
      const kept = fakeMailbox();
      for (const mailbox of [cleared, kept]) mailbox.delay(1_000);
      const pending = [cleared.send(EMAIL), kept.send(EMAIL)];
      cleared.clear();
      await vi.advanceTimersByTimeAsync(1_000);
      await Promise.all(pending);

      expect(cleared.messages()).toEqual([]);
      expect(kept.messages()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('close waits for a send in flight and refuses later sends at once', async () => {
    vi.useFakeTimers();
    try {
      const mailbox = fakeMailbox();
      mailbox.delay(100);
      const inFlight = mailbox.send(EMAIL);
      let closed = false;
      const closing = mailbox.close().then(() => {
        closed = true;
      });

      expect(await mailbox.send(EMAIL)).toEqual(CLOSED_RESULT);
      await vi.advanceTimersByTimeAsync(99);
      expect(closed).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await inFlight).toEqual({ sent: true, responseCode: 250 });
      await closing;
      expect(closed).toBe(true);
      expect(mailbox.messages()).toHaveLength(1);
      expect(mailbox.sendCount()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clear ends a close still waiting and opens the mailbox again', async () => {
    vi.useFakeTimers();
    try {
      const mailbox = fakeMailbox();
      mailbox.delay(1_000);
      const cutOff = mailbox.send(EMAIL);
      let closed = false;
      const closing = mailbox.close().then(() => {
        closed = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(closed).toBe(false);

      mailbox.clear();
      await vi.advanceTimersByTimeAsync(0);

      expect(closed).toBe(true);
      await closing;
      expect(await mailbox.send(EMAIL)).toEqual({ sent: true, responseCode: 250 });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(await cutOff).toEqual({ sent: true, responseCode: 250 });
      expect(mailbox.messages()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a later close does not wait for a send cut off by clear', async () => {
    vi.useFakeTimers();
    try {
      const mailbox = fakeMailbox();
      mailbox.delay(1_000);
      const cutOff = mailbox.send(EMAIL);
      mailbox.clear();
      mailbox.delay(2_000);
      const current = mailbox.send(EMAIL);
      let closed = false;
      const closing = mailbox.close().then(() => {
        closed = true;
      });

      await vi.advanceTimersByTimeAsync(1_000);
      await cutOff;
      expect(closed).toBe(false);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(await current).toEqual({ sent: true, responseCode: 250 });
      await vi.advanceTimersByTimeAsync(0);
      expect(closed).toBe(true);
      await closing;
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['reply code 199', () => fakeMailbox().planErrors({ responseCode: 199 })],
    ['reply code 354', () => fakeMailbox().planErrors({ responseCode: 354 })],
    ['reply code 600', () => fakeMailbox().planErrors({ responseCode: 600 })],
    [
      'an unknown connection error',
      () => fakeMailbox().planErrors({ connectionError: 'EHOSTUNREACH' } as never),
    ],
    [
      'a reply code and an error together',
      () => fakeMailbox().planErrors({ responseCode: 250, connectionError: 'ETIMEDOUT' } as never),
    ],
    ['a negative delay', () => fakeMailbox().delay(-1)],
    ['a fractional delay', () => fakeMailbox().delay(1.5)],
  ])('refuses %s', (_case, call) => {
    expect(call).toThrow(TypeError);
  });

  it('ground control: well-formed plans and delays are taken', () => {
    const mailbox = fakeMailbox();
    expect(() =>
      mailbox.planErrors({ responseCode: 250 }, { connectionError: 'ETIMEDOUT' }),
    ).not.toThrow();
    expect(() => mailbox.delay(0)).not.toThrow();
  });
});

describe('Every transport refuses a malformed e-mail', () => {
  const MALFORMED: Array<[string, unknown]> = [
    ['two recipients in one address', { ...EMAIL, to: `${RECIPIENT}, other@istanbul.edu.tr` }],
    ['a display name in the recipient', { ...EMAIL, to: `Lecturer <${RECIPIENT}>` }],
    ['a line break in the subject', { ...EMAIL, subject: 'Code\r\nBcc: spy@example.org' }],
    ['a line break in the sender name', { ...EMAIL, from: { ...EMAIL.from, name: 'A\nB' } }],
    ['an empty text', { ...EMAIL, text: '' }],
    ['an HTML part', { ...EMAIL, html: '<p>code</p>' }],
    ['extra headers', { ...EMAIL, headers: { 'X-Extra': '1' } }],
  ];

  it.each(MALFORMED)('%s', async (_case, email) => {
    const transport = track(smtpTransport(settingsFor(587, 'starttls')));

    await expect(fakeMailbox().send(email as OutgoingEmail)).rejects.toThrow(TypeError);
    await expect(transport.send(email as OutgoingEmail)).rejects.toThrow(TypeError);
  });

  it('ground control: the well-formed e-mail passes the same check', () => {
    expect(parseOutgoingEmail(EMAIL)).toEqual(EMAIL);
  });

  it('the refusal names the fields, never their values', () => {
    const email = { ...EMAIL, to: 'hidden.person@istanbul.edu.tr, x@example.org', text: '' };

    const message = errorMessageOf(() => parseOutgoingEmail(email));
    expect(message).toMatch(/\bto\b/);
    expect(message).toMatch(/\btext\b/);
    expect(message).not.toContain('hidden.person');
  });
});

// ---------------------------------------------------------------------------------

const VALID_DATA: EmailData = {
  sign_in_code: { code: '123456', validityMinutes: 5 },
  application_code: { code: '654321', validityMinutes: 5 },
  application_deletion_code: { code: '000000', validityMinutes: 5 },
  approval_pending: {},
  sign_in_notification: {
    signedInAt: new Date('2026-10-06T06:58:00Z'),
    client: 'panel',
    deviceLabel: 'Edge, Windows',
    closedSessionLabel: null,
  },
  application_approved: {},
  operations_warning: { subject: 'Backup is late', lines: ['Last backup: 26 hours ago'] },
  operations_summary: { subject: 'Weekly summary', lines: [] },
};

const accepts = (type: keyof EmailData, data: unknown) =>
  EMAIL_TYPES[type].data.safeParse(data).success;

describe('E-mail types', () => {
  it('are the eight types of the specification with their limit and product flags', () => {
    expect(
      Object.entries(EMAIL_TYPES).map(([type, row]) => [type, row.limited, row.product]),
    ).toEqual([
      ['sign_in_code', true, true],
      ['application_code', true, true],
      ['application_deletion_code', true, true],
      ['approval_pending', true, true],
      ['sign_in_notification', false, true],
      ['application_approved', false, true],
      ['operations_warning', false, false],
      ['operations_summary', false, false],
    ]);
  });

  it('every e-mail that carries a code counts toward the limit', () => {
    const carriesCode = Object.entries(EMAIL_TYPES).filter(
      ([type]) => 'code' in (VALID_DATA[type as keyof EmailData] as object),
    );

    expect(carriesCode.length).toBeGreaterThan(0);
    expect(carriesCode.every(([, row]) => row.limited && row.product)).toBe(true);
  });

  it('the table and its rows are frozen', () => {
    expect(Object.isFrozen(EMAIL_TYPES)).toBe(true);
    expect(Object.values(EMAIL_TYPES).every((row) => Object.isFrozen(row))).toBe(true);
  });

  // Checked by the type checker; at run time these calls do nothing.
  it('the derived types are those of the specification', () => {
    expectTypeOf<EmailData['sign_in_code']>().toEqualTypeOf<{
      code: string;
      validityMinutes: number;
    }>();
    expectTypeOf<EmailData['approval_pending']>().toEqualTypeOf<Record<string, never>>();
    expectTypeOf<EmailData['sign_in_notification']>().toEqualTypeOf<{
      signedInAt: Date;
      client: 'phone' | 'panel';
      deviceLabel: string;
      closedSessionLabel: string | null;
    }>();
    expectTypeOf<EmailData['operations_summary']>().toEqualTypeOf<{
      subject: string;
      lines: string[];
    }>();
    expectTypeOf<LimitedEmailType>().toEqualTypeOf<
      'sign_in_code' | 'application_code' | 'application_deletion_code' | 'approval_pending'
    >();
    expectTypeOf<Exclude<EmailType, ProductEmailType>>().toEqualTypeOf<
      'operations_warning' | 'operations_summary'
    >();
    expectTypeOf<DeliveryErrorKind>().toEqualTypeOf<
      'transient' | 'permanent' | 'connection' | 'timeout' | 'authentication'
    >();
  });

  it.each(Object.keys(EMAIL_TYPES) as Array<keyof EmailData>)(
    '%s data refuses an unknown field',
    (type) => {
      expect(accepts(type, VALID_DATA[type])).toBe(true);
      expect(accepts(type, { ...VALID_DATA[type], email: RECIPIENT })).toBe(false);
    },
  );

  it('codes are exactly six ASCII digits', () => {
    const digits = fc.string({ unit: fc.constantFrom(...'0123456789'), maxLength: 9 });
    const isSixAsciiDigits = (code: string) =>
      code.length === 6 && [...code].every((char) => char >= '0' && char <= '9');
    fc.assert(
      fc.property(fc.oneof(digits, fc.string({ unit: 'binary', maxLength: 9 })), (code) => {
        expect(accepts('sign_in_code', { code, validityMinutes: 5 })).toBe(isSixAsciiDigits(code));
      }),
      { numRuns: 2000 },
    );
    for (const code of ['000000', '999999']) {
      expect(accepts('application_deletion_code', { code, validityMinutes: 5 })).toBe(true);
    }
    for (const code of ['12345', '1234567', '12345a', '١٢٣٤٥٦', ' 123456']) {
      expect(accepts('application_code', { code, validityMinutes: 5 })).toBe(false);
    }
  });

  it('validity is whole minutes up to an hour, so seconds passed by mistake are refused', () => {
    for (const validityMinutes of [1, 5, 60]) {
      expect(accepts('sign_in_code', { code: '123456', validityMinutes })).toBe(true);
    }
    for (const validityMinutes of [0, -5, 2.5, 61, 300]) {
      expect(accepts('sign_in_code', { code: '123456', validityMinutes })).toBe(false);
    }
  });

  it('code-less e-mails cannot carry a code', () => {
    for (const type of ['approval_pending', 'application_approved'] as const) {
      expect(accepts(type, {})).toBe(true);
      expect(accepts(type, { code: '123456' })).toBe(false);
    }
  });

  it('device labels are one line of 1 to 60 characters; a label with a link passes for the template to replace', () => {
    const notification = (deviceLabel: string, closedSessionLabel: string | null = null) => ({
      ...VALID_DATA.sign_in_notification,
      deviceLabel,
      closedSessionLabel,
    });

    for (const label of [
      'iPhone, iOS',
      'Samsung (Android 16) - Chrome.',
      'Bilinmeyen tarayıcı',
      // D14 tests[24]: the e-mail then says 'Bilinmeyen cihaz' instead of the label.
      'Edge http://ornek.example',
      'evil.example/login',
      'user@evil.example',
      '<b>Edge</b>',
      'a'.repeat(60),
    ]) {
      expect(accepts('sign_in_notification', notification(label))).toBe(true);
      expect(accepts('sign_in_notification', notification('Edge, Windows', label))).toBe(true);
    }
    for (const label of ['a'.repeat(61), '', 'Edge\nWindows', 'Edge\r\nWindows', 'Edge\tWindows']) {
      expect(accepts('sign_in_notification', notification(label))).toBe(false);
      expect(accepts('sign_in_notification', notification('Edge, Windows', label))).toBe(false);
    }
  });

  it('sign-in notifications come from a phone or the panel with a real instant', () => {
    const base = VALID_DATA.sign_in_notification;

    expect(accepts('sign_in_notification', { ...base, client: 'phone' })).toBe(true);
    expect(accepts('sign_in_notification', { ...base, client: 'lectern' })).toBe(false);
    expect(accepts('sign_in_notification', { ...base, signedInAt: new Date(Number.NaN) })).toBe(
      false,
    );
    expect(
      accepts('sign_in_notification', { ...base, signedInAt: base.signedInAt.toISOString() }),
    ).toBe(false);
  });

  it('operations e-mails keep the subject on one line; body lines may hold tabs and line breaks', () => {
    for (const type of ['operations_warning', 'operations_summary'] as const) {
      expect(
        accepts(type, {
          subject: 'Disk 91%',
          lines: ['', 'operations.wal_archive late', 'isletim.disk\t91%', 'two\r\nlines', 'a\nb\n'],
        }),
      ).toBe(true);
      for (const subject of ['', 'Disk\nBcc: x', 'Disk\r\nBcc: x', 'Disk\rfull', 'Disk\tfull']) {
        expect(accepts(type, { subject, lines: [] })).toBe(false);
      }
    }
  });

  it('operations e-mails hold a subject of up to 200 characters and up to 1,000 lines of up to 1,000', () => {
    const lines = (count: number, length: number) =>
      Array.from({ length: count }, () => 'y'.repeat(length));
    for (const type of ['operations_warning', 'operations_summary'] as const) {
      expect(accepts(type, { subject: 'x'.repeat(200), lines: lines(1000, 1000) })).toBe(true);
      expect(accepts(type, { subject: 'x'.repeat(201), lines: [] })).toBe(false);
      expect(accepts(type, { subject: 'Disk', lines: lines(1, 1001) })).toBe(false);
      expect(accepts(type, { subject: 'Disk', lines: lines(1001, 0) })).toBe(false);
    }
  });
});

describe('Failure kinds', () => {
  it('only shutdown, capacity and database end before a delivery attempt', () => {
    expect(
      Object.entries(EMAIL_ERROR_KINDS).map(([kind, row]) => [kind, row.deliveryAttempted]),
    ).toEqual([
      ['transient', true],
      ['permanent', true],
      ['connection', true],
      ['timeout', true],
      ['authentication', true],
      ['shutdown', false],
      ['capacity', false],
      ['database', false],
    ]);
    expect(Object.isFrozen(EMAIL_ERROR_KINDS)).toBe(true);
  });

  // SMTP 4xx is transient and 5xx permanent (send table); the rows at 199, 399, 400, 499,
  // 500, 599 and 600 hold the edges.
  it.each([
    ['ETIMEDOUT', null, null, 'timeout'],
    ['ETIMEDOUT', 451, 'CONN', 'timeout'],
    ['ETLS', 500, 'STARTTLS', 'connection'],
    ['ETLS', 454, 'STARTTLS', 'connection'],
    ['ETLS', null, null, 'connection'],
    ['ESOCKET', null, 'CONN', 'connection'],
    ['ECONNECTION', 502, 'EHLO', 'connection'],
    ['ECONNECTION', 500, 'EHLO', 'connection'],
    ['ECONNECTION', 451, 'EHLO', 'transient'],
    ['ECONNECTION', 421, 'EHLO', 'transient'],
    ['EPROTOCOL', 502, 'HELO', 'permanent'],
    ['EAUTH', 535, 'AUTH PLAIN', 'authentication'],
    ['EAUTH', null, null, 'authentication'],
    ['ENOAUTH', null, null, 'authentication'],
    ['EAUTH', 454, 'AUTH PLAIN', 'transient'],
    [null, 535, null, 'authentication'],
    ['EENVELOPE', 400, 'RCPT TO', 'transient'],
    ['EENVELOPE', 451, 'RCPT TO', 'transient'],
    ['EENVELOPE', 499, 'RCPT TO', 'transient'],
    ['ECONNECTION', 421, null, 'transient'],
    ['EENVELOPE', 500, 'RCPT TO', 'permanent'],
    ['EENVELOPE', 550, 'RCPT TO', 'permanent'],
    ['EMESSAGE', 552, 'DATA', 'permanent'],
    ['EPROTOCOL', 554, null, 'permanent'],
    ['EENVELOPE', 599, 'RCPT TO', 'permanent'],
    ['EENVELOPE', 399, 'RCPT TO', 'connection'],
    ['EENVELOPE', 199, 'RCPT TO', 'connection'],
    ['EENVELOPE', 600, 'RCPT TO', 'connection'],
    ['ESOCKET', null, null, 'connection'],
    ['ECONNECTION', null, null, 'connection'],
    ['EDNS', null, null, 'connection'],
    [null, null, null, 'connection'],
  ] as const)('code %s with reply %s on command %s is %s', (code, responseCode, command, kind) => {
    expect(classifyTransportFailure({ code, responseCode, command })).toBe(kind);
  });

  it('a transport never reports a kind that ends before a delivery attempt', () => {
    const processSide = Object.entries(EMAIL_ERROR_KINDS).filter(
      ([, row]) => !row.deliveryAttempted,
    );
    expect(processSide.length).toBeGreaterThan(0);
    fc.assert(
      fc.property(
        fc.option(fc.oneof(fc.constantFrom('ETIMEDOUT', 'ETLS', 'EAUTH', 'ESOCKET'), fc.string())),
        fc.option(fc.integer({ min: 200, max: 599 })),
        fc.option(fc.oneof(fc.constantFrom('EHLO', 'HELO', 'STARTTLS', 'DATA'), fc.string())),
        (code, responseCode, command) => {
          const kind = classifyTransportFailure({ code, responseCode, command });
          expect(EMAIL_ERROR_KINDS[kind].deliveryAttempted).toBe(true);
          if (code === 'ETIMEDOUT') expect(kind).toBe('timeout');
          if (code === 'ETLS') expect(kind).toBe('connection');
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('every transport result kind is a delivery failure kind', async () => {
    const mailbox = fakeMailbox();
    mailbox.planErrors({ responseCode: 550 });
    const result: TransportResult = await mailbox.send(EMAIL);

    expect(result.sent).toBe(false);
    if (!result.sent) expect(EMAIL_ERROR_KINDS[result.errorKind].deliveryAttempted).toBe(true);
  });
});

describe('Fixed sentences', () => {
  const SENTENCES = { FIXED_WARNING_SENTENCE, IF_NOT_YOU_SENTENCE, JOBS_GENERIC_ERROR_TEXT };
  const looksLikeLink = (text: string) => /:\/\/|www\.|@/i.test(text);

  it.each(Object.entries(SENTENCES))(
    '%s is one line of text without a link in every language',
    (_name, text) => {
      expect(Object.keys(text).sort()).toEqual([...LANGUAGES].sort());
      for (const language of LANGUAGES) {
        const sentence = text[language];
        expect(sentence.length).toBeGreaterThan(0);
        expect(sentence.trim()).toBe(sentence);
        expect(sentence).toMatch(/^\P{Cc}+$/u);
        expect(sentence.endsWith('.')).toBe(true);
        expect(looksLikeLink(sentence)).toBe(false);
      }
      expect(new Set(LANGUAGES.map((language) => text[language])).size).toBe(LANGUAGES.length);
      expect(Object.isFrozen(text)).toBe(true);
    },
  );

  it('positive control: the link check flags a link', () => {
    expect(looksLikeLink('Open https://example.org now.')).toBe(true);
    expect(looksLikeLink('Write to help@example.org.')).toBe(true);
  });
});

// The values of the specification, written out on purpose: every other test imports these
// constants, so only a literal here notices when one of them drifts.
describe('Values of the specification', () => {
  it('the fixed sentences are those of the D14 constants table, byte for byte', () => {
    expect({ FIXED_WARNING_SENTENCE, IF_NOT_YOU_SENTENCE, JOBS_GENERIC_ERROR_TEXT }).toEqual({
      FIXED_WARNING_SENTENCE: {
        tr: 'Bu kodu yalnız uygulamaya ya da panele gir; uygulama kodu e-postayla, telefonla ya da başka bir yolla asla istemez.',
        en: 'Enter this code only in the app or on the panel; the app never asks for the code by e-mail, phone or any other way.',
      },
      IF_NOT_YOU_SENTENCE: {
        tr: 'Sen değilsen Oturumlarım ekranından kapat.',
        en: 'If this was not you, sign it out from the My sessions screen.',
      },
      JOBS_GENERIC_ERROR_TEXT: {
        tr: 'Beklenmeyen bir sorun oldu. Biraz sonra yeniden dene.',
        en: 'Something unexpected went wrong. Try again in a moment.',
      },
    });
  });

  it('every message is plain UTF-8 text marked Auto-Submitted: auto-generated', () => {
    expect(TRANSPORT_HEADERS).toEqual({ 'Auto-Submitted': 'auto-generated' });
    expect(PLAIN_TEXT_CONTENT_TYPE).toBe('text/plain; charset=utf-8');
  });

  it('product e-mails go to istanbul.edu.tr and a device label holds at most 60 characters', () => {
    expect(PRODUCT_RECIPIENT_DOMAIN).toBe('istanbul.edu.tr');
    expect(DEVICE_LABEL_MAX_LENGTH).toBe(60);
  });

  it('the pool has 5 connections, 10 s to connect and to greet, 30 s of socket silence', () => {
    expect(SMTP_CONNECTION_SETTINGS).toEqual({
      maxConnections: 5,
      connectionTimeoutMs: 10_000,
      greetingTimeoutMs: 10_000,
      socketTimeoutMs: 30_000,
    });
  });

  it('TLS is version 1.2 or later with certificate checks on', () => {
    expect(SMTP_TLS_SETTINGS).toEqual({ minVersion: 'TLSv1.2', rejectUnauthorized: true });
  });
});
