import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getMysqlPool } from "./mysql-pool";

export interface MysqlMigration {
  name: string;
  sql: string;
  requiresDestructiveApproval: boolean;
}

function migrationDirectory() {
  const candidates = [
    path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations/mysql"),
    path.resolve(process.cwd(), "migrations/mysql"),
    path.resolve(process.cwd(), "../../migrations/mysql"),
  ];
  const directory = candidates.find(candidate => existsSync(candidate));
  if (!directory) throw new Error("MySQL migration files are missing.");
  return directory;
}

export async function loadMysqlMigrations(): Promise<MysqlMigration[]> {
  const directory = migrationDirectory();
  const names = (await readdir(directory))
    .filter(name => /^\d+_[a-z0-9_-]+\.sql$/i.test(name))
    .sort((a, b) => Number(a.split("_")[0]) - Number(b.split("_")[0]) || a.localeCompare(b));
  const numbers = names.map(name => Number(name.split("_")[0]));
  if (new Set(numbers).size !== numbers.length) throw new Error("Duplicate MySQL migration numbers.");
  if (!names.length) throw new Error("No numbered MySQL migration files found.");
  return Promise.all(names.map(async name => {
    const sql = await readFile(path.join(directory, name), "utf8");
    // Conservative review gate, not a SQL parser. All ALTER/DML and privileged
    // operations require separate, explicit approval, even when additive.
    const statements = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const requiresDestructiveApproval = /(?:^|;)\s*(DROP|TRUNCATE|DELETE|UPDATE|ALTER|REPLACE|GRANT|REVOKE|CALL|EXECUTE|CREATE\s+(USER|PROCEDURE|FUNCTION|TRIGGER|EVENT))\b/i.test(statements);
    return { name, sql, requiresDestructiveApproval };
  }));
}

async function history(connection: PoolConnection): Promise<string[]> {
  const [tables] = await connection.execute<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?",
    ["schema_migrations"],
  );
  if (!tables.length) return [];
  const [rows] = await connection.execute<RowDataPacket[]>("SELECT name FROM schema_migrations ORDER BY name");
  return rows.map(row => String(row.name));
}

export async function mysqlMigrationStatus() {
  const migrations = await loadMysqlMigrations();
  const connection = await getMysqlPool().getConnection();
  try {
    const applied = await history(connection);
    if (applied.some(name => !migrations.some(migration => migration.name === name))) {
      throw new Error("Migration history contains files missing from this release. Review before continuing.");
    }
    return { applied, pending: migrations.filter(migration => !applied.includes(migration.name)) };
  } finally { connection.release(); }
}

export async function initializeMysqlSchema(options: {
  apply: boolean;
  reviewed?: boolean;
  allowDestructive?: boolean;
}) {
  if (!options.apply) {
    const status = await mysqlMigrationStatus();
    if (status.pending.length) throw new Error("Pending MySQL migrations: review and apply them explicitly before production startup.");
    return;
  }
  if (process.env.NODE_ENV === "production" && !options.reviewed) {
    throw new Error("Production migrations require explicit review.");
  }
  const migrations = await loadMysqlMigrations();
  const connection = await getMysqlPool().getConnection();
  let locked = false;
  try {
    const [result] = await connection.execute<RowDataPacket[]>("SELECT GET_LOCK('sabito_migrations',30) AS acquired");
    locked = Number(result[0]?.acquired) === 1;
    if (!locked) throw new Error("Could not acquire Sabito migration lock.");
    const applied = await history(connection);
    if (applied.some(name => !migrations.some(migration => migration.name === name))) {
      throw new Error("Migration history contains files missing from this release.");
    }
    const pending = migrations.filter(migration => !applied.includes(migration.name));
    if (pending.some(migration => migration.requiresDestructiveApproval) && !options.allowDestructive) {
      throw new Error("A migration requires explicit destructive-change approval.");
    }
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    for (const migration of pending) {
      // Only repository-owned, reviewed SQL files use multiple statements.
      // DDL implicitly commits: never claim a failed migration was rolled back.
      await connection.query(migration.sql);
      await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [migration.name]);
    }
  } finally {
    try { if (locked) await connection.execute("SELECT RELEASE_LOCK('sabito_migrations')"); }
    finally { connection.release(); }
  }
}
