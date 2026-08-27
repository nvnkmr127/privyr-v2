import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

import { leads } from './leads';
import { users } from './users';

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: uuid('lead_id').references(() => leads.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(), // email, call, meeting, note
  content: text('content'),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  leadIdx: index('activities_lead_idx').on(table.leadId),
  leadCreatedIdx: index('activities_lead_created_idx').on(table.leadId, table.createdAt),
}));

export const followUps = pgTable('follow_ups', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: uuid('lead_id').references(() => leads.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  dueAt: timestamp('due_at').notNull(),
  snoozedUntil: timestamp('snoozed_until'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userDueIdx: index('follow_ups_user_due_idx').on(table.userId, table.status, table.dueAt),
  leadIdx: index('follow_ups_lead_idx').on(table.leadId),
}));

export const reminders = pgTable('reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  followUpId: uuid('follow_up_id').references(() => followUps.id).notNull(),
  remindAt: timestamp('remind_at').notNull(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  followUpIdx: index('reminders_follow_up_idx').on(table.followUpId),
}));
