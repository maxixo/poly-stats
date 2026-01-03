import { Router } from "express";
import {
  getTrending,
  getGammaMarkets,
  getClobMarkets,
  getMarketCategoriesApi
} from "../controllers/marketsController.js";

const router = Router();

router.get("/trending", getTrending);
router.get("/categories", getMarketCategoriesApi);
router.get("/gamma", getGammaMarkets);
router.get("/clob", getClobMarkets);

export default router;
