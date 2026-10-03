"use client";

import React from "react";

export function EmptyState({ icon: Icon, title, message }: { icon?: React.ComponentType<{ size?: number }>; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 rounded-2xl border border-white/10 bg-[#111827]/60">
      {Icon && <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-300 flex items-center justify-center mb-4"><Icon size={22} /></div>}
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400 mt-2 max-w-xs">{message}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-xl bg-[#0F172A] animate-pulse border border-white/5" />
      ))}
    </div>
  );
}
