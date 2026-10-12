import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { logger } from "../lib/logger";
import { verifyAccessToken } from "./security";
import { activeCredential } from "./projects";
import { widgetOrigins } from "./widget";
import { acceptUserMessage,beginAssistantMessage,createConversation,findAssistantReply,finishMessage,getConversationMessages } from "./conversations";
import { searchKnowledge } from "./knowledge";
import { buildKnowledgeAnswer,streamParts } from "./knowledge-answer";

const messageSchema = z.object({
  conversationId:z.string().uuid().optional(),
  idempotencyKey:z.string().min(8).max(100).regex(/^[A-Za-z0-9._:-]+$/),
  content:z.string().trim().min(1).max(20000),
});
const startSchema = z.object({metadata:z.record(z.string(),z.unknown()).optional()});
let currentIo: Server | undefined;
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
    maxHttpBufferSize:64*1024,pingInterval:25000,pingTimeout:20000,
  });
  currentIo = io;
  io.use(async (socket,next) => {
    try {
      const token = socket.handshake.auth.token;
      if (typeof token !== "string") throw new Error("UNAUTHORIZED");
      const claims = verifyAccessToken(token);
      if (!await activeCredential(claims.sub,claims.clientId)) throw new Error("UNAUTHORIZED");
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
    socket.emit("session:ready",{projectId:claims.sub,externalUserId:claims.externalUserId});
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
        const conversationId = await createConversation(claims.sub,claims.externalUserId,parsed.data.metadata);
        acknowledge({ok:true,data:{conversationId}});
      } catch {
        acknowledge({ok:false,error:{code:"INTERNAL_ERROR"}});
      }
    });
    socket.on("message:send",async (payload,acknowledge) => {
      if (typeof acknowledge !== "function") return;
      const parsed = messageSchema.safeParse(payload);
      if (!parsed.success) return acknowledge({ok:false,error:{code:"INVALID_PAYLOAD",message:"Message invalide."}});
      const now = Date.now();
      socket.data.messageTimestamps = socket.data.messageTimestamps.filter((timestamp:number) => timestamp > now-60000);
      if (socket.data.messageTimestamps.length >= 20) return acknowledge({ok:false,error:{code:"RATE_LIMITED",message:"Veuillez patienter."}});
      socket.data.messageTimestamps.push(now);
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
          if (reply?.status === "completed") socket.emit("message:complete",{conversationId,messageId:reply.id,content:reply.content,replayed:true});
          else if (accepted.status === "failed") socket.emit("message:error",{conversationId,messageId:reply?.id,code:"PREVIOUS_MESSAGE_FAILED"});
          return;
        }
        const history = await getConversationMessages(conversationId);
        const priorQuestions = history.filter(message => message.role === "user" && message.status === "completed")
          .slice(-2).map(message => message.content).join(" ");
        const knowledge = await searchKnowledge(claims.sub,`${priorQuestions} ${parsed.data.content}`.trim());
        assistantId = await beginAssistantMessage(claims.sub,conversationId,userMessageId);
        socket.emit("message:started",{conversationId,userMessageId,messageId:assistantId});
        const answer = buildKnowledgeAnswer(parsed.data.content,knowledge);
        for (const delta of streamParts(answer)) socket.emit("message:delta",{messageId:assistantId,delta});
        await finishMessage(assistantId,answer);
        await finishMessage(userMessageId);
        socket.emit("message:complete",{conversationId,messageId:assistantId,content:answer});
      } catch (error) {
        const code = error instanceof Error && error.message === "CONVERSATION_NOT_FOUND" ? error.message : "INTERNAL_ERROR";
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
