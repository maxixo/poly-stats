import Trade, { type TradeDoc } from "../models/Trade.js";

export type TrendingMarket = {
  marketId: string;
  volume: number;
  lastPrice: number;
  tradeCount: number;
};

export type SignalItem = {
  wallet: string;
  marketId: string;
  side: TradeDoc["side"];
  price: number;
  size: number;
  timestamp: Date;
};

export const getTrendingMarkets = async (): Promise<TrendingMarket[]> => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const markets = await Trade.aggregate<{
    _id: string;
    volume: number;
    lastPrice: number;
    tradeCount: number;
  }>([
    { $match: { timestamp: { $gte: since } } },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: "$marketId",
        volume: { $sum: "$size" },
        lastPrice: { $last: "$price" },
        tradeCount: { $sum: 1 }
      }
    },
    { $sort: { volume: -1 } },
    { $limit: 10 }
  ]);

  return markets.map((market) => ({
    marketId: market._id,
    volume: market.volume,
    lastPrice: market.lastPrice,
    tradeCount: market.tradeCount
  }));
};

export const getSignalFeed = async (): Promise<SignalItem[]> => {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const trades = await Trade.find({ timestamp: { $gte: since } })
    .sort({ timestamp: -1 })
    .limit(25)
    .lean();

  return (trades as TradeDoc[]).map((trade) => ({
    wallet: trade.wallet,
    marketId: trade.marketId,
    side: trade.side,
    price: trade.price,
    size: trade.size,
    timestamp: trade.timestamp
  }));
};