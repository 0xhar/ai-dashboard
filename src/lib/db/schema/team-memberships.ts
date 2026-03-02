import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { users } from './users';

export const teamMemberships = pgTable(
  'team_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.teamId, t.userId)]
);
