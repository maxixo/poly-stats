import type { NextFunction, Request, Response } from "express";
import { copySubscribeSchema, copyExecuteSchema, normalizeAddress } from "../utils/validation.js";
import { upsertSubscription, executeCopyTrade } from "../services/copyTradeService.js";

export const subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = copySubscribeSchema.parse(req.body);
    const subscription = await upsertSubscription({
      follower: normalizeAddress(input.follower),
      leader: normalizeAddress(input.leader),
      riskMultiplier: input.riskMultiplier,
      maxSlippageBps: input.maxSlippageBps,
      active: input.active
    });
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

export const execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = copyExecuteSchema.parse(req.body);
    const tx = await executeCopyTrade({
      follower: normalizeAddress(input.follower),
      leader: normalizeAddress(input.leader),
      marketId: input.marketId,
      side: input.side,
      price: input.price,
      size: input.size,
      riskMultiplier: input.riskMultiplier,
      maxSlippageBps: input.maxSlippageBps
    });
    res.json({ transaction: tx });
  } catch (error) {
    next(error);
  }
};
