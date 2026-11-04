import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { coreRoutes } from "./sabito/routes";
import { permittedOrigin } from "./sabito/socket";
import path from "node:path";
import { existsSync } from "node:fs";
import { widgetPublicRoutes } from "./sabito/widget";
import { widgetFrameOrigins } from "./widget-frame";
import { contentSecurityPolicy, safeHttpErrors, securityHeaders } from "./http-security";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(securityHeaders);
// Compressed input is not needed by these JSON APIs. Reject it before decoding,
// rather than exposing decompression memory/CPU attacks.
app.use("/v1/widget", express.json({ inflate: false }), widgetPublicRoutes);
app.use("/api/v1/widget", express.json({ inflate: false }), widgetPublicRoutes);
app.use(cors({origin(origin, callback) { callback(null, permittedOrigin(origin)); }}));
app.use(express.json({ limit: "2mb", inflate: false }));
// The runtime supports depth; the Express declaration omits this body-parser option.
const formOptions = { extended: true, limit: "2mb", parameterLimit: 100, depth: 8, inflate: false };
app.use(express.urlencoded(formOptions));

app.use("/api", coreRoutes);
app.use(coreRoutes);
app.use("/api", router);

// Optional single-server deployment for Plesk, without Replit's shared proxy.
if (process.env.SABITO_WEB_DIR) {
  const webDir = path.resolve(process.env.SABITO_WEB_DIR);
  const indexFile = path.join(webDir, "index.html");
  if (!existsSync(indexFile)) throw new Error("SABITO_WEB_DIR does not contain the built dashboard.");
  app.get("/widget/chat", async (req, res) => {
    res.setHeader("Content-Security-Policy", contentSecurityPolicy());
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    const origins = await widgetFrameOrigins(req.query);
    if (typeof req.query.parentOrigin !== "string" || !origins.includes(req.query.parentOrigin)) {
      res.status(403).type("text").send("Origine du site non autorisée pour le widget Sabito.");
      return;
    }
    res.setHeader("Content-Security-Policy", contentSecurityPolicy(`'self' ${origins.join(" ")}`));
    res.sendFile("index.html", { root: webDir });
  });
  app.use(express.static(webDir, { index: false, dotfiles: "deny" }));
  app.get(["/", "/admin", "/projects/:projectId/chat"], (_req, res) => {
    // A private release directory may itself start with a dot. Check only the
    // requested filename for dotfiles, never expose private files via this root.
    res.sendFile("index.html", { root: webDir });
  });
}
app.use((_req,res) => { res.status(404).json({success:false,message:"Route introuvable."}); });
app.use(safeHttpErrors);

export default app;
