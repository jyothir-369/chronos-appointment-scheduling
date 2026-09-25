import { apiFetch } from "../../lib/api";
import TimeDisplay from "../../components/TimeDisplay";
import CancelButton from "../../components/CancelButton";

export default async function MyBookingsPage() {
  let bookings: any[] = [];
  let error = "";
  try {
    const res = await apiFetch("/bookings" + (process.env.NEXT_PUBLIC_API_URL ? "" : "")); // best-effort; backend may not expose GET /bookings fully
    if (res.ok) bookings = await res.json();
  } catch {
    error = "We couldn't load your bookings.";
  }

  // If backend has no GET endpoint, show a real-state page with instructions
  const hasReal = bookings.length > 0 || error === "";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My bookings</h1>
        <p className="text-slate-500">Upcoming, past, and cancelled appointments - shown with timezone.</p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3" role="alert">{error}</div>
      ) : null}

      {bookings.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm" aria-label="Empty bookings">
          <h2 className="text-xl font-bold">You don't have any upcoming appointments.</h2>
          <p className="text-slate-500 mt-2">Book your first appointment to see it here.</p>
          <a href="/book" className="inline-block mt-4 rounded-xl bg-blue-600 text-white font-bold px-6 py-3 hover:bg-blue-700">Book appointment</a>
        </div>
      )}

      <section aria-label="Bookings list" className="grid gap-4">
        {bookings.map((b: any) => (
          <article key={b.id || b.booking_id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">Booking <span className="font-mono text-slate-400">{b.id?.slice(0, 8) || "-"}</span></h3>
                <p className="text-sm text-slate-500">Status: <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${b.status === "booked" ? "bg-amber-50 text-amber-600" : b.status === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"}`}>{b.status}</span></p>
              </div>
              <div>
                {b.status === "booked" && <CancelButton bookingId={b.id || b.booking_id} version={b.version || 1} />}
              </div>
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <div><TimeDisplay iso={b.slot_start_utc || b.start_utc} tz={b.client_timezone || b.display_tz || "UTC"} /></div>
              <div>Provider: <strong>{b.provider_name || "Demo Provider"}</strong> · Zone: <strong>{b.display_tz || "UTC"}</strong></div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
