export interface MysqlConnectionSettings {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/** Server-only configuration. Error messages contain variable names, never values. */
export function readMysqlConfiguration(
  env: Record<string, string | undefined> = process.env,
): MysqlConnectionSettings {
  const missing = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"]
    .filter(key => !env[key] || (key !== "MYSQL_PASSWORD" && !env[key]?.trim()));
  if (missing.length) throw new Error(`Missing MySQL configuration: ${missing.join(", ")}.`);
  const rawPort = env.MYSQL_PORT?.trim() || "3306";
  if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    throw new Error("MYSQL_PORT must be an integer between 1 and 65535.");
  }
  return {
    host: env.MYSQL_HOST!.trim(),
    port: Number(rawPort),
    database: env.MYSQL_DATABASE!.trim(),
    user: env.MYSQL_USER!.trim(),
    password: env.MYSQL_PASSWORD!,
  };
}
