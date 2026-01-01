import React from "react";

type Variant = "primary" | "ghost" | "outline";

type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-neon/20 text-neon border border-neon/40 hover:bg-neon/30",
  ghost: "bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10",
  outline: "bg-transparent text-slate-200 border border-slate-600/50 hover:border-neon/50 hover:text-neon"
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base"
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) => (
  <button
    type="button"
    className={`transition-all duration-200 rounded-full font-semibold tracking-wide ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {children}
  </button>
);