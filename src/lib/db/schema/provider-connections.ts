import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const providerConnections = pgTable('provider_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  credentialsEncrypted: text('credentials_encrypted').notNull(),
  credentialsIv: varchar('credentials_iv', { length: 64 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastError: text('last_error'),
  syncCursor: jsonb('sync_cursor'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
