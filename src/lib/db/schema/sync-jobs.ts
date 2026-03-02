import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';
import { providerConnections } from './provider-connections';

export const syncJobs = pgTable('sync_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => providerConnections.id, { onDelete: 'cascade' }),
  syncType: varchar('sync_type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  recordsSynced: integer('records_synced').default(0),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
