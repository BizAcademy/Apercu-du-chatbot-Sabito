import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { readMysqlConfiguration } from "./database-config";

export type DatabaseResult = { rows: Record<string, any>[]; rowCount: number };
export interface DatabaseConnection {
  query(sql: string, values?: readonly unknown[]): Promise<DatabaseResult>;
  release(): void;
}
export interface DatabasePool {
  query(sql: string, values?: readonly unknown[]): Promise<DatabaseResult>;
  connect(): Promise<DatabaseConnection>;
  end(): Promise<void>;
}

let singleton: Pool | undefined;

/** Created lazily: importing this module never opens a database connection. */
export function getMysqlPool(): Pool {
  if (!singleton) {
    singleton = mysql.createPool({
      ...readMysqlConfiguration(),
      waitForConnections: true,
      connectionLimit: 10,
      multipleStatements: true,
      charset: "utf8mb4",
      timezone: "Z",
      connectTimeout: 10000,
    });
  }
  return singleton;
}

export async function checkMysqlConnection(): Promise<void> {
  await getMysqlPool().execute("SELECT 1");
}

export async function closeMysqlPool(): Promise<void> {
  const pool = singleton;
  singleton = undefined;
  if (pool) await pool.end();
}

export async function withMysqlTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { /* Preserve the original failure. */ }
    throw error;
  } finally {
    connection.release();
  }
}

// Only Sabito's parameterized, application-owned SQL passes through this adapter.
// Table names are isolated from any existing tables in the hosting database.
export function mysqlStatement(sql: string, values: readonly unknown[] = []) {
  const parameters: unknown[] = /\$\d+/.test(sql) ? [] : [...values];
  const statement = sql
    .replace(/\bsabito_core\.([a-z_]+)\b/g, "sabito_$1")
    .replace(/\bnow\(\)/gi, "UTC_TIMESTAMP(6)")
    .replace(/\bAS "([a-zA-Z]+)"/g, "AS `$1`")
    .replace(/\$(\d+)/g, (_placeholder, number: string) => {
      const index = Number(number) - 1;
      if (index < 0 || index >= values.length) throw new Error("Missing SQL parameter");
      parameters.push(values[index]);
      return "?";
    });
  return { sql: statement, parameters };
}

function wrap(connection: PoolConnection): DatabaseConnection {
  return {
    async query(sql, values) {
      // Preserve existing business transaction boundaries using mysql2 methods.
      const transaction = sql.trim().toUpperCase();
      if (transaction === "BEGIN") {
        await connection.beginTransaction();
        return { rows: [], rowCount: 0 };
      }
      if (transaction === "COMMIT" || transaction === "ROLLBACK") {
        if (transaction === "COMMIT") await connection.commit();
        else await connection.rollback();
        return { rows: [], rowCount: 0 };
      }
      const statement = mysqlStatement(sql, values);
      try {
        // Prepared execution binds runtime values even with multipleStatements
        // enabled for trusted migration files. Values cannot become SQL code.
        const [result] = await connection.execute<RowDataPacket[] | ResultSetHeader>(
          statement.sql, statement.parameters as Parameters<PoolConnection["execute"]>[1],
        );
        return Array.isArray(result)
          ? { rows: result, rowCount: result.length }
          : { rows: [], rowCount: result.affectedRows };
      } catch (error) {
        // Keep duplicate-key handling identical for the public API.
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
          (error as { code: string }).code = "23505";
        }
        throw error;
      }
    },
    release() { connection.release(); },
  };
}

export function createMysqlAdapter(): DatabasePool {
  const adapter: DatabasePool = {
    async connect() {
      const connection = await getMysqlPool().getConnection();
      try {
        await connection.query("SET time_zone = '+00:00'");
        return wrap(connection);
      } catch (error) { connection.release(); throw error; }
    },
    async query(sql, values) {
      const connection = await adapter.connect();
      try { return await connection.query(sql, values); }
      finally { connection.release(); }
    },
    end() { return closeMysqlPool(); },
  };
  return adapter;
}
