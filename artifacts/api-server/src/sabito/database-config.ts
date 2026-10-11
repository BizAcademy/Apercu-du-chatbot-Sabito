export interface MysqlConnectionSettings {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  tls: boolean;
}

export type DatabaseConfiguration =
  | { dialect: "mysql"; mysql: MysqlConnectionSettings }
  | { dialect: "postgres"; connectionString: string };

function portNumber(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error("DB_PORT must be a valid TCP port.");
  const port = Number(value);
  if (port < 1 || port > 65535) throw new Error("DB_PORT must be between 1 and 65535.");
  return port;
}

function tlsEnabled(value: string | undefined): boolean {
  if (!value || value === "false") return false;
  if (value === "true") return true;
  throw new Error("DB_SSL must be true or false.");
}

// Separate MySQL settings take precedence over Replit's managed DATABASE_URL.
// Never silently use PostgreSQL when MySQL configuration is incomplete.
export function resolveDatabaseConfiguration(
  env: Record<string, string | undefined>,
): DatabaseConfiguration {
  const fields = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_SSL"];
  if (fields.some(key => env[key] !== undefined)) {
    const missing = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]
      .filter(key => !env[key] || (key !== "DB_PASSWORD" && !env[key]?.trim()));
    if (missing.length) {
      throw new Error(`MySQL/MariaDB configuration is incomplete. Required: ${missing.join(", ")}.`);
    }
    return {
      dialect: "mysql",
      mysql: {
        host: env.DB_HOST!.trim(),
        port: portNumber(env.DB_PORT?.trim() || "3306"),
        database: env.DB_NAME!.trim(),
        user: env.DB_USER!.trim(),
        // Separate settings accept the actual password, not a URL-encoded value.
        password: env.DB_PASSWORD!,
        tls: tlsEnabled(env.DB_SSL),
      },
    };
  }

  // Compatibility for existing installations and isolated PostgreSQL Preview data.
  if (!env.DATABASE_URL) throw new Error("Configure DB_HOST, DB_NAME, DB_USER and DB_PASSWORD.");
  let url: URL;
  try { url = new URL(env.DATABASE_URL); }
  catch { throw new Error("DATABASE_URL is invalid."); }
  if (url.protocol === "postgres:" || url.protocol === "postgresql:") {
    return { dialect: "postgres", connectionString: env.DATABASE_URL };
  }
  if (url.protocol !== "mysql:") {
    throw new Error("DATABASE_URL must use mysql://, postgres:// or postgresql://.");
  }
  if (!url.hostname || !url.username || !url.pathname.slice(1)) {
    throw new Error("MySQL DATABASE_URL requires a host, user and database name.");
  }
  let user: string, password: string, database: string;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch { throw new Error("MySQL DATABASE_URL contains invalid URL encoding."); }
  return {
    dialect: "mysql",
    mysql: {
      host: url.hostname,
      port: portNumber(url.port || "3306"),
      database, user, password,
      tls: tlsEnabled(url.searchParams.get("ssl") ?? undefined),
    },
  };
}
