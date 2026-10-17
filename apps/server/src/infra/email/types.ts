// E-mail types, their template data, failure kinds and the transport contract in one
// place: the CHECK lists of the e-mail send table, the sender and every transport read
// these constants instead of keeping their own lists.
import type { Identity } from '@iu-attendance/contracts/shared/identity';
import { z } from 'zod';

// Product e-mails go only to this exact domain (no subdomain).
export const PRODUCT_RECIPIENT_DOMAIN = 'istanbul.edu.tr';

export const DEVICE_LABEL_MAX_LENGTH = 60;

const SIX_DIGIT_CODE = /^[0-9]{6}$/;
// No control character and no line or paragraph separator, so no line break either.
const SINGLE_LINE = /^[^\p{Cc}\u2028\u2029]*$/u;

/** True for one line of text by the rule every header and label here keeps. */
export const isSingleLine = (text: string) => SINGLE_LINE.test(text);

const SIGN_IN_CLIENTS = ['phone', 'panel'] as const satisfies readonly Identity['client'][];

const codeData = z.strictObject({
  code: z.string().regex(SIX_DIGIT_CODE),
  // Minutes: a value above an hour means the caller passed seconds.
  validityMinutes: z.int().min(1).max(60),
});
// Code-less e-mails take no data, so no code can travel in them.
const noData = z.strictObject({});
// One line of any characters: a label that carries a link passes here, and the template
// writes 'Bilinmeyen cihaz' / 'Unknown device' in its place.
const deviceLabel = z.string().min(1).max(DEVICE_LABEL_MAX_LENGTH).regex(SINGLE_LINE);
// The instants the e-mail's time phrase can write: a sign-in is never before 1970, and the
// phrase stops at the year 9999 (the bound leaves 21 hours before Istanbul's year 10000).
// In Unix milliseconds, since a Date can be changed in place.
export const SIGN_IN_INSTANT_RANGE_MS = Object.freeze({
  earliest: 0,
  latest: Date.UTC(9999, 11, 31),
});
const signInNotificationData = z.strictObject({
  signedInAt: z
    .date()
    .min(new Date(SIGN_IN_INSTANT_RANGE_MS.earliest))
    .max(new Date(SIGN_IN_INSTANT_RANGE_MS.latest)),
  client: z.enum(SIGN_IN_CLIENTS),
  deviceLabel,
  closedSessionLabel: deviceLabel.nullable(),
});
// The subject goes into a header and stays on one line; body lines are text and may hold
// tabs and line breaks. At most OPERATIONS_LINE_LIMIT lines, so the body fits a transport
// even when every link grows to [adres]: a line of 1,000 characters renders at most 3,999
// ('@ @ ...' becomes '[adres] [adres] ...'), 200 of them under 800,000.
export const OPERATIONS_LINE_LIMIT = 200;
const operationsData = z.strictObject({
  subject: z.string().min(1).max(200).regex(SINGLE_LINE),
  lines: z.array(z.string().max(1000)).max(OPERATIONS_LINE_LIMIT),
});

type EmailTypeDefinition = {
  readonly limited: boolean;
  readonly product: boolean;
  readonly data: z.ZodType;
};

// limited: counts toward the per-address sliding window limit. product: written to a
// person in their language (a template per language), sent only to
// PRODUCT_RECIPIENT_DOMAIN and ending with the fixed warning sentence. Operations
// e-mails are Turkish only and carry no fixed sentence.
const EMAIL_TYPE_ROWS = {
  sign_in_code: { limited: true, product: true, data: codeData },
  application_code: { limited: true, product: true, data: codeData },
  application_deletion_code: { limited: true, product: true, data: codeData },
  approval_pending: { limited: true, product: true, data: noData },
  sign_in_notification: { limited: false, product: true, data: signInNotificationData },
  application_approved: { limited: false, product: true, data: noData },
  operations_warning: { limited: false, product: false, data: operationsData },
  operations_summary: { limited: false, product: false, data: operationsData },
} as const satisfies Record<string, EmailTypeDefinition>;

for (const row of Object.values(EMAIL_TYPE_ROWS)) Object.freeze(row);
export const EMAIL_TYPES: typeof EMAIL_TYPE_ROWS = Object.freeze(EMAIL_TYPE_ROWS);

export type EmailType = keyof typeof EMAIL_TYPES;
export type LimitedEmailType = {
  [K in EmailType]: (typeof EMAIL_TYPES)[K]['limited'] extends true ? K : never;
}[EmailType];
export type ProductEmailType = {
  [K in EmailType]: (typeof EMAIL_TYPES)[K]['product'] extends true ? K : never;
}[EmailType];
export type OperationsEmailType = Exclude<EmailType, ProductEmailType>;
export type EmailData = { [K in EmailType]: z.output<(typeof EMAIL_TYPES)[K]['data']> };

