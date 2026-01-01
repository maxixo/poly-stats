import React from "react";

type Accent = "neon" | "nebula" | "pulse";

const accentClasses: Record<Accent, string> = {
  neon: "text-neon",
  nebula: "text-nebula",
  pulse: "text-pulse"
};

type StatCardProps = {
  label: string;
  value: string;
  subvalue?: string;
  accent?: Accent;
};

export const StatCard = ({ label, value, subvalue, accent = "neon" }: StatCardProps) => (
  <div className="glass-panel rounded-2xl p-5 border border-white/5">
    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
    <div className="mt-3 flex items-end justify-between gap-4">
      <div>
        <p className={`text-2xl font-semibold ${accentClasses[accent] || "text-neon"}`}>{value}</p>
        {subvalue ? <p className="text-sm text-slate-400 mt-1">{subvalue}</p> : null}
      </div>
      <div className="h-12 w-12 rounded-2xl bg-white/5 grid place-items-center text-neon shadow-glow">
        <span className="text-lg">*</span>
      </div>
    </div>
  </div>
);