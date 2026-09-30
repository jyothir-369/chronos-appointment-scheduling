import AppShell from '../../../components/AppShell';
export default function BookPage() {
  return (
    <AppShell title="Schedule an appointment">
      <div className="max-w-5xl mx-auto space-y-6">
        <header><h1 className="text-2xl font-bold text-white tracking-tight">Schedule an appointment</h1></header>
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-6 shadow-xl shadow-black/20">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94A3B8] mb-4">Available appointments</h2>
            <p className="text-sm text-[#94A3B8]">Loading available slots from API...</p>
          </div>
          <aside className="space-y-6">
            <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-5 shadow-xl shadow-black/20">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Your timezone</div>
              <div className="text-xl font-bold text-white">UTC (auto-detected)</div>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
