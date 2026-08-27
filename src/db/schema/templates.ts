import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

// Canned responses / message templates (Privyr-style one-tap messaging).
export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull().default('whatsapp'), // whatsapp, sms, email
  subject: varchar('subject', { length: 255 }), // email only
  body: text('body').notNull(), // supports {{name}} {{first_name}} {{email}} {{phone}} {{company}} tokens
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
