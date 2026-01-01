import React, { useEffect, useMemo, useState } from "react";
import { Topbar } from "../components/Topbar";
import { SectionHeader } from "../components/SectionHeader";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { Tag } from "../components/Tag";
import { useWalletContext } from "../context/WalletContext";
import { useRequest } from "../hooks/useRequest";
import { api } from "../services/api";
import { formatAddress, formatNumber, formatPercent } from "../services/format";

type SubscriptionState = Record<string, boolean>;

export const CopyTrading = () => {
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
  const { data, loading, error, run } = useRequest(api.getTopWallets);
  const [riskMultiplier, setRiskMultiplier] = useState(1);
  const [maxSlippageBps, setMaxSlippageBps] = useState(50);
  const [subscriptions, setSubscriptions] = useState<SubscriptionState>({});
  const [pendingWallet, setPendingWallet] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>("");

  useEffect(() => {
    run(12);
  }, [run]);

  const leaderboard = data?.wallets || [];

  const handleToggle = async (leader: string) => {
    if (!account) {
      setActionError("Connect your wallet to manage subscriptions.");
      return;
    }
    if (!isPolygon) {
      setActionError("Switch to Polygon to manage subscriptions.");
      return;
    }

    const nextActive = !subscriptions[leader];
    setActionError("");
    setPendingWallet(leader);
    setSubscriptions((prev) => ({ ...prev, [leader]: nextActive }));

    try {
      await api.subscribeCopy({
        follower: account,
        leader,
        riskMultiplier,
        maxSlippageBps,
        active: nextActive
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Subscription update failed";
      setSubscriptions((prev) => ({ ...prev, [leader]: !nextActive }));
      setActionError(message);
    } finally {
      setPendingWallet(null);
    }
  };

  const riskLabel = useMemo(() => {
    if (riskMultiplier < 1) {
      return "Conservative";
    }
    if (riskMultiplier < 2) {
      return "Balanced";
    }
    return "Aggressive";
  }, [riskMultiplier]);

  return (
    <>
      <Topbar
        title="Copy Trading"
        subtitle="Subscribe to elite wallets and mirror their trades without custody risk."
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
        <SectionHeader title="Risk Controls" subtitle="Set portfolio exposure and slippage protection." />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Risk Multiplier</p>
            <p className="text-xl font-semibold text-slate-100 mt-2">{riskMultiplier.toFixed(2)}x</p>
            <p className="text-sm text-neon mt-1">{riskLabel}</p>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={riskMultiplier}
              onChange={(event) => setRiskMultiplier(Number(event.target.value))}
              className="mt-4 w-full accent-neon"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Max Slippage</p>
            <p className="text-xl font-semibold text-slate-100 mt-2">{maxSlippageBps} bps</p>
            <p className="text-sm text-slate-400 mt-1">Protects against price drift.</p>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={maxSlippageBps}
              onChange={(event) => setMaxSlippageBps(Number(event.target.value))}
              className="mt-4 w-full accent-neon"
            />
          </div>
        </div>
        {actionError ? <p className="text-sm text-rose-400">{actionError}</p> : null}
      </GlassCard>

      <section className="grid gap-6">
        <SectionHeader
          title="Wallet Leaderboard"
          subtitle="Ranked by volume with strategy tags and ROI signals."
          action={
            <Button variant="ghost" onClick={() => run(12)}>
              Refresh
            </Button>
          }
        />

        {loading ? (
          <div className="grid gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : leaderboard.length ? (
          <div className="grid gap-4">
            {leaderboard.map((wallet) => {
              const isActive = subscriptions[wallet.wallet];
              return (
                <div
                  key={wallet.wallet}
                  className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Leader</p>
                    <p className="text-base font-semibold text-slate-100 mt-1">{formatAddress(wallet.wallet)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {wallet.metrics.strategyTags?.length ? (
                        wallet.metrics.strategyTags.map((tag) => <Tag key={tag} label={tag} />)
                      ) : (
                        <span className="text-xs text-slate-500">No tags yet</span>
                      )}
                    </div>
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
                  <Button
                    onClick={() => handleToggle(wallet.wallet)}
                    disabled={pendingWallet === wallet.wallet}
                    variant={isActive ? "outline" : "primary"}
                  >
                    {pendingWallet === wallet.wallet
                      ? "Updating..."
                      : isActive
                      ? "Unsubscribe"
                      : "Subscribe"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No wallets indexed yet.</p>
        )}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </section>
    </>
  );
};
