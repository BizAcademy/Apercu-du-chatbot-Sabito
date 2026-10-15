import { randomUUID } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { authenticateProject } from "./projects";
import { parseBasicCredentials } from "./security";

export const operations = ["account_activation", "deposit_status", "referral_code"] as const;
export type BackendOperation = typeof operations[number];
export const backendResult = z.discriminatedUnion("status", [
  z.object({status:z.enum(["pending","confirmed","failed","not_found","active","inactive","forbidden","error"])}).strict(),
  z.object({status:z.literal("ok"),code:z.string().regex(/^[\p{L}\p{N}_-]{1,100}$/u)}).strict(),
]);
export type BackendResult = z.infer<typeof backendResult>;
type Job = {id:string; operation:BackendOperation; external_user_id:string; fields:Record<string,string>; expires_at:string};
type Pending = {projectId:string; job:Job; delivered:boolean; finish:(result:BackendResult)=>void};
const pending = new Map<string,Pending>();
const seen = new Map<string,number>();
export function revokeBackendJobs(projectId:string) {
  seen.delete(projectId);
  for(const item of pending.values()) if(item.projectId===projectId) item.finish({status:"error"});
}
export function backendStatus(projectId:string) {
  const lastSeen = seen.get(projectId);
  return {connected:!!lastSeen && Date.now()-lastSeen < 30000,last_seen:lastSeen ? new Date(lastSeen).toISOString() : null};
}
export function requestBackend(projectId:string, externalUserId:string, operation:BackendOperation, fields:Record<string,string>):Promise<BackendResult> {
  if (!backendStatus(projectId).connected) return Promise.reject(new Error("BACKEND_OFFLINE"));
  if (pending.size >= 2000 || [...pending.values()].filter(p=>p.projectId===projectId).length >= 32)
    return Promise.reject(new Error("BACKEND_BUSY"));
  return new Promise((resolve,reject) => {
    const id=randomUUID();
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error("BACKEND_TIMEOUT"));},20000);
    timer.unref();
    pending.set(id,{projectId,delivered:false,
      job:{id,operation,external_user_id:externalUserId,fields,expires_at:new Date(Date.now()+20000).toISOString()},
      finish(result) {clearTimeout(timer);pending.delete(id);resolve(result);}});
  });
}

// No browser token can poll jobs: only the existing server-side platform
// credentials. No caller-supplied URLs, SQL or arbitrary operations are accepted.
export const backendBridgeRoutes=Router();
backendBridgeRoutes.use("/v1/backend",rateLimit({windowMs:60000,limit:240,standardHeaders:"draft-7",legacyHeaders:false}),async(req,res,next)=>{
  if (req.headers.origin) {res.sendStatus(403);return;}
  const credentials=parseBasicCredentials(req.header("authorization"));
  const project=credentials ? await authenticateProject(credentials.clientId,credentials.clientSecret) : null;
  if (!project) {res.status(401).json({message:"Identifiants serveur invalides ou révoqués."});return;}
  res.locals.projectId=project.id;
  next();
});
backendBridgeRoutes.post("/v1/backend/jobs/poll",(_req,res)=>{
  const projectId=res.locals.projectId as string;
  seen.set(projectId,Date.now());
  for (const [id,time] of seen) if (Date.now()-time>300000) seen.delete(id);
  const jobs:Job[]=[];
  for (const item of pending.values()) {
    if (item.projectId===projectId && !item.delivered && jobs.length<5) {
      item.delivered=true;jobs.push(item.job);
    }
  }
  res.json({jobs});
});
backendBridgeRoutes.post("/v1/backend/jobs/:jobId/result",(req,res)=>{
  const body=z.object({result:backendResult}).strict().safeParse(req.body);
  if (!z.string().uuid().safeParse(req.params.jobId).success || !body.success) {res.sendStatus(422);return;}
  const item=pending.get(req.params.jobId as string);
  if (!item || !item.delivered || item.projectId!==res.locals.projectId) {res.sendStatus(404);return;}
  if(Date.parse(item.job.expires_at)<=Date.now()) {item.finish({status:"error"});res.sendStatus(404);return;}
  item.finish(body.data.result);
  res.json({accepted:true});
});
