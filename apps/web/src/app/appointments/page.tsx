"use client";
// DATA SOURCE: real API; BACKEND GAP: /bookings endpoint returns 500 (DB auth 28P01) — displayed honestly
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { EmptyState, LoadingState } from "../components/States";
import { apiFetch } from "../../lib/api";
import { Clock, AlertCircle, Sparkles } from "lucide-react";

export default function AppointmentsPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setLoading(true); setError("");
    apiFetch("/bookings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Fetch failed: " + r.status))))
      .then((data: any) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Appointments</h1>
        <div className="text-xs text-amber-300 font-medium mb-4">BACKEND GAP: /bookings returns 500 (DB auth); Confirm/Decline endpoints missing. Evidence: docs/api-samples/real/bookings.json</div>
        {loading && <LoadingState />}
        {error && (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/40 p-6 text-rose-200 flex items-start gap-3"><AlertCircle size={20} />{error}</div>
        )}
        {!loading && !error && items.length === 0 && <EmptyState icon={Sparkles} title="No appointments" message="No bookings returned by the backend." />}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-3">
            {items.slice(0,8).map((b: any) => (
              <div key={b.id || b.booking_id} className="flex items-center justify-between p-4 rounded-xl bg-[#0F172A] border border-white/5">
                <div>
                  <div className="font-bold text-white text-sm">{b.clientName || "Client"}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} />{new Date(b.slot_start_utc).toLocaleString("en-US")}</div>
                  <div className="text-xs text-slate-500">{b.eventType || "Booking"}</div>
                </div>
                <Badge variant={b.status === "BOOKED" || b.status === "booked" ? "success" : b.status === "COMPLETED" ? "success" : "danger"}>{b.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
