import { Router } from "express";
import { buildTrade } from "../controllers/tradeController.js";

const router = Router();

router.post("/build", buildTrade);

export default router;