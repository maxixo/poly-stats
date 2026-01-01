import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Wallets", path: "/wallets" },
  { label: "Copy", path: "/copy-trading" },
  { label: "Trade", path: "/trade" },
  { label: "Access", path: "/login" }
];

export const MobileNav = () => (
  <nav className="fixed bottom-5 left-5 right-5 z-40 lg:hidden">
    <div className="glass-panel rounded-2xl px-4 py-3 flex items-center justify-between border border-white/10">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `text-xs font-semibold uppercase tracking-[0.2em] px-3 py-2 rounded-full transition-all ${
              isActive ? "bg-neon/20 text-neon" : "text-slate-400"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  </nav>
);
