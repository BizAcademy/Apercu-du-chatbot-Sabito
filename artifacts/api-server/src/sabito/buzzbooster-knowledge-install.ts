import { pool } from "./database";
import { saveKnowledge } from "./knowledge";
import { buzzGuides } from "./buzzbooster-guides";
import { buzzFaq } from "./buzzbooster-faq";
import { supervisedBuzzKnowledge, supervisedBuzzSource } from "./buzzbooster-supervised-pack";
import { buzzCorpus,buzzCorpusSource } from "./buzzbooster-corpus";
import { normalizeQuestion } from "./question-normalization";

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
    const faqKeys=new Set(buzzFaq.map(guide=>guide.key));
    const packs=[
      {action,guides:buzzGuides.filter(guide=>!faqKeys.has(guide.key))},
      {action:"buzzbooster.general_faq.installed",guides:buzzFaq},
    ];
    for(const pack of packs) {
      const marker=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",[projectId,pack.action]);
      if(marker.rows.length)continue;
      const existing=await connection.query("SELECT title FROM sabito_core.knowledge_documents WHERE project_id=$1",[projectId]);
      const titles=new Set(existing.rows.map(row=>String(row.title).trim().toLowerCase()));
      const ids:string[]=[];
      for(const guide of pack.guides) {
        if(titles.has(guide.title.toLowerCase()))continue;
        const followUps=guide.key==="overview"
          ? ["service-choice","mobile-money"].map(key=>buzzGuides.find(item=>item.key===key)!)
            .map(item=>({question:item.title,answer:item.content}))
          : [];
        const saved=await saveKnowledge(projectId,guide.title,guide.content,undefined,connection,guide.variants,followUps);
        if(saved){ids.push(saved.documentId);titles.add(guide.title.toLowerCase());}
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES ($1,'system',$2,$3)`,[projectId,pack.action,JSON.stringify({source:"owner-approved-buzzbooster-help",documentIds:ids})]);
      changed=changed||ids.length>0;
    }
    const draftAction="buzzbooster.supervised_drafts.prepared";
    const seeded=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",[projectId,draftAction]);
    if(!seeded.rows.length) {
      for(const draft of supervisedBuzzKnowledge) {
        await saveKnowledge(projectId,draft.title,draft.content,undefined,connection,draft.variants,[],
          {category:draft.category,keywords:draft.keywords,source:supervisedBuzzSource});
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES($1,'system',$2,$3)`,[projectId,draftAction,JSON.stringify({count:supervisedBuzzKnowledge.length,status:"pending"})]);
      changed=true;
    }
    const corpusAction="buzzbooster.corpus97.proposed";
    const corpusMarker=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",[projectId,corpusAction]);
    if(!corpusMarker.rows.length) {
      const existing=await connection.query("SELECT id,title,status FROM sabito_core.knowledge_documents WHERE project_id=$1",[projectId]);
      const byTitle=new Map(existing.rows.map(row=>[normalizeQuestion(String(row.title)),row]));
      const proposals=[];
      for(const item of buzzCorpus) {
        // Never replace an approved answer, an administrator's draft or a deleted
        // proposal. The pack marker makes subsequent reads/restarts idempotent.
        const found=byTitle.get(normalizeQuestion(item.title));
        let documentId=found?String(found.id):undefined;
        if(!found){
          const saved=await saveKnowledge(projectId,item.title,item.content,undefined,connection,item.variants,[],
            {category:item.category,keywords:item.keywords,source:`${buzzCorpusSource} Groupe : ${item.key}. Repères : ${item.questions.map(n=>`Q${n}`).join(", ")}.`});
          documentId=saved?.documentId;changed=true;
        }
        proposals.push({key:item.key,questions:item.questions,documentId,preserved:!!found});
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES($1,'system',$2,$3)`,[projectId,corpusAction,JSON.stringify({source:"owner-supplied-corpus-analysis",proposals})]);
    }
    await connection.query("COMMIT");
    if(installed.size>=10000)installed.delete(installed.values().next().value!);
    installed.add(projectId);
    return changed;
  } catch(error) {await connection.query("ROLLBACK");throw error;}
  finally {connection.release();}
}
