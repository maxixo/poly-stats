import React from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export const SectionHeader = ({ title, subtitle, action }: SectionHeaderProps) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <h2 className="text-2xl font-semibold text-slate-100">{title}</h2>
      {subtitle ? <p className="text-slate-400 mt-2">{subtitle}</p> : null}
    </div>
    {action ? <div>{action}</div> : null}
  </div>
);