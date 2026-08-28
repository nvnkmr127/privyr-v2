import { pgTable, uuid, varchar, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { organizations } from './organizations';

export const savedViews = pgTable('saved_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  filters: jsonb('filters').default([]).notNull(),
  sortField: varchar('sort_field', { length: 50 }).default('createdAt'),
  sortOrder: varchar('sort_order', { length: 10 }).default('desc'),
  isPreset: integer('is_preset').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgUserIdx: index('saved_views_org_user_idx').on(table.organizationId, table.userId),
}));

export const savedViewsRelations = relations(savedViews, ({ one }) => ({
  organization: one(organizations, { fields: [savedViews.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [savedViews.userId], references: [users.id] }),
}));
