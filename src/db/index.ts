import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

// Convenience proxy — behaves like the db object but initialises lazily
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
