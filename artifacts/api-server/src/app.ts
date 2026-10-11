import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { coreRoutes } from "./sabito/routes";
import { permittedOrigin } from "./sabito/socket";

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

export default app;
