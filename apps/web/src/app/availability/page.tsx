"use client";

import React from "react";
import { AppShell } from "../components/AppShell";
import { apiFetch } from "../../lib/api";
import { Clock } from "lucide-react";

export default function AvailabilityPage() {
  const [providerId, setProviderId] = React.useState("");
  const [avail, setAvail] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tz] = React.useState("UTC");

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Availability</h1>
        <p className="text-sm text-slate-400 mb-6">Read-only view. Only <code className="text-indigo-300">GET /providers/:id/availability?tz=...</code> is verified.</p>
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Provider ID</label>
          <input
            className="w-full mt-2 px-4 py-2.5 rounded-lg bg-[#0F172A] border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="Paste a provider UUID"
          />
          <button
            onClick={() => {
              if (!providerId) return;
              setLoading(true);
              apiFetch(`/providers/${providerId}/availability?tz=${encodeURIComponent(tz)}`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : Promise.reject(r)))
                .then((data) => setAvail(Array.isArray(data) ? data : []))
                .catch((e) => console.error(e))
                .finally(() => setLoading(false));
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 transition"
          >
            Load Availability
          </button>
          {loading && <div className="mt-4 text-sm text-slate-400">Loading...</div>}
          {!loading && avail.length > 0 && (
            <div className="mt-6 space-y-3">
              {avail.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#0F172A] border border-white/5 hover:border-white/10 transition">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-indigo-300" />
                    <span className="text-sm font-medium text-white">Day {a.dayOfWeek ?? "—"}</span>
                  </div>
                  <span className="text-xs text-slate-400">{a.startTime || "—"} → {a.endTime || "—"}</span>
                </div>
              ))}
            </div>
          )}
          {!loading && avail.length === 0 && providerId && (
            <div className="mt-6 text-sm text-slate-400">No availability rules returned.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
