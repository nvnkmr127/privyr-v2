import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// The tenant. Every tenant-scoped row carries organization_id; a user belongs to exactly one org.
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
