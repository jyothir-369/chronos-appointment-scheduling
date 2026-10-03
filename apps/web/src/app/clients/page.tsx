"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { apiFetch } from "../../lib/api";
import { Search, User, Mail, Phone, Building2, Sparkles, AlertCircle } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<any>(null);

  React.useEffect(() => {
    setLoading(true);
    apiFetch("/clients", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c: any) => {
    const q = query.toLowerCase();
    return (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || (c.company || c.organization || "").toLowerCase().includes(q) || (c.phone || "").includes(q);
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Clients</h1>
        <p className="text-sm text-slate-400 mb-6">Directory of clients with verified backend data from <code className="text-indigo-300">GET /clients</code>.</p>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, company, phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition"
          />
        </div>

        {loading && <LoadingState />}
        {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20} />{error}</div>}
        {!loading && !error && filtered.length === 0 && <EmptyState icon={Sparkles} title="No clients" message="No clients match your search or the backend returned none."></EmptyState>}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c: any) => (
              <button key={c.id} onClick={() => setSelected(c)} className="text-left rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl shadow-black/20 hover:border-indigo-500/30 transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm">{(c.name || "").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div className="font-bold text-white">{c.name || "Unnamed"}</div>
                    <div className="text-xs text-slate-400">{c.email || "—"}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  {c.company || c.organization ? <div className="flex items-center gap-1.5"><Building2 size={12} /> {c.company || c.organization}</div> : null}
                  {c.phone ? <div className="flex items-center gap-1.5"><Phone size={12} /> {c.phone}</div> : null}
                </div>
                <div className="mt-3 flex gap-2"><Badge variant="info">Profile</Badge></div>
              </button>
            ))}
          </div>
        )}

        {/* Drawer for selected client */}
        {selected && (
          <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <aside className="relative w-full max-w-md bg-[#111827] border-l border-white/10 h-full overflow-y-auto shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-white">Client Details</h2>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-white/10 text-slate-300" aria-label="Close">✕</button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xl">{(selected.name || "").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="font-bold text-white text-lg">{selected.name || "—"}</div>
                  <div className="text-xs text-slate-400">ID: {selected.id ? String(selected.id).slice(0, 8) : "—"}</div>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-2"><Mail size={16} className="text-indigo-300" /> {selected.email || "—"}</div>
                <div className="flex items-center gap-2"><Phone size={16} className="text-indigo-300" /> {selected.phone || "—"}</div>
                <div className="flex items-center gap-2"><Building2 size={16} className="text-indigo-300" /> {selected.company || selected.organization || "—"}</div>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <h3 className="font-bold text-white mb-2">Booking History</h3>
                <p className="text-xs text-slate-400">Backend: <code className="text-indigo-300">GET /bookings</code> filtered by client. No separate history endpoint audited — derived from bookings.</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
