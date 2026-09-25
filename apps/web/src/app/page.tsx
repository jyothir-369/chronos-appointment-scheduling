import { apiFetch } from "../lib/api";
import { cookies } from "next/headers";
import TimeDisplay from "../components/TimeDisplay";

export default async function HomePage() {
  const cookieStore = await cookies();
  const tzCookie = cookieStore.get("tz")?.value;
  const tzQuery = typeof window === "undefined" ? undefined : undefined; // server only
  let tz = tzCookie || "UTC";
  try {
    const validated = Intl.DateTimeFormat().resolvedOptions().timeZone || tz;
    if (validated && validated !== "UTC" && validated.length > 2) tz = validated;
  } catch {}

  let slots: any[] = [];
  let error = "";
  try {
    const res = await apiFetch("/providers/seeded-provider-001/availability");
    if (res.ok) slots = await res.json();
    else error = "Could not load availability";
  } catch (e: any) {
    error = "Could not reach backend";
  }

  return (
    <div className="space-y-10">
      <section aria-label="Hero" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="none"><path d="M0 200 Q200 50 400 200 T800 200 L800 400 L0 400 Z" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#818cf8"/></linearGradient></defs></svg>
        </div>
        <div className="relative px-6 sm:px-10 py-14 sm:py-20 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">Timezone-safe scheduling</h1>
          <p className="mt-6 text-lg sm:text-xl text-blue-100/90 max-w-2xl">Book appointments with explicit timezone awareness. No silent local-time assumptions. See exactly when your slot is in your zone.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/book" className="inline-flex items-center px-6 py-3 rounded-xl bg-white text-blue-900 font-bold shadow-lg hover:bg-blue-50 transition">Book appointment</a>
            <a href="/bookings" className="inline-flex items-center px-6 py-3 rounded-xl bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/20 transition">My bookings</a>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-blue-200/80 bg-white/10 rounded-lg px-3 py-1.5 border border-white/10" aria-label="Detected timezone">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>Zone: <strong className="text-white">{tz}</strong> {tz === "UTC" && "(fallback — set via cookie or ?tz=)"}</span>
          </div>
        </div>
      </section>

      <section aria-label="Availability" className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight">Available slots</h2>
          <p className="text-slate-500">Real data from the backend at <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">localhost:3003</code>.</p>
          {error ? <div className="mt-4 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3" role="alert">{error}</div> : null}
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            {slots.map((s: any) => (
              <article key={String(s.slot_start_utc)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">Provider: Dr. Chronos Test Provider</h3>
                    <p className="text-sm text-slate-500">{s.display_tz || "UTC"}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.status === "open" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`} aria-label={`Status ${s.status}`}>{s.status}</span>
                </div>
                <div className="mt-3 text-sm text-slate-700">
                  <TimeDisplay iso={s.slot_start_utc} tz={s.display_tz || "UTC"} /> —{" "}
                  <TimeDisplay iso={s.slot_end_utc} tz={s.display_tz || "UTC"} />
                </div>
                <a href={`/book?slot=${encodeURIComponent(s.slot_start_utc)}`} className="mt-4 inline-block rounded-lg bg-blue-600 text-white text-sm font-semibold px-4 py-2 hover:bg-blue-700 transition">Select slot</a>
              </article>
            ))}
            {slots.length === 0 && !error && <div className="col-span-full rounded-2xl bg-slate-100 text-slate-500 px-6 py-10 text-center">No open slots returned by the API.</div>}
          </div>
        </div>
        <aside aria-label="Timezone info" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-lg">Your timezone</h3>
          <p className="text-sm text-slate-500 mt-1">Appointment times are displayed in your selected zone, not the browser's default.</p>
          <div className="mt-4 rounded-xl bg-slate-900 text-white p-4 text-sm font-mono leading-relaxed" aria-label="Timezone details">
            <div>Detected: <strong>{tz}</strong></div>
            <div className="text-slate-400">Cookie: {tzCookie ? "set" : "not set"}</div>
            <div className="text-slate-400">Fallback: UTC</div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Use <code>?tz=America/New_York</code> to override. Change via cookie or query.</p>
        </aside>
      </section>
    </div>
  );
}
