import Trade, { type TradeDoc } from "../models/Trade.js";

export type StrategyTag = "EARLY_ENTRY" | "SCALPER" | "MOMENTUM" | "WHALE";

type Mark = {
  yes: number | null;
  no: number | null;
  last: number | null;
};

type MarketRange = {
  _id: string;
  first: Date;
  last: Date;
};

export type WalletAnalytics = {
  wallet: string;
  roi: number;
  winRate: number;
  avgTradeSize: number;
  drawdown: number;
  totalTrades: number;
  totalVolume: number;
  strategyTags: StrategyTag[];
};

const computeMarks = (trades: TradeDoc[]): Map<string, Mark> => {
  const marks = new Map<string, Mark>();
  for (const trade of trades) {
    const entry = marks.get(trade.marketId) || { yes: null, no: null, last: null };
    if (trade.side === "YES") {
      entry.yes = trade.price;
    } else {
      entry.no = trade.price;
    }
    entry.last = trade.price;
    marks.set(trade.marketId, entry);
  }

  for (const entry of marks.values()) {
    if (entry.yes === null && entry.no !== null) {
      entry.yes = Math.max(0, 1 - entry.no);
    }
    if (entry.no === null && entry.yes !== null) {
      entry.no = Math.max(0, 1 - entry.yes);
    }
  }

  return marks;
};

const computeDrawdown = (trades: TradeDoc[], marks: Map<string, Mark>): number => {
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of trades) {
    const mark = marks.get(trade.marketId);
    const markPrice = trade.side === "YES" ? mark?.yes ?? trade.price : mark?.no ?? trade.price;
    const pnl = trade.size * (markPrice - trade.price);
    cumulative += pnl;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
};

const computeStrategyTags = async (wallet: string, trades: TradeDoc[]): Promise<StrategyTag[]> => {
  const tags = new Set<StrategyTag>();
  if (!trades.length) {
    return [];
  }

  const avgSize = trades.reduce((sum, trade) => sum + trade.size, 0) / trades.length;
  const globalStats = await Trade.aggregate<{ avgSize: number }>([
    { $match: { timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: null, avgSize: { $avg: "$size" } } }
  ]);
  const globalAvg = globalStats[0]?.avgSize ?? avgSize;

  if (avgSize > globalAvg * 3) {
    tags.add("WHALE");
  }

  if (trades.length >= 10) {
    const gaps: number[] = [];
    for (let i = 1; i < trades.length; i += 1) {
      gaps.push((trades[i].timestamp.getTime() - trades[i - 1].timestamp.getTime()) / 60000);
    }
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    if (avgGap < 10 && avgSize < globalAvg) {
      tags.add("SCALPER");
    }
  }

  const marketIds = [...new Set(trades.map((trade) => trade.marketId))];
  const marketRanges = await Trade.aggregate<MarketRange>([
    { $match: { marketId: { $in: marketIds } } },
    {
      $group: {
        _id: "$marketId",
        first: { $min: "$timestamp" },
        last: { $max: "$timestamp" }
      }
    }
  ]);

  const rangeMap = new Map(marketRanges.map((entry) => [entry._id, entry]));
  let earlyEntries = 0;

  for (const marketId of marketIds) {
    const marketTrades = trades.filter((trade) => trade.marketId === marketId);
    const firstTrade = marketTrades[0];
    const range = rangeMap.get(marketId);
    if (!firstTrade || !range || range.last <= range.first) {
      continue;
    }
    const rangeMs = range.last.getTime() - range.first.getTime();
    if (firstTrade.timestamp.getTime() - range.first.getTime() <= rangeMs * 0.2) {
      earlyEntries += 1;
    }
  }

  if (earlyEntries / marketIds.length >= 0.5) {
    tags.add("EARLY_ENTRY");
  }

  const marketTrades = await Trade.find({ marketId: { $in: marketIds } })
    .sort({ timestamp: 1 })
    .lean();
  const lastPrice = new Map<string, number>();
  let momentumHits = 0;
  let momentumTotal = 0;

  for (const trade of marketTrades as TradeDoc[]) {
    const prev = lastPrice.get(trade.marketId);
    if (trade.wallet === wallet && prev !== undefined) {
      const delta = trade.price - prev;
      if ((delta > 0 && trade.side === "YES") || (delta < 0 && trade.side === "NO")) {
        momentumHits += 1;
      }
      momentumTotal += 1;
    }
    lastPrice.set(trade.marketId, trade.price);
  }

  if (momentumTotal > 0 && momentumHits / momentumTotal >= 0.6) {
    tags.add("MOMENTUM");
  }

  return [...tags];
};

export const getWalletAnalytics = async (wallet: string): Promise<WalletAnalytics> => {
  const trades = await Trade.find({ wallet }).sort({ timestamp: 1 }).lean();
  if (!trades.length) {
    return {
      wallet,
      roi: 0,
      winRate: 0,
      avgTradeSize: 0,
      drawdown: 0,
      totalTrades: 0,
      totalVolume: 0,
      strategyTags: []
    };
  }

  const tradesTyped = trades as TradeDoc[];
  const marks = computeMarks(tradesTyped);
  let totalCost = 0;
  let totalPnl = 0;
  let wins = 0;

  for (const trade of tradesTyped) {
    const mark = marks.get(trade.marketId);
    const markPrice = trade.side === "YES" ? mark?.yes ?? trade.price : mark?.no ?? trade.price;
    const cost = trade.size * trade.price;
    const pnl = trade.size * (markPrice - trade.price);
    totalCost += cost;
    totalPnl += pnl;
    if (pnl > 0) {
      wins += 1;
    }
  }

  const avgTradeSize = tradesTyped.reduce((sum, trade) => sum + trade.size, 0) / tradesTyped.length;
  const drawdown = computeDrawdown(tradesTyped, marks);
  const strategyTags = await computeStrategyTags(wallet, tradesTyped);

  return {
    wallet,
    roi: totalCost > 0 ? totalPnl / totalCost : 0,
    winRate: tradesTyped.length ? wins / tradesTyped.length : 0,
    avgTradeSize,
    drawdown,
    totalTrades: tradesTyped.length,
    totalVolume: tradesTyped.reduce((sum, trade) => sum + trade.size, 0),
    strategyTags
  };
};