import type { NextFunction, Request, Response } from "express";
import Trade from "../models/Trade.js";
import { getWalletAnalytics } from "../services/analyticsService.js";
import { addressSchema, normalizeAddress } from "../utils/validation.js";

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
