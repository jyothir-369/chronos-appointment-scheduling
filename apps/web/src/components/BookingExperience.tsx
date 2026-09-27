"use client";
import { useState, useCallback, Suspense } from "react";
import { apiFetch } from "../lib/api";
import { getSession } from "../lib/auth";
import { mapApiError } from "../lib/error-map";

function SlotGroup({ label, slots }: { label: string; slots: any[] }) {
  if (!slots.length) return null;
  return (
    <div className="mb-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <button
            key={s.slot_id}
            onClick={() => (window as any).onSlotSelect?.(s)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-blue-600 hover:text-blue-700 transition hover:scale-[1.03] active:scale-[0.98]"
            aria-label={`Book ${s.slot_start_utc}`}
          >
            {new Date(s.slot_start_utc).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: s.display_tz || "UTC" })}
            <span className="text-xs text-slate-400 ml-1">{s.display_tz || "UTC"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SkeletonSlotList() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading slots">
      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="h-10 w-24 bg-slate-200 rounded-lg animate-pulse" />)}
      </div>
    </div>
  );
}

export default function BookingExperience({ providerId = "seeded-provider-001" }: { providerId?: string }) {
  const session = getSession();
  const clientId = session?.userId || "";
  const [status, setStatus] = useState<"idle" | "loading" | "reserved" | "conflict" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [tz, setTz] = useState("UTC");
  const [key] = useState(() => crypto.randomUUID());
  const [reserving, setReserving] = useState(false);

  // Load real open slots from backend
  const loadSlots = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiFetch(`/providers/${providerId}/availability`);
      if (!res.ok) throw new Error("Failed to load slots");
      const data = await res.json();
      setSlots(data || []);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMsg(mapApiError(500));
    }
  }, [providerId]);

  // Group real slots by time of day
  const morning = slots.filter((s: any) => {
    const h = new Date(s.slot_start_utc).getUTCHours();
    return h < 12;
  });
  const afternoon = slots.filter((s: any) => {
    const h = new Date(s.slot_start_utc).getUTCHours();
    return h >= 12 && h < 17;
  });
  const evening = slots.filter((s: any) => {
    const h = new Date(s.slot_start_utc).getUTCHours();
    return h >= 17;
  });

  const handleBook = useCallback(async () => {
    if (!selectedSlot || reserving) return;
    setReserving(true);
    setStatus("loading");
    setMsg("");
    try {
      const res = await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          slotId: selectedSlot.slot_id,
          clientId,
          clientTimezone: tz,
          idempotencyKey: key,
        }),
        headers: { "Idempotency-Key": key },
      });
      if (res.status === 201) {
        setStatus("reserved");
        setMsg("Booking confirmed — check your email for details.");
        loadSlots(); // refresh open slots
      } else {
        const body = await res.json().catch(() => ({}));
        setStatus("conflict");
        setMsg(mapApiError(res.status, body.error));
        loadSlots(); // refresh on conflict so user can pick another
      }
    } catch {
      setStatus("error");
      setMsg("Network error — please try again.");
    } finally {
      setReserving(false);
    }
  }, [selectedSlot, reserving, clientId, tz, key, loadSlots]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-md p-6 space-y-6" aria-label="Booking scheduler">
      {/* Two-pane header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-slate-900">Book appointment</h2>
        <div className="flex gap-2 text-sm">
          <span className="font-numerals text-slate-500">{tz}</span>
          <button onClick={() => setTz(tz === "UTC" ? "America/New_York" : "UTC")} className="text-blue-600 hover:underline" aria-label="Change timezone">change</button>
        </div>
      </div>

      {/* Real available slots — group by morning/afternoon/evening */}
      <Suspense fallback={<SkeletonSlotList />}>
        <div>
          <button onClick={loadSlots} disabled={status === "loading"} className="mb-3 text-xs font-medium text-blue-600 hover:text-blue-700">Refresh availability</button>
          {status === "loading" && <SkeletonSlotList />}
          {status === "idle" && (
            <>
              <SlotGroup label="Morning" slots={morning} />
              <SlotGroup label="Afternoon" slots={afternoon} />
              <SlotGroup label="Evening" slots={evening} />
              {slots.length === 0 && <p className="text-sm text-slate-500">No open slots at this time.</p>}
            </>
          )}
        </div>
      </Suspense>

      {/* Honest reserving / loading state */}
      {reserving && (
        <div role="status" aria-live="polite" className="text-sm font-medium text-blue-700">Reserving your slot…</div>
      )}

      {/* Confirm with selected slot */}
      {selectedSlot && !reserving && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3" role="region" aria-label="Selected slot">
          <p className="font-medium text-slate-800">
            {new Date(selectedSlot.slot_start_utc).toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: selectedSlot.display_tz || "UTC" })}
            <span className="font-numerals text-xs text-slate-500 ml-2">({selectedSlot.display_tz || "UTC"})</span>
          </p>
          <button onClick={handleBook} disabled={reserving} className="inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50">Confirm booking</button>
        </div>
      )}

      {/* Confirmation / conflict / error messages with focus management via aria-live */}
      {msg && (
        <div role={status === "error" ? "alert" : "status"} aria-live={status === "conflict" ? "assertive" : "polite"} className={`rounded-lg px-4 py-3 text-sm font-medium border ${status === "reserved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "conflict" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg}
          {status === "reserved" && (
            <div className="mt-2 text-xs text-slate-500">Free cancellation until 24 hours before slot start.</div>
          )}
        </div>
      )}
    </div>
  );
}
