import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// Browser push subscriptions (Web Push / VAPID). One row per device/browser a user enables.
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  endpoint: text('endpoint').notNull().unique(), // the push service URL; unique per subscription
  p256dh: varchar('p256dh', { length: 255 }).notNull(), // client public key
  auth: varchar('auth', { length: 255 }).notNull(), // client auth secret
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('push_subs_user_idx').on(table.userId),
}));
