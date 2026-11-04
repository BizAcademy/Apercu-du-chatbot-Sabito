import { randomUUID } from "node:crypto";
import { pool } from "./database";
import type { AccessClaims } from "./security";
import { logger } from "../lib/logger";

/** Only called after verified-member/owned-conversation checks by the continuation. */
export async function bcaContinuationTicket(claims:AccessClaims,conversationId:string,intent:string,operation:string,reason:string) {
  logger.warn({code:reason,operation,projectId:claims.sub,stage:"backend_continuation"},"BCA consultation unavailable");
  await pool.query(`INSERT INTO sabito_core.support_tickets(id,project_id,conversation_id,external_user_id,intent,reason)
    VALUES($1,$2,$3,$4,$5,$6) ON DUPLICATE KEY UPDATE status='ouvert',reason=VALUES(reason),updated_at=CURRENT_TIMESTAMP(6)`,
    [randomUUID(),claims.sub,conversationId,claims.externalUserId,intent,reason]);
}

export async function closeBcaContinuationTicket(projectId:string,conversationId:string,intent:string) {
  await pool.query(`UPDATE sabito_core.support_tickets SET status='ferme',updated_at=CURRENT_TIMESTAMP(6)
    WHERE project_id=$1 AND conversation_id=$2 AND intent=$3 AND status='ouvert'`,[projectId,conversationId,intent]);
}
