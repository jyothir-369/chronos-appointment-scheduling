"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { AlertCircle, CreditCard, Receipt } from "lucide-react";

export default function BillingPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div><h1 className="text-3xl font-extrabold tracking-tight text-white">Billing</h1><p className="text-sm text-slate-400">Manage your plan, usage and invoices.</p></div>
        {/* Current Plan — BACKEND GAP: no subscription/plan endpoint */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 space-y-4">
          <h2 className="font-bold text-white">Current Plan</h2>
          <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center"><CreditCard size={20}/></div><div><div className="font-bold text-white">Billing isn&apos;t set up for this workspace yet</div><div className="text-xs text-slate-400">No subscription endpoint available (BACKEND GAP).</div></div></div>
        </div>
        {/* Usage — counts only, no limits (no plan limits from backend) */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 space-y-3">
          <h2 className="font-bold text-white">Usage</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-[#0F172A] border border-white/5 p-3"><div className="text-xs text-slate-400">Bookings (this month)</div><div className="text-xl font-extrabold text-white">—</div></div>
            <div className="rounded-xl bg-[#0F172A] border border-white/5 p-3"><div className="text-xs text-slate-400">Event types</div><div className="text-xl font-extrabold text-white">—</div></div>
            <div className="rounded-xl bg-[#0F172A] border border-white/5 p-3"><div className="text-xs text-slate-400">Clients</div><div className="text-xl font-extrabold text-white">—</div></div>
          </div>
        </div>
        {/* Revenue — BACKEND GAP: no price/amount fields */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 space-y-3">
          <h2 className="font-bold text-white">Revenue</h2>
          <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center"><Receipt size={20}/></div><div><div className="font-bold text-white">Revenue not available</div><div className="text-xs text-slate-400">No price/amount fields on bookings (audit: bookings.json = 500 error, no amount key) — BACKEND GAP.</div></div></div>
        </div>
        {/* Payment / Invoices — BACKEND GAP */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
          <h2 className="font-bold text-white mb-4">Invoices</h2>
          <table className="w-full text-sm text-slate-300"><thead><tr className="border-b border-white/10 text-xs uppercase text-slate-400"><th className="text-left py-2">Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th>Download</th></tr></thead><tbody><tr><td colSpan={5} className="py-6 text-center text-slate-500">No invoices yet (no /invoices endpoint — BACKEND GAP).</td></tr></tbody></table>
        </div>
      </div>
    </AppShell>
  );
}
