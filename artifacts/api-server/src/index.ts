import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { initializeSabitoCore } from "./sabito/database";
import { attachSocketServer } from "./sabito/socket";

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
