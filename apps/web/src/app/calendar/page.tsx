"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { apiFetch } from "../../lib/api";
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock,
  List, LayoutGrid, Sparkles, AlertCircle, Filter
} from "lucide-react";

export default function CalendarPage() {
  const [view, setView] = React.useState<"month" | "week" | "day" | "agenda">("month");
  const [monthStart, setMonthStart] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [eventTypes, setEventTypes] = React.useState<any[]>([]);
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [filter, setFilter] = React.useState<string>("");

  // Load event types for filters
  React.useEffect(() => {
    apiFetch("/event-types", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setEventTypes(Array.isArray(data) ? data : []))
      .catch(() => setEventTypes([]));
  }, []);

  // Load bookings for calendar
  React.useEffect(() => {
    setLoading(true);
    apiFetch("/bookings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const goToday = () => {
    const t = new Date();
    setMonthStart(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(t);
  };

  const goPrev = () => {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    setMonthStart(d);
    setSelectedDate(d);
  };

  const goNext = () => {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    setMonthStart(d);
    setSelectedDate(d);
  };

  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay();

  const formatMonth = (d: Date) => d.toLocaleString("en-US", { month: "long", year: "numeric" });
  const formatShort = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric" });

  const visibleBookings = bookings.filter((b) => {
    if (filter) {
      const et = (b.eventType || b.event_type || "").toLowerCase();
      if (!et.includes(filter.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Calendar</h1>
            <p className="text-sm text-slate-400">{formatMonth(monthStart)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} aria-label="Previous" className="p-2 rounded-xl border border-white/10 bg-[#111827] hover:bg-[#1E293B] text-slate-200"><ChevronLeft size={18} /></button>
            <button onClick={goToday} className="px-3 py-2 rounded-xl border border-white/10 bg-[#111827] hover:bg-[#1E293B] text-sm font-medium text-slate-200">Today</button>
            <button onClick={goNext} aria-label="Next" className="p-2 rounded-xl border border-white/10 bg-[#111827] hover:bg-[#1E293B] text-slate-200"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(["month", "week", "day", "agenda"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${view === v ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#111827] border-white/10 text-slate-300 hover:text-white"}`}>{v}</button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Filter size={14} /> Filter by type:</div>
          <button onClick={() => setFilter("")} className={`px-2 py-0.5 rounded-md text-xs border transition ${filter === "" ? "bg-indigo-600 text-white border-indigo-500" : "bg-[#111827] text-slate-300 border-white/10"}`}>All</button>
          {eventTypes.map((et: any) => (
            <button key={et.id || et.name} onClick={() => setFilter(et.name || "")} className={`px-2 py-0.5 rounded-md text-xs border transition ${filter === (et.name || "") ? "bg-indigo-600 text-white border-indigo-500" : "bg-[#111827] text-slate-300 border-white/10"}`}>{et.name || "Unknown"}</button>
          ))}
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Mini calendar */}
          <aside className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-xl shadow-black/20 h-fit">
            <h3 className="font-bold text-white mb-3">Select date</h3>
            <div className="text-xs text-slate-400 mb-3">{formatMonth(selectedDate)}</div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-1">
              {["S","M","T","W","T","F","S"].map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <span key={"e" + i} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
                const isSel = d.getTime() === selectedDate.getTime();
                return (
                  <button key={i} onClick={() => setSelectedDate(d)} className={`text-xs rounded-lg py-1 transition ${isSel ? "bg-indigo-600 text-white font-bold" : "text-slate-300 hover:bg-white/5"}`}>{i + 1}</button>
                );
              })}
            </div>
          </aside>

          {/* Main calendar area */}
          <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20 min-h-[520px]">
            {loading && <LoadingState />}
            {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20} />{error}</div>}

            {!loading && !error && view === "month" && (
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2 text-xs font-bold text-slate-400 mb-2">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <span key={d}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={"e" + i} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const current = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
                    const dayBookings = visibleBookings.filter((b: any) => {
                      const start = new Date(b.slot_start_utc || b.slotStartUtc || "");
                      return start.getUTCDate() === current.getUTCDate() && start.getUTCMonth() === current.getUTCMonth();
                    });
                    return (
                      <button key={day} onClick={() => setSelectedDate(current)} className={`text-left rounded-xl border p-2 min-h-[108px] transition ${current.getTime() === selectedDate.getTime() ? "border-indigo-500 bg-indigo-500/10" : "border-white/5 bg-[#0F172A] hover:border-white/10"}`}>
                        <div className={`text-xs font-bold mb-1 ${current.getTime() === selectedDate.getTime() ? "text-indigo-300" : "text-slate-300"}`}>{day}</div>
                        <div className="space-y-1">
                          {dayBookings.slice(0, 3).map((b: any) => (
                            <div key={b.id || b.booking_id} className="text-[10px] rounded-md bg-indigo-600/20 text-indigo-200 px-1.5 py-0.5 truncate">{b.eventType || b.event_type || "Booking"}</div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && !error && view === "week" && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(selectedDate); d.setDate(d.getDate() + i - 3);
                  const dayBs = visibleBookings.filter((b: any) => new Date(b.slot_start_utc || b.slotStartUtc || "").getUTCDate() === d.getUTCDate());
                  return (
                    <div key={i} className="min-w-[140px] rounded-xl border border-white/5 bg-[#0F172A] p-3">
                      <div className="text-xs font-bold text-white mb-2">{formatShort(d)}</div>
                      {dayBs.map((b: any) => <div key={b.id || b.booking_id} className="text-[10px] bg-indigo-600/20 text-indigo-200 rounded px-2 py-1 mb-1 truncate">{b.eventType || b.event_type || "Booking"}</div>)}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && view === "day" && (
              <div className="space-y-3">
                <h3 className="font-bold text-white">{formatShort(selectedDate)}</h3>
                {visibleBookings.filter((b: any) => new Date(b.slot_start_utc || b.slotStartUtc || "").toISOString().slice(0, 10) === selectedDate.toISOString().slice(0, 10)).map((b: any) => (
                  <div key={b.id || b.booking_id} className="flex items-center gap-3 rounded-xl bg-[#0F172A] border border-white/5 p-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-300 flex items-center justify-center"><CalendarDays size={14} /></div>
                    <div>
                      <div className="text-sm font-bold text-white">Booking #{String(b.id || b.booking_id).slice(0, 8)}</div>
                      <div className="text-xs text-slate-400">{new Date(b.slot_start_utc || b.slotStartUtc || "").toLocaleString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                ))}
                {visibleBookings.filter((b: any) => new Date(b.slot_start_utc || b.slotStartUtc || "").toISOString().slice(0, 10) === selectedDate.toISOString().slice(0, 10)).length === 0 && <EmptyState icon={Sparkles} title="No bookings" message="Select a different day or add a new appointment." />}
              </div>
            )}

            {!loading && !error && view === "agenda" && (
              <div className="space-y-2">
                {visibleBookings.map((b: any) => (
                  <div key={b.id || b.booking_id} className="flex items-start gap-3 rounded-xl bg-[#0F172A] border border-white/5 p-3">
                    <div className="text-xs text-slate-400 w-28 shrink-0">{new Date(b.slot_start_utc || b.slotStartUtc || "").toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="text-sm font-bold text-white">Booking #{String(b.id || b.booking_id).slice(0, 8)} — {b.eventType || b.event_type || "—"}</div>
                  </div>
                ))}
                {visibleBookings.length === 0 && <EmptyState icon={Sparkles} title="No bookings" message="No appointments match the current filter." />}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
