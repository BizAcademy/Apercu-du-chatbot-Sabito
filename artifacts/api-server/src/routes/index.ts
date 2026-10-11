import { Router, type IRouter } from "express";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
// The original PostgreSQL evaluation module is preserved in the source tree,
// but is not mounted in the MySQL-only application.

export default router;
