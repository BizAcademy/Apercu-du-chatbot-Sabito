import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { coreRoutes } from "./sabito/routes";
import { permittedOrigin } from "./sabito/socket";
import path from "node:path";
import { existsSync } from "node:fs";

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
app.use(cors({origin(origin, callback) { callback(null, permittedOrigin(origin)); }}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", coreRoutes);
app.use(coreRoutes);
app.use("/api", router);

// Optional single-server deployment for Plesk, without Replit's shared proxy.
if (process.env.SABITO_WEB_DIR) {
  const webDir = path.resolve(process.env.SABITO_WEB_DIR);
  const indexFile = path.join(webDir, "index.html");
  if (!existsSync(indexFile)) throw new Error("SABITO_WEB_DIR does not contain the built dashboard.");
  app.get("/widget/chat", (req, res) => {
    const origins = [process.env.PUBLIC_URL, ...(process.env.CORS_ORIGINS || "").split(",")]
      .filter((value): value is string => Boolean(value))
      .map(value => value.trim())
      .filter(value => {
        try {
          const url = new URL(value);
          return url.origin === value && (url.protocol === "https:" ||
            (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
        } catch { return false; }
      });
    res.setHeader("Content-Security-Policy", `frame-ancestors 'self' ${origins.join(" ")}`);
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    if (typeof req.query.parentOrigin !== "string" || !origins.includes(req.query.parentOrigin)) {
      res.status(403).type("text").send("Origine du site non autorisée pour le widget Sabito.");
      return;
    }
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

export default app;
