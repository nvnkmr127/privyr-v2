import { pgTable, varchar, uuid, timestamp } from 'drizzle-orm/pg-core';

export const legacyIdMappings = pgTable('legacy_id_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  legacyId: varchar('legacy_id', { length: 255 }).notNull(),
  legacyType: varchar('legacy_type', { length: 100 }).notNull(),
  newId: uuid('new_id').notNull(), // can't strictly enforce reference across all tables here, but logically points to a uuid
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
