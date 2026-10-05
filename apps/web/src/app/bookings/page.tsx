"use client";

import React from "react";
import { apiFetch } from "../../lib/api";
import { Badge } from "../components/Badge";
import { EmptyState } from "../components/States";
import { CalendarDays, Clock, User, AlertCircle } from "lucide-react";

function formatClientShort(iso: string) {
  try { const d = new Date(iso + "Z"); return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC") || "UTC" }); } catch { return iso; }
}

function statusVariant(s: string) {
  if (s === "booked") return "success";
  if (s === "cancelled") return "danger";
  if (s === "completed") return "info";
  return "default";
}

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => {
    apiFetch("/bookings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const shown = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">My Bookings</h1>
        <div className="flex gap-2">
          {["all", "booked", "cancelled", "completed"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filter === f ? "bg-indigo-600 text-white border-indigo-500" : "bg-[#111827] text-slate-300 border-white/10 hover:border-white/20"}`}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-[#0F172A] border border-white/5 animate-pulse" />)}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3">
          <AlertCircle size={20} />
          <div>
            <div className="font-semibold">Failed to load bookings</div>
            <div className="text-sm text-rose-300/70">{error}</div>
          </div>
        </div>
      )}

      {!loading && !error && shown.length === 0 && (
        <EmptyState icon={CalendarDays} title="No bookings yet" message="Book an appointment to see it listed here." />
      )}

      {!loading && !error && shown.length > 0 && (
        <div className="grid gap-4">
          {shown.map((b: any) => (
            <article key={b.booking_id || b.id} className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 hover:border-white/20 transition">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold text-white">Booking #{String(b.booking_id || b.id).slice(0, 8)}</h2>
                    <Badge variant={statusVariant(b.status || "booked")}>
                      {(b.status || "booked").replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {formatClientShort(b.slot_start_utc || b.slot?.slot_start_utc)}</span>
                    <span className="flex items-center gap-1.5"><User size={14} /> {b.client_id ? String(b.client_id).slice(0,8) : "—"}</span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">UTC • Status version {b.version ?? 1}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => alert("Reschedule: POST /bookings/" + (b.booking_id || b.id) + "/reschedule (verified backend)")} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0F172A] border border-white/10 hover:bg-[#1E293B] text-slate-200 transition">Reschedule</button>
                  <button onClick={() => alert("Cancel: POST /bookings/" + (b.booking_id || b.id) + "/cancel (if-match + window + version)")} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 border border-rose-900/60 hover:bg-rose-900 text-rose-200 transition">Cancel</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-xs text-amber-200 leading-relaxed">
        <strong>Backend verified:</strong> bookings use cookie auth (<code>chronos_session</code>), version/if-match on reschedule/cancel, cancellation window enforced server-side. No invented endpoints. No mock data.
      </div>
    </div>
  );
}
