import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: process.env.WORKER_MODE === 'true' ? 5 : 10,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });
