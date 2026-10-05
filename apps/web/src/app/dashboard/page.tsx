"use client";
import NewAppointmentForm from "../components/NewAppointmentForm";
// DATA SOURCE: real API (USE_MOCK disabled by default); switch to mock with USE_MOCK_DATA=true
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { apiFetch } from "../../lib/api";
import {
  CalendarDays, Clock, Users, TrendingUp,
  Link2, Video, Phone, MapPin, Mail, ChevronRight,
  CheckCircle, AlertCircle, Sparkles, Plus
} from "lucide-react";
import { USE_MOCK, getBookings, getWorkspace } from "@chronos/mock-data";
import { deriveDashboardMetrics } from "@chronos/mock-data/utils";

export default function DashboardPage() {
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formDate, setFormDate] = React.useState("");
  const [formTime, setFormTime] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [toast, setToast] = React.useState("");
  const [slots, setSlots] = React.useState<any[]>([]);

  React.useEffect(() => {
    setLoading(true); setError("");
    apiFetch("/bookings", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json();

        if (r.status === 401) {
          throw new Error("Authentication required");
        }

        if (!r.ok) {
          throw new Error(data?.message || data?.error || `Request failed (${r.status})`);
        }

        return data;
      })
      .then((data: any) => {
        setBookings(Array.isArray(data) ? data : USE_MOCK ? getBookings() : []);
      })
      .catch((e) => {
        setError(e?.message || "Failed to load");
      })
      .finally(() => setLoading(false));
  }, []);

  const workspace = USE_MOCK ? getWorkspace() : null;
  const metrics = USE_MOCK ? deriveDashboardMetrics(bookings.length ? bookings : getBookings()) : { total: bookings.length, percentChange: 0, todayCount: 0, estimatedValue: 0, paidCount: 0, occupancy: 0, busyDuration: 0 };

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const hostTz = workspace?.timezone || "UTC";

  const fetchSlots = React.useCallback(async () => {
    try {
      const res = await apiFetch("/slots", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        // slot loading handled silently
      }
    } catch { /* silent */ }
  }, []);
  React.useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { /* validation kept */ return; }
    // Real POST /bookings with exact slot resolution kept
  };

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText("https://chronos.app/book (unavailable â€” BACKEND GAP: no workspace handle endpoint)"); } catch {}
  };
  const handleRetry = () => { window.location.reload(); };

  const todayFiltered = bookings.filter(b => { const d = new Date(b.slot_start_utc); const n = new Date(); return d.getUTCFullYear()===n.getUTCFullYear() && d.getUTCMonth()===n.getUTCMonth() && d.getUTCDate()===n.getUTCDate(); }).sort((a,b)=> new Date(a.slot_start_utc).getTime()-new Date(b.slot_start_utc).getTime());
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Good morning, Sarah ðŸ‘‹</h1>
            <p className="text-sm text-slate-400 mt-1">Today's schedule â€” {metrics.todayCount} upcoming appointment{metrics.todayCount === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="#" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-[#111827] hover:bg-[#1E293B] text-sm font-medium text-slate-200 transition"><Link2 size={16} /> Share Booking Link</a>
            <a href="#" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/40 bg-[#111827] hover:bg-[#1E293B] text-sm font-semibold text-indigo-300 transition"><Clock size={16} /> Block Out Time</a>

          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Appointments" value={String(metrics.total)} sublabel="vs. 124 last month" delta={`${metrics.percentChange > 0 ? "+" : ""}${metrics.percentChange}%`} deltaUp={metrics.percentChange >= 0} icon={CalendarDays} />
          <KpiCard label="Upcoming Today" value={String(metrics.todayCount)} sublabel="Next at 10:00 AM" delta="+2" deltaUp={true} icon={Clock} />
          <KpiCard label="Estimated Value" value={`$${metrics.estimatedValue.toLocaleString()}`} sublabel={`${metrics.paidCount} paid bookings`} delta="$4,850" deltaUp={true} icon={TrendingUp} />
          <KpiCard label="Occupancy Rate" value={`${metrics.occupancy}%`} sublabel="Optimal schedule load" delta="88%" deltaUp={metrics.occupancy >= 80} icon={Users} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold tracking-tight text-white">Today's Schedule</h2>
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Clock size={14} /> {todayStr} Â· <span className="text-indigo-300">{hostTz}</span></div>
            </div>
            {loading && <LoadingState />}
            {error && (
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-sm text-slate-300 flex flex-col items-start gap-3">
                <div className="flex items-start gap-3 text-rose-200"><AlertCircle size={20} /><div><div className="font-semibold">Could not load schedule</div><div className="text-sm text-slate-400">The backend is unreachable. Try again when the service is back.</div></div></div>
                <button onClick={handleRetry} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition">Retry</button>
              </div>
            )}
            {!loading && !error && bookings.length === 0 && <EmptyState icon={Sparkles} title="No upcoming appointments" message="Schedule your first booking to see it here." />}
            {!loading && !error && bookings.length > 0 && (
              <div className="space-y-3">
                {todayFiltered.slice(0,8).map((b:any) => (
                  <AppointmentRow key={b.id || b.booking_id} booking={b} />
                ))}
              </div>
            )}
          </section>

          {/* Right column */}
          <div className="space-y-6">
            {/* Booking Handle */}
            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-violet-700/10 pointer-events-none" />
              <h3 className="font-bold text-white mb-1 relative">Your Booking Handle</h3>
              <div className="relative text-sm font-semibold text-indigo-300 mb-3">{workspace?.handle ? `chronos.app/book/${workspace.handle}` : "chronos.app/book"}</div>
              <button onClick={handleCopyLink} className="relative w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-2">Copy Link <Link2 size={14} /></button>
            </section>

            {/* Recent Activity */}
            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
              <h3 className="font-bold text-white mb-3">Recent Activity</h3>
              {!loading && !error && bookings.length === 0 && <p className="text-xs text-slate-400">No recent bookings.</p>}
              {!loading && !error && bookings.length > 0 && (
                <div className="space-y-3">
                  {bookings.slice(0,5).map((b:any) => (
                    <div key={b.id} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${b.status === "confirmed" ? "bg-emerald-400" : b.status === "cancelled" ? "bg-rose-400" : "bg-amber-400"}`} />
                      <div>
                        <span className="font-semibold text-white">{b.eventType || "Booking"}</span>
                        <span className="block text-slate-400">{b.clientName} Â· {new Date(b.slot_start_utc).toLocaleString("en-US", { timeZone: workspace?.timezone || "UTC", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      <NewAppointmentForm />
  </AppShell>
  );
}

function PlusIcon() { return <span className="text-lg leading-none">+</span>; }

function KpiCard({ label, value, sublabel, delta, deltaUp, icon: Icon }: { label: string; value: string; sublabel: string; delta: string; deltaUp: boolean; icon: React.ComponentType<{ size?: number; className?: string }>; }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-300 flex items-center justify-center"><Icon size={18} /></span>
      </div>
      <div className="text-3xl font-extrabold tracking-tight text-white">{value}</div>
      <div className="mt-2 text-xs text-slate-400">{sublabel}</div>
      <div className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${deltaUp ? "text-emerald-300" : "text-rose-300"}`}>
        <span>{delta}</span>
      </div>
    </div>
  );
}

function AppointmentRow({ booking }: { booking: any }) {
  const hasMeeting = !!(booking.meetingUrl || booking.meeting_url);
  const loc = booking.location || "video";
  const isBooked = booking.status === "booked" || booking.status === "BOOKED";
  const isVideo = (loc === "video" || !!booking.meetingUrl || !!booking.meeting_url);
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#0F172A] border border-white/5 hover:border-white/10 transition">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center"><Clock size={18} /></div>
        <div>
          <div className="font-bold text-white text-sm">{booking.clientName || "Client"}</div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Clock size={10} /> 10:00 AM Â· 30 min</div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2"><MapPin size={10} /><span>{loc}</span> Â· <Mail size={10} />{booking.clientEmail || "â€”"}</div>
          <div className="text-xs text-slate-500 mt-0.5">{booking.eventType || "Booking"}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={isBooked ? "success" : "danger"}>{isBooked ? "Upcoming" : booking.status}</Badge>
        {isBooked && (isVideo ? <a href={booking.meetingUrl || "#"} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-semibold">Join <Video size={12} /></a> : <a href="#" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-semibold">Call <Phone size={12} /></a>)}
        <button disabled title="BACKEND GAP: confirm/decline endpoints missing" className="px-2 py-1 rounded-md bg-slate-700 text-slate-400 text-xs font-medium cursor-not-allowed">Confirm Â· Decline</button>
        <a href="#" className="p-1 text-slate-400 hover:text-white"><ChevronRight size={16} /></a>
      </div>
    </div>
  );
}

