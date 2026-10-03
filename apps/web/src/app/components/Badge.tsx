import React from "react";

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "info" }) {
  const map = {
    default: "bg-[#111827] text-slate-300 border border-white/10",
    success: "bg-emerald-950 text-emerald-300 border border-emerald-900",
    warning: "bg-amber-950 text-amber-300 border border-amber-900",
    danger: "bg-rose-950 text-rose-300 border border-rose-900",
    info: "bg-indigo-950 text-indigo-300 border border-indigo-900",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${map[variant]} uppercase`}>{children}</span>;
}
