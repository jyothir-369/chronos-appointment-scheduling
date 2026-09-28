"use client";
import { useState, useCallback } from "react";
import { apiFetch } from "../lib/api";
import { resolveTimeZone, setCookieTz } from "../lib/timezone";
import { Clock } from "lucide-react";

export default function BookingForm({ slotId, providerId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }: { slotId?: string; providerId?: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "201" | "409" | "412" | "403" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const viewerTz = resolveTimeZone();

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("pending");
    setMsg("");
    try {
      const res = await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          slotId: slotId || "",
          providerId,
          clientTimezone: viewerTz,
          idempotencyKey: key,
        }),
        headers: { "Idempotency-Key": key, "Content-Type": "application/json" },
      });
      if (res.status === 201) {
        setStatus("201");
        setMsg("Booking confirmed — stored in UTC, formatted for your zone.");
      } else if (res.status === 409) {
        setStatus("409");
        setMsg("Slot conflict — this time was just booked. Please refresh availability and choose another slot.");
      } else if (res.status === 412) {
        setStatus("412");
        setMsg("Booking state changed. Refresh and try again.");
      } else if (res.status === 403) {
        setStatus("403");
        setMsg("Not authorized.");
      } else {
        setStatus("error");
        setMsg(`Server error: ${res.status}`);
      }
    } catch (err: any) {
      setStatus("error");
      setMsg("Network error — please retry with the same Idempotency-Key.");
    }
  }, [slotId, providerId, key, viewerTz]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Booking form">
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Clock size={14} /> Viewer timezone: <strong className="text-slate-900 dark:text-slate-100">{viewerTz}</strong>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <label htmlFor="client-tz" className="block font-medium text-slate-700 dark:text-slate-200">Timezone</label>
          <input id="client-tz" value={viewerTz} readOnly onChange={e => setCookieTz(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100" aria-label="Client timezone" />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={status === "pending"} className={`inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold shadow transition ${status === "pending" ? "bg-slate-300 text-slate-500" : "bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20"}`} aria-busy={status === "pending"}>Confirm booking</button>
        </div>
        {status === "pending" && <div role="status" aria-live="polite" className="text-sm text-brand-600 font-medium">Submitting (same Idempotency-Key preserved) …</div>}
        {msg && (
          <div role="alert" aria-live="assertive" className={`rounded-xl px-4 py-3 text-sm font-medium border ${status === "201" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300" : status === "409" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300" : status === "412" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300"}`}>
            {msg}
          </div>
        )}
      </div>
    </form>
  );
}
