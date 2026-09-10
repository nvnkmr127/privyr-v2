import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

declare global {
  // eslint-disable-next-line no-var -- global augmentation requires `var`
  var _dbClient: postgres.Sql | undefined;
}

// Serverless (Vercel) + Neon free tier: Neon autosuspends compute after 5min idle and its
// pooler reaps idle connections. postgres-js keeps idle sockets in its pool and only discovers
// they're dead when it writes and waits out a ~30s TCP timeout — that's the "leads opens after
// 30-45s" stall. idle_timeout/max_lifetime make postgres-js close conns BEFORE Neon does, so it
// never reuses a dead socket; connect_timeout bounds any remaining stall.
const client =
  globalThis._dbClient ??
  postgres(connectionString, {
    prepare: false,
    // The lead detail page (and its post-mutation re-render) fans out ~13 concurrent
    // queries in one Promise.all; max:5 forced them into 3 serial waves. Size the pool to
    // the fan-out so they actually run in parallel. Safe on Neon's pooler (prepare:false,
    // transaction mode). ponytail: bump higher only if a hotter page fans out wider — watch
    // Neon's connection ceiling (max × concurrent Fluid instances must stay under it).
    max: 15,
    idle_timeout: 20, // close idle conns after 20s — well under Neon's reap/autosuspend window
    max_lifetime: 60 * 4, // recycle conns before Neon's 5-min autosuspend drops them
    connect_timeout: 15, // fail a bad connect fast instead of hanging ~30s
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
// Reuse the pool across warm invocations in all envs (also survives HMR in dev).
globalThis._dbClient = client;

export const db = drizzle(client, { schema });
