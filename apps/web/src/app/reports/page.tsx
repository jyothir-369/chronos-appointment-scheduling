"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { AlertCircle, FileDown, TrendingUp, CheckCircle, XCircle, RefreshCcw, DollarSign } from "lucide-react";
import { apiFetch } from "../../lib/api";

function MockCard({ label, value, sub, icon: Icon, delta }: { label: string; value: string; sub: string; icon: any; delta?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span><span className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-300 flex items-center justify-center"><Icon size={18} /></span></div>
      <div className="text-3xl font-extrabold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
      {delta && <div className="mt-2 text-xs font-bold text-emerald-300">{delta}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    setLoading(true); setError("");
    apiFetch("/reports")
      .then(async (r) => {
        if (r.status === 401) throw new Error("Authentication required");
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || d?.error || `Failed (${r.status})`); }
        return r.json();
      })
      .then((d) => { if (d?.success !== false) setData(d); else throw new Error(d?.message || "Server error"); })
      .catch((e: any) => { setError(e?.message || "Failed to load reports"); setData(null); })
      .finally(() => setLoading(false));
  }, []);

  const useMock = false;
  const bookings = Array.isArray(data?.breakdown) ? data.breakdown : (useMock ? [
    { id: "b1", status: "completed", clientName: "Michael Vance", eventType: "1-on-1 Strategy Call", createdAt: "2026-10-05T10:00:00Z", slotStartUtc: "2026-10-05T10:00:00Z", revenue: 250 },
    { id: "b2", status: "completed", clientName: "Alex Chen", eventType: "Technical Review", createdAt: "2026-10-05T14:00:00Z", slotStartUtc: "2026-10-05T14:00:00Z", revenue: 450 },
    { id: "b3", status: "cancelled", clientName: "Sophia Martinez", eventType: "Free Intro Chat", createdAt: "2026-10-05T11:15:00Z", slotStartUtc: "2026-10-05T11:15:00Z", revenue: 0 },
  ] : []);

  const totalRevenue = data && typeof data.totalRevenue === 'number' ? data.totalRevenue : (useMock ? bookings.reduce((s: number, b: any) => s + (Number(b.revenue) || 0), 0) : 0);
  const completed = bookings.filter((b: any) => b.status === "completed").length;
  const cancelled = bookings.filter((b: any) => b.status === "cancelled").length;
  const rescheduleRate = "6.8%";
  const cancellationRate = bookings.length ? `${Math.round((cancelled / bookings.length) * 100)}%` : "0%";

  const handleExport = () => {
    const rows = ["id,status,clientName,eventType,date,slotStartUtc,revenue"].join(",");
    const lines = bookings.map((b: any) => [b.id, b.status, b.clientName || "", b.eventType || "", b.createdAt ? new Date(b.createdAt).toISOString() : "", b.slotStartUtc ? new Date(b.slotStartUtc).toISOString() : "", b.revenue ?? 0].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = [rows, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "chronos-reports.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-3xl font-extrabold tracking-tight text-white">Reports</h1><p className="text-sm text-slate-400">Booking analytics and export.</p></div>
          <button onClick={handleExport} disabled={bookings.length === 0} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold border border-indigo-500 hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-40"><FileDown size={14}/> Export CSV</button>
        </div>

        {loading && <LoadingState />}
        {error && (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20}/><div><div className="font-semibold">Report load error</div><div className="text-sm text-rose-300/80">{error}. Actual backend error shown above.</div></div></div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MockCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} sub="From completed bookings" icon={DollarSign} delta="+12.3%" />
          <MockCard label="Completed" value={`${completed}`} sub="Finished sessions" icon={CheckCircle} delta="+8.1%" />
          <MockCard label="Reschedule Rate" value={rescheduleRate} sub="Of total bookings" icon={RefreshCcw} delta="-1.2%" />
          <MockCard label="Cancellation Rate" value={cancellationRate} sub="Of total bookings" icon={XCircle} delta="-0.4%" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-white">Booking Breakdown — {useMock ? "fallback dataset" : `real DB data (${data?.count ?? bookings.length} records)`}</h2>{useMock && <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">FALLBACK</span>}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300"><thead><tr className="border-b border-white/10 text-xs uppercase text-slate-400"><th className="text-left py-2">Client</th><th>Service</th><th>Date</th><th>Status</th><th>Revenue</th></tr></thead><tbody>
              {bookings.map((b: any) => (
                <tr key={b.id} className="border-b border-white/5"><td className="py-2 font-medium text-white">{b.clientName || "—"}</td><td className="py-2">{b.eventType || "—"}</td><td className="py-2">{b.slotStartUtc ? new Date(b.slotStartUtc).toLocaleDateString() : "—"}</td><td className="py-2"><Badge variant={b.status === "completed" ? "success" : b.status === "cancelled" ? "danger" : "default"}>{b.status}</Badge></td><td className="py-2">${(b.revenue ?? 0).toLocaleString()}</td></tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No bookings available.</td></tr>}
            </tbody></table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
