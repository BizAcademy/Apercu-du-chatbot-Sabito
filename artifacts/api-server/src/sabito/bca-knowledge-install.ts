import { pool } from "./database";
import { saveKnowledge } from "./knowledge";
import { normalizeQuestion } from "./question-normalization";
import { bcaGuides } from "./bca-guide-data";
import { bcaFaq,bcaFaqFor } from "./bca-faq";
import { bcaSourceDrafts } from "./bca-source-drafts";

const installed = new Set<string>();
const action = "bca.help_pack.installed";
type Answer = {content:string;status:string;priority:number};

/** Install the owner's approved BCA pack once. The project lock and durable
 * marker also protect concurrent workers, cold starts and intentional deletions. */
export async function ensureBcaKnowledge(projectId:string):Promise<boolean> {
  if (installed.has(projectId)) return false;
  const connection = await pool.connect();
  let changed = false;
  try {
    await connection.query("BEGIN");
    const owner = await connection.query(
      "SELECT id,slug,name FROM sabito_core.projects WHERE id=$1 FOR UPDATE", [projectId]);
    const project = owner.rows[0];
    if (!project || !/\bbca\b|sabitobca|biz\s*connect\s*academy/i.test(`${project.slug} ${project.name}`)) {
      await connection.query("ROLLBACK");
      return false;
    }
    const faqKeys=new Set(bcaFaq.map(guide=>guide.key));
    const packs=[{action,guides:bcaGuides.filter(guide=>!faqKeys.has(guide.key))},
      {action:"bca.general_faq.installed",guides:bcaFaq}];
    for(const pack of packs) {
      const marker = await connection.query(
        "SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1", [projectId, pack.action]);
      if(marker.rows.length)continue;
      const existing = await connection.query(`SELECT d.title,d.content,d.status,v.variantes_de_question,f.questions_json
        FROM sabito_core.knowledge_documents d
        LEFT JOIN sabito_core.knowledge_question_variants v ON v.document_id=d.id AND v.project_id=d.project_id
        LEFT JOIN sabito_core.knowledge_follow_ups f ON f.document_id=d.id AND f.project_id=d.project_id
        WHERE d.project_id=$1`, [projectId]);
      const reserved = new Set<string>();
      const answers = new Map<string,Answer[]>();
      const add = (question:string, content:string, status:string, priority:number) => {
        const key = normalizeQuestion(question);
        reserved.add(key);
        answers.set(key, [...(answers.get(key) ?? []), {content,status,priority}]);
      };
      for (const row of existing.rows) {
        add(String(row.title), String(row.content), String(row.status), 3);
        for (const variant of JSON.parse(String(row.variantes_de_question ?? "[]")) as string[])
          add(variant, String(row.content), String(row.status), 2);
        for (const item of JSON.parse(String(row.questions_json ?? "[]")) as {question:string;answer:string}[])
          add(item.question, item.answer, String(row.status), 1);
      }
      // Titles are reserved before aliases so a variant never shadows a primary question.
      const pending = pack.guides.filter(guide => !reserved.has(normalizeQuestion(guide.title)));
      const variants = new Map<string,string[]>();
      for (const guide of pending) add(guide.title, guide.content, "ready", 3);
      for (const guide of pending) {
        variants.set(guide.key, guide.variants.filter(variant => {
          if (reserved.has(normalizeQuestion(variant))) return false;
          add(variant, guide.content, "ready", 2);
          return true;
        }));
      }
      const ids:string[] = [];
      for (const guide of pending) {
        const followUps = guide.followUpKeys.flatMap(key => {
          const target = bcaGuides.find(item => item.key === key)!;
          const candidates = answers.get(normalizeQuestion(target.title)) ?? [];
          const priority = Math.max(0, ...candidates.map(item => item.priority));
          const best = candidates.filter(item => item.priority === priority);
          // Respect authored answers; don't expose drafts or guess between conflicts.
          if (!best.length || best.some(item => item.status !== "ready") ||
              new Set(best.map(item => item.content)).size !== 1) return [];
          return [{question:target.title, answer:best[0].content}];
        });
        const saved = await saveKnowledge(projectId, guide.title, guide.content,
          undefined, connection, variants.get(guide.key) ?? [], followUps);
        if (saved) ids.push(saved.documentId);
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES ($1,'system',$2,$3)`, [projectId, pack.action, JSON.stringify({
        source:"owner-approved-bca-help", documentIds:ids,
        preservedQuestions:pack.guides.filter(guide => !pending.includes(guide)).map(guide => guide.title),
      })]);
      changed = changed || ids.length > 0;
    }
    const sourceAction="bca.source_drafts.proposed";
    const seeded=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",
      [projectId,sourceAction]);
    if(!seeded.rows.length) {
      const existing=await connection.query("SELECT title FROM sabito_core.knowledge_documents WHERE project_id=$1",[projectId]);
      const titles=new Set(existing.rows.map(row=>normalizeQuestion(String(row.title))));
      let count=0;
      for(const draft of bcaSourceDrafts) {
        if(titles.has(normalizeQuestion(draft.title)))continue;
        await saveKnowledge(projectId,draft.title,draft.content,undefined,connection,draft.variants,[],
          {category:draft.category,keywords:draft.keywords,source:`Archive backend BCA fournie par le propriétaire. ${draft.source}`});
        count++;
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES($1,'system',$2,$3)`,[projectId,sourceAction,JSON.stringify({count,status:"pending"})]);
      changed=changed||count>0;
    }
    await connection.query("COMMIT");
    if (installed.size >= 10000) installed.delete(installed.values().next().value!);
    installed.add(projectId);
    return changed;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

/** Only procedural questions may bypass collection of private transaction fields.
 * The caller must also find a reliable approved answer. Exact financial values
 * and requests for actual personal results remain in the existing member flow. */
export function isBcaHelpQuestion(text:string):boolean {
  const question = normalizeQuestion(text);
  if(bcaFaqFor(text))return true;
  if (/\d/.test(question) || /^(?:verifie|verifier|consulte|recherche|cherche)\b/.test(question))
    return false;
  return /^(?:comment\b|guide\b|quelles? (?:sont les )?etapes\b|c est quoi\b|a quoi sert\b|ou (?:trouver|retrouver|consulter|voir|saisir|faire|envoyer)\b)/.test(question);
}
