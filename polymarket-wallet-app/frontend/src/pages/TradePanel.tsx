import React, { useMemo, useState } from "react";
import { Topbar } from "../components/Topbar";
import { SectionHeader } from "../components/SectionHeader";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { useWalletContext } from "../context/WalletContext";
import { useRequest } from "../hooks/useRequest";
import { api, type TradeSide } from "../services/api";
import { formatNumber } from "../services/format";

export const TradePanel = () => {
  const {
    account,
    provider,
    isPolygon,
    connect,
    disconnect,
    selectWallet,
    walletType,
    walletOptions,
    isConnecting,
    error: walletError
  } = useWalletContext();
  const { data, loading } = useRequest(api.getTrending, { immediate: true });
  const markets = data?.markets || [];
  const [marketId, setMarketId] = useState("");
  const [side, setSide] = useState<TradeSide>("YES");
  const [price, setPrice] = useState(0.5);
  const [size, setSize] = useState(50);
  const [maxSlippageBps, setMaxSlippageBps] = useState(50);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMarket = useMemo(
    () => markets.find((market) => market.marketId === marketId),
    [markets, marketId]
  );

  const livePrice = selectedMarket?.lastPrice ?? price;

  const handleMarketChange = (nextId: string) => {
    setMarketId(nextId);
    const match = markets.find((market) => market.marketId === nextId);
    if (match) {
      setPrice(Number(match.lastPrice.toFixed(4)));
    }
  };

  const handleSubmit = async () => {
    if (!account || !provider) {
      setError("Connect your wallet before trading.");
      return;
    }
    if (!isPolygon) {
      setError("Switch to Polygon to submit trades.");
      return;
    }
    const trimmedMarketId = marketId.trim();
    if (!trimmedMarketId) {
      setError("Market ID is required.");
      return;
    }
    if (price <= 0 || size <= 0) {
      setError("Price and size must be greater than zero.");
      return;
    }

    setError("");
    setStatus("Building transaction payload...");
    setTxHash("");
    setIsSubmitting(true);

    try {
      const build = await api.buildTrade({
        wallet: account,
        marketId: trimmedMarketId,
        side,
        price,
        size,
        maxSlippageBps
      });
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: build.transaction.to,
        data: build.transaction.data,
        value: build.transaction.value
      });
      setTxHash(tx.hash);
      setStatus("Transaction submitted. Await confirmation in wallet.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Trade submission failed";
      setError(message);
      setStatus("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Topbar
        title="Trade Panel"
        subtitle="Build and sign trades client-side with slippage protection."
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="grid gap-6">
          <SectionHeader title="Trade Builder" subtitle="Select a market and set your position." />
          <div className="grid gap-4">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Market</label>
            {loading ? (
              <Skeleton className="h-12" />
            ) : (
              <select
                value={marketId}
                onChange={(event) => handleMarketChange(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                <option value="">Select market</option>
                {markets.map((market) => (
                  <option key={market.marketId} value={market.marketId}>
                    {market.marketId}
                  </option>
                ))}
              </select>
            )}
            <input
              value={marketId}
              onChange={(event) => handleMarketChange(event.target.value)}
              placeholder="Or paste a market ID"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <div className="grid gap-4">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Side</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSide("YES")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                  side === "YES"
                    ? "border-neon/50 bg-neon/20 text-neon"
                    : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setSide("NO")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                  side === "NO"
                    ? "border-nebula/50 bg-nebula/20 text-nebula"
                    : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                NO
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Position Size</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="500"
                step="1"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="flex-1 accent-neon"
              />
              <span className="text-sm text-slate-200 w-16 text-right">{size}</span>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Price (Odds)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            />
          </div>

          <div className="grid gap-4">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Max Slippage</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={maxSlippageBps}
                onChange={(event) => setMaxSlippageBps(Number(event.target.value))}
                className="flex-1 accent-neon"
              />
              <span className="text-sm text-slate-200 w-16 text-right">{maxSlippageBps} bps</span>
            </div>
            {maxSlippageBps > 100 ? (
              <p className="text-xs text-amber-300">High slippage can expose you to price drift.</p>
            ) : null}
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Trade"}
          </Button>
          {status ? <p className="text-sm text-neon">{status}</p> : null}
          {txHash ? <p className="text-xs text-slate-400">Tx: {txHash}</p> : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </GlassCard>

        <GlassCard className="grid gap-6">
          <SectionHeader title="Live Odds" subtitle="Snapshot of current market pricing." />
          {loading ? (
            <Skeleton className="h-40" />
          ) : selectedMarket ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Market</p>
              <p className="text-base font-semibold text-slate-100 mt-2">{selectedMarket.marketId}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                <span>Last price</span>
                <span className="text-neon">{formatNumber(livePrice, 3)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                <span>24h volume</span>
                <span>{formatNumber(selectedMarket.volume, 2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                <span>Trades</span>
                <span>{selectedMarket.tradeCount}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a market to view live odds.</p>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Execution Summary</p>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
              <span>Side</span>
              <span className={side === "YES" ? "text-neon" : "text-nebula"}>{side}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
              <span>Size</span>
              <span>{size}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
              <span>Odds</span>
              <span>{formatNumber(price, 3)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
              <span>Slippage</span>
              <span>{maxSlippageBps} bps</span>
            </div>
          </div>
        </GlassCard>
      </section>
    </>
  );
};
