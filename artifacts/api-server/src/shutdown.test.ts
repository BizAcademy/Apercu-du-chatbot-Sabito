import assert from "node:assert/strict";
import { EventEmitter,once } from "node:events";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as clientIo } from "socket.io-client";
import test from "node:test";
import { installGracefulShutdown } from "./shutdown";

function processFixture() {
  const control=new EventEmitter();
  const codes:number[]=[];
  let finish!:(code:number)=>void;
  const exited=new Promise<number>(resolve=>{finish=resolve;});
  return {control:Object.assign(control,{exit(code:number){codes.push(code);finish(code);}}),codes,exited};
}
test("Passenger exit closes an active WebSocket and the database exactly once",{timeout:5000},async t=>{
  const server=createServer((_req,res)=>res.end("ok"));
  const io=new Server(server);
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const address=server.address();
  assert.ok(address&&typeof address!=="string");
  const client=clientIo(`http://127.0.0.1:${address.port}`,{transports:["websocket"],reconnection:false});
  t.after(()=>{client.disconnect();io.close();});
  await new Promise<void>((resolve,reject)=>{
    client.once("connect",()=>resolve());
    client.once("connect_error",reject);
  });
  const disconnected=new Promise<string>(resolve=>client.once("disconnect",reason=>resolve(reason)));
  const fixture=processFixture(),passenger=new EventEmitter();
  let databaseCloses=0;
  installGracefulShutdown({server,io,passenger,processControl:fixture.control,
    closeDatabase:async()=>{databaseCloses++;},logger:{error:()=>assert.fail("Unexpected shutdown error")}});
  passenger.emit("exit");
  fixture.control.emit("SIGTERM");
  fixture.control.emit("SIGINT");
  assert.equal(await fixture.exited,0);
  assert.notEqual(await disconnected,"io server disconnect");
  assert.equal(databaseCloses,1);
  assert.deepEqual(fixture.codes,[0]);
  assert.equal(server.listening,false);
});
for(const signal of ["SIGTERM","SIGINT"] as const)test(`${signal} stops a server without Passenger`,async()=>{
  const server=createServer(),io=new Server(server),fixture=processFixture();
  server.listen(0,"127.0.0.1");await once(server,"listening");
  installGracefulShutdown({server,io,processControl:fixture.control,
    closeDatabase:async()=>{},logger:{error:()=>assert.fail("Unexpected shutdown error")}});
  fixture.control.emit(signal);
  assert.equal(await fixture.exited,0);
  assert.equal(server.listening,false);
});
test("A failed database close exits with an error without exposing its details",async()=>{
  const server=createServer(),io=new Server(server),fixture=processFixture(),logs:string[]=[];
  server.listen(0,"127.0.0.1");await once(server,"listening");
  installGracefulShutdown({server,io,processControl:fixture.control,
    closeDatabase:async()=>{throw new Error("fixture-private-error");},logger:{error:line=>logs.push(line)}});
  fixture.control.emit("SIGTERM");
  assert.equal(await fixture.exited,1);
  assert.doesNotMatch(logs.join("\n"),/fixture-private-error/);
  await io.close();
});
test("A stuck database close cannot hold Passenger shutdown indefinitely",{timeout:2000},async()=>{
  const server=createServer(),io=new Server(server),fixture=processFixture(),logs:string[]=[];
  server.listen(0,"127.0.0.1");await once(server,"listening");
  installGracefulShutdown({server,io,processControl:fixture.control,timeoutMs:30,
    closeDatabase:()=>new Promise(()=>{}),logger:{error:line=>logs.push(line)}});
  fixture.control.emit("SIGTERM");
  assert.equal(await fixture.exited,1);
  assert.match(logs.join("\n"),/deadline exceeded/);
  await io.close();
});
