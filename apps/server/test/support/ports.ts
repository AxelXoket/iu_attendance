import { createServer, type Server, type Socket } from 'node:net';

// Local network helpers for unit tests: a server on a free port, a port nothing listens
// on, and a server that takes connections and never answers.

/** Starts the server on a free local port and returns the port. */
export async function listenLocally(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('No port');
  return address.port;
}

/** Destroys the open sockets and closes the server. */
export async function closeServer(server: Server, sockets: Iterable<Socket>): Promise<void> {
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

/** A local port nothing listens on: connecting to it is refused at once. */
export async function closedPort(): Promise<number> {
  const server = createServer();
  const port = await listenLocally(server);
  await closeServer(server, []);
  return port;
}

/** A local server that takes connections and never answers: a connect that times out. */
export async function silentServer(): Promise<{ port: number; close(): Promise<void> }> {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => socket.destroy());
  });
  return { port: await listenLocally(server), close: () => closeServer(server, sockets) };
}
