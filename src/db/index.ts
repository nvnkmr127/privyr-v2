import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

declare global {
  // eslint-disable-next-line no-var -- global augmentation requires `var`
  var _dbClient: postgres.Sql | undefined;
  var _dbLastActive: number | undefined;
}

// Neon autosuspends compute after 5min idle and its pooler drops idle TCP connections after ~20s.
// In serverless (Vercel), when a lambda freezes between requests, Node's event loop pauses, so
// postgres-js's internal setTimeout(idleTimer) never ticks. When the lambda unfreezes on the next
// request, postgres-js attempts to write to the dead socket. Linux TCP retransmissions wait ~30s
// before timing out — that is the classic "leads takes 30s to load" stall.
//
// Root-cause fix: track wall-clock activity. When >15s of real time has passed since the last query,
// any existing sockets are guaranteed stale. Discard them immediately (timeout: 0) and establish a
// fresh client (~50ms) instead of waiting out a 30s TCP timeout.
const STALE_TIMEOUT_MS = 15_000;

function createClient(): postgres.Sql {
  return postgres(connectionString, {
    prepare: false,
    fetch_types: false, // Prevents redundant pg_type queries on connection
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: {
      timezone: "UTC",
    },
    types: {
      timestamp: {
        to: 1114,
        from: [1114],
        serialize: (x: any) => (x instanceof Date ? x : new Date(x)).toISOString(),
        parse: (x: string) => new Date(x.endsWith("Z") ? x : x.replace(" ", "T") + "Z"),
      },
    },
  });
}

function getActiveClient(): postgres.Sql {
  const now = Date.now();
  const lastActive = globalThis._dbLastActive ?? 0;

  if (!globalThis._dbClient || now - lastActive > STALE_TIMEOUT_MS) {
    if (globalThis._dbClient) {
      globalThis._dbClient.end({ timeout: 0 }).catch(() => {});
    }
    globalThis._dbClient = createClient();
  }

  globalThis._dbLastActive = now;
  return globalThis._dbClient;
}

// Proxy dispatches all calls and properties to the currently active client.
const client = new Proxy(function () {} as unknown as postgres.Sql, {
  apply(_target, _thisArg, args) {
    return (getActiveClient() as any)(...args);
  },
  get(_target, prop) {
    const active = getActiveClient();
    const val = (active as any)[prop];
    if (typeof val === "function") {
      return val.bind(active);
    }
    return val;
  },
});

export const db = drizzle(client, { schema });
