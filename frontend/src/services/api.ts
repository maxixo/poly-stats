const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export type TradeSide = "YES" | "NO";

export type WalletMetrics = {
  wallet: string;
  roi: number;
  winRate: number;
  avgTradeSize: number;
  drawdown: number;
  totalTrades: number;
  totalVolume: number;
  strategyTags: string[];
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

export type TradeRecord = {
  wallet: string;
  marketId: string;
  side: TradeSide;
  price: number;
  size: number;
  txHash?: string;
  logIndex?: number;
  blockNumber?: number;
  timestamp: string;
};

export type TrendingMarket = {
  marketId: string;
  volume: number;
  lastPrice: number;
  tradeCount: number;
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
  topCategory: string;
};

export type WalletLeaderboardResponse = {
  range: { start: string; end: string; days: number };
  filters: { minWinRate: number; minTrades: number; minProfit: number; limit: number; category?: string };
  summary: { totalWallets: number; totalTrades: number; averageWinRate: number; averageRoi: number; averageProfit: number };
  wallets: WalletLeaderboardItem[];
};

export type ProfitPoint = {
  timestamp: string;
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
  side: TradeSide;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  size: number;
  profit: number;
  roi: number;
  holdHours: number;
};

export type WalletAnalysisResponse = {
  wallet: string;
  range: { start: string; end: string; days: number };
  performance: WalletPerformanceMetrics;
  behavior: WalletBehaviorMetrics;
  profitSeries: ProfitPoint[];
  holdTimeDistribution: HoldTimeBucket[];
  topTrades: TopTrade[];
  categoryStats: CategoryStat[];
  trades: TradeRecord[];
};

export type WalletInsightsResponse = {
  scope: string;
  rangeDays: number;
  generatedAt: string;
  model: string;
  insights: Record<string, unknown> | null;
  rawText: string;
};

export type SignalItem = {
  wallet: string;
  marketId: string;
  side: TradeSide;
  price: number;
  size: number;
  timestamp: string;
};

export type TopWalletsResponse = {
  wallets: {
    wallet: string;
    totalVolume: number;
    tradeCount: number;
    metrics: WalletMetrics;
  }[];
};

export type WalletDetailResponse = {
  wallet: string;
  metrics: WalletMetrics;
  trades: TradeRecord[];
};

export type TrendingResponse = {
  markets: TrendingMarket[];
  signals: SignalItem[];
};

export type GammaMarketsResponse = unknown;
export type ClobMarketsResponse = unknown;
export type MarketCategoriesResponse = { categories: string[] };

export type TradeTx = {
  to: string;
  data: string;
  value: string;
};

export type CopySubscription = {
  follower: string;
  leader: string;
  riskMultiplier: number;
  maxSlippageBps: number;
  active: boolean;
};

export type CopySubscribeResponse = {
  subscription: CopySubscription | null;
};

export type TradeBuildResponse = {
  wallet: string;
  transaction: TradeTx;
};

export type CopyExecuteResponse = {
  transaction: TradeTx;
};

type QueryParams = Record<string, string | number | boolean | null | undefined>;

const withQuery = (path: string, params?: QueryParams): string => {
  if (!params) {
    return path;
  }
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    searchParams.set(key, String(value));
  });
  const suffix = searchParams.toString();
  return suffix ? `${path}?${suffix}` : path;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const message = (payload as { error?: string })?.error || "Request failed";
    throw new Error(message);
  }
  return payload as T;
};

export const api = {
  getTrending: () => request<TrendingResponse>("/api/markets/trending"),
  getMarketCategories: () => request<MarketCategoriesResponse>("/api/markets/categories"),
  getGammaMarkets: (params?: QueryParams) => request<GammaMarketsResponse>(withQuery("/api/markets/gamma", params)),
  getClobMarkets: (params?: QueryParams) => request<ClobMarketsResponse>(withQuery("/api/markets/clob", params)),
  getTopWallets: (limit = 10) => request<TopWalletsResponse>(`/api/wallets/top?limit=${limit}`),
  getWalletLeaderboard: (params?: QueryParams) =>
    request<WalletLeaderboardResponse>(withQuery("/api/wallets/leaderboard", params)),
  getWalletAnalysis: (address: string, params?: QueryParams) =>
    request<WalletAnalysisResponse>(withQuery(`/api/wallets/${address}/analysis`, params)),
  getWalletInsights: (params?: QueryParams) =>
    request<WalletInsightsResponse>(withQuery("/api/wallets/insights", params)),
  getWallet: (address: string) => request<WalletDetailResponse>(`/api/wallets/${address}`),
  subscribeCopy: (data: {
    follower: string;
    leader: string;
    riskMultiplier: number;
    maxSlippageBps: number;
    active?: boolean;
  }) => request<CopySubscribeResponse>("/api/copy/subscribe", { method: "POST", body: JSON.stringify(data) }),
  executeCopy: (data: {
    follower: string;
    leader: string;
    marketId: string;
    side: TradeSide;
    price: number;
    size: number;
    riskMultiplier: number;
    maxSlippageBps: number;
  }) => request<CopyExecuteResponse>("/api/copy/execute", { method: "POST", body: JSON.stringify(data) }),
  buildTrade: (data: {
    wallet: string;
    marketId: string;
    side: TradeSide;
    price: number;
    size: number;
    maxSlippageBps: number;
  }) => request<TradeBuildResponse>("/api/trade/build", { method: "POST", body: JSON.stringify(data) })
};
