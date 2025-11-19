import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import schema from "./schema";

export type DatabaseSchema = typeof schema;
export type Db = PostgresJsDatabase<DatabaseSchema>;

let cachedClient: Sql<Record<string, never>> | undefined;
let cachedDb: Db | undefined;

function createClient(url: string): Sql<Record<string, never>> {
  return postgres(url, { max: 1, prepare: true }) as Sql<Record<string, never>>;
}

export default function getDb(): Db {
  if (!cachedDb) {
    const url: string | undefined = process.env.DATABASE_URL;
    if (!url) {
      // During local builds without environment configuration, avoid crashing
      // the entire app. Expose a disabled Db instance instead so any runtime
      // usage still fails loudly but build/typecheck can complete.
      // eslint-disable-next-line no-console
      console.warn("DATABASE_URL environment variable is not set. Returning a disabled Db instance.");
      cachedDb = {} as Db;
      return cachedDb;
    }
    const client: Sql<Record<string, never>> = createClient(url);
    cachedClient = client;
    cachedDb = drizzle(client, { schema }) as Db;
  }
  return cachedDb;
}

export { schema };
