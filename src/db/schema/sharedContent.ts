import { pgTable, uuid, varchar, integer, timestamp, text, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { leads } from './leads';
import { users } from './users';

// A trackable link a rep shares with a lead (brochure, page, PDF). Opening /s/:slug
// records a view, so reps see who actually engaged — and who never opened it.
export const sharedLinks = pgTable('shared_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }).notNull(),
  ownerId: uuid('owner_id').references(() => users.id),
  slug: varchar('slug', { length: 32 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  // A share is a link out (targetUrl), a self-contained page (bodyText/imageUrl), or both.
  targetUrl: varchar('target_url', { length: 2048 }),
  bodyText: text('body_text'),
  imageUrl: varchar('image_url', { length: 2048 }),
  viewCount: integer('view_count').default(0).notNull(),
  lastViewedAt: timestamp('last_viewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  leadIdx: index('shared_links_lead_idx').on(table.leadId),
  orgIdx: index('shared_links_org_idx').on(table.organizationId),
}));

export const sharedLinkViews = pgTable('shared_link_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  sharedLinkId: uuid('shared_link_id').references(() => sharedLinks.id, { onDelete: 'cascade' }).notNull(),
  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
}, (table) => ({
  linkIdx: index('shared_link_views_link_idx').on(table.sharedLinkId),
}));
