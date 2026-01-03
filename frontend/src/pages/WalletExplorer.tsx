import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useSearchParams } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { SectionHeader } from "../components/SectionHeader";
import { GlassCard } from "../components/GlassCard";
import { Skeleton } from "../components/Skeleton";
import { StatCard } from "../components/StatCard";
import { Tag } from "../components/Tag";
import { Button } from "../components/Button";
import { useWalletContext } from "../context/WalletContext";
import { useRequest } from "../hooks/useRequest";
import { api } from "../services/api";
import {
  formatAddress,
  formatDateTime,
  formatDurationHours,
  formatNumber,
  formatPercent
} from "../services/format";

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number; payload?: Record<string, unknown> }>;
  label?: string;
};

const formatSigned = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatNumber(Math.abs(value), 2)}`;
};

const ProfitTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) {
    return null;
  }
  const profit = payload[0]?.value ?? 0;
  const roi = Number(payload[0]?.payload?.roi || 0);
  return (
    <div className="glass-panel rounded-2xl px-4 py-3 text-xs text-slate-200">
      <p className="text-slate-400">{formatDateTime(label || "")}</p>
      <p className="mt-1 text-neon">{formatSigned(profit)}</p>
      <p className="text-slate-400 mt-1">ROI {formatPercent(roi)}</p>
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) {
    return null;
  }
  const value = payload[0]?.value ?? 0;
  const averageProfit = Number(payload[0]?.payload?.averageProfit || 0);
  const profit = Number(payload[0]?.payload?.profit || 0);
  const winRate = Number(payload[0]?.payload?.winRate || 0);
  return (
    <div className="glass-panel rounded-2xl px-4 py-3 text-xs text-slate-200">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 text-neon">{formatNumber(value, 2)}</p>
      {Number.isFinite(averageProfit) && averageProfit !== 0 ? (
        <p className="text-slate-400 mt-1">Avg P/L {formatSigned(averageProfit)}</p>
      ) : null}
      {Number.isFinite(profit) && profit !== 0 ? (
        <p className="text-slate-400 mt-1">Net P/L {formatSigned(profit)}</p>
      ) : null}
      {Number.isFinite(winRate) && winRate > 0 ? (
        <p className="text-slate-400 mt-1">Win rate {formatPercent(winRate)}</p>
      ) : null}
    </div>
  );
};

type SortKey = "netProfit" | "winRate" | "tradeCount" | "avgPositionSize" | "roi";

export const WalletExplorer = () => {
  const {
    account,
    isPolygon,
    connect,
    disconnect,
    selectWallet,
    walletType,
    walletOptions,
    isConnecting,
    error: walletError
  } = useWalletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const addressParam = searchParams.get("address") || "";
  const [addressInput, setAddressInput] = useState(addressParam);

  const categoriesRequest = useRequest(api.getMarketCategories, { immediate: true });
  const leaderboardRequest = useRequest(api.getWalletLeaderboard);
  const insightsRequest = useRequest(api.getWalletInsights);
  const analysisRequest = useRequest(api.getWalletAnalysis);

  const [topFilters, setTopFilters] = useState({ days: 30, minProfit: 0, category: "All" });
  const [appliedTopFilters, setAppliedTopFilters] = useState(topFilters);
  const [sortKey, setSortKey] = useState<SortKey>("netProfit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const analysisDays = 30;

  useEffect(() => {
    const params: Record<string, string | number> = {
      days: appliedTopFilters.days,
      minProfit: appliedTopFilters.minProfit,
      limit: 20,
      minWinRate: 0.75,
      minTrades: 20
    };
    if (appliedTopFilters.category !== "All") {
      params.category = appliedTopFilters.category;
    }
    console.log("[wallets] leaderboard request", params);
    void leaderboardRequest.run(params);
    void insightsRequest.run(params);
  }, [appliedTopFilters, leaderboardRequest.run, insightsRequest.run]);

  useEffect(() => {
    if (addressParam) {
      console.log("[wallets] analysis request", { wallet: addressParam, days: analysisDays });
      void analysisRequest.run(addressParam, { days: analysisDays });
    }
  }, [addressParam, analysisDays, analysisRequest.run]);

  useEffect(() => {
    if (addressParam) {
      setAddressInput(addressParam);
    }
  }, [addressParam]);

  const handleSearch = () => {
    const trimmed = addressInput.trim();
    if (!trimmed) {
      return;
    }
    console.log("[wallets] analyze", trimmed);
    setSearchParams({ address: trimmed });
  };

  const handleApplyFilters = () => {
    setAppliedTopFilters(topFilters);
  };

  const handleQuickRange = (days: number) => {
    const next = { ...topFilters, days };
    setTopFilters(next);
    setAppliedTopFilters(next);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  };

  const leaderboard = leaderboardRequest.data;
  const analysis = addressParam ? analysisRequest.data : null;
  const insights = insightsRequest.data?.insights as Record<string, unknown> | null;

  const wallets = leaderboard?.wallets || [];
  const sortedWallets = useMemo(() => {
    const list = [...wallets];
    list.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      return sortDir === "asc" ? left - right : right - left;
    });
    return list;
  }, [wallets, sortKey, sortDir]);

  const categoryOptions = useMemo(() => {
    const apiCategories = categoriesRequest.data?.categories || [];
    if (apiCategories.length) {
      return ["All", ...apiCategories];
    }
    const fallback = new Set<string>();
    wallets.forEach((wallet) => {
      if (wallet.topCategory) {
        fallback.add(wallet.topCategory);
      }
    });
    return ["All", ...Array.from(fallback)];
  }, [categoriesRequest.data, wallets]);

  const renderInsightValue = (value: unknown) => {
    if (!value) {
      return <p className="text-sm text-slate-400">No insights yet.</p>;
    }
    if (typeof value === "string") {
      return <p className="text-sm text-slate-200">{value}</p>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="grid gap-2">
          {value.map((item, index) => (
            <p key={`${index}`} className="text-sm text-slate-200">
              {typeof item === "string" ? item : JSON.stringify(item)}
            </p>
          ))}
        </div>
      );
    }
    return (
      <pre className="text-xs text-slate-300 whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  };

  return (
    <>
      <Topbar
        title="Wallet Explorer"
        subtitle="Analyze consistent winners and their Polymarket trading patterns."
        account={account}
        isPolygon={isPolygon}
        onConnect={connect}
        onDisconnect={disconnect}
        onSelectWallet={selectWallet}
        walletType={walletType}
        walletOptions={walletOptions}
        isConnecting={isConnecting}
        error={walletError}
      />

      <GlassCard className="grid gap-6">
        <SectionHeader title="Search Wallet" subtitle="Paste any Polygon wallet address to analyze it." />
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <input
            value={addressInput}
            onChange={(event) => setAddressInput(event.target.value)}
            placeholder="0x..."
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500"
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSearch} disabled={!addressInput || analysisRequest.loading}>
              {analysisRequest.loading ? "Analyzing..." : "Analyze"}
            </Button>
            {account ? (
              <Button variant="outline" onClick={() => setSearchParams({ address: account })}>
                Use Connected
              </Button>
            ) : null}
          </div>
        </div>
        {analysisRequest.error ? <p className="text-sm text-rose-400">{analysisRequest.error}</p> : null}
      </GlassCard>

      <section className="grid gap-6">
        <SectionHeader
          title="Top Wallet Discovery"
          subtitle="Top 20 wallets ranked by profitability and 75-100% win rate (1W, 2W, 1M views)."
          action={
            <Button variant="ghost" onClick={() => handleApplyFilters()}>
              Refresh
            </Button>
          }
        />
        <GlassCard className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant={topFilters.days === 7 ? "primary" : "outline"}
              onClick={() => handleQuickRange(7)}
            >
              1 Week
            </Button>
            <Button
              variant={topFilters.days === 14 ? "primary" : "outline"}
              onClick={() => handleQuickRange(14)}
            >
              2 Weeks
            </Button>
            <Button
              variant={topFilters.days === 30 ? "primary" : "outline"}
              onClick={() => handleQuickRange(30)}
            >
              1 Month
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Time Range
              <select
                value={topFilters.days}
                onChange={(event) => setTopFilters((prev) => ({ ...prev, days: Number(event.target.value) }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </label>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Minimum Profit
              <input
                type="number"
                value={topFilters.minProfit}
                onChange={(event) => setTopFilters((prev) => ({ ...prev, minProfit: Number(event.target.value) }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Market Category
              <select
                value={topFilters.category}
                onChange={(event) => setTopFilters((prev) => ({ ...prev, category: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
          {categoriesRequest.error ? (
            <p className="text-sm text-rose-400">{categoriesRequest.error}</p>
          ) : null}
        </GlassCard>

        {leaderboardRequest.loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : leaderboard ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Analyzed Trades"
              value={formatNumber(leaderboard.summary.totalTrades, 0)}
              subvalue={`${leaderboard.range.days}d window`}
              accent="neon"
            />
            <StatCard
              label="Avg Win Rate"
              value={formatPercent(leaderboard.summary.averageWinRate)}
              subvalue="Top 20 wallets"
              accent="pulse"
            />
            <StatCard
              label="Avg ROI"
              value={formatPercent(leaderboard.summary.averageRoi)}
              subvalue="Top 20 wallets"
              accent="nebula"
            />
            <StatCard
              label="Avg Net Profit"
              value={formatSigned(leaderboard.summary.averageProfit)}
              subvalue="Top 20 wallets"
              accent="neon"
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400">No leaderboard data yet.</p>
        )}

        <GlassCard className="grid gap-4">
          {leaderboardRequest.loading ? (
            <Skeleton className="h-56" />
          ) : sortedWallets.length ? (
            <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  <div className="grid grid-cols-7 gap-4 px-6 py-3 text-xs uppercase tracking-[0.2em] text-slate-500 bg-white/5">
                    <span>Wallet</span>
                    <button type="button" onClick={() => handleSort("netProfit")} className="text-left">
                      Net Profit
                    </button>
                    <button type="button" onClick={() => handleSort("winRate")} className="text-left">
                      Win Rate
                    </button>
                    <button type="button" onClick={() => handleSort("tradeCount")} className="text-left">
                      Trades
                    </button>
                    <button type="button" onClick={() => handleSort("avgPositionSize")} className="text-left">
                      Avg Size
                    </button>
                    <button type="button" onClick={() => handleSort("roi")} className="text-left">
                      ROI
                    </button>
                    <span>Action</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {sortedWallets.map((wallet) => (
                      <div
                        key={wallet.wallet}
                        className="grid grid-cols-7 gap-4 px-6 py-4 text-sm text-slate-200 items-center"
                      >
                        <div>
                          <p className="font-semibold">{formatAddress(wallet.wallet)}</p>
                          <p className="text-xs text-slate-500 mt-1">{wallet.topCategory}</p>
                        </div>
                        <span className={wallet.netProfit >= 0 ? "text-neon" : "text-rose-400"}>
                          {formatSigned(wallet.netProfit)}
                        </span>
                        <span>{formatPercent(wallet.winRate)}</span>
                        <span>{formatNumber(wallet.tradeCount, 0)}</span>
                        <span>{formatNumber(wallet.avgPositionSize, 2)}</span>
                        <span>{formatPercent(wallet.roi)}</span>
                        <Button variant="outline" onClick={() => setSearchParams({ address: wallet.wallet })}>
                          Inspect
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No wallets match the current filters.</p>
          )}
          {leaderboardRequest.error ? <p className="text-sm text-rose-400">{leaderboardRequest.error}</p> : null}
        </GlassCard>
      </section>

      <section className="grid gap-6">
        <SectionHeader title="Wallet Statistics Analysis" subtitle="Performance and risk profile for the selected wallet." />
        {analysisRequest.loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : analysis ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Net Profit"
                value={formatSigned(analysis.performance.netProfit)}
                subvalue={`P/L ${formatSigned(analysis.performance.totalProfit)} / ${formatSigned(-analysis.performance.totalLoss)}`}
                accent="neon"
              />
              <StatCard label="Win Rate" value={formatPercent(analysis.performance.winRate)} accent="pulse" />
              <StatCard label="Trades" value={formatNumber(analysis.performance.totalTrades, 0)} accent="nebula" />
              <StatCard
                label="Avg Position Size"
                value={formatNumber(analysis.performance.avgPositionSize, 2)}
                accent="neon"
              />
              <StatCard label="ROI" value={formatPercent(analysis.performance.roi)} accent="pulse" />
              <StatCard
                label="Profit Factor"
                value={formatNumber(analysis.performance.profitFactor, 2)}
                accent="nebula"
              />
              <StatCard
                label="Avg Profit / Trade"
                value={formatSigned(analysis.performance.avgProfitPerTrade)}
                accent="neon"
              />
              <StatCard
                label="Total Volume"
                value={formatNumber(analysis.performance.totalVolume, 2)}
                accent="pulse"
              />
              <StatCard label="Largest Win" value={formatSigned(analysis.performance.largestWin)} accent="neon" />
              <StatCard label="Largest Loss" value={formatSigned(analysis.performance.largestLoss)} accent="nebula" />
              <StatCard
                label="Sharpe Ratio"
                value={formatNumber(analysis.performance.sharpeRatio, 2)}
                accent="pulse"
              />
              <StatCard
                label="Volatility"
                value={formatNumber(analysis.performance.volatility, 3)}
                accent="neon"
              />
              <StatCard
                label="Active Positions"
                value={formatNumber(analysis.performance.activePositions, 0)}
                accent="nebula"
              />
              <StatCard label="Trades / Day" value={formatNumber(analysis.behavior.tradesPerDay, 2)} accent="pulse" />
              <StatCard
                label="Avg Hold Time"
                value={formatDurationHours(analysis.behavior.avgHoldHours)}
                accent="neon"
              />
              <StatCard
                label="Max Drawdown"
                value={formatNumber(analysis.performance.drawdown, 2)}
                accent="nebula"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Tag label={`Wallet ${formatAddress(analysis.wallet)}`} />
              <Tag label={`${analysis.range.days}d window`} />
              <Tag label={`${formatDurationHours(analysis.behavior.maxHoldHours)} max hold`} />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Select a wallet to see detailed analytics.</p>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="grid gap-4">
          <SectionHeader title="Profit Over Time" subtitle="Cumulative P/L across recent trades." />
          {analysisRequest.loading ? (
            <Skeleton className="h-64" />
          ) : analysis?.profitSeries?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analysis.profitSeries}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7df9ff" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#7df9ff" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatDateTime} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(value) => formatNumber(value, 0)} />
                  <Tooltip content={<ProfitTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumulativeProfit"
                    stroke="#7df9ff"
                    fill="url(#profitGradient)"
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Trade history needed to plot profit curve.</p>
          )}
        </GlassCard>

        <GlassCard className="grid gap-4">
          <SectionHeader title="Hold Time Distribution" subtitle="Winning vs. duration mix." />
          {analysisRequest.loading ? (
            <Skeleton className="h-64" />
          ) : analysis?.holdTimeDistribution?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.holdTimeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="count" fill="#9b5cff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Hold time data will appear after trades are indexed.</p>
          )}
        </GlassCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="grid gap-4">
          <SectionHeader title="Market Category Breakdown" subtitle="Where this wallet wins the most." />
          {analysisRequest.loading ? (
            <Skeleton className="h-56" />
          ) : analysis?.categoryStats?.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.categoryStats.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="tradeCount" fill="#7df9ff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Category data unavailable.</p>
          )}
        </GlassCard>

        <GlassCard className="grid gap-4">
          <SectionHeader title="Top Trades" subtitle="Most profitable positions for this wallet." />
          {analysisRequest.loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : analysis?.topTrades?.length ? (
            <div className="grid gap-3">
              {analysis.topTrades.slice(0, 10).map((trade) => (
                <div
                  key={`${trade.marketId}-${trade.entryTime}`}
                  className="rounded-2xl border border-white/5 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {trade.category}
                      </p>
                      <p className="text-sm font-semibold text-slate-100 mt-1">
                        {trade.question || trade.marketId}
                      </p>
                    </div>
                    <span className={trade.profit >= 0 ? "text-neon text-sm" : "text-rose-400 text-sm"}>
                      {formatSigned(trade.profit)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-4">
                    <span>Entry: {formatNumber(trade.entryPrice, 3)}</span>
                    <span>Exit: {formatNumber(trade.exitPrice, 3)}</span>
                    <span>Size: {formatNumber(trade.size, 2)}</span>
                    <span>Hold: {formatDurationHours(trade.holdHours)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No top trades to show yet.</p>
          )}
        </GlassCard>
      </section>

      <section className="grid gap-6">
        <SectionHeader title="Trade History" subtitle="Most recent wallet trades." />
        {analysisRequest.loading ? (
          <Skeleton className="h-48" />
        ) : analysis?.trades?.length ? (
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-5 gap-4 px-6 py-3 text-xs uppercase tracking-[0.2em] text-slate-500 bg-white/5">
                  <span>Market</span>
                  <span>Side</span>
                  <span>Price</span>
                  <span>Size</span>
                  <span>Time</span>
                </div>
                <div className="divide-y divide-white/5">
                  {analysis.trades.map((trade) => (
                    <div
                      key={`${trade.txHash || trade.timestamp}-${trade.marketId}`}
                      className="grid grid-cols-5 gap-4 px-6 py-4 text-sm text-slate-200"
                    >
                      <span className="truncate">{trade.marketId}</span>
                      <span className={trade.side === "YES" ? "text-neon" : "text-nebula"}>{trade.side}</span>
                      <span>{formatNumber(trade.price, 3)}</span>
                      <span>{formatNumber(trade.size, 2)}</span>
                      <span className="text-slate-400">{formatDateTime(trade.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No trade history yet.</p>
        )}
      </section>

      <section className="grid gap-6">
        <SectionHeader title="Insights Panel" subtitle="AI-generated patterns and recommendations." />
        <GlassCard className="grid gap-4">
          {insightsRequest.loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : insights ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Patterns</p>
                {renderInsightValue(insights.patterns)}
              </div>
              <div className="grid gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Market Insights</p>
                {renderInsightValue(insights.market_insights)}
              </div>
              <div className="grid gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hold Time</p>
                {renderInsightValue(insights.hold_time_recommendations)}
              </div>
              <div className="grid gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Risk Analysis</p>
                {renderInsightValue(insights.risk_analysis)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No insights generated yet. Connect Gemini to enable AI analysis.
            </p>
          )}
          {insightsRequest.error ? <p className="text-sm text-rose-400">{insightsRequest.error}</p> : null}
        </GlassCard>
      </section>
    </>
  );
};
