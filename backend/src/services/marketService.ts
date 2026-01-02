import Trade, { type TradeDoc } from "../models/Trade.js";
import { fetchGammaMarkets } from "./polymarketService.js";

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

type GammaMarket = {
  id?: string;
  conditionId?: string;
  slug?: string;
  question?: string;
  volume24hr?: number | string;
  volume?: number | string;
  lastTradePrice?: number | string;
  bestBid?: number | string;
  bestAsk?: number | string;
  outcomePrices?: unknown;
};

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const parseOutcomePrice = (value: unknown): number | null => {
  if (Array.isArray(value) && value.length > 0) {
    const parsed = parseNumber(value[0], Number.NaN);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "string") {
    try {
      const parsedJson = JSON.parse(value);
      if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        const parsed = parseNumber(parsedJson[0], Number.NaN);
        return Number.isFinite(parsed) ? parsed : null;
      }
    } catch {
      return null;
    }
  }
  return null;
};

const getGammaMarketId = (market: GammaMarket): string =>
  market.conditionId ?? market.id ?? market.slug ?? market.question ?? "unknown";

const getGammaLastPrice = (market: GammaMarket): number => {
  const lastTrade = parseNumber(market.lastTradePrice, Number.NaN);
  if (Number.isFinite(lastTrade)) {
    return lastTrade;
  }
  const bestBid = parseNumber(market.bestBid, Number.NaN);
  if (Number.isFinite(bestBid)) {
    return bestBid;
  }
  const bestAsk = parseNumber(market.bestAsk, Number.NaN);
  if (Number.isFinite(bestAsk)) {
    return bestAsk;
  }
  const outcome = parseOutcomePrice(market.outcomePrices);
  return outcome ?? 0;
};

const getTrendingFromIndexer = async (): Promise<TrendingMarket[]> => {
  try {
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
  } catch {
    return [];
  }
};

export const getTrendingMarkets = async (): Promise<TrendingMarket[]> => {
  try {
    const payload = await fetchGammaMarkets({ active: true, closed: false, limit: 50 });
    if (Array.isArray(payload)) {
      const markets = (payload as GammaMarket[])
        .map((market) => {
          const marketId = getGammaMarketId(market);
          return {
            marketId,
            volume: parseNumber(market.volume24hr ?? market.volume),
            lastPrice: getGammaLastPrice(market),
            tradeCount: 0
          };
        })
        .filter((market) => market.marketId !== "unknown")
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10);

      if (markets.length) {
        return markets;
      }
    }
  } catch {
    // Fall through to indexed trades when Gamma is unavailable.
  }

  return getTrendingFromIndexer();
};

export const getSignalFeed = async (): Promise<SignalItem[]> => {
  try {
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
  } catch {
    return [];
  }
};
