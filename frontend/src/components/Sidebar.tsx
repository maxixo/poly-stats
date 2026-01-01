import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Wallet Explorer", path: "/wallets" },
  { label: "Copy Trading", path: "/copy-trading" },
  { label: "Trade Panel", path: "/trade" }
];

const linkBase = "flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all";

export const Sidebar = () => {
  const { user, signOutUser } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:px-6 lg:py-10">
      <div className="glass-panel rounded-3xl p-6 grid gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Pulse Core</p>
          <h1 className="text-2xl font-semibold mt-2 text-glow">Polymarket Atlas</h1>
          <p className="text-sm text-slate-400 mt-2">Live wallet intelligence + non-custodial copy trading.</p>
        </div>
        <nav className="grid gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive
                    ? "bg-neon/15 text-neon border border-neon/40"
                    : "bg-white/5 text-slate-300 border border-white/5 hover:border-neon/30"
                }`
              }
            >
              <span>{item.label}</span>
              <span className="text-xs text-slate-500">/</span>
            </NavLink>
          ))}
        </nav>
        <div className="rounded-2xl border border-neon/30 bg-neon/10 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-neon">Alpha Flow</p>
          <p className="text-sm text-slate-200 mt-2">Indexing Polygon markets and surfacing edge signals.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 grid gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">User Access</p>
          {user ? (
            <div className="grid gap-3">
              <p className="text-sm text-slate-200 truncate">{user.email || "Signed in"}</p>
              <button
                type="button"
                onClick={signOutUser}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-neon/40 hover:text-neon"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-full border border-neon/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neon hover:bg-neon/10"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-neon/40 hover:text-neon"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};