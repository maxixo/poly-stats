import Trade, { type TradeDoc } from "../models/Trade.js";
import Subscription, { type SubscriptionDoc } from "../models/Subscription.js";
import { buildTradeTx, type TradeBuildInput, type TradeTx } from "./tradeBuilderService.js";

type SubscriptionInput = {
  follower: string;
  leader: string;
  riskMultiplier: number;
  maxSlippageBps: number;
  active: boolean;
};

type CopyTradeInput = {
  follower: string;
  leader: string;
  marketId: string;
  side: TradeBuildInput["side"];
  price: number;
  size: number;
  riskMultiplier: number;
  maxSlippageBps: number;
};

const getFollowerAvgSize = async (follower: string): Promise<number | null> => {
  const trades = await Trade.find({ wallet: follower }).sort({ timestamp: -1 }).limit(50).lean();
  if (!trades.length) {
    return null;
  }
  const tradesTyped = trades as TradeDoc[];
  const avg = tradesTyped.reduce((sum, trade) => sum + trade.size, 0) / tradesTyped.length;
  return avg;
};

const applyRiskSizing = (leaderSize: number, riskMultiplier: number, followerAvg: number | null): number => {
  const rawSize = leaderSize * riskMultiplier;
  if (!followerAvg) {
    return rawSize;
  }
  const maxSize = followerAvg * 3;
  const minSize = followerAvg * 0.2;
  return Math.min(Math.max(rawSize, minSize), maxSize);
};

export const upsertSubscription = async ({
  follower,
  leader,
  riskMultiplier,
  maxSlippageBps,
  active
}: SubscriptionInput): Promise<SubscriptionDoc | null> => {
  const subscription = await Subscription.findOneAndUpdate(
    { follower, leader },
    {
      $set: {
        riskMultiplier,
        maxSlippageBps,
        active
      }
    },
    { new: true, upsert: true }
  );

  return subscription;
};

export const executeCopyTrade = async ({
  follower,
  leader,
  marketId,
  side,
  price,
  size,
  riskMultiplier,
  maxSlippageBps
}: CopyTradeInput): Promise<TradeTx> => {
  const subscription = await Subscription.findOne({ follower, leader, active: true }).lean();
  const effectiveRisk = subscription?.riskMultiplier ?? riskMultiplier ?? 1;
  const effectiveSlippage = subscription?.maxSlippageBps ?? maxSlippageBps ?? 50;

  const followerAvg = await getFollowerAvgSize(follower);
  const adjustedSize = applyRiskSizing(size, effectiveRisk, followerAvg);

  return buildTradeTx({
    marketId,
    side,
    price,
    size: adjustedSize,
    maxSlippageBps: effectiveSlippage
  });
};
