import Redis, { type RedisOptions } from "ioredis";

// One place to build every ioredis connection. Two things here stop a DOWN Redis from flooding the
// logs with a stack trace on every reconnect attempt (ECONNREFUSED 127.0.0.1:6379):
//   1. a backoff retryStrategy, so we don't hammer the socket, and
//   2. a throttled 'error' handler on every client — an unhandled ioredis 'error' event is what
//      prints the raw connection stack, and there were connections created without one.
/** Whether a Redis is actually configured. When false (e.g. a Vercel deploy with no managed Redis),
 *  background jobs are disabled rather than looping ECONNREFUSED against localhost. */
export function redisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

let lastLog = 0;
function logConnError(err: Error): void {
  const now = Date.now();
  if (now - lastLog > 30_000) {
    lastLog = now;
    const code = (err as NodeJS.ErrnoException).code || err.message;
    console.warn(`[redis] connection error (${code}); retrying in background. Further errors muted for 30s.`);
  }
}

/** Build an ioredis client with a throttled error handler. Pass BullMQ's required
 *  `{ maxRetriesPerRequest: null }` for queue/worker connections; omit it for plain command clients.
 *  When no REDIS_URL is configured it does NOT retry — one failed connect, then stop, so a
 *  Redis-less deploy never floods the logs with reconnect attempts to localhost. */
export function createRedis(opts: RedisOptions = {}, url?: string): Redis {
  const target = url || process.env.REDIS_URL;
  const client = new Redis(target || "redis://localhost:6379", {
    retryStrategy: target ? (times) => Math.min(times * 500, 10_000) : () => null,
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
