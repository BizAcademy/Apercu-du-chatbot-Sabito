import { pool } from "./database";
import type { AccessClaims } from "./security";
import { searchState } from "./question-search";
import { requestBackend } from "./backend-bridge";
import { isVerifiedMember,renderTemplate } from "./templates";
import type { AssistantSettings } from "./assistant-settings";
export function initialGreeting(claims:AccessClaims,settings:AssistantSettings) {
  if(!isVerifiedMember(claims))return settings.greeting_guest;
  return claims.externalUserName
    ? renderTemplate(settings.greeting_member,{nom_utilisateur:claims.externalUserName})??settings.greeting_member_no_name
    : settings.greeting_member_no_name;
}
export async function conversationGreeting(claims:AccessClaims,conversationId:string) {
  const {settings}=await searchState(claims.sub);
  let content=initialGreeting(claims,settings),name=claims.externalUserName;
  if(isVerifiedMember(claims)&&!name) {
    try {
      const result=await requestBackend(claims.sub,claims.externalUserId,"user_profile",{});
      const candidate=result.data?.nom_utilisateur??result.data?.username??result.data?.name;
      if(["ok","success"].includes(result.status)&&typeof candidate==="string"&&candidate.trim().length<=100&&candidate.trim()) {
        name=candidate.trim();content=renderTemplate(settings.greeting_member,{nom_utilisateur:name})??content;
      }
    } catch { /* Unavailable identity is never replaced with an invented name. */ }
  }
  await pool.query(`INSERT INTO sabito_core.conversation_welcomes(conversation_id,project_id,content,trusted_name)
    SELECT id,project_id,$4,$5 FROM sabito_core.conversations WHERE id=$1 AND project_id=$2 AND external_user_id=$3
    ON DUPLICATE KEY UPDATE content=VALUES(content),trusted_name=VALUES(trusted_name)`,
    [conversationId,claims.sub,claims.externalUserId,content,name??null]);
  return content;
}
