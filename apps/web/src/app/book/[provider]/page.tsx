import AppShell from '../../../components/AppShell';

export default function BookPage() {
  return (
    <AppShell title="Schedule an appointment">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white tracking-tight">Schedule an appointment</h1>
          <p className="text-[#94A3B8] mt-1 text-sm">Choose a time that works for you. Appointment times are shown in your selected timezone.</p>
        </header>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94A3B8]">Available appointments</h2>
              <div className="flex gap-1.5">
                <button className="w-7 h-7 rounded-full bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center text-xs hover:bg-[#6366F1]/25">‹</button>
                <button className="w-7 h-7 rounded-full bg-[#6366F1]/15 text-[#818CF8] flex items-center justify-center text-xs hover:bg-[#6366F1]/25">›</button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM'].map((t) => (
                <button key={t} className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[#111827] hover:border-[#6366F1]/40 hover:bg-[#6366F1]/10 p-3 text-center transition group">
                  <div className="text-sm font-semibold text-white group-hover:text-[#818CF8]">{t}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">30 min</div>
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs text-[#64748B]">Asia/Calcutta</div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-5 shadow-xl shadow-black/20">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Your timezone</div>
              <div className="text-xl font-bold text-white">Asia/Calcutta</div>
              <div className="text-sm text-[#94A3B8] mt-1">Detected automatically</div>
              <button className="mt-3 w-full rounded-lg border border-[rgba(148,163,184,0.12)] bg-[#111827] text-sm text-[#F8FAFC] py-2 hover:bg-[#1E293B] transition">Change timezone</button>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
