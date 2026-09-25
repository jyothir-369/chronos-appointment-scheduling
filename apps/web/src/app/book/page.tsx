import { apiFetch } from "../../lib/api";
import TimeDisplay from "../../components/TimeDisplay";
import BookingForm from "../../components/BookingForm";

export default async function BookPage() {
  let slots: any[] = [];
  try {
    const res = await apiFetch("/providers/seeded-provider-001/availability");
    if (res.ok) slots = await res.json();
  } catch {}

  const firstSlot = slots[0] || null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Book an appointment</h1>
        <p className="mt-2 text-slate-500">Select from available slots. All times shown in the provider's zone.</p>
      </div>
      <section aria-label="Available slots" className="grid gap-4">
        {firstSlot ? (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Selected slot">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Selected slot</h2>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600">Open</span>
            </div>
            <p className="text-sm text-slate-600 mt-1">Provider: <strong>Demo Provider</strong> · Zone: <strong>America/New_York</strong></p>
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-800 space-y-1">
              <div><strong>Start:</strong> <TimeDisplay iso={firstSlot.slot_start_utc} tz={firstSlot.display_tz || "UTC"} /></div>
              <div><strong>End:</strong> <TimeDisplay iso={firstSlot.slot_end_utc} tz={firstSlot.display_tz || "UTC"} /></div>
            </div>
          </article>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-500">No open slots available.</div>
        )}
      </section>
      <BookingForm slotId={firstSlot ? firstSlot.slot_start_utc : undefined} />
    </div>
  );
}
