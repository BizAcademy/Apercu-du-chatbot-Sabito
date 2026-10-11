import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { databaseDialect } from "../sabito/database";

const router: IRouter = Router();

router.use(healthRouter);
// The old isolated evaluation screen depends on PostgreSQL and managed AI.
// It is not part of the external production dashboard/chat.
if (process.env.NODE_ENV !== "production" && databaseDialect === "postgres") {
  router.use((await import("./sabito")).default);
}

export default router;
