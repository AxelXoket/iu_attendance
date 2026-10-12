import pino, { type Bindings, type ChildLoggerOptions, type Logger } from 'pino';

// The process's root logger (D15). Until the log setup runs, it writes JSON lines to
// stderr at info, in the setup's line shape: the time as UTC ISO, no pid and no host.
// The setup then binds it to the logger it builds, once per process. It imports neither
// the setup nor the settings nor the contract, so a module that only logs waits for none
// of them. A child made from it, even before the setup, follows the binding: it is the
// pino child of its parent as the parent stands when it is used. What was set on a
// logger before the binding (a level, a listener) does not carry over, and Fastify is
// built after the binding, because it copies the root's serializers when it is built.

let root: Logger = pino(
  { level: 'info', base: null, timestamp: pino.stdTimeFunctions.isoTime },
  pino.destination(2),
);

// The loggers made here; the root is never bound to one of them, which would loop.
const followers = new WeakSet<object>();

function following(resolveTarget: () => Logger): Logger {
  let made: { readonly from: Logger; readonly logger: Logger } | null = null;
  const resolve = () => {
    if (made?.from !== root) made = { from: root, logger: resolveTarget() };
    return made.logger;
  };
  const proxy = new Proxy(Object.create(null) as Logger, {
    get(_target, property) {
      if (property === 'child') {
        return (bindings: Bindings, options?: ChildLoggerOptions) => {
          const child = following(() => resolve().child(bindings, options) as Logger);
          // Made now, so broken bindings throw here and not at the first line.
          void child.level;
          return child;
        };
      }
      const logger = resolve();
      const value: unknown = Reflect.get(logger, property, logger);
      return typeof value === 'function' ? value.bind(logger) : value;
    },
    set(_target, property, value) {
      return Reflect.set(resolve(), property, value);
    },
    has(_target, property) {
      return property in resolve();
    },
  });
  followers.add(proxy);
  return proxy;
}

export const log: Logger = following(() => root);

/** Binds the root logger to the one the log setup built; the setup calls it once. */
export function bindRootLogger(logger: Logger): void {
  if (followers.has(logger)) throw new TypeError('The root logger cannot follow itself');
  root = logger;
}
