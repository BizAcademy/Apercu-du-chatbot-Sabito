import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Linux UNIX-domain sockets allow at most 107 pathname bytes. GitHub checkout
// paths include the repository name twice, so CI must not put sockets there.
export async function createMysqlRuntime(root, { verify = false, githubActions = false } = {}) {
  const temporary = verify && githubActions;
  const runtime = temporary
    ? await mkdtemp(path.join(os.tmpdir(), "sabito-mysql-"))
    : path.join(root, "generated-artifacts/mysql-preview");
  const socket = path.join(runtime, "mysql.sock");
  if (Buffer.byteLength(socket) > 107) {
    if (temporary) await rm(runtime, { recursive: true, force: true });
    const error = new Error("MYSQL_LOCAL_SOCKET_PATH_TOO_LONG");
    error.code = "MYSQL_LOCAL_SOCKET_PATH_TOO_LONG";
    throw error;
  }
  return {
    runtime, socket, temporary,
    data: path.join(runtime, "data"),
    marker: path.join(runtime, "initialized"),
    port: temporary ? 33309 : 33308,
  };
}
