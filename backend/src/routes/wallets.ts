import { Router } from "express";
import {
  getTopWallets,
  getWalletDetail,
  getWalletLeaderboardApi,
  getWalletAnalysisApi,
  getWalletInsightsApi,
  syncWalletData
} from "../controllers/walletController.js";

const router = Router();

router.get("/top", getTopWallets);
router.get("/leaderboard", getWalletLeaderboardApi);
router.get("/insights", getWalletInsightsApi);
router.get("/:address/analysis", getWalletAnalysisApi);
router.post("/sync", syncWalletData);
router.get("/:address", getWalletDetail);

export default router;
