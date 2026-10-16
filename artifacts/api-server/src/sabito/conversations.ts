import { randomUUID,createHash } from "node:crypto";
import { pool } from "./database";

export async function createConversation(projectId: string, externalUserId: string, metadata?: Record<string,unknown>) {
  const id = randomUUID();
  await pool.query(`INSERT INTO sabito_core.conversations(id,project_id,external_user_id,metadata)
    VALUES ($1,$2,$3,$4)`,[id,projectId,externalUserId,metadata ? JSON.stringify(metadata) : null]);
  return id;
}
export async function acceptUserMessage(input: {
  projectId: string; externalUserId: string; conversationId?: string; content: string; idempotencyKey: string;
}): Promise<{conversationId:string;messageId:string;status:string;isNew:boolean;conflict:boolean}> {
  const connection = await pool.connect();
  const lockName=createHash("sha256").update(`${input.projectId}:${input.idempotencyKey}`).digest("hex");
  try {
    const lock=await connection.query("SELECT GET_LOCK($1,10) AS acquired",[lockName]);
    if(Number(lock.rows[0]?.acquired)!==1)throw new Error("MESSAGE_BUSY");
    await connection.query("BEGIN");
    // A transactional row lock works on both engines and serializes retries
    // before creating a conversation, including retries on another server.
    const project = await connection.query(`SELECT id FROM sabito_core.projects WHERE id=$1`,[input.projectId]);
    if (!project.rowCount) throw new Error("PROJECT_NOT_FOUND");
    const { rows: existing } = await connection.query(`SELECT m.* FROM sabito_core.messages m
      JOIN sabito_core.conversations c ON c.id=m.conversation_id
      WHERE m.project_id=$1 AND m.idempotency_key=$2 AND c.external_user_id=$3`,
      [input.projectId,input.idempotencyKey,input.externalUserId]);
    if (existing[0]) {
      const previous = existing[0];
      await connection.query("COMMIT");
      return {conversationId:previous.conversation_id,messageId:previous.id,status:previous.status,isNew:false,
        conflict:previous.content !== input.content || Boolean(input.conversationId && previous.conversation_id !== input.conversationId)};
    }
    const conversationId = input.conversationId ?? randomUUID();
    if (input.conversationId) {
      const result = await connection.query(`SELECT id FROM sabito_core.conversations
        WHERE id=$1 AND project_id=$2 AND external_user_id=$3 FOR UPDATE`,
        [conversationId,input.projectId,input.externalUserId]);
      if (!result.rowCount) throw new Error("CONVERSATION_NOT_FOUND");
    } else {
      await connection.query(`INSERT INTO sabito_core.conversations(id,project_id,external_user_id) VALUES ($1,$2,$3)`,
        [conversationId,input.projectId,input.externalUserId]);
    }
    const messageId = randomUUID();
    await connection.query(`INSERT INTO sabito_core.messages
      (id,project_id,conversation_id,role,content,status,idempotency_key) VALUES ($1,$2,$3,'user',$4,'accepted',$5)`,
      [messageId,input.projectId,conversationId,input.content,input.idempotencyKey]);
    await connection.query(`UPDATE sabito_core.conversations SET updated_at=now() WHERE id=$1`,[conversationId]);
    await connection.query("COMMIT");
    return {conversationId,messageId,status:"accepted",isNew:true,conflict:false};
  } catch (error) { await connection.query("ROLLBACK"); throw error; }
  finally { await connection.query("SELECT RELEASE_LOCK($1)",[lockName]).catch(()=>{});connection.release(); }
}
export async function getConversationMessages(conversationId: string, limit = 40) {
  const {rows} = await pool.query(`SELECT recent.*,p.suggestions_json,p.suggestions_label,p.closing_message FROM (
    SELECT id,role,content,status,reply_to_message_id,created_at FROM sabito_core.messages
    WHERE conversation_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2
    ) recent LEFT JOIN sabito_core.message_presentations p ON p.message_id=recent.id ORDER BY recent.created_at ASC,recent.id ASC`,[conversationId,limit]);
  return rows.map(presentation);
}
export async function findAssistantReply(userMessageId: string) {
  const {rows} = await pool.query(`SELECT m.id,m.content,m.status,p.suggestions_json,p.suggestions_label,p.closing_message FROM sabito_core.messages m
    LEFT JOIN sabito_core.message_presentations p ON p.message_id=m.id
    WHERE m.reply_to_message_id=$1 AND m.role='assistant' ORDER BY m.created_at DESC LIMIT 1`,[userMessageId]);
  return rows[0]?presentation(rows[0]):undefined;
}
function presentation(row:Record<string,any>):Record<string,any> {
  const {suggestions_json,...rest}=row;
  return {...rest,suggestions:typeof suggestions_json==="string"?JSON.parse(suggestions_json):suggestions_json??[]};
}
export async function saveMessagePresentation(id:string,value:{suggestions:unknown[];suggestions_label:string;closing_message:string}) {
  await pool.query(`INSERT INTO sabito_core.message_presentations(message_id,suggestions_json,suggestions_label,closing_message)
    VALUES($1,$2,$3,$4)`,[id,JSON.stringify(value.suggestions),value.suggestions_label,value.closing_message]);
}
export async function beginAssistantMessage(projectId: string, conversationId: string, userMessageId: string) {
  const id = randomUUID();
  await pool.query(`INSERT INTO sabito_core.messages(id,project_id,conversation_id,reply_to_message_id,role,content,status)
    VALUES ($1,$2,$3,$4,'assistant','','streaming')`,[id,projectId,conversationId,userMessageId]);
  return id;
}
export async function finishMessage(id: string, content?: string, errorCode?: string) {
  await pool.query(`UPDATE sabito_core.messages SET status=$2,content=COALESCE($3,content),
    error_code=$4,completed_at=now() WHERE id=$1`,
    [id,errorCode ? "failed" : "completed",content ?? null,errorCode ?? null]);
}
