import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp,mkdir,readFile,writeFile,rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
async function fixture(t,{oldExit=false,code="RELEASE_NOT_READY_OR_ACCESS_DENIED",warm=false}={}) {
  const dir=await mkdtemp(path.join(os.tmpdir(),"sabito-passenger-restart-"));
  await mkdir(path.join(dir,"scripts/src"),{recursive:true});
  await mkdir(path.join(dir,"deployment"),{recursive:true});
  let source=await readFile(path.join(root,"app.js"),"utf8");
  if(oldExit)source=source.replace("process.exit(1);","process.exitCode = 1;");
  await writeFile(path.join(dir,"app.js"),source);
  await writeFile(path.join(dir,"scripts/src/plesk-fingerprint.mjs"),
    `export async function getSourceFingerprint(){return "${"f".repeat(64)}";}`);
  await writeFile(path.join(dir,"deployment/deploy-plesk.mjs"),
    `export async function deployFromGithub(){const error=new Error("fixture-private-detail");error.code=${JSON.stringify(code)};throw error;}`);
  // Passenger's control channel keeps the event loop alive even if startup fails.
  await writeFile(path.join(dir,"passenger-control.cjs"),"setInterval(()=>{},1000);");
  if(warm) {
    const current=path.join(dir,".sabito-runtime/current");
    await mkdir(current,{recursive:true});
    await writeFile(path.join(current,"release.json"),JSON.stringify({sourceFingerprint:"f".repeat(64)}));
    await writeFile(path.join(current,"app.js"),'process.stdout.write("WARM_RELEASE_STARTED\\n");process.exit(0);');
  }
  const child=spawn(process.execPath,["--require","./passenger-control.cjs","app.js"],{
    cwd:dir,env:{PATH:process.env.PATH},stdio:["ignore","pipe","pipe"],
  });
  let output="";
  child.stdout.on("data",chunk=>{output+=chunk;});
  child.stderr.on("data",chunk=>{output+=chunk;});
  const exited=once(child,"exit");
  t.after(async()=>{
    if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
    await exited;
    await rm(dir,{recursive:true,force:true});
  });
  return {child,exited,output:()=>output};
}
test("Regression: exitCode alone leaves a failed Passenger bootstrap alive",{timeout:4000},async t=>{
  const run=await fixture(t,{oldExit:true});
  for(let i=0;i<60&&!run.output().includes("lancement impossible");i++)await delay(20);
  assert.match(run.output(),/lancement impossible/);
  await delay(100);
  assert.equal(run.child.exitCode,null);
});
test("A missing release terminates the Passenger bootstrap instead of hanging",{timeout:4000},async t=>{
  const run=await fixture(t);
  const [code]=await run.exited;
  assert.equal(code,1);
  assert.match(run.output(),/\[RELEASE_NOT_READY_OR_ACCESS_DENIED\]/);
  assert.doesNotMatch(run.output(),/fixture-private-detail/);
});
test("Unknown bootstrap errors are redacted and terminate the process",{timeout:4000},async t=>{
  const run=await fixture(t,{code:"fixture-private-code"});
  const [code]=await run.exited;
  assert.equal(code,1);
  assert.match(run.output(),/\[STARTUP_FAILED\]/);
  assert.doesNotMatch(run.output(),/fixture-private/);
});
test("A matching compiled release starts without downloading another release",{timeout:4000},async t=>{
  const run=await fixture(t,{warm:true});
  const [code]=await run.exited;
  assert.equal(code,0);
  assert.match(run.output(),/WARM_RELEASE_STARTED/);
  assert.doesNotMatch(run.output(),/lancement impossible/);
});
