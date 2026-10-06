"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { AlertCircle, CreditCard, Receipt } from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function BillingPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    setLoading(true); setError("");
    apiFetch("/billing")
      .then(async (r) => {
        if (r.status === 401) throw new Error("Authentication required");
        if (!r.ok) throw new Error((await r.json()).message || `Failed (${r.status})`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || "Failed to load billing"))
      .finally(() => setLoading(false));
  }, []);

  const plan = data?.plan || {};
  const usage = data?.usage || {};
  const revenue = data?.revenue || {};

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div><h1 className="text-3xl font-extrabold tracking-tight text-white">Billing</h1><p className="text-sm text-slate-400">Manage your plan, usage and invoices.</p></div>
        {loading && <LoadingState />}
        {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20}/>{error}</div>}
        {!loading && !error && data && (
          <>
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 space-y-4">
              <h2 className="font-bold text-white">Current Plan</h2>
              <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center"><CreditCard size={20}/></div><div><div className="font-bold text-white">{plan.name || "No plan"} — {plan.status || "inactive"}</div><div className="text-xs text-slate-400">{plan.billingCycle ? `Billed ${plan.billingCycle}` : "No billing endpoint configured"}</div></div></div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 space-y-3">
              <h2 className="font-bold text-white">Usage</h2>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-[#0F172A] border border-white/5 p-3"><div className="text-xs text-slate-400">Bookings (this month)</div><div className="text-xl font-extrabold text-white">{usage.bookingsThisMonth ?? 0}</div></div>
                <div className="rounded-xl bg-[#0F172A] border border-white/5 p-3"><div className="text-xs text-slate-400">Event types</div><div className="text-xl font-extrabold text-white">{usage.eventTypes ?? 0}</div></div>
                <div className="rounded-xl bg-[#0F172A] border border-white/5 p-3"><div className="text-xs text-slate-400">Clients</div><div className="text-xl font-extrabold text-white">{usage.clients ?? 0}</div></div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 space-y-3">
              <h2 className="font-bold text-white">Revenue</h2>
              <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center"><Receipt size={20}/></div><div><div className="font-bold text-white">Estimated Revenue</div><div className="text-xs text-slate-400">${revenue.estimatedRevenue ?? 0} ({revenue.completedBookings ?? 0} completed bookings with event-type prices)</div></div></div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
              <h2 className="font-bold text-white mb-4">Invoices</h2>
              <table className="w-full text-sm text-slate-300"><thead><tr className="border-b border-white/10 text-xs uppercase text-slate-400"><th className="text-left py-2">Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
                {(Array.isArray(data.invoices) && data.invoices.length > 0 ? data.invoices : []).map((inv: any) => (
                  <tr key={inv.id} className="border-b border-white/5"><td className="py-2">{inv.id}</td><td>{inv.date}</td><td>${inv.amount}</td><td><Badge variant="default">{inv.status}</Badge></td></tr>
                ))}
                {(!Array.isArray(data.invoices) || data.invoices.length === 0) && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No invoices yet.</td></tr>}
              </tbody></table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
