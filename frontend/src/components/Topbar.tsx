import React from "react";
import { Button } from "./Button";
import { formatAddress } from "../services/format";
import type { WalletOption, WalletType } from "../services/walletService";

type TopbarProps = {
  title: string;
  subtitle?: string;
  account: string;
  isPolygon: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectWallet: (type: WalletType) => void;
  walletType: WalletType | null;
  walletOptions: WalletOption[];
  isConnecting: boolean;
  error?: string;
};

const WalletIcon = ({ type }: { type: WalletType }) => {
  const styleMap: Record<WalletType, string> = {
    metamask: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    phantom: "bg-nebula/20 text-nebula border-nebula/40"
  };
  const label = type === "metamask" ? "M" : "P";
  return (
    <span
      className={`h-7 w-7 rounded-full border text-xs font-semibold flex items-center justify-center ${
        styleMap[type]
      }`}
    >
      {label}
    </span>
  );
};

export const Topbar = ({
  title,
  subtitle,
  account,
  isPolygon,
  onConnect,
  onDisconnect,
  onSelectWallet,
  walletType,
  walletOptions,
  isConnecting,
  error
}: TopbarProps) => {
  const selectedWallet = walletOptions.find((option) => option.type === walletType);
  const connectLabel = selectedWallet?.label || "Wallet";

  return (
    <header className="flex flex-col gap-4 rounded-3xl glass-panel px-6 py-5 border border-white/5 animate-reveal">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Live Ops</p>
          <h2 className="text-2xl font-semibold text-slate-100 mt-2">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-400 mt-1">{subtitle}</p> : null}
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {walletType ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-slate-200">
                <WalletIcon type={walletType} />
                <span>{connectLabel}</span>
              </div>
            ) : null}
            {account ? (
              <div className="px-4 py-2 rounded-full border border-white/10 text-sm text-slate-200 bg-white/5">
                {formatAddress(account)}
              </div>
            ) : null}
            {account && !isPolygon ? (
              <div className="px-3 py-2 rounded-full border border-amber-400/40 text-amber-300 text-xs uppercase tracking-[0.2em]">
                Switch to Polygon
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {walletOptions.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {walletOptions.map((option) => (
                  <div key={option.type} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectWallet(option.type)}
                      disabled={!option.available}
                      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                        option.available
                          ? option.type === walletType
                            ? "border-neon/50 bg-neon/15 text-neon"
                            : "border-white/10 bg-white/5 text-slate-300 hover:border-neon/30"
                          : "border-white/5 bg-white/5 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <WalletIcon type={option.type} />
                      {option.label}
                    </button>
                    {!option.available ? (
                      <a
                        href={option.installUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-neon uppercase tracking-[0.2em]"
                      >
                        Install
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No supported wallets detected.</p>
            )}
            <Button onClick={account ? onDisconnect : onConnect} disabled={isConnecting}>
              {account
                ? "Disconnect"
                : isConnecting
                ? "Connecting..."
                : walletType
                ? `Connect ${connectLabel}`
                : "Connect Wallet"}
            </Button>
          </div>
        </div>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </header>
  );
};