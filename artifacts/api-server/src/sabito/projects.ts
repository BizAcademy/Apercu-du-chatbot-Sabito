import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { hashClientSecret, issueCredentials, safeEqual } from "./security";

export async function listProjects() {
  const { rows } = await pool.query(`SELECT id,slug,name,assistant_name AS "assistantName",status,
    created_at AS "createdAt" FROM sabito_core.projects ORDER BY created_at DESC`);
  return rows;
}
export async function getProject(id: string) {
  const { rows } = await pool.query(`SELECT * FROM sabito_core.projects WHERE id=$1`, [id]);
  return rows[0] ?? null;
}
export async function createProject(input: {slug: string; name: string; assistant_name: string; system_prompt: string}) {
  const projectId = randomUUID(), credentials = issueCredentials();
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query(`INSERT INTO sabito_core.projects
      (id,slug,name,assistant_name,system_prompt) VALUES ($1,$2,$3,$4,$5)`,
      [projectId,input.slug,input.name,input.assistant_name,input.system_prompt]);
    const { rows } = await connection.query(`SELECT id,slug,name,assistant_name AS "assistantName",
      status,created_at AS "createdAt" FROM sabito_core.projects WHERE id=$1`,[projectId]);
    await connection.query(`INSERT INTO sabito_core.project_credentials
      (id,project_id,client_id,secret_hash,secret_hint) VALUES ($1,$2,$3,$4,$5)`,
      [randomUUID(),projectId,credentials.clientId,credentials.secretHash,credentials.secretHint]);
    await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
      VALUES ($1,'admin','project.created',$2)`, [projectId,JSON.stringify({slug:input.slug,clientId:credentials.clientId})]);
    await connection.query("COMMIT");
    return { project: rows[0], credentials: {clientId:credentials.clientId,clientSecret:credentials.clientSecret} };
  } catch (error) {
    await connection.query("ROLLBACK"); throw error;
  } finally { connection.release(); }
}
export async function rotateProjectCredential(projectId: string) {
  const credentials = issueCredentials(), connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    const { rows } = await connection.query(`SELECT id FROM sabito_core.projects WHERE id=$1 FOR UPDATE`,[projectId]);
    if (!rows.length) { await connection.query("ROLLBACK"); return null; }
    await connection.query(`UPDATE sabito_core.project_credentials SET status='revoked',revoked_at=now()
      WHERE project_id=$1 AND status='active'`,[projectId]);
    await connection.query(`INSERT INTO sabito_core.project_credentials
      (id,project_id,client_id,secret_hash,secret_hint) VALUES ($1,$2,$3,$4,$5)`,
      [randomUUID(),projectId,credentials.clientId,credentials.secretHash,credentials.secretHint]);
    await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
      VALUES ($1,'admin','credential.rotated',$2)`,[projectId,JSON.stringify({clientId:credentials.clientId})]);
    await connection.query("COMMIT");
    return {clientId:credentials.clientId,clientSecret:credentials.clientSecret};
  } catch (error) {
    await connection.query("ROLLBACK"); throw error;
  } finally { connection.release(); }
}
export async function activeCredential(projectId: string, clientId?: string) {
  const { rows } = await pool.query(`SELECT c.* FROM sabito_core.project_credentials c
    INNER JOIN sabito_core.projects p ON p.id=c.project_id
    WHERE c.project_id=$1 AND p.status='active' AND c.status='active'
      AND (c.expires_at IS NULL OR c.expires_at>now()) ${clientId ? "AND c.client_id=$2" : ""}
    ORDER BY c.created_at DESC LIMIT 1`, clientId ? [projectId,clientId] : [projectId]);
  return rows[0] ?? null;
}
export async function authenticateProject(clientId: string, clientSecret: string) {
  const { rows } = await pool.query(`SELECT project_id FROM sabito_core.project_credentials WHERE client_id=$1`,[clientId]);
  if (!rows[0]) return null;
  const credential = await activeCredential(rows[0].project_id,clientId);
  if (!credential || !safeEqual(hashClientSecret(clientSecret),credential.secret_hash)) return null;
  await pool.query(`UPDATE sabito_core.project_credentials SET last_used_at=now() WHERE id=$1`,[credential.id]);
  return {id:credential.project_id,clientId:credential.client_id};
}
