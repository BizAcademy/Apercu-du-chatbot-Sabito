import { closeMysqlPool } from "./sabito/mysql-pool";
import { initializeMysqlSchema, mysqlMigrationStatus } from "./sabito/mysql-schema";
import { logger } from "./lib/logger";

try {
  const args = new Set(process.argv.slice(2));
  if (args.has("--apply")) {
    if (!args.has("--reviewed")) throw new Error("Review the migration plan before explicitly approving application.");
    await initializeMysqlSchema({
      apply: true, reviewed: true, allowDestructive: args.has("--allow-destructive"),
    });
  }
  const status = await mysqlMigrationStatus();
  // File names and trusted migration SQL only; never connection settings.
  logger.info({
    applied: status.applied,
    pending: status.pending.map(({ name, requiresDestructiveApproval }) => ({ name, requiresDestructiveApproval })),
  }, "MySQL migration status");
  if (args.has("--plan")) {
    for (const migration of status.pending) {
      logger.info({ name: migration.name, sql: migration.sql }, "Review pending MySQL migration");
    }
  }
} catch {
  logger.error("MySQL migration command failed. Check configuration, connectivity, history and explicit approval.");
  process.exitCode = 1;
} finally {
  await closeMysqlPool();
}