// deliveryAttempted: an SMTP delivery attempt finished with this failure; such a send
// counts toward the limit and toward consecutive failures. shutdown, capacity and
// database end on the process side before any attempt and count toward neither.
const EMAIL_ERROR_KIND_ROWS = {
  transient: { deliveryAttempted: true }, // SMTP 4xx
  permanent: { deliveryAttempted: true }, // SMTP 5xx
  connection: { deliveryAttempted: true }, // includes a server without STARTTLS
  timeout: { deliveryAttempted: true },
  authentication: { deliveryAttempted: true }, // SMTP 535
  shutdown: { deliveryAttempted: false },
  capacity: { deliveryAttempted: false },
  database: { deliveryAttempted: false },
} as const;

for (const row of Object.values(EMAIL_ERROR_KIND_ROWS)) Object.freeze(row);
export const EMAIL_ERROR_KINDS: typeof EMAIL_ERROR_KIND_ROWS = Object.freeze(EMAIL_ERROR_KIND_ROWS);

export type EmailErrorKind = keyof typeof EMAIL_ERROR_KINDS;
export type DeliveryErrorKind = {
  [K in EmailErrorKind]: (typeof EMAIL_ERROR_KINDS)[K]['deliveryAttempted'] extends true
    ? K
    : never;
}[EmailErrorKind];

// What a sender hands to a transport: plain text only, so no HTML part, tracking pixel
// or remote image can exist.
export type OutgoingEmail = {
  readonly from: { readonly name: string; readonly address: string };
  readonly to: string;
  readonly subject: string;
  readonly text: string;
};

// The outcome of one delivery attempt. A failure carries the kind, the SMTP reply code
// and the error code only, never the server text, which can repeat the address.
export type TransportResult =
  | { readonly sent: true; readonly responseCode: number | null }
  | {
      readonly sent: false;
      readonly errorKind: DeliveryErrorKind;
      readonly responseCode: number | null;
      readonly errorCode: string | null;
    };

// Every transport (SMTP, the test fake) follows the same rules: send makes exactly one
// delivery attempt and resolves with its result, retries belong to the sender; it
// rejects (TypeError) only for an e-mail parseOutgoingEmail refuses, a programming
// error. Every message is text/plain in UTF-8 and carries TRANSPORT_HEADERS. close
// refuses every later send at once (a connection failure that reaches no server) and
// resolves when every send started before it has settled, queued sends included; only
// then are the connections closed. A caller with a deadline races it.
export type EmailTransport = {
  send(email: OutgoingEmail): Promise<TransportResult>;
  close(): Promise<void>;
};

export const TRANSPORT_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Auto-Submitted': 'auto-generated',
});

export const PLAIN_TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';

// One plain address: no display name, no list, no comment.
const ADDRESS = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

const outgoingEmailSchema = z.strictObject({
  from: z.strictObject({
    name: z.string().min(1).max(200).regex(SINGLE_LINE),
    address: z.string().max(254).regex(ADDRESS),
  }),
  to: z.string().max(254).regex(ADDRESS),
  subject: z.string().min(1).max(998).regex(SINGLE_LINE),
  text: z.string().min(1).max(1_000_000),
});

// The single check of an outgoing e-mail. The error names fields and rules only, never
// values: the text holds the code and the fields hold addresses.
export function parseOutgoingEmail(email: unknown): OutgoingEmail {
  const result = outgoingEmailSchema.safeParse(email);
  if (result.success) return result.data;
  const problems = result.error.issues.map(
    (issue) => `${issue.path.join('.') || 'email'} (${issue.code})`,
  );
  throw new TypeError(`Malformed outgoing e-mail: ${problems.join(', ')}`);
}

const AUTHENTICATION_CODES: ReadonlySet<string> = new Set(['EAUTH', 'ENOAUTH']);

// Maps a failed attempt (Nodemailer's error code, the SMTP reply code and the command
// that failed) to its kind. Order matters. A failed TLS handshake or upgrade is a
// connection failure and is retried like one; AUTH and DATA never go out over it (a
// refused STARTTLS is ETLS, a refused certificate or TLS version arrives as ESOCKET).
// 'starttls' does not fall back to HELO, so a refused EHLO means the server cannot offer
// STARTTLS: a connection failure too, unless the refusal is temporary. An authentication
// reply in 4xx is temporary as well.
export function classifyTransportFailure(failure: {
  readonly code: string | null;
  readonly responseCode: number | null;
  readonly command: string | null;
}): DeliveryErrorKind {
  const { code, responseCode, command } = failure;
  if (code === 'ETIMEDOUT') return 'timeout';
  if (code === 'ETLS') return 'connection';
  const temporary = responseCode !== null && responseCode >= 400 && responseCode <= 499;
  if (command === 'EHLO' && !temporary) return 'connection';
  if ((code !== null && AUTHENTICATION_CODES.has(code)) || responseCode === 535) {
    return temporary ? 'transient' : 'authentication';
  }
  if (temporary) return 'transient';
  if (responseCode !== null && responseCode >= 500 && responseCode <= 599) return 'permanent';
  return 'connection';
}
