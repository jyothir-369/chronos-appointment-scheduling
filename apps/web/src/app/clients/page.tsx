"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Search, Mail, Phone } from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function ClientsPage() {
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    setLoading(true); setError("");
    apiFetch("/clients", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || d?.error || `Failed (${r.status})`); }
        return r.json();
      })
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch((e: any) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(
    (c: any) =>
      (c.name || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.phone || "").includes(query)
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Clients Directory</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View and manage contact profiles, booking history, and revenues.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500/40 transition"
            />
          </div>
        </div>
        {loading && <div className="text-xs text-slate-400">Loading clients...</div>}
        {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-4 text-rose-200 text-xs">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c: any) => (
            <a key={c.id || c.email} href="#" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group" onClick={(e) => { e.preventDefault(); alert("Client detail not yet implemented."); }}>
              <div>
                <div className="flex items-center gap-3">
                  <img src={c.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"} alt={c.name || "Client"} className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800" />
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">{c.name || "Unknown"}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{c.company || "—"}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2"><Mail size={12} /> {c.email || "—"}</div>
                  <div className="flex items-center gap-2"><Phone size={12} /> {c.phone || "—"}</div>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex gap-4">
                  <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bookings</div><div className="font-bold text-slate-900 dark:text-white">{c.bookings || 0}</div></div>
                  <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Spent</div><div className="font-bold text-emerald-600 dark:text-emerald-400">${c.totalSpent || 0}</div></div>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold">Profile</span>
              </div>
            </a>
          ))}
        </div>
        {!loading && !error && filtered.length === 0 && clients.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
            <div className="text-sm font-bold text-slate-900 dark:text-white">No clients found</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search query.</div>
          </div>
        )}
        {!loading && !error && clients.length === 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
            <div className="text-sm font-bold text-slate-900 dark:text-white">No clients</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">The clients list is empty.</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
