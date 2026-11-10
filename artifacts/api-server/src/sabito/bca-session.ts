import { pool } from "./database";
import type { AccessClaims } from "./security";
import { normalizeQuestion } from "./question-normalization";
import { bcaCurrentQuestion } from "./bca-current-questions";
import { z } from "zod";

// This server-owned namespace cannot be seeded through conversation metadata.
const schema=z.object({
  language:z.enum(["fr","en"]).default("fr"),
  problem:z.string().max(100).optional(),
  checked:z.array(z.string().max(100)).max(30).default([]),
  pending:z.string().uuid().optional(),
  resume:z.boolean().optional(),
});
export type BcaSession=z.infer<typeof schema>;
export const emptyBcaSession=():BcaSession=>({language:"fr",checked:[]});
export const bcaSessionMetadataKey="__sabito_bca";
export async function readBcaSession(claims:AccessClaims,conversationId:string) {
  const result=await pool.query(`SELECT c.metadata,s.status FROM sabito_core.conversations c
    LEFT JOIN sabito_core.intent_sessions s ON s.conversation_id=c.id AND s.project_id=c.project_id
    WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3
    AND c.created_at>DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 24 HOUR)`,
    [conversationId,claims.sub,claims.externalUserId]);
  const row=result.rows[0];
  let state=emptyBcaSession();
  try {
    const metadata=typeof row?.metadata==="string"?JSON.parse(row.metadata):row?.metadata;
    state=schema.parse(metadata?.[bcaSessionMetadataKey]??{});
  }catch{/* Invalid metadata is not conversational evidence. */}
  return {state,owned:!!row,blocked:["collecting","checking"].includes(String(row?.status))};
}
export async function saveBcaSession(claims:AccessClaims,conversationId:string,state:BcaSession) {
  await pool.query(`UPDATE sabito_core.conversations SET
    metadata=JSON_SET(COALESCE(metadata,JSON_OBJECT()),'$.__sabito_bca',JSON_EXTRACT($1,'$'))
    WHERE id=$2 AND project_id=$3 AND external_user_id=$4`,
    [JSON.stringify(schema.parse(state)),conversationId,claims.sub,claims.externalUserId]);
}
const socialAvailability=/^(?:enfin tu es disponible|je t attendais on me disait que tu n etais pas disponible|nn juste que je t attendais depuis mes on me dit que t es pas disponible)$/;
export function bcaSocialAnswer(text:string,english=false) {
  const q=normalizeQuestion(text);
  if(q==="barka da warhaka")return "Barka da warhaka ! Bonjour. Quelle aide souhaitez-vous sur BCA ?";
  if(/^(?:d accord sabito je comprends|merci beaucoup boss|merci pour ton aide merci beaucoup le code a passe|merci beaucoup|merci)$/.test(q))
    return english?"You’re welcome.":"Je vous en prie.";
  if(socialAvailability.test(q))return english
    ?"I’m available in this conversation. I cannot confirm what caused the earlier interruption. What question would you like to resume?"
    :"Je suis disponible dans cette conversation. Je ne peux pas confirmer la cause de l’interruption précédente. Quelle question souhaitez-vous reprendre ?";
  if(/^(?:sava tres bien|ca va tres bien|i am fine)$/.test(q))return english
    ?"Glad to hear it. What would you like help with in BCA?"
    :"Très bien. De quelle aide avez-vous besoin sur BCA ?";
  if(/^(?:je vous ecoute|vous ne m avez pas montre ou le trouver)$/.test(q))return english
    ?"Which section are you looking for: Parrainage, campaigns, the seller area or something else?"
    :"Quelle rubrique cherchez-vous : Parrainage, campagnes, espace vendeur ou autre chose ?";
  return undefined;
}
/** A topic-switch check defers only a different explicit route while a problem
 * is open. Store a message ID, never infer identity or authorization from it. */
export async function prepareBcaSession(claims:AccessClaims,conversationId:string,text:string,messageId:string) {
  const current=await readBcaSession(claims,conversationId),state=current.state;
  const result:{state:BcaSession;query:string;answer?:string;prefix?:string;control?:boolean}={state,query:text};
  if(!current.owned)return result;
  const q=normalizeQuestion(text);
  if(/^(?:in english|english|en anglais|speak english)$/.test(q)) {
    state.language="en";result.answer="Of course. I’ll continue in English. What would you like help with?";
    result.control=true;
  }else if(/^(?:en francais|in french|francais)$/.test(q)) {
    state.language="fr";result.answer="Bien sûr, je continue en français. Quelle aide souhaitez-vous ?";
    result.control=true;
  }else if(!current.blocked) {
    if(state.pending) {
      if(/^(?:oui|yes|oui c est resolu|c est resolu|non|no|non pas encore)$/.test(q)) {
        const positive=/^(?:oui|yes|oui c est resolu|c est resolu)$/.test(q);
        if(state.problem)state.checked=[...new Set([...state.checked,state.problem])].slice(-30);
        if(positive) {
          const pending=await pool.query(`SELECT m.content FROM sabito_core.messages m
            JOIN sabito_core.conversations c ON c.id=m.conversation_id AND c.project_id=m.project_id
            WHERE m.id=$1 AND m.conversation_id=$2 AND m.project_id=$3 AND c.external_user_id=$4 AND m.role='user'`,
            [state.pending,conversationId,claims.sub,claims.externalUserId]);
          if(pending.rows[0]){result.query=String(pending.rows[0].content);result.prefix="Excellent\n\n";}
          delete state.pending;delete state.problem;
        }else{
          delete state.pending;state.resume=true;
          result.answer=state.language==="en"?"Which step still needs help?":"À quel niveau avez-vous encore besoin d’aide ?";
          result.control=true;
        }
      }else{
        // An explicit third subject replaces the deferred question; a detail
        // stays with the unresolved problem, without another satisfaction loop.
        delete state.pending;
      }
    }
    const route=bcaCurrentQuestion(result.query);
    if(!result.answer&&state.problem&&route&&route.key!==state.problem&&!state.resume&&
      !state.checked.includes(state.problem)) {
      state.pending=messageId;
      result.answer=state.language==="en"
        ?"Before we switch topics, were you able to resolve the previous problem?"
        :"Avant de changer de sujet, avez-vous pu résoudre votre problème précédent ?";
      result.control=true;
    }
  }
  await saveBcaSession(claims,conversationId,state);
  return result;
}
export async function finishBcaSession(claims:AccessClaims,conversationId:string,state:BcaSession,text:string,reliable:boolean,control=false) {
  if(!control&&!state.pending) {
    const route=bcaCurrentQuestion(text);
    if(!reliable||route&&["current-upload-error","current-alleged-debit","current-fraud"].includes(route.key))
      state.problem=route?.key??"unresolved";
    else if(state.problem==="unresolved"&&reliable)delete state.problem;
    else if(state.resume&&route) {
      delete state.resume;delete state.problem;
    }
  }
  await saveBcaSession(claims,conversationId,state);
}
