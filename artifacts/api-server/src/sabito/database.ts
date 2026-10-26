import { checkMysqlConnection, createMysqlAdapter } from "./mysql-pool";
import { initializeMysqlSchema } from "./mysql-schema";

// Sabito's core uses MySQL/MariaDB only. PostgreSQL evaluation data is untouched.
export const databaseDialect = "mysql" as const;
export const pool = createMysqlAdapter();

export async function initializeSabitoCore() {
  await checkMysqlConnection();
  // Production startup is read-only with respect to migrations.
  // Pending migrations require explicit review and application by an operator.
  const localDevelopment = process.env.NODE_ENV !== "production";
  await initializeMysqlSchema({ apply: localDevelopment, allowDestructive: localDevelopment });
}
