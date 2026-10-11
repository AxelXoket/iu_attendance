// An in-memory mailbox for tests. It is an EmailTransport with the same contract as the
// SMTP transport (the same e-mail check, failure kinds, From header and close rule) and
// records what it delivers; scenarios import the fixed sentences and search for them
// here. D14's hook clears it before every scenario.
import { z } from 'zod';
import { smtpFromHeader } from '../../src/infra/email/transport.ts';
import {
  classifyTransportFailure,
  type EmailTransport,
  type OutgoingEmail,
  PLAIN_TEXT_CONTENT_TYPE,
  parseOutgoingEmail,
  TRANSPORT_HEADERS,
  type TransportResult,
} from '../../src/infra/email/types.ts';

export type FakeMessage = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  // Auto-Submitted, Content-Type and From, each as the SMTP transport writes it.
  readonly headers: Readonly<Record<string, string>>;
};

// A planned reply for one send: an SMTP reply code (2xx delivers) or a connection error.
export type PlannedReply =
  | { readonly responseCode: number }
  | { readonly connectionError: 'ETIMEDOUT' | 'ECONNREFUSED' };

export type FakeMailbox = EmailTransport & {
  // Delivered messages in order, only those to address when it is given.
  messages(address?: string): ReadonlyArray<FakeMessage>;
  // Back to a fresh mailbox: no messages, plans or delay, count 0, open again. A close
  // still waiting resolves; a send still in flight is neither recorded nor waited for.
  clear(): void;
  // Replies for the next sends, used in call order; after them sends deliver again.
  planErrors(...replies: PlannedReply[]): void;
  // Every later send settles this many milliseconds after it starts (global setTimeout,
  // so fake timers drive it).
  delay(ms: number): void;
  // Well-formed calls to send since the last clear: failed, refused after close and
  // in-flight ones included.
  sendCount(): number;
};

const plannedReplySchema = z.union([
  z.strictObject({
    responseCode: z
      .int()
      .min(200)
      .max(599)
      .refine((code) => code < 300 || code >= 400),
  }),
  z.strictObject({ connectionError: z.enum(['ETIMEDOUT', 'ECONNREFUSED']) }),
]);

// The error codes Nodemailer reports for the same events, so the failure kinds come
// from the shared classifier exactly as for the SMTP transport.
const CONNECTION_ERROR_CODES = { ETIMEDOUT: 'ETIMEDOUT', ECONNREFUSED: 'ESOCKET' } as const;
const AUTHENTICATION_REPLY = 535;

function failure(code: string, responseCode: number | null): TransportResult {
  return {
    sent: false,
    errorKind: classifyTransportFailure({ code, responseCode, command: null }),
    responseCode,
    errorCode: code,
  };
}

function recorded(message: OutgoingEmail): FakeMessage {
  return Object.freeze({
    to: message.to,
    subject: message.subject,
    text: message.text,
    headers: Object.freeze({
      ...TRANSPORT_HEADERS,
      'Content-Type': PLAIN_TEXT_CONTENT_TYPE,
      From: smtpFromHeader(message.from),
    }),
  });
}

export function fakeMailbox(): FakeMailbox {
  let delivered: FakeMessage[] = [];
  let plan: PlannedReply[] = [];
  let delayMs = 0;
  let sends = 0;
  // Bumped by clear: a send in flight then is not recorded and no close waits for it.
  let generation = 0;
  // Sends of this generation not yet settled, and the close waiting for them to end.
  let pending = 0;
  let drained: (() => void) | undefined;
  let closing: Promise<void> | undefined;

  async function deliver(message: OutgoingEmail, startedIn: number): Promise<TransportResult> {
    const reply = plan.shift() ?? { responseCode: 250 };
    const wait = delayMs;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    if ('connectionError' in reply) {
      return failure(CONNECTION_ERROR_CODES[reply.connectionError], null);
    }
    if (reply.responseCode >= 400) {
      const code = reply.responseCode === AUTHENTICATION_REPLY ? 'EAUTH' : 'EMESSAGE';
      return failure(code, reply.responseCode);
    }
    if (startedIn === generation) delivered.push(recorded(message));
    return { sent: true, responseCode: reply.responseCode };
  }

  return {
    async send(email) {
      const message = parseOutgoingEmail(email);
      sends += 1;
      if (closing !== undefined) return failure('ECONNECTION', null);
      const startedIn = generation;
      pending += 1;
      try {
        return await deliver(message, startedIn);
      } finally {
        if (startedIn === generation) {
          pending -= 1;
          if (pending === 0) drained?.();
        }
      }
    },
    close() {
      closing ??= new Promise<void>((resolve) => {
        drained = resolve;
        if (pending === 0) resolve();
      });
      return closing;
    },
    messages(address) {
      return Object.freeze(
        delivered.filter((message) => address === undefined || message.to === address),
      );
    },
    clear() {
      drained?.();
      delivered = [];
      plan = [];
      delayMs = 0;
      sends = 0;
      generation += 1;
      pending = 0;
      closing = undefined;
    },
    planErrors(...replies) {
      const checked = replies.map((reply) => {
        const result = plannedReplySchema.safeParse(reply);
        if (!result.success)
          throw new TypeError('A planned reply is a reply code or a connection error');
        return result.data;
      });
      plan.push(...checked);
    },
    delay(ms) {
      if (!Number.isInteger(ms) || ms < 0) throw new TypeError('Delay is a whole number of ms');
      delayMs = ms;
    },
    sendCount() {
      return sends;
    },
  };
}
