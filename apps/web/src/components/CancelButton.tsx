"use client";
import { useState } from "react";
import { apiFetch } from "../lib/api";

export default function CancelButton({ bookingId, version }: { bookingId: string; version: number }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleCancel = async () => {
    setStatus("pending");
    setMsg("");
    try {
      const res = await apiFetch(`/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: {
          "If-Match": String(version),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (res.ok || res.status === 204) {
        setStatus("ok");
        setMsg("Appointment cancelled.");
      } else if (res.status === 409) {
        setStatus("error");
        setMsg("Conflict: current state prevents cancellation.");
      } else if (res.status === 412) {
        setStatus("error");
        setMsg("Resource version changed. Please refresh.");
      } else if (res.status === 403) {
        setStatus("error");
        setMsg("Not authorized to cancel.");
      } else {
        setStatus("error");
        setMsg(`Error ${res.status}`);
      }
    } catch (e: any) {
      setStatus("error");
      setMsg("Network error.");
    }
    setOpen(false);
  };

  return (
    <div>
      {!open && (
        <button onClick={() => setOpen(true)} className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-1.5 text-sm font-semibold hover:bg-red-100 transition" aria-label="Open cancellation confirmation">Cancel appointment</button>
      )}
      {open && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm" role="dialog" aria-modal="true" aria-label="Cancel confirmation">
          <p className="text-sm font-semibold text-red-800">Cancel appointment?</p>
          <p className="text-xs text-red-600 mt-1">This cannot be undone. Please confirm.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setOpen(false)} className="rounded-lg bg-white text-slate-700 border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">Keep appointment</button>
            <button onClick={handleCancel} disabled={status === "pending"} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm font-bold hover:bg-red-700">Cancel appointment</button>
          </div>
          {status === "pending" && <p className="text-xs text-red-600 mt-2">Sending request…</p>}
          {msg && <p className="text-xs mt-2" role="status" aria-live="polite">{msg}</p>}
        </div>
      )}
    </div>
  );
}
