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
  app.use(express.static(webDir, { index: false, dotfiles: "deny" }));
  app.get(["/", "/admin", "/projects/:projectId/chat"], (_req, res) => {
    res.sendFile(indexFile);
  });
}
app.use((_req,res) => { res.status(404).json({success:false,message:"Route introuvable."}); });

export default app;
