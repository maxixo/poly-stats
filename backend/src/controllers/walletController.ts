import type { NextFunction, Request, Response } from "express";
import Trade from "../models/Trade.js";
import { getWalletAnalytics } from "../services/analyticsService.js";
import { getWalletAnalysis, getWalletLeaderboard } from "../services/walletAnalysisService.js";
import { getTopWalletInsights } from "../services/walletInsightsService.js";
import { syncPolymarketTrades } from "../services/tradeSyncService.js";
import { syncMarkets } from "../services/marketSyncService.js";
import { addressSchema, normalizeAddress } from "../utils/validation.js";

const getNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const getTopWallets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.min(rawLimit, 50) : 10;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const results = await Trade.aggregate<{
      _id: string;
      totalVolume: number;
      tradeCount: number;
    }>([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: "$wallet",
          totalVolume: { $sum: "$size" },
          tradeCount: { $sum: 1 }
        }
      },
      { $sort: { totalVolume: -1 } },
      { $limit: limit }
    ]);

    const wallets = [] as Array<{
      wallet: string;
      totalVolume: number;
      tradeCount: number;
      metrics: Awaited<ReturnType<typeof getWalletAnalytics>>;
    }>;

    for (const entry of results) {
      const metrics = await getWalletAnalytics(entry._id);
      wallets.push({
        wallet: entry._id,
        totalVolume: entry.totalVolume,
        tradeCount: entry.tradeCount,
        metrics
      });
    }

    res.json({ wallets });
  } catch (error) {
    next(error);
  }
};

export const getWalletLeaderboardApi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = clamp(getNumber(req.query.days, 30), 1, 180);
    const limit = clamp(getNumber(req.query.limit, 20), 1, 50);
    const minWinRate = clamp(getNumber(req.query.minWinRate, 0.75), 0, 1);
    const minTrades = clamp(getNumber(req.query.minTrades, 20), 1, 1000);
    const minProfit = getNumber(req.query.minProfit, 0);
    const category = typeof req.query.category === "string" && req.query.category.trim() ? req.query.category.trim() : undefined;

    console.log("[wallets] leaderboard", { days, limit, minWinRate, minTrades, minProfit, category });
    const payload = await getWalletLeaderboard(days, limit, minWinRate, minTrades, minProfit, category);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

export const getWalletAnalysisApi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const wallet = addressSchema.parse(req.params.address);
    const normalized = normalizeAddress(wallet);
    const days = clamp(getNumber(req.query.days, 30), 1, 180);
    const payload = await getWalletAnalysis(normalized, days);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

export const getWalletInsightsApi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = clamp(getNumber(req.query.days, 30), 1, 180);
    const limit = clamp(getNumber(req.query.limit, 20), 1, 50);
    const minWinRate = clamp(getNumber(req.query.minWinRate, 0.75), 0, 1);
    const minTrades = clamp(getNumber(req.query.minTrades, 20), 1, 1000);
    const minProfit = getNumber(req.query.minProfit, 0);
    const force = String(req.query.force || "").toLowerCase() === "true";

    const payload = await getTopWalletInsights({ days, limit, minWinRate, minTrades, minProfit, force });
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

export const syncWalletData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers["x-sync-token"];
    if (process.env.SYNC_TOKEN && token !== process.env.SYNC_TOKEN) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const tradeResult = await syncPolymarketTrades();
    const marketCount = await syncMarkets();
    res.json({ trades: tradeResult, markets: { inserted: marketCount } });
  } catch (error) {
    next(error);
  }
};

export const getWalletDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wallet = addressSchema.parse(req.params.address);
    const normalized = normalizeAddress(wallet);
    const metrics = await getWalletAnalytics(normalized);
    const trades = await Trade.find({ wallet: normalized }).sort({ timestamp: -1 }).limit(50).lean();

    res.json({
      wallet: normalized,
      metrics,
      trades
    });
  } catch (error) {
    next(error);
  }
};
