import { Router } from "express";
import { subscribe, execute } from "../controllers/copyController.js";

const router = Router();

router.post("/subscribe", subscribe);
router.post("/execute", execute);

export default router;