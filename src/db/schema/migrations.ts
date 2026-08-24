import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const legacyIdMappings = pgTable('legacy_id_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  legacyId: varchar('legacy_id', { length: 255 }).notNull(),
  legacyType: varchar('legacy_type', { length: 100 }).notNull(), // 'user', 'lead', 'source', etc.
  newId: uuid('new_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
