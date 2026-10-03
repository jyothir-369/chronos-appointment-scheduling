"use client";

import React from "react";
import { apiFetch } from "../../lib/api";
import { Badge } from "../components/Badge";
import { AppShell } from "../components/AppShell";
import { BookOpen, Clock, AlertCircle, CalendarDays } from "lucide-react";

export default function DashboardPage() {
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    apiFetch("/bookings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter((b) => b.status === "booked");

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-4">Upcoming Bookings</h2>
          {loading && <div className="h-32 rounded-xl bg-[#0F172A] animate-pulse border border-white/5" />}
          {error && (
            <div className="flex items-start gap-3 text-rose-200 text-sm"><AlertCircle size={18} />{error}</div>
          )}
          {!loading && !error && upcoming.length === 0 && (
            <div className="text-sm text-slate-400 py-8">No upcoming bookings. Book an appointment to see it here.</div>
          )}
          {!loading && !error && upcoming.length > 0 && (
            <div className="space-y-3">
              {upcoming.slice(0, 5).map((b: any) => (
                <div key={b.booking_id || b.id} className="flex items-center justify-between p-4 rounded-xl bg-[#0F172A] border border-white/5 hover:border-white/10 transition">
                  <div>
                    <div className="font-bold text-white">Booking #{String(b.booking_id || b.id).slice(0, 8)}</div>
                    <div className="text-xs text-slate-400">{new Date(b.slot_start_utc || "").toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })}</div>
                  </div>
                  <Badge variant="success">Booked</Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
          <h2 className="text-lg font-extrabold text-white mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/bookings" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-sm font-medium text-slate-200 transition border border-white/5"><BookOpen size={18} /> View Bookings</a>
            <a href="/clients" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-sm font-medium text-slate-200 transition border border-white/5"><Clock size={18} /> Clients</a>
            <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-sm font-medium text-slate-200 transition border border-white/5"><CalendarDays size={18} /> Settings</a>
          </div>
          <div className="mt-4 text-xs text-slate-500 leading-relaxed">
            Authenticated via <code className="text-indigo-300">chronos_session</code> cookie.<br />
            Development bypass <code className="text-amber-300">NO_REAL_AUTH</code> active.
          </div>
        </section>
      </div>
    </AppShell>
  );
}
