import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sabitoRouter from "./sabito";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sabitoRouter);

export default router;
