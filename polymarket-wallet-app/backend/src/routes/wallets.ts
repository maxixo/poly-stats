import { Router } from "express";
import { getTopWallets, getWalletDetail } from "../controllers/walletController.js";

const router = Router();

router.get("/top", getTopWallets);
router.get("/:address", getWalletDetail);

export default router;