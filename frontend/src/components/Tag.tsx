import React from "react";

const tagStyles: Record<string, string> = {
  EARLY_ENTRY: "border-neon/40 text-neon bg-neon/10",
  SCALPER: "border-pulse/40 text-pulse bg-pulse/10",
  MOMENTUM: "border-nebula/40 text-nebula bg-nebula/10",
  WHALE: "border-amber-400/40 text-amber-300 bg-amber-400/10"
};

type TagProps = {
  label: string;
};

export const Tag = ({ label }: TagProps) => (
  <span
    className={`text-xs px-3 py-1 rounded-full border uppercase tracking-[0.2em] ${
      tagStyles[label] || "border-slate-500/40 text-slate-300 bg-white/5"
    }`}
  >
    {label.replace("_", " ")}
  </span>
);