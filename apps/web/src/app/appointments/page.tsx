"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { Clock, AlertCircle, Sparkles, Search, X } from "lucide-react";

const STATUS_PILLS = ["All", "Confirmed", "Pending", "Cancelled", "Completed", "Rescheduled"];

export default function AppointmentsPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerItem, setDrawerItem] = React.useState<any>(null);

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter.toLowerCase());
      const res = await fetch(`/api/appointments?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Unable to load appointments");
      const data = await res.json();
      if (data.success === false) throw new Error(data.error || "Failed");
      setItems(Array.isArray(data.appointments) ? data.appointments : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load appointments");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const openDrawer = (item: any) => {
    setDrawerItem(item);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerItem(null);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleAction = async (action: string, item: any, extra?: any) => {
    try {
      const res = await fetch(`/api/appointments/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra, ifMatch: item.version }),
        credentials: "include",
      });
      const result = await res.json();
      if (res.ok && result.success !== false) {
        fetchAppointments();
        closeDrawer();
      } else {
        alert(result.error || "Action failed");
      }
    } catch (e: any) {
      alert(e?.message || "Action failed");
    }
  };

  const displayStatus = (s: string) => {
    if (s === "confirmed") return "Confirmed";
    if (s === "pending") return "Pending";
    if (s === "cancelled") return "Cancelled";
    if (s === "completed") return "Completed";
    if (s === "rescheduled") return "Rescheduled";
    return s || "Unknown";
  };

  const statusColor = (s: string) => {
    if (s === "confirmed") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (s === "pending") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (s === "cancelled") return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    if (s === "completed") return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    if (s === "rescheduled") return "bg-violet-500/20 text-violet-300 border-violet-500/30";
    return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-6">Appointments</h1>

        {/* Search + filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search appointments"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, email, or service..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="group" aria-label="Status filters">
            {STATUS_PILLS.map((p) => (
              <button
                key={p}
                aria-pressed={statusFilter === p}
                onClick={() => setStatusFilter(p)}
                className={`whitespace-nowrap px-3 py-2 rounded-full text-xs font-bold border transition ${statusFilter === p ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-800 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3">
            <AlertCircle size={20} />
            <div>
              <div className="font-semibold">Unable to load appointments</div>
              <div className="text-sm text-rose-300/80">{error}</div>
              <button onClick={fetchAppointments} className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">Retry</button>
            </div>
          </div>
        )}

        {/* Empty states */}
        {!loading && !error && items.length === 0 && (
          <EmptyState icon={Sparkles} title="No appointments found" message={search || statusFilter !== "All" ? "No appointments match your filters." : "No appointments returned by the backend."} />
        )}

        {/* Table */}
        {!loading && !error && items.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left" role="table" aria-label="Appointments">
              <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3">Client</th>
                  <th scope="col" className="px-5 py-3">Event Type</th>
                  <th scope="col" className="px-5 py-3">Date & Time</th>
                  <th scope="col" className="px-5 py-3">Location</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-300 flex items-center justify-center text-xs font-extrabold">
                          {item.clientName ? item.clientName.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "—"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{item.clientName || "Client"}</div>
                          <div className="text-xs text-slate-500">{item.clientEmail || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{item.eventTypeName || "Booking"}</td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                      <div className="font-medium">{item.date || "—"}</div>
                      <div className="text-xs text-slate-500">{item.time || "—"}</div>
                      <div className="text-xs text-slate-500">{item.duration ? item.duration + " min" : "—"}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{item.location || "Not specified"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${statusColor(item.status)}`} aria-label={`Status: ${displayStatus(item.status)}`}>
                        {displayStatus(item.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => openDrawer(item)} aria-label={`Manage appointment for ${item.clientName || "client"}`} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Manage drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Appointment details">
            <button onClick={closeDrawer} className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close drawer" />
            <aside className="relative w-full max-w-md h-full bg-white dark:bg-[#111827] shadow-2xl border-l border-slate-200 dark:border-slate-800 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-extrabold tracking-tight text-white">Manage Appointment</h2>
                <button onClick={closeDrawer} aria-label="Close drawer" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4 text-sm text-slate-800 dark:text-slate-200">
                <div><strong className="text-slate-500 dark:text-slate-400">Client:</strong> <div className="font-bold text-white">{drawerItem?.clientName || "—"}</div><div className="text-xs text-slate-400">{drawerItem?.clientEmail || "—"}</div></div>
                <div><strong className="text-slate-500 dark:text-slate-400">Event Type:</strong> <div className="font-medium">{drawerItem?.eventTypeName || "—"}</div></div>
                <div><strong className="text-slate-500 dark:text-slate-400">Date:</strong> <div>{drawerItem?.date || "—"}</div></div>
                <div><strong className="text-slate-500 dark:text-slate-400">Time:</strong> <div>{drawerItem?.time || "—"}</div></div>
                <div><strong className="text-slate-500 dark:text-slate-400">Duration:</strong> <div>{drawerItem?.duration ? drawerItem.duration + " min" : "—"}</div></div>
                <div><strong className="text-slate-500 dark:text-slate-400">Timezone:</strong> <div>{typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC"}</div></div>
                <div><strong className="text-slate-500 dark:text-slate-400">Location:</strong> <div>{drawerItem?.location || "Not specified"}</div></div>
                <div><strong className="text-slate-500 dark:text-slate-400">Notes:</strong> <div>{drawerItem?.notes || "—"}</div></div>
                <div><strong className="text-slate-500 dark:text-slate-400">Status:</strong> <div><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${statusColor(drawerItem?.status)}`}>{displayStatus(drawerItem?.status)}</span></div></div>

                <div className="pt-4 flex flex-wrap gap-2">
                  {drawerItem?.status === "confirmed" || drawerItem?.status === "booked" ? (
                    <>
                      <button onClick={() => handleAction("confirm", drawerItem)} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">Confirm</button>
                      <button onClick={() => handleAction("decline", drawerItem)} className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition">Decline</button>
                      <button onClick={() => handleAction("cancel", drawerItem)} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition">Cancel</button>
                      <button onClick={() => handleAction("reschedule", drawerItem, { newSlotId: "" })} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition">Reschedule</button>
                    </>
                  ) : drawerItem?.status === "pending" ? (
                    <>
                      <button onClick={() => handleAction("confirm", drawerItem)} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">Confirm</button>
                      <button onClick={() => handleAction("decline", drawerItem)} className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition">Decline</button>
                      <button onClick={() => handleAction("cancel", drawerItem)} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition">Cancel</button>
                    </>
                  ) : drawerItem?.status === "cancelled" || drawerItem?.status === "completed" ? (
                    <span className="text-xs text-slate-400">No actions available for this status.</span>
                  ) : (
                    <>
                      <button onClick={() => handleAction("confirm", drawerItem)} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">Confirm</button>
                      <button onClick={() => handleAction("decline", drawerItem)} className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition">Decline</button>
                      <button onClick={() => handleAction("cancel", drawerItem)} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition">Cancel</button>
                    </>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
