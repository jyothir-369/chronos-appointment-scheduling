"use client";
import React from "react";
import { apiFetch } from "../../lib/api";
import { Search, AlertCircle } from "lucide-react";

export default function SearchPage() {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSearch = React.useCallback(async (value: string) => {
    if (!value.trim()) { setResults([]); return; }
    setLoading(true); setError("");
    try {
      const r = await apiFetch(`/search?q=${encodeURIComponent(value)}`, { credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || data?.error || `Search failed (${r.status})`);
      setResults(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Search failed");
      setResults([]);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => handleSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q, handleSearch]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-white mb-6">Search</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search bookings, clients, events..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111827] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          aria-label="Search"
        />
      </div>
      {loading && <div className="text-sm text-slate-400">Searching…</div>}
      {error && (
        <div className="rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-rose-200 text-sm mb-4 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {!loading && !error && results.length === 0 && q.trim() && <div className="text-sm text-slate-400">No results for “{q}”</div>}
      <div className="space-y-3">
        {results.map((r: any) => (
          <a key={r.id || r.booking_id || r.slug} href="#" className="block rounded-xl border border-white/10 bg-[#111827] p-4 hover:border-white/20 transition">
            <div className="font-semibold text-white">{r.title || r.name || r.eventType || "Result"}</div>
            <div className="text-xs text-slate-400 mt-1">{r.status ? `Status: ${r.status}` : r.time ? `Time: ${r.time}` : r.id || r.booking_id ? `ID: ${r.id || r.booking_id}` : ""}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
