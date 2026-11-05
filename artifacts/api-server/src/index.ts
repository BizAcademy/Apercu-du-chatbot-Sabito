import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { initializeSabitoCore } from "./sabito/database";
import { attachSocketServer } from "./sabito/socket";
import { closeMysqlPool } from "./sabito/mysql-pool";
import { describeMysqlFailure } from "./sabito/mysql-diagnostics";
import { installGracefulShutdown } from "./shutdown";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  await initializeSabitoCore();
} catch (error) {
  logger.error(describeMysqlFailure(error), "Initialisation MySQL impossible.");
  throw new Error("MYSQL_INITIALIZATION_FAILED");
}
const server = createServer(app);
const io=attachSocketServer(server);
installGracefulShutdown({server,io,closeDatabase:closeMysqlPool,logger});
server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
