import { pgTable, uuid, varchar, jsonb, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { leads } from './leads';

export const automations = pgTable('automations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const automationTriggers = pgTable('automation_triggers', {
  id: uuid('id').defaultRandom().primaryKey(),
  automationId: uuid('automation_id').references(() => automations.id).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  config: jsonb('config').default({}),
}, (table) => ({
  typeIdx: index('auto_triggers_type_idx').on(table.type, table.automationId),
}));

export const automationConditions = pgTable('automation_conditions', {
  id: uuid('id').defaultRandom().primaryKey(),
  automationId: uuid('automation_id').references(() => automations.id).notNull(),
  config: jsonb('config').default({}),
});

export const automationActions = pgTable('automation_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  automationId: uuid('automation_id').references(() => automations.id).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  config: jsonb('config').default({}),
  orderIndex: integer('order_index').default(0),
});

export const automationRuns = pgTable('automation_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  automationId: uuid('automation_id').references(() => automations.id).notNull(),
  leadId: uuid('lead_id').references(() => leads.id),
  status: varchar('status', { length: 50 }).notNull(), // pending, success, failed
  error: varchar('error', { length: 255 }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }),
  retryCount: integer('retry_count').default(0).notNull(),
}, (table) => ({
  idempotencyIdx: index('auto_runs_idempotency_idx').on(table.idempotencyKey),
  leadIdx: index('auto_runs_lead_idx').on(table.leadId),
}));
