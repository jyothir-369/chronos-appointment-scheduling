"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { AlertCircle, FileDown } from "lucide-react";

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Reports</h1>
            <p className="text-sm text-slate-400">Review detailed booking data and export it.</p>
          </div>
          <button className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold border border-indigo-500 hover:bg-indigo-700 flex items-center gap-2"><FileDown size={14}/> Export CSV</button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 min-h-[320px]">
          <h2 className="font-bold text-white mb-4">Bookings</h2>
          <table className="w-full text-sm text-slate-300">
            <thead><tr className="border-b border-white/10 text-xs uppercase text-slate-400"><th className="text-left py-2">Client</th><th>Event Type</th><th>Date</th><th>Status</th></tr></thead>
            <tbody><tr><td colSpan={4} className="py-8 text-center text-slate-500">No bookings in selected range. Widen range or check BACKEND GAP (no /reports endpoint).</td></tr></tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
