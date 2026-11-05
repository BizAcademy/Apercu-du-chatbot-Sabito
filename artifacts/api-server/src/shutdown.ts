import type { Server as HttpServer } from "node:http";
import type { Server as SocketServer } from "socket.io";

type Passenger = { on(event:"exit",listener:()=>void):unknown };
type ProcessControl = {
  once(event:"SIGINT"|"SIGTERM",listener:()=>void):unknown;
  exit(code:number):unknown;
};
type Options = {
  server:HttpServer;
  io:SocketServer;
  closeDatabase:()=>Promise<void>;
  logger:{error(message:string):unknown};
  processControl?:ProcessControl;
  passenger?:Passenger;
  timeoutMs?:number;
};

/** Passenger does not necessarily deliver a Unix signal to its Node worker. */
export function installGracefulShutdown(options:Options) {
  const control=options.processControl??process;
  const passenger=options.passenger??
    (globalThis as typeof globalThis & {PhusionPassenger?:Passenger}).PhusionPassenger;
  let pending:Promise<void>|undefined;
  const shutdown=()=>{
    if(pending)return pending;
    pending=(async()=>{
      const deadline=setTimeout(()=>{
        options.logger.error("Sabito shutdown deadline exceeded.");
        control.exit(1);
      },options.timeoutMs??10000);
      try {
        // closeAllConnections does not close upgraded WebSocket connections.
        // Socket.IO must disconnect them and stop its transports explicitly.
        // io.close() closes the transports. Do not send a namespace DISCONNECT:
        // clients interpret that as a permanent logout and stop reconnecting.
        const socketsClosed=new Promise<void>((resolve,reject)=>{
          options.io.close(error=>{
            if(error&&(error as NodeJS.ErrnoException).code!=="ERR_SERVER_NOT_RUNNING")reject(error);
            else resolve();
          });
        });
        options.server.closeAllConnections();
        await Promise.all([socketsClosed,options.closeDatabase()]);
        clearTimeout(deadline);
        control.exit(0);
      } catch {
        clearTimeout(deadline);
        options.logger.error("Could not close Sabito connections during shutdown.");
        control.exit(1);
      }
    })();
    return pending;
  };
  control.once("SIGTERM",()=>{void shutdown();});
  control.once("SIGINT",()=>{void shutdown();});
  if(passenger&&typeof passenger.on==="function")passenger.on("exit",()=>{void shutdown();});
  return shutdown;
}
