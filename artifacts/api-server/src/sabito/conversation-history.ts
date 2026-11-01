import { pool } from "./database";
import type { AccessClaims } from "./security";

export const conversationLifetimeMs=24*60*60*1000;
export async function ownedRecentConversation(claims:AccessClaims,id?:string) {
  const result=await pool.query(`SELECT id,DATE_ADD(created_at,INTERVAL 24 HOUR) AS expires_at
    FROM sabito_core.conversations WHERE project_id=$1 AND external_user_id=$2
    AND created_at>DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 24 HOUR) ${id?"AND id=$3":""}
    ORDER BY created_at DESC,id DESC LIMIT 1`,id?[claims.sub,claims.externalUserId,id]:[claims.sub,claims.externalUserId]);
  return result.rows[0] as {id:string;expires_at:Date}|undefined;
}
export async function conversationHistoryPage(conversationId:string,before?:string) {
  const args:unknown[]=[conversationId];
  let cursor="";
  if(before) {
    const result=await pool.query("SELECT created_at,id FROM sabito_core.messages WHERE id=$1 AND conversation_id=$2",[before,conversationId]);
    if(!result.rows[0])throw new Error("INVALID_HISTORY_CURSOR");
    args.push(result.rows[0].created_at,result.rows[0].id);
    cursor="AND (m.created_at<$2 OR (m.created_at=$2 AND m.id<$3))";
  }
  const result=await pool.query(`SELECT m.id,m.role,m.content,m.status,m.created_at,
    p.suggestions_json,p.suggestions_label,p.closing_message
    FROM sabito_core.messages m LEFT JOIN sabito_core.message_presentations p ON p.message_id=m.id
    WHERE m.conversation_id=$1 ${cursor} ORDER BY m.created_at DESC,m.id DESC LIMIT 101`,args);
  return {hasMore:result.rows.length>100,data:result.rows.slice(0,100).reverse().map(({suggestions_json,...row})=>({
    ...row,suggestions:typeof suggestions_json==="string"?JSON.parse(suggestions_json):suggestions_json??[],
  }))};
}
