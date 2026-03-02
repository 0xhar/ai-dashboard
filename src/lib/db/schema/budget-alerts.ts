import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { teams } from './teams';

export const budgetAlerts = pgTable('budget_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  thresholdCents: integer('threshold_cents').notNull(),
  period: varchar('period', { length: 20 }).notNull().default('monthly'),
  notifyEmails: text('notify_emails').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
