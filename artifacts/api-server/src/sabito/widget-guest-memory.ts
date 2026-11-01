import { createHash,randomBytes } from "node:crypto";
import type { Request,Response } from "express";
import { pool } from "./database";
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
function cookieDetails(req:Request,projectId:string) {
  const origin=req.header("origin")??"",secure=origin.startsWith("https:");
  const name=`${secure?"__Secure-":""}sabito_guest_${hash(`${projectId}|${origin}`).slice(0,20)}`;
  const raw=(req.header("cookie")??"").split(";").map(s=>s.trim()).find(s=>s.startsWith(`${name}=`))?.slice(name.length+1);
  const token=raw&&/^[\w-]{43}$/.test(raw)?raw:undefined;
  return {origin,name,token,suffix:`; Path=/; HttpOnly; ${secure?"Secure; SameSite=None; Partitioned":"SameSite=Lax"}`};
}
export async function rememberedGuest(req:Request,projectId:string,clientId:string) {
  const cookie=cookieDetails(req,projectId);
  if(!cookie.token)return undefined;
  const rows=await pool.query(`SELECT external_user_id FROM sabito_core.widget_guest_sessions
    WHERE token_hash=$1 AND project_id=$2 AND client_id=$3 AND origin=$4 AND expires_at>CURRENT_TIMESTAMP(6)`,
    [hash(cookie.token),projectId,clientId,cookie.origin]);
  return rows.rows[0]?.external_user_id as string|undefined;
}
export async function rememberGuest(req:Request,res:Response,projectId:string,clientId:string,userId:string,existing?:string) {
  if(existing===userId)return;
  const cookie=cookieDetails(req,projectId),token=randomBytes(32).toString("base64url");
  await pool.query(`DELETE FROM sabito_core.widget_guest_sessions WHERE project_id=$1 AND expires_at<=CURRENT_TIMESTAMP(6) LIMIT 100`,[projectId]);
  await pool.query(`INSERT INTO sabito_core.widget_guest_sessions(token_hash,project_id,client_id,origin,external_user_id,expires_at)
    VALUES($1,$2,$3,$4,$5,DATE_ADD(CURRENT_TIMESTAMP(6),INTERVAL 24 HOUR))`,
    [hash(token),projectId,clientId,cookie.origin,userId]);
  res.append("Set-Cookie",`${cookie.name}=${token}; Max-Age=86400${cookie.suffix}`);
}
export async function forgetGuest(req:Request,res:Response,projectId:string) {
  const cookie=cookieDetails(req,projectId);
  if(cookie.token)await pool.query(`DELETE FROM sabito_core.widget_guest_sessions WHERE token_hash=$1 AND project_id=$2 AND origin=$3`,
    [hash(cookie.token),projectId,cookie.origin]);
  res.append("Set-Cookie",`${cookie.name}=; Max-Age=0${cookie.suffix}`);
}
