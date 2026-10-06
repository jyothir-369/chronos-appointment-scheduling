"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { Sparkles, AlertCircle, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function AnalyticsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    setLoading(true); setError("");
    apiFetch("/analytics")
      .then(async (r) => {
        if (r.status === 401) throw new Error("Authentication required");
        if (!r.ok) throw new Error((await r.json()).error || `Failed (${r.status})`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const totals = data?.totals || {};
  const rates = data?.rates || {};
  const bookings = Array.isArray(data?.bookings) ? data.bookings : [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Analytics</h1>
          <p className="text-sm text-slate-400">Understand booking trends, busy periods and client behavior.</p>
        </div>
        {loading && <LoadingState />}
        {error && (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20}/>{error}</div>
        )}
        {!loading && !error && data && (
          <>
            <div className="grid lg:grid-cols-4 gap-4">
              {[
                { label: "Total Bookings", value: String(totals.total ?? 0), delta: `${rates.completionRate ?? 0}% complete`, note: "All statuses" },
                { label: "Completion Rate", value: `${rates.completionRate ?? 0}%`, delta: `${totals.completed ?? 0} completed`, note: "Of finished bookings" },
                { label: "Cancellation Rate", value: `${rates.cancellationRate ?? 0}%`, delta: `${totals.cancelled ?? 0} cancelled`, note: "Of finished bookings" },
                { label: "Utilization", value: `${rates.utilization ?? 0}%`, delta: `${bookings.length} records`, note: "Slot occupancy" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl shadow-black/20">
                  <div className="flex items-start justify-between mb-2"><span className="text-[10px] uppercase font-bold text-slate-400">{s.label}</span><TrendingUp size={14} className="text-indigo-400"/></div>
                  <div className="text-3xl font-extrabold text-white">{s.value}</div>
                  <div className="text-sm text-slate-400">{s.note}</div>
                  <div className="text-xs text-indigo-300 mt-1">{s.delta}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
              <h2 className="font-bold text-white mb-4">Bookings Over Time (real DB data)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs uppercase bg-[#0F172A] text-slate-400"><tr><th className="px-3 py-2">Booking</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Slot Start (UTC)</th></tr></thead>
                  <tbody>
                    {bookings.slice(0, 10).map((b: any) => (
                      <tr key={b.id} className="border-b border-white/5"><td className="px-3 py-2 font-medium text-white">{b.id.slice(0, 8)}…</td><td className="px-3 py-2"><Badge variant={b.status === 'completed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'default'}>{b.status}</Badge></td><td className="px-3 py-2">{new Date(b.createdAt).toLocaleString()}</td><td className="px-3 py-2">{b.slotStartUtc ? new Date(b.slotStartUtc).toISOString() : '—'}</td></tr>
                    ))}
                    {bookings.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-slate-500">No bookings in range.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {!loading && !error && !data && (
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 text-slate-300">No analytics data available.</div>
        )}
      </div>
    </AppShell>
  );
}
