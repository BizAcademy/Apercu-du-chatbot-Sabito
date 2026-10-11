import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { initializeSabitoCore } from "./sabito/database";
import { attachSocketServer } from "./sabito/socket";
import { closeMysqlPool } from "./sabito/mysql-pool";

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

await initializeSabitoCore();
const server = createServer(app);
attachSocketServer(server);
server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
server.listen(port, () => {
  logger.info({ port }, "Server listening");
});

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  server.close();
  server.closeAllConnections();
  try {
    await closeMysqlPool();
    clearTimeout(deadline);
    process.exit(0);
  } catch {
    logger.error("Could not close the database pool during shutdown.");
    process.exit(1);
  }
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
