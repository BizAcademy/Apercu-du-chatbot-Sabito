import { pool } from "./database";
import { saveKnowledge } from "./knowledge";
import { buzzGuides } from "./buzzbooster-guides";

const installed=new Set<string>();
const action="buzzbooster.help_pack.installed";
/** The owner approved this pack. Install once, atomically, without overwriting
 * existing references or restoring documents the administrator later deletes. */
export async function ensureBuzzBoosterKnowledge(projectId:string):Promise<boolean> {
  if(installed.has(projectId))return false;
  const connection=await pool.connect();
  let changed=false;
  try {
    await connection.query("BEGIN");
    const owner=await connection.query("SELECT id FROM sabito_core.projects WHERE id=$1 FOR UPDATE",[projectId]);
    if(!owner.rows.length)throw new Error("PROJECT_NOT_FOUND");
    const marker=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",[projectId,action]);
    if(!marker.rows.length) {
      const existing=await connection.query("SELECT title FROM sabito_core.knowledge_documents WHERE project_id=$1",[projectId]);
      const titles=new Set(existing.rows.map(row=>String(row.title).trim().toLowerCase()));
      const ids:string[]=[];
      for(const guide of buzzGuides) {
        if(titles.has(guide.title.toLowerCase()))continue;
        const saved=await saveKnowledge(projectId,guide.title,guide.content,undefined,connection,guide.variants,[]);
        if(saved)ids.push(saved.documentId);
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES ($1,'system',$2,$3)`,[projectId,action,JSON.stringify({source:"owner-approved-buzzbooster-help",documentIds:ids})]);
      changed=ids.length>0;
    }
    await connection.query("COMMIT");
    if(installed.size>=10000)installed.delete(installed.values().next().value!);
    installed.add(projectId);
    return changed;
  } catch(error) {await connection.query("ROLLBACK");throw error;}
  finally {connection.release();}
}
