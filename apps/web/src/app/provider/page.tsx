export default async function ProviderDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Provider Dashboard</h1>
        <p className="text-slate-500">Weekly rules, timezone, and upcoming bookings. Backend dependency: provider endpoints.</p>
      </div>

      <section aria-label="Provider info" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm grid sm:grid-cols-3 gap-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Provider</h3>
          <p className="font-bold text-lg">Demo Provider</p>
          <p className="text-sm text-slate-500">seeded-provider-001</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Timezone</h3>
          <p className="font-bold text-lg">America/New_York</p>
          <p className="text-sm text-slate-500">No DST adjustments shown here.</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Cancellation window</h3>
          <p className="font-bold text-lg">24 hours</p>
          <p className="text-sm text-slate-500">Before slot start.</p>
        </div>
      </section>

      <section aria-label="Weekly availability" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-lg mb-4">Weekly availability</h2>
        <div className="grid gap-3">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
            <div key={day} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="font-semibold text-sm w-28">{day}</span>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" aria-label={`Enable ${day}`} />
                Enabled
              </label>
              <span className="text-sm text-slate-600">09:00 — 17:00</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Upcoming bookings" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-lg">Upcoming bookings</h2>
        <p className="text-sm text-slate-500">No endpoint integrated yet.</p>
      </section>
    </div>
  );
}
