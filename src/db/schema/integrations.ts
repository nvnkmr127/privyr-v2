import { pgTable, uuid, varchar, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const integrationAccounts = pgTable('integration_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  integrationId: uuid('integration_id').references(() => integrations.id).notNull(),
  credentials: jsonb('credentials').notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: varchar('provider', { length: 255 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // pending, processing, processed, failed
  idempotencyKey: varchar('idempotency_key', { length: 255 }),
  retryCount: integer('retry_count').default(0).notNull(),
  errorLog: jsonb('error_log'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const leadIngestionLogs = pgTable('lead_ingestion_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: uuid('lead_id'), // can be null if ingestion failed completely
  sourceId: varchar('source_id', { length: 255 }).notNull(),
  originalPayload: jsonb('original_payload'),
  status: varchar('status', { length: 50 }).notNull(), // success, failed, deduplicated
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
