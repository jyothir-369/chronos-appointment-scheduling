"use client";
import { useState, useCallback } from "react";
import { apiFetch } from "../lib/api";

export default function BookingForm({ slotId, providerId = "seeded-provider-001" }: { slotId?: string; providerId?: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "201" | "409" | "412" | "403" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [key, setKey] = useState(() => `idemp-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("pending");
    setMsg("");
    try {
      const res = await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          slotId: slotId || "",
          clientId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21",
          clientTimezone: "UTC",
          idempotencyKey: key,
        }),
        headers: { "Idempotency-Key": key },
      });
      if (res.status === 201) {
        setStatus("201");
        setMsg("Booking confirmed.");
      } else if (res.status === 409) {
        setStatus("409");
        setMsg("That time slot is no longer available. Please choose another slot.");
      } else if (res.status === 412) {
        setStatus("412");
        setMsg("The booking information has changed. Please refresh the availability and try again.");
      } else if (res.status === 403) {
        setStatus("403");
        setMsg("You are not authorized to perform this action.");
      } else {
        const body = await res.json().catch(() => ({}));
        setStatus("error");
        setMsg(body.error || `Error ${res.status}`);
      }
    } catch (err: any) {
      setStatus("error");
      setMsg("Network error. Please try again.");
    }
  }, [slotId, key]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Booking form">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Book appointment</h3>
          <span className="text-xs font-medium text-slate-400">Slot: {slotId || "none selected"}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <label htmlFor="client-tz" className="block font-medium text-slate-700">Timezone</label>
          <input id="client-tz" defaultValue="UTC" readOnly className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm" aria-label="Client timezone" />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={status === "pending"} className={`inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-bold shadow ${status === "pending" ? "bg-slate-300 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-700"}`} aria-busy={status === "pending"}>Confirm booking</button>
          <button type="button" onClick={() => { setStatus("idle"); setMsg(""); }} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">Reset</button>
        </div>
        {status === "pending" && <div role="status" aria-live="polite" className="text-sm text-blue-700 font-medium">Submitting…</div>}
        {msg && (
          <div role="alert" aria-live="assertive" className={`rounded-lg px-4 py-3 text-sm font-medium ${status === "201" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : status === "409" ? "bg-amber-50 text-amber-700 border border-amber-200" : status === "412" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg}
          </div>
        )}
      </div>
    </form>
  );
}
