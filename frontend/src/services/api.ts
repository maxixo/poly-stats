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
  getTopWallets: (limit = 10) => request<TopWalletsResponse>(`/api/wallets/top?limit=${limit}`),
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
