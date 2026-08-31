import Redis, { type RedisOptions } from "ioredis";

// One place to build every ioredis connection. Two things here stop a DOWN Redis from flooding the
// logs with a stack trace on every reconnect attempt (ECONNREFUSED 127.0.0.1:6379):
//   1. a backoff retryStrategy, so we don't hammer the socket, and
//   2. a throttled 'error' handler on every client — an unhandled ioredis 'error' event is what
//      prints the raw connection stack, and there were connections created without one.
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let lastLog = 0;
function logConnError(err: Error): void {
  const now = Date.now();
  if (now - lastLog > 30_000) {
    lastLog = now;
    const code = (err as NodeJS.ErrnoException).code || err.message;
    console.warn(`[redis] connection error (${code}); retrying in background. Further errors muted for 30s.`);
  }
}

/** Build an ioredis client with backoff + a throttled error handler. Pass BullMQ's required
 *  `{ maxRetriesPerRequest: null }` for queue/worker connections; omit it for plain command clients. */
export function createRedis(opts: RedisOptions = {}, url?: string): Redis {
  const client = new Redis(url || REDIS_URL, {
    retryStrategy: (times) => Math.min(times * 500, 10_000),
    ...opts,
  });
  client.on("error", logConnError);
  return client;
}

/** BullMQ Worker/QueueEvents surface connection problems as their own 'error' event; without a
 *  listener Node throws "Unhandled 'error' event". Attach a quiet one (the connection already logs). */
export function quietErrors(emitter: { on(event: "error", listener: (err: Error) => void): unknown }): void {
  emitter.on("error", () => {});
}
