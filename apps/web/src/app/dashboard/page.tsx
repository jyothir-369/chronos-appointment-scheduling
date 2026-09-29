import AppShell from '../../components/AppShell';

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Overview of your scheduling workspace.</p>
        </div>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {label: 'Today\'s Appointments', value: '— (placeholder)' },
            { label: 'Upcoming', value: '12' },
            { label: 'Clients', value: '28' },
            { label: 'Event Types', value: '3' },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-5 shadow-xl shadow-black/20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{k.label}</div>
              <div className="text-3xl font-bold text-white mt-2">{k.value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748B] mb-4">Dashboard metrics — placeholder (no backend endpoint currently exposed)</h2>
          <div className="divide-y divide-[rgba(148,163,184,0.12)]">
            {[
              { time: '10:30 AM', name: 'Strategy Consultation', date: 'Sep 30', tz: 'Asia/Calcutta', status: 'Confirmed' },
              { time: '02:00 PM', name: 'Design Review', date: 'Oct 1', tz: 'Asia/Calcutta', status: 'Pending' },
            ].map((b) => (
              <div key={b.name} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-white font-medium">{b.name}</div>
                  <div className="text-xs text-[#94A3B8]">{b.date} • {b.tz}</div>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#94A3B8]">
                  <span>{b.time}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${b.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
