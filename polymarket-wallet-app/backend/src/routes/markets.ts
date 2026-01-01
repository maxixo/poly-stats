import { Router } from "express";
import { getTrending } from "../controllers/marketsController.js";

const router = Router();

router.get("/trending", getTrending);

export default router;