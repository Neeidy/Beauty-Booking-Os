import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const client = postgres(databaseUrl, {
    prepare: false,      // ← YENİ: Transaction pooler için zorunlu
    max: 1,              // ← DEĞİŞTİ: Serverless'ta her function kendi connection'ını açar, 10 değil 1
    idle_timeout: 20,
    connect_timeout: 10,
  });

  _db = drizzle(client, { schema });
  return _db;
}

export * from "./schema";
export { schema };