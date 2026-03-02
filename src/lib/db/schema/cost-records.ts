import {
  pgTable,
  uuid,
  varchar,
  integer,
  date,
  timestamp,
  index,
  unique,
  bigserial,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { providerConnections } from './provider-connections';
import { teams } from './teams';

export const costRecords = pgTable(
  'cost_records',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull(),
    source: varchar('source', { length: 20 }).notNull().default('provider'),
    bucketDate: date('bucket_date').notNull(),
    model: varchar('model', { length: 255 }).notNull(),
    providerProjectId: varchar('provider_project_id', { length: 255 }),
    providerWorkspaceId: varchar('provider_workspace_id', { length: 255 }),
    costCategory: varchar('cost_category', { length: 100 }),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    teamId: uuid('team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('cost_org_date_idx').on(t.orgId, t.bucketDate),
    index('cost_team_date_idx').on(t.teamId, t.bucketDate),
    unique('cost_upsert_key').on(
      t.connectionId,
      t.bucketDate,
      t.model,
      t.providerProjectId,
      t.providerWorkspaceId,
      t.costCategory
    ),
  ]
);
