import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { GlassCard } from "../components/GlassCard";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { useWalletContext } from "../context/WalletContext";
import { useRequest } from "../hooks/useRequest";
import { api } from "../services/api";
import { formatAddress, formatDateTime, formatNumber, formatPercent } from "../services/format";

export const Dashboard = () => {
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
  const trendingRequest = useRequest(api.getTrending, { immediate: true });
  const { data: walletsData, loading: walletsLoading, error: walletsError, run: runWallets } = useRequest(
    api.getTopWallets
  );

  useEffect(() => {
    runWallets(8);
  }, [runWallets]);

  const markets = trendingRequest.data?.markets || [];
  const signals = trendingRequest.data?.signals || [];
  const wallets = walletsData?.wallets || [];

  const topRoi = wallets[0]?.metrics?.roi;

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Real-time wallet intelligence and signal flow across Polygon."
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

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="animate-reveal reveal-delay-1">
          <StatCard
            label="Trending Markets"
            value={trendingRequest.loading ? "--" : `${markets.length}`}
            subvalue="Last 24h"
            accent="neon"
          />
        </div>
        <div className="animate-reveal reveal-delay-2">
          <StatCard
            label="Signal Velocity"
            value={trendingRequest.loading ? "--" : `${signals.length}`}
            subvalue="Last 2h"
            accent="pulse"
          />
        </div>
        <div className="animate-reveal reveal-delay-3">
          <StatCard
            label="Top Wallet ROI"
            value={walletsLoading || topRoi === undefined ? "--" : formatPercent(topRoi)}
            subvalue="30d window"
            accent="nebula"
          />
        </div>
        <div className="animate-reveal reveal-delay-3">
          <StatCard
            label="Tracked Wallets"
            value={walletsLoading ? "--" : `${wallets.length}`}
            subvalue="Top volume"
            accent="neon"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <GlassCard className="grid gap-6">
          <SectionHeader
            title="Market Trends"
            subtitle="Top Polygon markets by traded volume with live odds."
            action={
              <Button variant="ghost" onClick={() => trendingRequest.run()}>
                Refresh
              </Button>
            }
          />
          {trendingRequest.loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : markets.length ? (
            <div className="grid gap-4">
              {markets.map((market) => (
                <div
                  key={market.marketId}
                  className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm text-slate-400 uppercase tracking-[0.2em]">Market</p>
                    <p className="text-base font-semibold text-slate-100 mt-1">{market.marketId}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-slate-300">
                    <div>
                      <p className="text-xs text-slate-500">Volume</p>
                      <p className="font-semibold">{formatNumber(market.volume, 2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Price</p>
                      <p className="font-semibold text-neon">{formatNumber(market.lastPrice, 3)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Trades</p>
                      <p className="font-semibold">{market.tradeCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No market activity indexed yet.</p>
          )}
          {trendingRequest.error ? <p className="text-sm text-rose-400">{trendingRequest.error}</p> : null}
        </GlassCard>

        <GlassCard className="grid gap-6">
          <SectionHeader title="Signal Feed" subtitle="Newest trade signals across active wallets." />
          {trendingRequest.loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : signals.length ? (
            <div className="grid gap-4">
              {signals.map((signal) => (
                <div
                  key={`${signal.wallet}-${signal.marketId}-${signal.timestamp}`}
                  className="rounded-2xl border border-white/5 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">{formatAddress(signal.wallet)}</p>
                    <span className="text-xs text-slate-500">{formatDateTime(signal.timestamp)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                    <span>{signal.marketId}</span>
                    <span className={signal.side === "YES" ? "text-neon" : "text-nebula"}>{signal.side}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Price: {formatNumber(signal.price, 3)}</span>
                    <span>Size: {formatNumber(signal.size, 2)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No signals yet. Indexer will populate soon.</p>
          )}
        </GlassCard>
      </section>

      <section className="grid gap-6">
        <SectionHeader
          title="Top Wallets"
          subtitle="High-volume wallets ranked by activity and performance."
          action={
            <Link to="/wallets" className="text-sm text-neon">
              Explore all
            </Link>
          }
        />
        <div className="grid gap-4">
          {walletsLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : wallets.length ? (
            wallets.map((wallet) => (
              <div
                key={wallet.wallet}
                className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wallet</p>
                  <p className="text-base font-semibold text-slate-100 mt-1">{formatAddress(wallet.wallet)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
                  <div>
                    <p className="text-xs text-slate-500">ROI</p>
                    <p className="font-semibold text-neon">{formatPercent(wallet.metrics.roi)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Win Rate</p>
                    <p className="font-semibold">{formatPercent(wallet.metrics.winRate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Volume</p>
                    <p className="font-semibold">{formatNumber(wallet.totalVolume, 2)}</p>
                  </div>
                </div>
                <Link
                  to={`/wallets?address=${wallet.wallet}`}
                  className="inline-flex items-center justify-center rounded-full border border-neon/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neon hover:bg-neon/10"
                >
                  Inspect
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No wallet activity yet.</p>
          )}
        </div>
        {walletsError ? <p className="text-sm text-rose-400">{walletsError}</p> : null}
      </section>
    </>
  );
};
