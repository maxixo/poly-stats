import Trade, { type TradeDoc } from "../models/Trade.js";
import Market from "../models/Market.js";

type Mark = {
  yes: number | null;
  no: number | null;
  last: number | null;
  lastTimestamp: Date | null;
};

export type WalletLeaderboardItem = {
  wallet: string;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  winRate: number;
  tradeCount: number;
  avgTradeSize: number;
  avgPositionSize: number;
  roi: number;
  totalVolume: number;
  score: number;
};

export type WalletLeaderboardSummary = {
  totalWallets: number;
  totalTrades: number;
  averageWinRate: number;
  averageRoi: number;
  averageProfit: number;
};

export type WalletLeaderboardResponse = {
  range: { start: Date; end: Date; days: number };
  filters: { minWinRate: number; minTrades: number; minProfit: number; limit: number };
  summary: WalletLeaderboardSummary;
  wallets: WalletLeaderboardItem[];
};

export type ProfitPoint = {
  timestamp: Date;
  cumulativeProfit: number;
  roi: number;
};

export type HoldTimeBucket = {
  label: string;
  count: number;
  averageProfit: number;
};

export type CategoryStat = {
  category: string;
  tradeCount: number;
  winRate: number;
  profit: number;
  roi: number;
};

export type TopTrade = {
  marketId: string;
  question: string | null;
  category: string;
  side: TradeDoc["side"];
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
  size: number;
  profit: number;
  roi: number;
  holdHours: number;
};

export type WalletPerformanceMetrics = {
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  winRate: number;
  avgProfitPerTrade: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  roi: number;
  avgTradeSize: number;
  avgPositionSize: number;
  totalTrades: number;
  totalVolume: number;
  drawdown: number;
  sharpeRatio: number;
  volatility: number;
  activePositions: number;
};

export type WalletBehaviorMetrics = {
  tradesPerDay: number;
  tradesPerWeek: number;
  avgHoldHours: number;
  minHoldHours: number;
  maxHoldHours: number;
};

export type WalletAnalysisResponse = {
  wallet: string;
  range: { start: Date; end: Date; days: number };
  performance: WalletPerformanceMetrics;
  behavior: WalletBehaviorMetrics;
  profitSeries: ProfitPoint[];
  holdTimeDistribution: HoldTimeBucket[];
  topTrades: TopTrade[];
  categoryStats: CategoryStat[];
  trades: TradeDoc[];
};

type PositionSummary = {
  marketId: string;
  side: TradeDoc["side"];
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
  size: number;
  profit: number;
  roi: number;
  holdHours: number;
};

const ensureDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value as string);
};

