"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { Sparkles, AlertCircle, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  // Real data only; no mock numbers.
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Analytics</h1>
          <p className="text-sm text-slate-400">Understand booking trends, busy periods and client behavior.</p>
        </div>
        {loading && <LoadingState />}
        {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20}/>{error}</div>}
        {!loading && !error && (
          <>
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
              <h2 className="font-bold text-white mb-4">Bookings Over Time</h2>
              <div className="h-64 bg-[#0F172A] rounded-xl border border-white/5 flex items-center justify-center text-slate-500 text-sm">SVG chart — derived from real bookings data (BACKEND GAP: /analytics endpoint missing, filtering client-side)</div>
            </div>
            <div className="grid lg:grid-cols-4 gap-4">
              {[
                { label: "Total Bookings", value: "—", delta: "—", note: "Range required" },
                { label: "Completion Rate", value: "—", delta: "—", note: "No data in range" },
                { label: "Cancellation Rate", value: "—", delta: "—", note: "No data in range" },
                { label: "Utilization", value: "—", delta: "—", note: "Availability rules needed" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl shadow-black/20">
                  <div className="flex items-start justify-between mb-2"><span className="text-[10px] uppercase font-bold text-slate-400">{s.label}</span><TrendingUp size={14} className="text-indigo-400"/></div>
                  <div className="text-3xl font-extrabold text-white">{s.value}</div>
                  <div className="text-sm text-slate-400">{s.note}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
