"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Video, Phone, Link2, Plus } from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function EventTypesPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [toasted, setToasted] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true); setError("");
    apiFetch("/event-types", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || d?.error || `Failed (${r.status})`); }
        return r.json();
      })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e: any) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string, current: boolean) => {
    // UI state only; persistence requires backend PATCH endpoint
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, active: !current } : i)));
  };

  const handleCopy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`https://chronos.app/${slug || slug}`);
      setToasted(slug);
      setTimeout(() => setToasted(null), 1200);
    } catch {
      setToasted("error");
      setTimeout(() => setToasted(null), 1200);
    }
  };

  const handleEdit = (item: any) => {
    alert(`Edit is blocked by existing backend gap. The /event-types controller currently only implements GET; no PATCH/PUT endpoint exists for updates. Endpoint: POST /event-types (not present) or PATCH /event-types/:id (not present).`);
  };

  const handleNew = () => {
    alert("New Event Type is blocked by existing backend gap. The /event-types controller only implements GET; no POST endpoint exists.");
  };

  // Render cards using real data if present; else seed design cards explicitly marked
  const displayItems = items.length > 0 ? items : [
    { id: "seed-1", title: "1-on-1 Strategy Call", durationMinutes: 30, description: "Deep dive strategic session to review roadmap & goals.", location: "Google Meet", price: 50, active: true, slug: "1-on-1-strategy-call" },
    { id: "seed-2", title: "Technical Review", durationMinutes: 60, description: "Comprehensive codebase audit and architecture planning.", location: "Zoom Video", price: 120, active: true, slug: "technical-review" },
    { id: "seed-3", title: "Free Intro Chat", durationMinutes: 15, description: "Brief introductory consultation to assess alignment.", location: "Phone Call", price: 0, active: true, slug: "free-intro-chat" },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Event Types</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure appointment types and booking links for your client base.</p>
          </div>
          <button onClick={handleNew} aria-label="New Event Type" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition shadow-md shadow-brand-500/20"><Plus size={14} /> New Event Type</button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm animate-pulse">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-full mb-3" />
                <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 text-xs flex items-start gap-3">
            <span className="text-lg">⚠</span>
            <div>
              <div className="font-bold">Failed to load event types</div>
              <div className="mt-1">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">No event types yet.</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Get started by creating your first event type.</div>
            <button onClick={handleNew} className="mt-4 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition inline-flex items-center gap-2"><Plus size={14} /> New Event Type</button>
            <div className="text-[11px] text-amber-400 mt-3">Note: backend only supports GET /event-types; create requires POST endpoint not yet implemented.</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayItems.map((et: any) => {
            const isReal = items.length > 0;
            const slug = et.slug || (et.id ? String(et.id).toLowerCase() : "");
            return (
              <div key={et.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition relative flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-600 dark:bg-brand-950/80 dark:text-brand-300">{et.durationMinutes || et.duration || "—"} MINS</span>
                    <button
                      onClick={() => toggle(et.id, et.active)}
                      aria-label={et.active ? `Deactivate ${et.title}` : `Activate ${et.title}`}
                      className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${et.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${et.active ? "translate-x-3" : "translate-x-0"}`} />
                    </button>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">{et.title || et.name || "Untitled"}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{et.description || et.desc || "—"}</p>
                </div>
                <div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      {et.location === "Phone Call" ? <Phone size={14} className="text-brand-500" /> : (et.location === "Google Meet" || et.location === "Zoom Video") ? <Video size={14} className="text-brand-500" /> : <Video size={14} className="text-brand-500" />}
                      {et.location || "—"}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{et.price != null ? (typeof et.price === "number" ? (et.price > 0 ? `$${et.price}` : "Free") : et.price) : "—"}</span>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <button onClick={() => handleCopy(slug)} aria-label={`Copy booking link for ${et.title}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"><Link2 size={14} /> Copy Link</button>
                    <button onClick={() => handleEdit(et)} aria-label={`Edit ${et.title}`} className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition">Edit</button>
                  </div>
                  {toasted === slug && <div className="mt-2 text-[11px] font-medium text-emerald-400">Booking link copied</div>}
                  {toasted === "error" && slug === (et.slug || String(et.id)) && <div className="mt-2 text-[11px] font-medium text-rose-400">Copy failed — clipboard unavailable</div>}
                  {!isReal && <div className="mt-2 text-[10px] text-amber-400">Design seed — backend data unavailable</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
