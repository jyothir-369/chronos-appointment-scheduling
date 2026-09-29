export default function BookingSuccess({ date, time, tz, onViewBookings, onBookAnother }: any) {
  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-6 shadow-xl shadow-black/20 max-w-md">
      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mb-4">✓</div>
      <h2 className="text-xl font-bold text-white mb-1">Appointment booked</h2>
      <p className="text-sm text-[#94A3B8] mb-6">Your appointment has been successfully scheduled.</p>
      <div className="space-y-2 text-sm text-[#94A3B8] mb-6">
        <div><span className="text-[#64748B]">Date:</span> <span className="text-white">{date}</span></div>
        <div><span className="text-[#64748B]">Time:</span> <span className="text-white">{time}</span></div>
        <div><span className="text-[#64748B]">Timezone:</span> <span className="text-white">{tz}</span></div>
      </div>
      <div className="flex flex-col gap-3">
        <a href="#" onClick={onViewBookings} className="w-full rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium py-2.5 text-center shadow-lg shadow-indigo-900/20 hover:brightness-110">View My Bookings</a>
        <a href="#" onClick={onBookAnother} className="w-full rounded-xl border border-[rgba(148,163,184,0.12)] bg-[#111827] text-[#F8FAFC] text-sm font-medium py-2.5 text-center hover:bg-[#1E293B]">Book Another Appointment</a>
      </div>
    </div>
  );
}