const computeMarks = (trades: TradeDoc[]): Map<string, Mark> => {
  const marks = new Map<string, Mark>();
  for (const trade of trades) {
    const entry = marks.get(trade.marketId) || { yes: null, no: null, last: null, lastTimestamp: null };
    if (trade.side === "YES") {
      entry.yes = trade.price;
    } else {
      entry.no = trade.price;
    }
    entry.last = trade.price;
    entry.lastTimestamp = ensureDate(trade.timestamp);
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

const getMarkPrice = (trade: TradeDoc, marks: Map<string, Mark>): number => {
  const mark = marks.get(trade.marketId);
  if (!mark) {
    return trade.price;
  }
  return trade.side === "YES" ? mark.yes ?? trade.price : mark.no ?? trade.price;
};

const computeDrawdown = (trades: TradeDoc[], marks: Map<string, Mark>): number => {
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of trades) {
    const markPrice = getMarkPrice(trade, marks);
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

const computeProfitSeries = (trades: TradeDoc[], marks: Map<string, Mark>): ProfitPoint[] => {
  if (!trades.length) {
    return [];
  }
  const sorted = [...trades].sort(
    (a, b) => ensureDate(a.timestamp).getTime() - ensureDate(b.timestamp).getTime()
  );
  let cumulative = 0;
  let totalCost = 0;

  return sorted.map((trade) => {
    const markPrice = getMarkPrice(trade, marks);
    const pnl = trade.size * (markPrice - trade.price);
    cumulative += pnl;
    totalCost += trade.size * trade.price;
    return {
      timestamp: ensureDate(trade.timestamp),
      cumulativeProfit: cumulative,
      roi: totalCost ? cumulative / totalCost : 0
    };
  });
};

const buildPositionSummaries = (trades: TradeDoc[], marks: Map<string, Mark>): PositionSummary[] => {
  const grouped = new Map<string, TradeDoc[]>();
  for (const trade of trades) {
    const list = grouped.get(trade.marketId) || [];
    list.push(trade);
    grouped.set(trade.marketId, list);
  }

  const positions: PositionSummary[] = [];
  for (const [marketId, marketTrades] of grouped.entries()) {
    const sorted = [...marketTrades].sort(
      (a, b) => ensureDate(a.timestamp).getTime() - ensureDate(b.timestamp).getTime()
    );
    const entry = sorted[0];
    const exit = sorted[sorted.length - 1];
    if (!entry || !exit) {
      continue;
    }
    const markPrice = getMarkPrice(entry, marks);
    const size =
      sorted.reduce((sum, trade) => sum + trade.size, 0) / Math.max(sorted.length, 1);
    const cost = size * entry.price;
    const profit = size * (markPrice - entry.price);
    const holdMs = ensureDate(exit.timestamp).getTime() - ensureDate(entry.timestamp).getTime();
    positions.push({
      marketId,
      side: entry.side,
      entryPrice: entry.price,
      exitPrice: markPrice,
      entryTime: ensureDate(entry.timestamp),
      exitTime: ensureDate(exit.timestamp),
      size,
      profit,
      roi: cost ? profit / cost : 0,
      holdHours: holdMs > 0 ? holdMs / (1000 * 60 * 60) : 0
    });
  }

  return positions;
};

const buildHoldTimeDistribution = (positions: PositionSummary[]): HoldTimeBucket[] => {
  const buckets: { label: string; min: number; max: number }[] = [
    { label: "<1h", min: 0, max: 1 },
    { label: "1-6h", min: 1, max: 6 },
    { label: "6-24h", min: 6, max: 24 },
    { label: "1-3d", min: 24, max: 72 },
    { label: "3-7d", min: 72, max: 168 },
    { label: ">7d", min: 168, max: Number.POSITIVE_INFINITY }
  ];

  return buckets.map((bucket) => {
    const inBucket = positions.filter(
      (position) => position.holdHours >= bucket.min && position.holdHours < bucket.max
    );
    const totalProfit = inBucket.reduce((sum, position) => sum + position.profit, 0);
    return {
      label: bucket.label,
      count: inBucket.length,
      averageProfit: inBucket.length ? totalProfit / inBucket.length : 0
    };
  });
};

const computeCategoryStats = (
  trades: TradeDoc[],
  marks: Map<string, Mark>,
  marketMap: Map<string, { category?: string }>
): CategoryStat[] => {
  const stats = new Map<string, { wins: number; trades: number; profit: number; cost: number }>();

  for (const trade of trades) {
    const category = marketMap.get(trade.marketId)?.category || "Uncategorized";
    const entry = stats.get(category) || { wins: 0, trades: 0, profit: 0, cost: 0 };
    const markPrice = getMarkPrice(trade, marks);
    const pnl = trade.size * (markPrice - trade.price);
    const cost = trade.size * trade.price;
    entry.trades += 1;
    entry.profit += pnl;
    entry.cost += cost;
    if (pnl > 0) {
      entry.wins += 1;
    }
    stats.set(category, entry);
  }

  return [...stats.entries()]
    .map(([category, entry]) => ({
      category,
      tradeCount: entry.trades,
      winRate: entry.trades ? entry.wins / entry.trades : 0,
      profit: entry.profit,
      roi: entry.cost ? entry.profit / entry.cost : 0
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);
};

const getRange = (days: number): { start: Date; end: Date; days: number } => {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end, days };
};

const clampDays = (value: number | undefined, fallback: number): number => {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(value), 1), 180);
};

const computePerformance = (trades: TradeDoc[], marks: Map<string, Mark>, positions: PositionSummary[]) => {
  let totalProfit = 0;
  let totalLoss = 0;
  let totalCost = 0;
  let wins = 0;
  let largestWin = 0;
  let largestLoss = 0;

  const returns: number[] = [];

  for (const trade of trades) {
    const markPrice = getMarkPrice(trade, marks);
    const pnl = trade.size * (markPrice - trade.price);
    const cost = trade.size * trade.price;
    totalCost += cost;
    if (pnl > 0) {
      totalProfit += pnl;
      wins += 1;
      largestWin = Math.max(largestWin, pnl);
    } else {
      totalLoss += Math.abs(pnl);
      largestLoss = Math.min(largestLoss, pnl);
    }
    if (cost > 0) {
      returns.push(pnl / cost);
    }
  }

  const avgTradeSize = trades.length
    ? trades.reduce((sum, trade) => sum + trade.size, 0) / trades.length
    : 0;
  const avgPositionSize = positions.length
    ? positions.reduce((sum, position) => sum + position.size, 0) / positions.length
    : 0;
  const netProfit = totalProfit - totalLoss;
  const winRate = trades.length ? wins / trades.length : 0;
  const roi = totalCost ? netProfit / totalCost : 0;
  const avgProfitPerTrade = trades.length ? netProfit / trades.length : 0;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit;

  const avgReturn = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((sum, value) => sum + Math.pow(value - avgReturn, 2), 0) / (returns.length - 1)
      : 0;
  const volatility = variance > 0 ? Math.sqrt(variance) : 0;
  const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

  const drawdown = computeDrawdown(trades, marks);

  const activeCutoffDays = clampDays(Number(process.env.ACTIVE_POSITION_DAYS), 7);
  const activeCutoff = new Date(Date.now() - activeCutoffDays * 24 * 60 * 60 * 1000).getTime();
  const activePositions = positions.filter((position) => position.exitTime.getTime() >= activeCutoff).length;

  return {
    totalProfit,
    totalLoss,
    netProfit,
    winRate,
    avgProfitPerTrade,
    largestWin,
    largestLoss,
    profitFactor,
    roi,
    avgTradeSize,
    avgPositionSize,
    totalTrades: trades.length,
    totalVolume: trades.reduce((sum, trade) => sum + trade.size, 0),
    drawdown,
    sharpeRatio,
    volatility,
    activePositions
  };
};

const computeBehavior = (positions: PositionSummary[], rangeDays: number, tradeCount: number): WalletBehaviorMetrics => {
  const tradesPerDay = rangeDays > 0 ? tradeCount / rangeDays : 0;
  const tradesPerWeek = rangeDays > 0 ? tradeCount / (rangeDays / 7) : 0;
  const holdHours = positions.map((position) => position.holdHours).filter((value) => Number.isFinite(value));
  const avgHoldHours = holdHours.length ? holdHours.reduce((sum, value) => sum + value, 0) / holdHours.length : 0;
  const minHoldHours = holdHours.length ? Math.min(...holdHours) : 0;
  const maxHoldHours = holdHours.length ? Math.max(...holdHours) : 0;

  return {
    tradesPerDay,
    tradesPerWeek,
    avgHoldHours,
    minHoldHours,
    maxHoldHours
  };
};

export const getWalletAnalysis = async (
  wallet: string,
  days: number,
  tradeLimit = 100
): Promise<WalletAnalysisResponse> => {
  const range = getRange(clampDays(days, 30));
  const trades = (await Trade.find({
    wallet,
    timestamp: { $gte: range.start, $lte: range.end }
  })
    .sort({ timestamp: 1 })
    .lean()) as TradeDoc[];

  if (!trades.length) {
    return {
      wallet,
      range,
      performance: {
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
        winRate: 0,
        avgProfitPerTrade: 0,
        largestWin: 0,
        largestLoss: 0,
        profitFactor: 0,
        roi: 0,
        avgTradeSize: 0,
        avgPositionSize: 0,
        totalTrades: 0,
        totalVolume: 0,
        drawdown: 0,
        sharpeRatio: 0,
        volatility: 0,
        activePositions: 0
      },
      behavior: {
        tradesPerDay: 0,
        tradesPerWeek: 0,
        avgHoldHours: 0,
        minHoldHours: 0,
        maxHoldHours: 0
      },
      profitSeries: [],
      holdTimeDistribution: [],
      topTrades: [],
      categoryStats: [],
      trades: []
    };
  }

  const marks = computeMarks(trades);
  const positions = buildPositionSummaries(trades, marks);

  const marketIds = [...new Set(trades.map((trade) => trade.marketId))];
  const markets = await Market.find({ marketId: { $in: marketIds } }).lean();
  const marketMap = new Map(
    markets.map((market) => [market.marketId, { category: market.category, question: market.question }])
  );

  const performance = computePerformance(trades, marks, positions);
  const behavior = computeBehavior(positions, range.days, trades.length);
  const profitSeries = computeProfitSeries(trades, marks);
  const holdTimeDistribution = buildHoldTimeDistribution(positions);
  const categoryStats = computeCategoryStats(trades, marks, marketMap);

  const topTrades = [...positions]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 20)
    .map((position) => ({
      marketId: position.marketId,
      question: marketMap.get(position.marketId)?.question ?? null,
      category: marketMap.get(position.marketId)?.category ?? "Uncategorized",
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice: position.exitPrice,
      entryTime: position.entryTime,
      exitTime: position.exitTime,
      size: position.size,
      profit: position.profit,
      roi: position.roi,
      holdHours: position.holdHours
    }));

  const tradesLimited = trades.slice(-tradeLimit).reverse();

  return {
    wallet,
    range,
    performance,
    behavior,
    profitSeries,
    holdTimeDistribution,
    topTrades,
    categoryStats,
    trades: tradesLimited
  };
};

export const getWalletLeaderboard = async (
  days: number,
  limit: number,
  minWinRate: number,
  minTrades: number,
  minProfit: number
): Promise<WalletLeaderboardResponse> => {
  const range = getRange(clampDays(days, 30));
  const trades = (await Trade.find({
    timestamp: { $gte: range.start, $lte: range.end }
  }).lean()) as TradeDoc[];

  const grouped = new Map<string, TradeDoc[]>();
  for (const trade of trades) {
    const list = grouped.get(trade.wallet) || [];
    list.push(trade);
    grouped.set(trade.wallet, list);
  }

  const wallets: WalletLeaderboardItem[] = [];
  let totalTrades = 0;

  for (const [wallet, walletTrades] of grouped.entries()) {
    const marks = computeMarks(walletTrades);
    const positions = buildPositionSummaries(walletTrades, marks);
    const performance = computePerformance(walletTrades, marks, positions);
    totalTrades += walletTrades.length;

    if (performance.totalTrades < minTrades) {
      continue;
    }
    if (performance.winRate < minWinRate) {
      continue;
    }
    if (performance.netProfit < minProfit) {
      continue;
    }

    const score = performance.netProfit * performance.winRate * performance.totalTrades;
    wallets.push({
      wallet,
      totalProfit: performance.totalProfit,
      totalLoss: performance.totalLoss,
      netProfit: performance.netProfit,
      winRate: performance.winRate,
      tradeCount: performance.totalTrades,
      avgTradeSize: performance.avgTradeSize,
      avgPositionSize: performance.avgPositionSize,
      roi: performance.roi,
      totalVolume: performance.totalVolume,
      score
    });
  }

  const ranked = wallets.sort((a, b) => b.score - a.score).slice(0, limit);
  const averageWinRate = ranked.length
    ? ranked.reduce((sum, wallet) => sum + wallet.winRate, 0) / ranked.length
    : 0;
  const averageRoi = ranked.length
    ? ranked.reduce((sum, wallet) => sum + wallet.roi, 0) / ranked.length
    : 0;
  const averageProfit = ranked.length
    ? ranked.reduce((sum, wallet) => sum + wallet.netProfit, 0) / ranked.length
    : 0;

  return {
    range,
    filters: {
      minWinRate,
      minTrades,
      minProfit,
      limit
    },
    summary: {
      totalWallets: ranked.length,
      totalTrades,
      averageWinRate,
      averageRoi,
      averageProfit
    },
    wallets: ranked
  };
};
