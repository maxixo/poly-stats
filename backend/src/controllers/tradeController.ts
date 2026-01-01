import type { NextFunction, Request, Response } from "express";
import { tradeInputSchema, normalizeAddress } from "../utils/validation.js";
import { buildTradeTx } from "../services/tradeBuilderService.js";

export const buildTrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = tradeInputSchema.parse(req.body);
    const tx = buildTradeTx({
      marketId: input.marketId,
      side: input.side,
      price: input.price,
      size: input.size,
      maxSlippageBps: input.maxSlippageBps
    });
    res.json({
      wallet: normalizeAddress(input.wallet),
      transaction: tx
    });
  } catch (error) {
    next(error);
  }
};