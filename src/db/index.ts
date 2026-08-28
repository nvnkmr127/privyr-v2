import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

declare global {
  // eslint-disable-next-line no-var -- global augmentation requires `var`
  var _dbClient: postgres.Sql | undefined;
}

const client = globalThis._dbClient ?? postgres(connectionString, { prepare: false, max: 10 });
if (process.env.NODE_ENV !== 'production') {
  globalThis._dbClient = client;
}

export const db = drizzle(client, { schema });
