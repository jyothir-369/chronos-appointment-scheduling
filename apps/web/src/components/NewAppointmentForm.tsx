import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
export default function NewAppointmentForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [providerId, setProviderId] = useState("");
  const [grouped, setGrouped] = useState<Record<string,any[]>>({});
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  useEffect(() => {
    function onOpen() {
      setOpen(true); setError(""); setSuccess(""); setSelectedSlotId(""); setLoading(true);
      fetch("http://localhost:3001/providers/me", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then((p:any) => {
          if (p?.id) setProviderId(p.id);
          if (p?.timezone) setTimezone(p.timezone);
          const tz = p?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          if (p?.id) { apiFetch(`/providers/${p.id}/availability?tz=${encodeURIComponent(tz)}`, { credentials: "include" })
            .then(r => r.ok ? r.json() : { slots: [] })
            .then((data:any) => {
              const openSlots = (data.slots || []).filter((s:any) => (s.status || s.slot_status || "open") === "open" && new Date(s.slot_start_utc || s.slotStartUtc) > new Date());
              const groups: Record<string, any[]> = {};
              for (const s of openSlots) { const d = new Date(s.slot_start_utc || s.slotStartUtc); const localDate = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); if (!groups[localDate]) groups[localDate] = []; groups[localDate].push(s); }
              setGrouped(groups); setLoading(false);
            }).catch(() => { setLoading(false); setError("Failed to load slots"); });
          } else setLoading(false);
        }).catch(() => setLoading(false));
    }
    window.addEventListener("open-new-appointment", onOpen);
    return () => window.removeEventListener("open-new-appointment", onOpen);
  }, []);
  if (!open) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!name.trim() || !email.trim()) { setError("Name and email required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Invalid email"); return; }
    if (!selectedSlotId) { setError("Select a time slot"); return; }
    setSubmitting(true);
    try { const res = await apiFetch("/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ slot_id: selectedSlotId, client_name: name, email: email, client_timezone: timezone }) }); const data = await res.json().catch(() => ({})); if (res.ok && (data.bookingId || data.id)) { setSuccess("Appointment scheduled"); setName(""); setEmail(""); setSelectedSlotId(""); window.dispatchEvent(new CustomEvent("refresh-dashboard")); setTimeout(() => setOpen(false), 800); } else { setError(data.error || "Scheduling failed"); } } catch (e:any) { setError(e?.message || "Network error"); } setSubmitting(false);
  };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone || "UTC";
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()} className="bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative text-white">
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-white text-xl leading-none">&times;</button>
        <h2 className="text-xl font-bold mb-5">Create New Appointment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label htmlFor="name" className="block text-xs font-semibold text-slate-400 mb-1">Client Name</label><input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-sm focus:outline-none focus:border-indigo-500" placeholder="Vijay" /></div>
          <div><label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1">Client Email</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-sm focus:outline-none focus:border-indigo-500" placeholder="tv8591094@gmail.com" /></div>
          <div><label className="block text-xs font-semibold text-slate-400 mb-2">Available Slots ({tz})</label>
            {loading ? <div className="text-xs text-slate-400">Loading slots...</div> :
             Object.keys(grouped).length === 0 ? <div className="text-sm text-rose-300">No slots available</div> :
             <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
               {Object.entries(grouped).map(([date, list]) => (
                 <div key={date} className="bg-[#111827] rounded-lg p-3 border border-white/5">
                   <div className="text-xs font-bold text-indigo-300 mb-2">{date}</div>
                   <div className="flex flex-wrap gap-2">
                     {list.map((slot: any) => {
                       const d = new Date(slot.slot_start_utc || slot.slotStartUtc);
                       const timeStr = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
                       return <button key={slot.id || slot.slot_id} type="button" onClick={() => setSelectedSlotId(slot.id || slot.slot_id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedSlotId === (slot.id || slot.slot_id) ? "bg-indigo-600 border-indigo-400 text-white" : "bg-[#0F172A] border-white/10 text-slate-300 hover:border-indigo-500"}`}>{timeStr}</button>;
                     })}
                   </div>
                 </div>
               ))}
             </div>}
          </div>
          {error && <div className="text-rose-300 text-xs font-semibold bg-rose-900/30 border border-rose-700 rounded px-3 py-2">{error}</div>}
          {success && <div className="text-emerald-300 text-xs font-semibold bg-emerald-900/30 border border-emerald-700 rounded px-3 py-2">{success}</div>}
          <button type="submit" disabled={submitting || !selectedSlotId} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-bold transition">Book Appointment</button>
        </form>
      </div>
    </div>
  );
}
