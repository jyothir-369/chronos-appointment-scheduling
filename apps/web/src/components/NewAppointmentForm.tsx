import { useState, useEffect } from 'react';

function parseDDMMYYYY(str: string): Date | null {
  const m = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

export default function NewAppointmentForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateRaw, setDateRaw] = useState('');
  const [timeRaw, setTimeRaw] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    function onOpen() {
      setOpen(true); setError(''); setSuccess('');
      fetch('http://localhost:3001/providers/me', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then((p: any) => { if (p?.timezone) setTimezone(p.timezone); })
        .catch(() => {});
    }
    window.addEventListener('open-new-appointment', onOpen);
    return () => window.removeEventListener('open-new-appointment', onOpen);
  }, []);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name.trim() || !email.trim() || !dateRaw || !timeRaw) { setError('All fields are required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email'); return; }
    const d = parseDDMMYYYY(dateRaw);
    if (!d) { setError('Date must be DD-MM-YYYY (e.g. 07-10-2026)'); return; }
    if (!/^\d{2}:\d{2}$/.test(timeRaw)) { setError('Time must be HH:MM'); return; }

    // Resolve slot from real endpoint (existing /slots)
    setSubmitting(true);
    try {
      const slotRes = await fetch('http://localhost:3001/slots', { credentials: 'include' });
      const slots = slotRes.ok ? await slotRes.json() : [];
      const targetSlot = Array.isArray(slots) ? slots.find((s: any) => {
        const sStart = s.slot_start_utc || s.slotStartUtc;
        const sStatus = s.status || s.slot_status;
        if (!sStart || sStatus !== 'open') return false;
        const dSlot = new Date(sStart + (sStart.endsWith('Z') ? '' : 'Z'));
        const dReq = new Date(Date.UTC(d!.getUTCFullYear(), d!.getUTCMonth(), d!.getUTCDate(),
          parseInt(timeRaw.split(':')[0]||'0',10), parseInt(timeRaw.split(':')[1]||'0',10)));
        // Compare in selected timezone using Intl.DateTimeFormat for year/month/day/hour/minute
        const fmt = (date: Date) => ({
          y: new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric' }).format(date),
          m: new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'numeric' }).format(date),
          d: new Intl.DateTimeFormat('en-US', { timeZone: timezone, day: 'numeric' }).format(date),
          h: new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(date),
          min: new Intl.DateTimeFormat('en-US', { timeZone: timezone, minute: 'numeric' }).format(date),
        });
        const sF = fmt(dSlot); const rF = fmt(dReq);
        return sF.y === rF.y && sF.m === rF.m && sF.d === rF.d && sF.h === rF.h && sF.min === rF.min;
      }) : null;
      if (!targetSlot) { setError('No available slot found for that date/time. Try a different time or check provider availability.'); setSubmitting(false); return; }

      const res = await fetch('http://localhost:3001/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slot_id: targetSlot.id || targetSlot.slot_id,
          email: email,
          client_name: name,
          client_timezone: timezone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.bookingId) {
        setSuccess('Appointment scheduled');
        setName(''); setEmail(''); setDateRaw(''); setTimeRaw('');
        window.dispatchEvent(new CustomEvent('refresh-dashboard'));
        setTimeout(() => { setOpen(false); }, 800);
      } else if (res.status === 409) {
        setError(data.error === 'slot_unavailable' ? 'This time is already booked or unavailable.' : (data.error || 'Scheduling conflict'));
      } else if (res.status === 401) {
        setError('Authentication required');
      } else {
        setError(data.error || 'Failed to schedule');
      }
    } catch (e: any) { setError('Network error'); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()} className="bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 relative text-white">
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-white text-xl leading-none">×</button>
        <h2 className="text-xl font-bold mb-5">Create New Appointment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-400 mb-1">Client Name</label>
            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-sm focus:outline-none focus:border-indigo-500" placeholder="Vijay" />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1">Client Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-sm focus:outline-none focus:border-indigo-500" placeholder="tv8591094@gmail.com" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="date" className="block text-xs font-semibold text-slate-400 mb-1">Date (DD-MM-YYYY)</label>
              <input id="date" type="text" value={dateRaw} onChange={e => setDateRaw(e.target.value)} placeholder="07-10-2026" className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex-1">
              <label htmlFor="time" className="block text-xs font-semibold text-slate-400 mb-1">Time (HH:MM)</label>
              <input id="time" type="text" value={timeRaw} onChange={e => setTimeRaw(e.target.value)} placeholder="11:00" className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label htmlFor="tz" className="block text-xs font-semibold text-slate-400 mb-1">Timezone</label>
            <select id="tz" value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-sm focus:outline-none focus:border-indigo-500 text-white">
              <option value="UTC">UTC</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
            </select>
          </div>
          {error && <div className="text-xs text-rose-300">{error}</div>}
          {success && <div className="text-xs text-emerald-300">{success}</div>}
          <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 transition">{submitting ? 'Scheduling...' : 'Schedule Appointment'}</button>
        </form>
      </div>
    </div>
  );
}
