// The SMTP transport: a Nodemailer pool behind the EmailTransport contract. The TLS
// rules cannot be weakened from the settings: 'tls' is implicit TLS, 'starttls' demands
// the upgrade (a server that does not offer STARTTLS gets neither AUTH nor DATA), both
// with SMTP_TLS_SETTINGS; 'none' is for Mailpit in development only, takes no
// credentials, and the composition root refuses it anywhere else.
import type { SMTPPoolOptions } from 'nodemailer';
import { createTransport } from 'nodemailer';
import MimeNode from 'nodemailer/lib/mime-node';
import { z } from 'zod';
import {
  classifyTransportFailure,
  type EmailTransport,
  type OutgoingEmail,
  parseOutgoingEmail,
  TRANSPORT_HEADERS,
  type TransportResult,
} from './types.ts';

export const SMTP_TLS_SETTINGS = Object.freeze({
  minVersion: 'TLSv1.2',
  rejectUnauthorized: true,
} as const);

// The transport's share of the sender settings (D14-B17): pool size and timeouts.
export const SMTP_CONNECTION_SETTINGS = Object.freeze({
  maxConnections: 5,
  connectionTimeoutMs: 10_000,
  greetingTimeoutMs: 10_000,
  socketTimeoutMs: 30_000,
});

export const SMTP_SECURITY_MODES = ['tls', 'starttls', 'none'] as const;
export type SmtpSecurity = (typeof SMTP_SECURITY_MODES)[number];

// Strict: a key such as tls, secure or rejectUnauthorized is refused, not ignored.
const smtpSettingsSchema = z
  .strictObject({
    host: z
      .string()
      .min(1)
      .max(253)
      .regex(/^[A-Za-z0-9.:-]+$/),
    port: z.int().min(1).max(65_535),
    security: z.enum(SMTP_SECURITY_MODES),
    user: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
  })
  .refine((settings) => (settings.user === undefined) === (settings.password === undefined), {
    message: 'user and password come together',
    path: ['password'],
  })
  // Without TLS the password would cross the network in plain text.
  .refine(
    (settings) =>
      settings.security !== 'none' ||
      (settings.user === undefined && settings.password === undefined),
    { message: "'none' takes no credentials", path: ['user'] },
  );

export type SmtpSettings = z.input<typeof smtpSettingsSchema>;

function securityOptions(
  security: SmtpSecurity,
): Pick<SMTPPoolOptions, 'secure' | 'requireTLS' | 'ignoreTLS' | 'tls'> {
  switch (security) {
    case 'tls':
      return { secure: true, tls: { ...SMTP_TLS_SETTINGS } };
    case 'starttls':
      return { secure: false, requireTLS: true, tls: { ...SMTP_TLS_SETTINGS } };
    case 'none':
      return { secure: false, ignoreTLS: true };
  }
}

// The Nodemailer options of a transport; settings are checked first. The error names
// fields and rules only: the settings hold the SMTP password.
export function smtpTransportOptions(settings: SmtpSettings): SMTPPoolOptions & { pool: true } {
  const parsed = smtpSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || 'settings'} (${issue.code})`,
    );
    throw new TypeError(`Invalid SMTP settings: ${problems.join(', ')}`);
  }
  const { host, port, security, user, password } = parsed.data;
  return {
    pool: true,
    host,
    port,
    maxConnections: SMTP_CONNECTION_SETTINGS.maxConnections,
    // One send is one delivery attempt; retries belong to the sender.
    maxRequeues: 0,
    connectionTimeout: SMTP_CONNECTION_SETTINGS.connectionTimeoutMs,
    greetingTimeout: SMTP_CONNECTION_SETTINGS.greetingTimeoutMs,
    socketTimeout: SMTP_CONNECTION_SETTINGS.socketTimeoutMs,
    // Resolving the host is part of connecting.
    dnsTimeout: SMTP_CONNECTION_SETTINGS.connectionTimeoutMs,
    // The SMTP transcript carries addresses and codes.
    logger: false,
    debug: false,
    transactionLog: false,
    ...securityOptions(security),
    ...(user !== undefined && password !== undefined ? { auth: { user, pass: password } } : {}),
  };
}

// The send table keeps reply codes in 200-599; anything else is not a reply.
function isReplyCode(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 200 && (value as number) <= 599;
}

function replyCodeOf(response: unknown): number | null {
  if (typeof response !== 'string') return null;
  const match = /^([2-5][0-9]{2})(?:[ -]|$)/.exec(response);
  return match === null ? null : Number(match[1]);
}

// Keeps the error code and the reply code of a Nodemailer error; the failed command only
// steers the classification.
function failureOf(error: unknown): TransportResult {
  const fields: Record<string, unknown> =
    typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
  const code = typeof fields.code === 'string' ? fields.code : null;
  const responseCode = isReplyCode(fields.responseCode) ? fields.responseCode : null;
  const command = typeof fields.command === 'string' ? fields.command : null;
  return {
    sent: false,
    errorKind: classifyTransportFailure({ code, responseCode, command }),
    responseCode,
    errorCode: code,
  };
}

// The From header this transport writes for a sender, made by Nodemailer's own header
// code and unfolded: a plain name stays as it is, other ASCII is quoted, a non-ASCII name
// becomes RFC 2047 encoded words. The fake mailbox records the same value.
export function smtpFromHeader(from: OutgoingEmail['from']): string {
  const headers = new MimeNode('text/plain')
    .setHeader('From', { name: from.name, address: from.address })
    .buildHeaders();
  // Unfolding removes every line break that a space or a tab follows.
  return /^From: (.*)$/m.exec(headers.replace(/\r\n(?=[ \t])/g, ''))?.[1] ?? '';
}

export function smtpTransport(settings: SmtpSettings): EmailTransport {
  const pool = createTransport(smtpTransportOptions(settings));
  // Sends started and not yet settled, and the close waiting for them to end.
  let pending = 0;
  let drained: (() => void) | undefined;
  let closing: Promise<void> | undefined;

  async function deliver(message: OutgoingEmail): Promise<TransportResult> {
    try {
      const info = await pool.sendMail({
        from: { name: message.from.name, address: message.from.address },
        to: message.to,
        subject: message.subject,
        text: message.text,
        headers: { ...TRANSPORT_HEADERS },
      });
      return { sent: true, responseCode: replyCodeOf(info.response) };
    } catch (error) {
      return failureOf(error);
    }
  }

  return {
    async send(email) {
      const message = parseOutgoingEmail(email);
      // Once close is called nothing reaches the pool; the code is the one Nodemailer
      // gives a closed pool.
      if (closing !== undefined) return failureOf({ code: 'ECONNECTION' });
      pending += 1;
      try {
        return await deliver(message);
      } finally {
        pending -= 1;
        if (pending === 0) drained?.();
      }
    },
    // Closing the pool at once would fail the queued sends; it waits for them instead.
    close() {
      closing ??= new Promise<void>((resolve) => {
        drained = resolve;
        if (pending === 0) resolve();
      }).then(() => pool.close());
      return closing;
    },
  };
}
