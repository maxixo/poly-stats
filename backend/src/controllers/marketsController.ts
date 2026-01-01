import type { NextFunction, Request, Response } from "express";
import { getTrendingMarkets, getSignalFeed } from "../services/marketService.js";

export const getTrending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const markets = await getTrendingMarkets();
    const signals = await getSignalFeed();
    res.json({ markets, signals });
  } catch (error) {
    next(error);
  }
};