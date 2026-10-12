import { createServer, type Socket } from 'node:net';
import { closeServer, listenLocally } from './ports.ts';

// A PostgreSQL wire server for unit tests: it takes the startup without a password and
// answers each simple query (no parameters) from a script, so the real pg driver and
// drizzle run against it without a database. A script answer is rows, a command tag, an
// error, or a FATAL error after which the server closes the connection.

type Value = string | number | boolean | null;
export type FakeAnswer =
  | { readonly rows?: readonly Readonly<Record<string, Value>>[]; readonly command?: string }
  | {
      readonly error: string;
      readonly fatal?: boolean;
      readonly constraint?: string;
      readonly table?: string;
    }
  // No answer at all: the query runs until the connection closes.
  | { readonly silent: true };

export type FakePostgres = {
  readonly port: number;
  /** Every query text received, in order. */
  readonly queries: readonly string[];
  close(): Promise<void>;
};

const int16 = (value: number) => {
  const buffer = Buffer.alloc(2);
  buffer.writeInt16BE(value);
  return buffer;
};
const int32 = (value: number) => {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value);
  return buffer;
};
const cstring = (text: string) => Buffer.from(`${text}\0`, 'utf8');
const message = (type: string, ...parts: Buffer[]) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([Buffer.from(type, 'ascii'), int32(body.length + 4), body]);
};

// Type ids the driver parses: text, boolean, int4.
const typeOf = (value: Value) =>
  typeof value === 'boolean' ? 16 : typeof value === 'number' ? 23 : 25;
const textOf = (value: Exclude<Value, null>) =>
  typeof value === 'boolean' ? (value ? 't' : 'f') : String(value);

function answerBytes(answer: Exclude<FakeAnswer, { silent: true }>, query: string): Buffer[] {
  if ('error' in answer) {
    const severity = answer.fatal === true ? 'FATAL' : 'ERROR';
    const fields = [
      ['S', severity],
      ['V', severity],
      ['C', answer.error],
      ['M', `fake ${answer.error}`],
      ...(answer.constraint === undefined ? [] : [['n', answer.constraint]]),
      ...(answer.table === undefined ? [] : [['t', answer.table]]),
    ];
    const error = message(
      'E',
      ...fields.map(([code, text]) =>
        Buffer.concat([Buffer.from(code ?? '', 'ascii'), cstring(text ?? '')]),
      ),
      Buffer.from([0]),
    );
    return answer.fatal === true ? [error] : [error, message('Z', Buffer.from('I'))];
  }
  const rows = answer.rows ?? [];
  const parts: Buffer[] = [];
  const first = rows[0];
  if (first !== undefined) {
    const names = Object.keys(first);
    parts.push(
      message(
        'T',
        int16(names.length),
        ...names.map((name) =>
          Buffer.concat([
            cstring(name),
            int32(0),
            int16(0),
            int32(typeOf(first[name] ?? null)),
            int16(-1),
            int32(-1),
            int16(0),
          ]),
        ),
      ),
    );
    for (const row of rows) {
      parts.push(
        message(
          'D',
          int16(names.length),
          ...names.map((name) => {
            const value = row[name] ?? null;
            if (value === null) return int32(-1);
            const bytes = Buffer.from(textOf(value), 'utf8');
            return Buffer.concat([int32(bytes.length), bytes]);
          }),
        ),
      );
    }
  }
  const tag =
    answer.command ??
    (first === undefined
      ? (query.trim().split(/\s+/)[0]?.toUpperCase() ?? '')
      : `SELECT ${rows.length}`);
  parts.push(message('C', cstring(tag)), message('Z', Buffer.from('I')));
  return parts;
}

/** Starts the server on a free local port; a query the script leaves undefined succeeds. */
export async function startFakePostgres(
  script: (query: string) => FakeAnswer | undefined,
): Promise<FakePostgres> {
  const queries: string[] = [];
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => socket.destroy());
    let pending = Buffer.alloc(0);
    let started = false;
    socket.on('data', (chunk) => {
      pending = Buffer.concat([pending, Buffer.from(chunk)]);
      for (;;) {
        // The startup message has no type byte; every later message has one.
        const offset = started ? 1 : 0;
        if (pending.length < offset + 4) return;
        const length = pending.readInt32BE(offset);
        if (pending.length < offset + length) return;
        const type = started ? String.fromCharCode(pending[0] ?? 0) : '';
        const body = pending.subarray(offset + 4, offset + length);
        pending = pending.subarray(offset + length);
        if (!started) {
          started = true;
          socket.write(Buffer.concat([message('R', int32(0)), message('Z', Buffer.from('I'))]));
        } else if (type === 'Q') {
          const query = body.subarray(0, body.length - 1).toString('utf8');
          queries.push(query);
          const answer = script(query) ?? {};
          if ('silent' in answer) continue;
          for (const part of answerBytes(answer, query)) socket.write(part);
          if ('error' in answer && answer.fatal === true) {
            socket.end();
            return;
          }
        } else if (type === 'X') {
          socket.end();
          return;
        }
      }
    });
  });
  return {
    port: await listenLocally(server),
    queries,
    close: () => closeServer(server, sockets),
  };
}
