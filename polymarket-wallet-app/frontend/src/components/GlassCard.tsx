import React from "react";

type GlassCardProps = React.PropsWithChildren<{ className?: string }>;

export const GlassCard = ({ children, className = "" }: GlassCardProps) => (
  <div className={`glass-panel rounded-3xl p-6 ${className}`}>{children}</div>
);