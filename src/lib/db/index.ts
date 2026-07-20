import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __cockpitDb?: ReturnType<typeof drizzle<typeof schema>>;
  __cockpitSqlite?: Database.Database;
};

function resolveDbPath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "cockpit.db");
}

export function getSqlite(): Database.Database {
  if (globalForDb.__cockpitSqlite) return globalForDb.__cockpitSqlite;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  globalForDb.__cockpitSqlite = sqlite;
  return sqlite;
}

export function getDb() {
  if (globalForDb.__cockpitDb) return globalForDb.__cockpitDb;
  const db = drizzle(getSqlite(), { schema });
  globalForDb.__cockpitDb = db;
  return db;
}

export type Db = ReturnType<typeof getDb>;
