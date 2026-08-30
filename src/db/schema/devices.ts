import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { organizations } from './organizations';

// Mobile push tokens. One row per device a user signs in on. Holds either an Expo push token
// ("ExponentPushToken[...]") or a raw FCM registration token — the dispatcher routes by format.
export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 512 }).notNull().unique(), // Expo token or FCM registration token
  platform: varchar('platform', { length: 20 }), // ios | android
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('device_tokens_user_idx').on(table.userId),
}));
