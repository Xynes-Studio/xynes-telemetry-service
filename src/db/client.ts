import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const queryClient = postgres(databaseUrl);
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}

// Proxy object that lazily initializes DB connection
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    const realDb = getDb();
    const value = realDb[prop as keyof typeof realDb];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});

export type Database = PostgresJsDatabase<typeof schema>;
