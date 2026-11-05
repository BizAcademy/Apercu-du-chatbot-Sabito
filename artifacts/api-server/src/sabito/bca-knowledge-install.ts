import { pool } from "./database";
import { saveKnowledge } from "./knowledge";
import { normalizeQuestion } from "./question-normalization";
import { bcaGuides } from "./bca-guide-data";
import { bcaFaq,bcaFaqFor } from "./bca-faq";
import { bcaSourceDrafts } from "./bca-source-drafts";
import { bcaMemberFaq } from "./bca-member-faq";
import { bcaQuestionAliases,bcaQuestionAlias,bcaQuestionFaq,bcaLegacyQuestionFaq } from "./bca-question-followups";
import { bcaOwnerFaq,bcaOwnerCorrections,bcaOwnerPrivateAliases } from "./bca-owner-answers";
import { bcaSupportFaq,bcaSupportAliases,bcaSupportTemplates } from "./bca-support-questions";
import { bcaIntents } from "./bca-settings";
import { bcaDialogueDrafts } from "./bca-dialogue-rules";
import { defaultAbbreviations } from "./question-spelling";

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
    const memberKeys=new Set(bcaMemberFaq.map(guide=>guide.key));
    const questionKeys=new Set(bcaQuestionFaq.map(guide=>guide.key));
    const ownerKeys=new Set(bcaOwnerFaq.map(guide=>guide.key));
    const supportKeys=new Set(bcaSupportFaq.map(guide=>guide.key));
    const packs=[{action,guides:bcaGuides.filter(guide=>!faqKeys.has(guide.key))},
      {action:"bca.general_faq.installed",guides:bcaFaq.filter(guide=>!memberKeys.has(guide.key)&&!questionKeys.has(guide.key)&&!ownerKeys.has(guide.key)&&!supportKeys.has(guide.key))},
      {action:"bca.member_questions.installed",guides:bcaMemberFaq},
      {action:"bca.conversation_questions.installed",guides:bcaQuestionFaq},
      {action:"bca.owner_answers.installed",guides:bcaOwnerFaq},
      {action:"bca.support_questions.installed",guides:bcaSupportFaq}];
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
    // Upgrade only exact shipped answers, including their reused inline answers.
    // An owner's edits, drafts, variants and intentional deletions remain intact.
    const correctionsAction="bca.owner_answers.corrections";
    const correctionMarker=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",
      [projectId,correctionsAction]);
    if(!correctionMarker.rows.length) {
      const documents=await connection.query(`SELECT d.id,d.title,d.content,d.status,v.variantes_de_question,f.questions_json
        FROM sabito_core.knowledge_documents d LEFT JOIN sabito_core.knowledge_question_variants v
        ON v.document_id=d.id AND v.project_id=d.project_id LEFT JOIN sabito_core.knowledge_follow_ups f
        ON f.document_id=d.id AND f.project_id=d.project_id WHERE d.project_id=$1`,[projectId]);
      let updated=0;
      for(const doc of documents.rows) {
        if(doc.status!=="ready")continue;
        const old=bcaLegacyQuestionFaq.find(guide=>guide.title===String(doc.title)&&guide.content===String(doc.content));
        const content=old?bcaOwnerCorrections[old.key]??String(doc.content):String(doc.content);
        const before=JSON.parse(String(doc.questions_json??"[]")) as {question:string;answer:string}[];
        const after=before.map(item=>{
          const target=bcaLegacyQuestionFaq.find(guide=>guide.title===item.question&&guide.content===item.answer);
          return target&&bcaOwnerCorrections[target.key]?{...item,answer:bcaOwnerCorrections[target.key]}:item;
        });
        if(content===String(doc.content)&&JSON.stringify(before)===JSON.stringify(after))continue;
        await saveKnowledge(projectId,String(doc.title),content,String(doc.id),connection,
          JSON.parse(String(doc.variantes_de_question??"[]")),after);
        updated++;
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES ($1,'system',$2,$3)`,[projectId,correctionsAction,JSON.stringify({source:"owner-confirmed-answers",updated})]);
      changed=changed||updated>0;
    }
    const privateAliasAction="bca.owner_private_aliases.installed";
    const privateMarker=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",
      [projectId,privateAliasAction]);
    if(!privateMarker.rows.length) {
      const settings=await connection.query("SELECT config_json FROM sabito_core.assistant_settings WHERE project_id=$1 FOR UPDATE",[projectId]);
      const config=JSON.parse(String(settings.rows[0]?.config_json??"{}"));
      let added=0;
      if(Array.isArray(config.intents)) {
        const reserved=new Set<string>(config.intents.flatMap((intent:{triggers?:string[]})=>intent.triggers??[]).map(normalizeQuestion));
        for(const [operation,aliases] of Object.entries(bcaOwnerPrivateAliases)) {
          const intent=config.intents.find((item:{enabled?:boolean;backend_function?:string})=>item.enabled&&item.backend_function===operation);
          if(!intent||!Array.isArray(intent.triggers))continue;
          for(const alias of aliases) {
            if(reserved.has(normalizeQuestion(alias)))continue;
            intent.triggers.push(alias);reserved.add(normalizeQuestion(alias));added++;
          }
        }
        if(added)await connection.query("UPDATE sabito_core.assistant_settings SET config_json=$2,revision=revision+1 WHERE project_id=$1",
          [projectId,JSON.stringify(config)]);
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES ($1,'system',$2,$3)`,[projectId,privateAliasAction,JSON.stringify({added})]);
      changed=changed||added>0;
    }
    // New read-only operations are installed once. Disabled existing definitions
    // are never enabled; later intentional removal is protected by this marker.
    const supportAction="bca.support_intents.installed";
    const supportMarker=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",
      [projectId,supportAction]);
    if(!supportMarker.rows.length) {
      const settings=await connection.query("SELECT config_json FROM sabito_core.assistant_settings WHERE project_id=$1 FOR UPDATE",[projectId]);
      const config=JSON.parse(String(settings.rows[0]?.config_json??"{}"));
      let added=0;
      if(Array.isArray(config.intents)) {
        const ids=new Set(config.intents.map((item:{id:string})=>item.id));
        const functions=new Set(config.intents.map((item:{backend_function:string})=>item.backend_function));
        const reserved=new Set<string>(config.intents.flatMap((item:{triggers?:string[]})=>item.triggers??[]).map(normalizeQuestion));
        for(const item of bcaIntents().filter(item=>bcaSupportTemplates.some(template=>template.operation===item.backend_function))) {
          if(ids.has(item.id)||functions.has(item.backend_function))continue;
          item.triggers=item.triggers.filter(value=>!reserved.has(normalizeQuestion(value)));
          if(!item.triggers.length)continue;
          config.intents.push(item);added++;
          for(const value of item.triggers)reserved.add(normalizeQuestion(value));
        }
        if(added)await connection.query("UPDATE sabito_core.assistant_settings SET config_json=$2,revision=revision+1 WHERE project_id=$1",
          [projectId,JSON.stringify(config)]);
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES ($1,'system',$2,$3)`,[projectId,supportAction,JSON.stringify({added})]);
      changed=changed||added>0;
    }
    for(const [aliasesAction,groups] of [
      ["bca.conversation_aliases.installed",bcaQuestionAliases],
      ["bca.support_aliases.installed",bcaSupportAliases],
    ] as const) {
    const aliasesMarker=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",
      [projectId,aliasesAction]);
    if(!aliasesMarker.rows.length) {
      const existing=await connection.query(`SELECT d.id,d.title,d.content,d.status,v.variantes_de_question,f.questions_json
        FROM sabito_core.knowledge_documents d LEFT JOIN sabito_core.knowledge_question_variants v
        ON v.document_id=d.id AND v.project_id=d.project_id
        LEFT JOIN sabito_core.knowledge_follow_ups f ON f.document_id=d.id AND f.project_id=d.project_id
        WHERE d.project_id=$1`,[projectId]);
      const reserved=new Set<string>();
      for(const row of existing.rows)for(const question of [String(row.title),...JSON.parse(String(row.variantes_de_question??"[]"))])
        reserved.add(normalizeQuestion(question));
      for(const row of existing.rows)for(const followUp of JSON.parse(String(row.questions_json??"[]")))
        if(typeof followUp.question==="string")reserved.add(normalizeQuestion(followUp.question));
      let added=0;
      for(const group of groups) {
        const guide=bcaGuides.find(item=>item.key===group.key);
        const doc=guide&&existing.rows.find(row=>String(row.title)===guide.title&&String(row.status)==="ready");
        if(!doc)continue; // Never resurrect deleted references or publish a pending one.
        const fresh=group.questions.filter(question=>!reserved.has(normalizeQuestion(question)));
        if(!fresh.length)continue;
        const aliases=[...JSON.parse(String(doc.variantes_de_question??"[]")),...fresh];
        await saveKnowledge(projectId,String(doc.title),String(doc.content),String(doc.id),connection,aliases);
        for(const question of fresh)reserved.add(normalizeQuestion(question));
        added+=fresh.length;
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES($1,'system',$2,$3)`,[projectId,aliasesAction,JSON.stringify({added,preservedContent:true})]);
      changed=changed||added>0;
    }
    }
    const sourceAction="bca.source_drafts.proposed";
    const seeded=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",
      [projectId,sourceAction]);
    if(!seeded.rows.length) {
      const existing=await connection.query(`SELECT d.title,v.variantes_de_question FROM sabito_core.knowledge_documents d
        LEFT JOIN sabito_core.knowledge_question_variants v ON v.document_id=d.id AND v.project_id=d.project_id WHERE d.project_id=$1`,[projectId]);
      const titles=new Set(existing.rows.map(row=>normalizeQuestion(String(row.title))));
      const reserved=new Set(existing.rows.flatMap(row=>[String(row.title),
        ...JSON.parse(String(row.variantes_de_question??"[]"))]).map(normalizeQuestion));
      let count=0;
      for(const draft of bcaSourceDrafts) {
        if(titles.has(normalizeQuestion(draft.title)))continue;
        const variants=[...draft.variants,...["Expliquez-moi ceci : ","Je souhaite comprendre : ","J’ai besoin d’aide : ",
          "Pouvez-vous expliquer : ","Je cherche des informations : "].map(prefix=>prefix+draft.title)]
          .filter((question,index,all)=>!reserved.has(normalizeQuestion(question))&&
            all.findIndex(other=>normalizeQuestion(other)===normalizeQuestion(question))===index).slice(0,10);
        for(const question of [draft.title,...variants])reserved.add(normalizeQuestion(question));
        await saveKnowledge(projectId,draft.title,draft.content,undefined,connection,variants,[],
          {category:draft.category,keywords:draft.keywords,source:`Archive backend BCA fournie par le propriétaire. ${draft.source}`});
        count++;
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES($1,'system',$2,$3)`,[projectId,sourceAction,JSON.stringify({count,status:"pending"})]);
      changed=true;
    }
    const dialogueAction="bca.dialogue_scenarios.proposed";
    const dialogueMarker=await connection.query("SELECT id FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2 LIMIT 1",
      [projectId,dialogueAction]);
    if(!dialogueMarker.rows.length) {
      const settings=await connection.query("SELECT config_json FROM sabito_core.assistant_settings WHERE project_id=$1 FOR UPDATE",[projectId]);
      const config=JSON.parse(String(settings.rows[0]?.config_json??"{}"));
      if(config.retrieval?.abbreviations) {
        for(const key of ["jvx","jveux","fonctione","formasion","formassion","formtion","rejeter","rejettee","parainage","parrainag","revnu","retraitt","vasy"])
          if(config.retrieval.abbreviations[key]===undefined)config.retrieval.abbreviations[key]=defaultAbbreviations[key];
        await connection.query("UPDATE sabito_core.assistant_settings SET config_json=$2,revision=revision+1 WHERE project_id=$1",[projectId,JSON.stringify(config)]);
      }
      const existing=await connection.query("SELECT title FROM sabito_core.knowledge_documents WHERE project_id=$1",[projectId]);
      const titles=new Set(existing.rows.map(row=>normalizeQuestion(String(row.title))));
      let count=0;
      for(const draft of bcaDialogueDrafts) {
        if(titles.has(normalizeQuestion(draft.title)))continue;
        await saveKnowledge(projectId,draft.title,draft.content,undefined,connection,draft.variants,[],
          {category:"Scénarios BCA",keywords:["bca",draft.key],source:"Consignes du propriétaire : suivi de conversation BCA. À valider avant diffusion."});
        count++;
      }
      await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
        VALUES($1,'system',$2,$3)`,[projectId,dialogueAction,JSON.stringify({count,status:"pending"})]);
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
  if(bcaQuestionAlias(text))return true;
  if(bcaFaqFor(text))return true;
  if (/\d/.test(question) || /^(?:verifie|verifier|consulte|recherche|cherche)\b/.test(question))
    return false;
  return /^(?:comment\b|guide\b|quelles? (?:sont les )?etapes\b|c est quoi\b|a quoi sert\b|ou (?:trouver|retrouver|consulter|voir|saisir|faire|envoyer)\b)/.test(question);
}
