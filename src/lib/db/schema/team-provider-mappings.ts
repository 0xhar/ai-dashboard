import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { providerConnections } from './provider-connections';

export const teamProviderMappings = pgTable(
  'team_provider_mappings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'cascade' }),
    providerEntityType: varchar('provider_entity_type', {
      length: 50,
    }).notNull(),
    providerEntityId: varchar('provider_entity_id', { length: 255 }).notNull(),
    providerEntityName: varchar('provider_entity_name', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.teamId, t.connectionId, t.providerEntityId)]
);
