import React from "react";
import { Link, Outlet } from "react-router-dom";

export const AuthLayout = () => (
  <div className="relative min-h-screen overflow-hidden">
    <div className="absolute inset-0 bg-mesh opacity-70"></div>
    <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-nebula/20 blur-3xl animate-float"></div>
    <div className="absolute top-32 right-0 h-64 w-64 rounded-full bg-neon/10 blur-3xl animate-pulseGlow"></div>

    <div className="relative px-6 py-12">
      <div className="mx-auto max-w-5xl grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-8 border border-white/10 grid gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Access</p>
            <h1 className="text-3xl font-semibold text-slate-100 mt-3 text-glow">Polymarket Atlas</h1>
            <p className="text-sm text-slate-400 mt-4">
              Track elite wallets, discover momentum signals, and copy trade in a non-custodial workflow.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Why sign in</p>
            <ul className="mt-3 grid gap-2 text-sm text-slate-300 list-disc list-inside">
              <li>Personalize your copy-trade settings.</li>
              <li>Sync wallet watchlists across devices.</li>
              <li>Access signal alerts and saved market views.</li>
            </ul>
          </div>
          <Link
            to="/"
            className="inline-flex items-center text-sm text-neon hover:text-neon/80 font-semibold"
          >
            Back to dashboard
          </Link>
        </div>
        <div className="glass-panel rounded-3xl p-8 border border-white/10">
          <Outlet />
        </div>
      </div>
    </div>
  </div>
);
