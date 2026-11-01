import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { logger } from "../lib/logger";
import { verifyAccessToken } from "./security";
import { activeCredential } from "./projects";
import { widgetOrigins } from "./widget";
import { acceptUserMessage,beginAssistantMessage,createConversation,findAssistantReply,finishMessage,saveMessagePresentation } from "./conversations";
import { streamParts } from "./knowledge-answer";
import { retrieveReply,searchState } from "./question-search";
import { conversationGreeting,initialGreeting } from "./welcome";
import { isVerifiedMember } from "./templates";
import { recordUnanswered } from "./unanswered";
import { handleIntent } from "./intents";
import { selectedFollowUp } from "./knowledge-follow-ups";
import { suggestedReply } from "./suggestion-replies";
import { contextualBuzzReply } from "./public-help-context";
import { ownedRecentConversation,conversationHistoryPage } from "./conversation-history";
import { supportMemoryTurn,trackSupportQuestion,appendPreviousSatisfaction } from "./support-memory";
import { createHash } from "node:crypto";
import { pool } from "./database";
import { publicGuidance,savePublicGuidance } from "./public-guidance";

const messageSchema = z.object({
  conversationId:z.string().uuid().optional(),
  idempotencyKey:z.string().min(8).max(100).regex(/^[A-Za-z0-9._:-]+$/),
  content:z.string().trim().min(1),
  follow_up_id:z.string().regex(/^[0-9a-f-]{36}:[0-9a-f]{24}$/).optional(),
});
const startSchema = z.object({metadata:z.record(z.string(),z.unknown()).optional(),resume:z.boolean().optional()});
let currentIo: Server | undefined;
const budgets=new Map<string,{time:number;count:number}>();
function allowMessage(key:string) {
  const now=Date.now();
  if(budgets.size>20000)for(const [key,value] of budgets)if(now-value.time>=60000)budgets.delete(key);
  const value=budgets.get(key);
  if(!value||now-value.time>=60000){budgets.set(key,{time:now,count:1});return true;}
  return ++value.count<=20;
}
export function revokeProjectSockets(projectId: string) {
  currentIo?.in(`project:${projectId}`).disconnectSockets(true);
}
export function permittedOrigin(origin?: string) {
  if (!origin) return true;
  const configured = [process.env.PUBLIC_URL,...(process.env.CORS_ORIGINS || "").split(",")]
    .filter(Boolean).map(value => value!.trim().replace(/\/$/,""));
  if (process.env.NODE_ENV !== "production") {
    if (process.env.REPLIT_DEV_DOMAIN) configured.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    for (const domain of (process.env.REPLIT_DOMAINS || "").split(",").filter(Boolean)) configured.push(`https://${domain}`);
  }
  return configured.includes(origin.replace(/\/$/,""));
}
export function attachSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer,{
    path:"/socket.io",
    cors:{origin(origin,callback) { callback(null,permittedOrigin(origin)); },methods:["GET","POST"]},
    allowRequest(request,callback) { callback(null,permittedOrigin(request.headers.origin)); },
    maxHttpBufferSize:2*1024*1024,pingInterval:25000,pingTimeout:20000,
  });
  currentIo = io;
  io.use(async (socket,next) => {
    try {
      const token = socket.handshake.auth.token;
      if (typeof token !== "string") throw new Error("UNAUTHORIZED");
      const claims = verifyAccessToken(token);
      const credential = await activeCredential(claims.sub,claims.clientId);
      if (!credential) throw new Error("UNAUTHORIZED");
      socket.data.projectName = credential.project_name;
      if (claims.scope.includes("widget:guest") && (!claims.widgetOrigin ||
        !(await widgetOrigins(claims.sub)).includes(claims.widgetOrigin))) throw new Error("UNAUTHORIZED");
      socket.data.claims = claims;
      socket.data.token = token;
      socket.data.messageTimestamps = [];
      next();
    } catch { next(new Error("unauthorized")); }
  });
  io.on("connection",socket => {
    const claims = socket.data.claims;
    void socket.join(`project:${claims.sub}`);
    socket.emit("session:ready",{projectId:claims.sub,projectName:socket.data.projectName,externalUserId:claims.externalUserId});
    const expiryCheck = setInterval(async () => {
      try {
        verifyAccessToken(socket.data.token);
        if (!await activeCredential(claims.sub,claims.clientId)) socket.disconnect(true);
      } catch { socket.disconnect(true); }
    },30000);
    socket.on("disconnect",() => clearInterval(expiryCheck));
    async function authorized() {
      try {
        verifyAccessToken(socket.data.token);
        return Boolean(await activeCredential(claims.sub,claims.clientId));
      } catch { return false; }
    }
    socket.on("conversation:start",async (payload,acknowledge) => {
      if (typeof acknowledge !== "function") return;
      const parsed = startSchema.safeParse(payload);
      if (!parsed.success) return acknowledge({ok:false,error:{code:"INVALID_PAYLOAD"}});
      try {
        if (!await authorized()) return acknowledge({ok:false,error:{code:"UNAUTHORIZED"}});
        if(!allowMessage(`start:${claims.sub}:${claims.externalUserId}`))return acknowledge({ok:false,error:{code:"RATE_LIMITED"}});
        const previous=parsed.data.resume?await ownedRecentConversation(claims):undefined;
        const conversationId = previous?.id??await createConversation(claims.sub,claims.externalUserId,parsed.data.metadata);
        const {settings}=await searchState(claims.sub);
        const history=parsed.data.resume?await conversationHistoryPage(conversationId):undefined;
        acknowledge({ok:true,data:{conversationId,greeting:initialGreeting(claims,settings),
          ...(history?{history:history.data,hasMore:history.hasMore,
            expiresAt:previous?.expires_at.toISOString()??new Date(Date.now()+86400000).toISOString()}:{} )}});
        if(previous)return;
        void conversationGreeting(claims,conversationId).then(content=>{
          if(socket.connected)socket.emit("conversation:welcome",{conversationId,content});
        }).catch(error=>logger.error({err:error},"Conversation welcome unavailable"));
      } catch {
        acknowledge({ok:false,error:{code:"INTERNAL_ERROR"}});
      }
    });
    socket.on("message:send",async (payload,acknowledge) => {
      if (typeof acknowledge !== "function") return;
      const parsed = messageSchema.safeParse(payload);
      if (!parsed.success) return acknowledge({ok:false,error:{code:"INVALID_PAYLOAD",message:"Message invalide."}});
      if (!allowMessage(`send:${claims.sub}:${claims.externalUserId}`)) return acknowledge({ok:false,error:{code:"RATE_LIMITED",message:"Veuillez patienter."}});
      let userMessageId: string | undefined, assistantId: string | undefined, conversationId: string | undefined;
      try {
        if (!await authorized()) return acknowledge({ok:false,error:{code:"UNAUTHORIZED",message:"Connexion expirée ou révoquée."}});
        const accepted = await acceptUserMessage({projectId:claims.sub,externalUserId:claims.externalUserId,...parsed.data});
        if (accepted.conflict) return acknowledge({ok:false,error:{code:"IDEMPOTENCY_CONFLICT",message:"Cette clé a déjà été utilisée."}});
        conversationId = accepted.conversationId;
        userMessageId = accepted.messageId;
        acknowledge({ok:true,data:{conversationId,userMessageId,duplicate:!accepted.isNew,status:accepted.status}});
        if (!accepted.isNew) {
          const reply = await findAssistantReply(userMessageId);
          if (reply?.status === "completed") socket.emit("message:complete",{...reply,conversationId,messageId:reply.id,replayed:true});
          else if (accepted.status === "failed") socket.emit("message:error",{conversationId,messageId:reply?.id,code:"PREVIOUS_MESSAGE_FAILED"});
          return;
        }
        assistantId = await beginAssistantMessage(claims.sub,conversationId,userMessageId);
        socket.emit("message:started",{conversationId,userMessageId,messageId:assistantId});
        const memory=parsed.data.follow_up_id?{}:await supportMemoryTurn(claims.sub,conversationId,parsed.data.content,assistantId);
        const question=memory.query??parsed.data.content;
        const followUp = parsed.data.follow_up_id
          ? await selectedFollowUp(claims.sub,parsed.data.follow_up_id,parsed.data.content) : null;
        const proposalAnswer = parsed.data.follow_up_id||memory.answer ? null :
          await suggestedReply(claims.sub,claims.externalUserId,conversationId,parsed.data.content);
        const guidance=parsed.data.follow_up_id||proposalAnswer||memory.answer?null:
          await publicGuidance(claims,conversationId,question,userMessageId);
        const contextReply = parsed.data.follow_up_id || proposalAnswer || memory.answer || guidance ? null :
          await contextualBuzzReply(claims,conversationId,question);
        const tracked=!memory.feedbackOnly&&!parsed.data.follow_up_id&&!proposalAnswer&&!contextReply&&!guidance?.continuing
          ?await trackSupportQuestion(claims.sub,conversationId,userMessageId,parsed.data.content):false;
        const intentAnswer = guidance?.answer??(parsed.data.follow_up_id || proposalAnswer || contextReply || memory.answer ? null : await handleIntent(claims,conversationId,question));
        const reply = parsed.data.follow_up_id||memory.answer
          ? {answer:"",reliable:true,suggestions:[] as Awaited<ReturnType<typeof retrieveReply>>["suggestions"],
            suggestions_label:"",closing_message:""}
          : contextReply ?? await retrieveReply(claims.sub,question);
        if(memory.answer){reply.answer=memory.answer;reply.reliable=true;}
        else if(parsed.data.follow_up_id) {
          reply.answer=followUp?.answer??"Cette question proposée a été modifiée ou supprimée. Posez à nouveau votre question.";
          reply.reliable=true;
          reply.suggestions=[];
        } else if(proposalAnswer) Object.assign(reply,proposalAnswer);
        else if(intentAnswer){reply.answer=intentAnswer;reply.reliable=true;reply.suggestions=[];}
        if(!reply.reliable&&memory.fallbackQuestion) {
          const fallback=await retrieveReply(claims.sub,memory.fallbackQuestion);
          if(fallback.reliable)Object.assign(reply,fallback,{answer:`Reprenons votre question « ${memory.fallbackQuestion} ».\n\n${fallback.answer}`});
        }
        // Only an unrecognized question with a relevant search proposal gets a clarification title.
        reply.suggestions_label=!reply.reliable && reply.suggestions.length ? "Voulez-vous dire :" : "";
        if (!reply.reliable) await recordUnanswered(claims.sub, parsed.data.content,
          isVerifiedMember(claims)?claims.externalUserId:undefined);
        const answer = guidance?.context.awaiting?reply.answer:
          (tracked||guidance)?await appendPreviousSatisfaction(claims.sub,conversationId,guidance?.context.questionId??userMessageId,assistantId,reply.answer):reply.answer;
        if(guidance)await savePublicGuidance(claims.sub,conversationId,guidance,answer);
        if(intentAnswer||memory.feedbackOnly) {
          const state=await pool.query("SELECT collected_json FROM sabito_core.intent_sessions WHERE conversation_id=$1 AND project_id=$2 AND status='complete'",[conversationId,claims.sub]);
          if(state.rows[0]) {
            const fields=JSON.parse(state.rows[0].collected_json);
            if(fields.__answer_hash){fields.__answer_hash=createHash("sha256").update(answer).digest("hex");
              await pool.query("UPDATE sabito_core.intent_sessions SET collected_json=$1 WHERE conversation_id=$2 AND project_id=$3 AND status='complete'",[JSON.stringify(fields),conversationId,claims.sub]);}
          }
        }
        for (const delta of streamParts(answer)) socket.emit("message:delta",{conversationId,messageId:assistantId,delta});
        await saveMessagePresentation(assistantId,reply);
        await finishMessage(assistantId,answer);
        await finishMessage(userMessageId);
        socket.emit("message:complete",{conversationId,messageId:assistantId,content:answer,
          suggestions:reply.suggestions,suggestions_label:reply.suggestions_label,closing_message:reply.closing_message});
      } catch (error) {
        const code = error instanceof Error && ["CONVERSATION_NOT_FOUND","CONVERSATION_EXPIRED"].includes(error.message) ? error.message : "INTERNAL_ERROR";
        logger.error({err:error,projectId:claims.sub},"Sabito message failed");
        if (!userMessageId) acknowledge({ok:false,error:{code,message:"Le message n’a pas été accepté."}});
        else {
          await Promise.all([finishMessage(userMessageId,undefined,code),
            assistantId ? finishMessage(assistantId,undefined,code) : Promise.resolve()]).catch(() => {});
          socket.emit("message:error",{conversationId,messageId:assistantId,code});
        }
      }
    });
  });
  return io;
}
