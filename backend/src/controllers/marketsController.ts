import type { NextFunction, Request, Response } from "express";
import { getTrendingMarkets, getSignalFeed } from "../services/marketService.js";
import { fetchGammaMarkets, fetchClobMarkets } from "../services/polymarketService.js";

export const getTrending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const markets = await getTrendingMarkets();
    const signals = await getSignalFeed();
    res.json({ markets, signals });
  } catch (error) {
    next(error);
  }
};

export const getGammaMarkets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = await fetchGammaMarkets(req.query as Record<string, unknown>);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

export const getClobMarkets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = await fetchClobMarkets(req.query as Record<string, unknown>);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};
