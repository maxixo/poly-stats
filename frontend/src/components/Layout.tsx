import React from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

type LayoutProps = React.PropsWithChildren;

export const Layout = ({ children }: LayoutProps) => (
  <div className="relative min-h-screen overflow-hidden">
    <div className="absolute inset-0 bg-mesh opacity-70"></div>
    <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-nebula/20 blur-3xl animate-float"></div>
    <div className="absolute top-32 right-0 h-64 w-64 rounded-full bg-neon/10 blur-3xl animate-pulseGlow"></div>
    <div className="relative flex">
      <Sidebar />
      <div className="flex-1 px-6 py-8 lg:px-10">
        <div className="grid gap-8 pb-24 lg:pb-10">{children}</div>
      </div>
    </div>
    <MobileNav />
  </div>
);