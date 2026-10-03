"use client";

import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState } from "../components/States";
import { apiFetch } from "../../lib/api";
import { Sparkles, AlertCircle } from "lucide-react";

export default function EventTypesPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    apiFetch("/event-types", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Event Types</h1>
        <p className="text-sm text-slate-400 mb-6">Verified endpoint: <code className="text-indigo-300">GET /event-types</code> (returns event types from DB).</p>
        {loading && <div className="h-32 rounded-2xl bg-[#0F172A] animate-pulse border border-white/5" />}
        {error && (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20} />{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <EmptyState icon={Sparkles} title="No event types" message="Create event types in the backend to see them listed here." />
        )}
        {!loading && !error && items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((et: any) => (
              <div key={et.id} className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl shadow-black/20 hover:border-indigo-500/30 transition">
                <h3 className="font-bold text-white">{et.name || "Untitled"}</h3>
                <div className="text-xs text-slate-400 mt-1">{et.durationMinutes ? `${et.durationMinutes} min` : "—"}</div>
                <div className="flex gap-2 mt-3"><Badge variant={et.active !== false ? "success" : "danger"}>{et.active !== false ? "Active" : "Inactive"}</Badge></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
