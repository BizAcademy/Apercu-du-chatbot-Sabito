import mysql, { type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

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

// Only Sabito's parameterized, application-owned SQL passes through this adapter.
// Table names are isolated from any existing tables in the hosting database.
export function mysqlStatement(sql: string, values: readonly unknown[] = []) {
  const parameters: unknown[] = [];
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
      const statement = mysqlStatement(sql, values);
      try {
        const [result] = await connection.query<RowDataPacket[] | ResultSetHeader>(
          statement.sql, statement.parameters,
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

export function createMysqlPool(connectionString: string): DatabasePool {
  const url = new URL(connectionString);
  if (!url.hostname || !url.pathname.slice(1)) {
    throw new Error("DATABASE_URL must contain a database host and database name.");
  }
  const pool = mysql.createPool({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    charset: "utf8mb4",
    timezone: "Z",
    connectionLimit: 10,
    multipleStatements: false,
    // TLS is explicit; certificate validation is never disabled.
    ...(url.searchParams.get("ssl") === "true" ? { ssl: {} } : {}),
  });
  const adapter: DatabasePool = {
    async connect() {
      const connection = await pool.getConnection();
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
    end() { return pool.end(); },
  };
  return adapter;
}
