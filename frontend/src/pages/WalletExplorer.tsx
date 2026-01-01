import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
import { api, type TradeRecord } from "../services/api";
import { formatAddress, formatDateTime, formatNumber, formatPercent } from "../services/format";

type RoiPoint = {
  time: string;
  roi: number;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className="glass-panel rounded-2xl px-4 py-3 text-xs text-slate-200">
      <p className="text-slate-400">{label}</p>
      <p className="text-neon mt-1">{formatPercent(payload[0].value)}</p>
    </div>
  );
};

const buildRoiSeries = (trades: TradeRecord[]): RoiPoint[] => {
  if (!trades.length) {
    return [];
  }
  const sorted = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const finalPrices = new Map<string, number>();
  for (const trade of sorted) {
    finalPrices.set(trade.marketId, trade.price);
  }
  let totalCost = 0;
  let totalPnl = 0;
  return sorted.map((trade) => {
    const mark = finalPrices.get(trade.marketId) ?? trade.price;
    const pnl = trade.size * (trade.side === "YES" ? mark - trade.price : trade.price - mark);
    totalCost += trade.size * trade.price;
    totalPnl += pnl;
    return {
      time: formatDateTime(trade.timestamp),
      roi: totalCost ? totalPnl / totalCost : 0
    };
  });
};

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
  const { data, loading, error, run } = useRequest(api.getWallet);

  useEffect(() => {
    if (addressParam) {
      run(addressParam);
    }
  }, [addressParam, run]);

  useEffect(() => {
    if (addressParam) {
      setAddressInput(addressParam);
    }
  }, [addressParam]);

  const roiSeries = useMemo(() => buildRoiSeries(data?.trades || []), [data?.trades]);

  const handleSearch = () => {
    const trimmed = addressInput.trim();
    if (!trimmed) {
      return;
    }
    setSearchParams({ address: trimmed });
  };

  return (
    <>
      <Topbar
        title="Wallet Explorer"
        subtitle="Deep dive into wallet performance, strategy tags, and trade history."
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
            <Button onClick={handleSearch} disabled={!addressInput || loading}>
              {loading ? "Searching..." : "Analyze"}
            </Button>
            {account ? (
              <Button variant="outline" onClick={() => setSearchParams({ address: account })}>
                Use Connected
              </Button>
            ) : null}
          </div>
        </div>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </GlassCard>

      <section className="grid gap-6">
        <SectionHeader title="Wallet Metrics" subtitle="Performance snapshot over the last 30 days." />
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : data?.metrics ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="ROI" value={formatPercent(data.metrics.roi)} accent="neon" />
            <StatCard label="Win Rate" value={formatPercent(data.metrics.winRate)} accent="pulse" />
            <StatCard
              label="Avg Trade Size"
              value={formatNumber(data.metrics.avgTradeSize, 2)}
              accent="nebula"
            />
            <StatCard
              label="Drawdown"
              value={formatNumber(data.metrics.drawdown, 2)}
              accent="neon"
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400">No metrics yet. Search a wallet to begin.</p>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="grid gap-4">
          <SectionHeader title="ROI Curve" subtitle="Performance over recent trades." />
          {loading ? (
            <Skeleton className="h-64" />
          ) : roiSeries.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={roiSeries}>
                  <defs>
                    <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7df9ff" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#7df9ff" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="roi"
                    stroke="#7df9ff"
                    fill="url(#roiGradient)"
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Trade history needed to build ROI curve.</p>
          )}
        </GlassCard>

        <GlassCard className="grid gap-4">
          <SectionHeader title="Strategy Tags" subtitle="Detected trading style." />
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : data?.metrics?.strategyTags?.length ? (
            <div className="flex flex-wrap gap-3">
              {data.metrics.strategyTags.map((tag) => (
                <Tag key={tag} label={tag} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No strategy tags detected yet.</p>
          )}
          {data?.wallet ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Wallet</p>
              <p className="text-sm font-semibold text-slate-200 mt-2">{formatAddress(data.wallet)}</p>
            </div>
          ) : null}
        </GlassCard>
      </section>

      <section className="grid gap-6">
        <SectionHeader title="Trade History" subtitle="Most recent wallet trades." />
        {loading ? (
          <Skeleton className="h-48" />
        ) : data?.trades?.length ? (
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
                  {data.trades.map((trade) => (
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
    </>
  );
};
