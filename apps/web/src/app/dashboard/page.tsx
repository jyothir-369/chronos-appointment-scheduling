"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { apiFetch } from "../../lib/api";
import {
  CalendarDays, Clock, Users, TrendingUp,
  Link2, Shield, Sparkles, AlertCircle, Video
} from "lucide-react";

export default function DashboardPage() {
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    apiFetch("/bookings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const total = bookings.length;
  const upcoming = bookings.filter((b) => b.status === "booked");
  const todayCount = upcoming.length;
  const valueAvailable = false;
  const occupancyAvailable = false;

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText("https://chronos.app/book"); } catch {}
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Good morning</h1>
            <p className="text-sm text-slate-400 mt-1">Today's schedule — {upcoming.length} upcoming appointment{upcoming.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyLink} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-[#111827] hover:bg-[#1E293B] text-sm font-medium text-slate-200 transition">
              <Link2 size={16} /> Share Booking Link
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 transition">
              <Shield size={16} /> Block Out Time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Appointments" value={String(total)} icon={CalendarDays} />
          <KpiCard label="Upcoming Today" value={String(todayCount)} icon={Clock} />
          <KpiCard label="Estimated Value" value={!valueAvailable ? "Unavailable" : "$0"} icon={TrendingUp} empty={!valueAvailable} />
          <KpiCard label="Occupancy Rate" value={!occupancyAvailable ? "—" : "0%"} icon={Users} empty={!occupancyAvailable} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-4">Today's Schedule</h2>
            {loading && <LoadingState />}
            {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20} />{error}</div>}
            {!loading && !error && upcoming.length === 0 && <EmptyState icon={Sparkles} title="No upcoming appointments" message="Schedule your first booking to see it here." />}
            {!loading && !error && upcoming.length > 0 && (
              <div className="space-y-3">
                {upcoming.slice(0, 8).map((b: any) => <AppointmentRow key={b.id || b.booking_id} booking={b} />)}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
              <h3 className="font-bold text-white mb-3">Your Booking Handle</h3>
              <div className="flex items-center gap-2 text-sm text-slate-300 mb-3">chronos.app/book</div>
              <button onClick={handleCopyLink} className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-2">
                Copy Link <Link2 size={14} />
              </button>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
              <h3 className="font-bold text-white mb-3">Recent Activity</h3>
              {!loading && !error && bookings.length === 0 && <p className="text-xs text-slate-400">No recent bookings.</p>}
              {!loading && !error && bookings.length > 0 && (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((b: any) => (
                    <div key={b.id || b.booking_id} className="text-xs text-slate-300">
                      <span className="font-semibold text-white">Booking #{String(b.id || b.booking_id).slice(0, 8)}</span>
                      <span className="block text-slate-400">Status: {b.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({ label, value, icon: Icon, empty }: { label: string; value: string; icon: React.ComponentType<{ size?: number }>; empty?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <Icon size={16} className="text-indigo-300" />
      </div>
      <div className={`text-2xl font-extrabold tracking-tight ${empty ? "text-slate-500" : "text-white"}`}>{value}</div>
    </div>
  );
}

function AppointmentRow({ booking }: { booking: any }) {
  const hasMeeting = !!(booking.meetingUrl || booking.meeting_url);
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#0F172A] border border-white/5 hover:border-white/10 transition">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center"><Clock size={18} /></div>
        <div>
          <div className="font-bold text-white text-sm">Booking #{String(booking.id || booking.booking_id).slice(0, 8)}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {new Date(booking.slot_start_utc || booking.slotStartUtc || "").toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Client: {booking.clientName || booking.client || "—"}</div>
          <div className="text-xs text-slate-500">Event: {booking.eventType || booking.event_type || "—"}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="success">{booking.status}</Badge>
        {hasMeeting && (
          <a href={booking.meetingUrl || booking.meeting_url} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"><Video size={12} /> Join</a>
        )}
      </div>
    </div>
  );
}
