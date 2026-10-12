import { randomUUID } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { pool } from "./database";
import { activeCredential } from "./projects";
import { signAccessToken, verifyAccessToken, tokenTtl } from "./security";

export function validWidgetOrigin(value: string) {
  try {
    const u = new URL(value);
    return u.origin === value && (u.protocol === "https:" ||
      (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname)));
  } catch { return false; }
}
export const widgetOriginsSchema = z.object({
  origins: z.array(z.string().refine(validWidgetOrigin, "Origine HTTPS exacte requise")).max(10),
});
export async function widgetOrigins(projectId: string): Promise<string[]> {
  const { rows } = await pool.query(
    "SELECT origins_json FROM sabito_core.widget_settings WHERE project_id=$1", [projectId]);
  return rows[0] ? JSON.parse(rows[0].origins_json) : [];
}
export const widgetPublicRoutes = Router();
widgetPublicRoutes.use(rateLimit({ windowMs: 60000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false }));
widgetPublicRoutes.use("/:projectId/session", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const id = z.string().uuid().safeParse(req.params.projectId);
  const origin = req.header("origin");
  if (!id.success || !origin || !(await widgetOrigins(id.data)).includes(origin)) {
    res.status(403).json({ error: "WIDGET_ORIGIN_DENIED" }); return;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});
widgetPublicRoutes.post("/:projectId/session", async (req, res) => {
  const projectId = String(req.params.projectId);
  const credential = await activeCredential(projectId);
  if (!credential) { res.status(403).json({ error: "WIDGET_INACTIVE" }); return; }
  const body = z.object({ visitor_token: z.string().max(16384).optional() }).safeParse(req.body ?? {});
  if (!body.success) { res.status(422).json({ error: "INVALID_WIDGET_SESSION" }); return; }
  let externalUserId = `widget-guest:${randomUUID()}`;
  if (body.data.visitor_token) {
    try {
      const claims = verifyAccessToken(body.data.visitor_token);
      if (claims.sub !== projectId || claims.clientId !== credential.client_id || claims.widgetOrigin !== req.header("origin") ||
        !claims.scope.includes("widget:guest") || !claims.externalUserId.startsWith("widget-guest:")) {
        res.status(401).json({ error: "INVALID_WIDGET_SESSION" }); return;
      }
      externalUserId = claims.externalUserId;
    } catch { res.status(401).json({ error: "WIDGET_SESSION_EXPIRED" }); return; }
  }
  const token = signAccessToken({ sub: projectId, clientId: credential.client_id,
    externalUserId, scope: ["chat:connect", "widget:guest"], widgetOrigin: req.header("origin") });
  res.json({ access_token: token, expires_in: tokenTtl, external_user_id: externalUserId,
    socket_path: "/socket.io", identity_type: "guest" });
});
