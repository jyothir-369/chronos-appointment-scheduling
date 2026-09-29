export default function BookingConfirmation({ date, time, tz, duration, onConfirm, onCancel }: any) {
  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-6 shadow-xl shadow-black/20 max-w-md">
      <h3 className="text-lg font-bold text-white mb-4">Confirm appointment</h3>
      <div className="space-y-2 text-sm text-[#94A3B8] mb-6">
        <div><span className="text-[#64748B]">Date:</span> <span className="text-white">{date}</span></div>
        <div><span className="text-[#64748B]">Time:</span> <span className="text-white">{time}</span></div>
        <div><span className="text-[#64748B]">Timezone:</span> <span className="text-white">{tz}</span></div>
        <div><span className="text-[#64748B]">Duration:</span> <span className="text-white">{duration}</span></div>
      </div>
      <div className="flex gap-3">
        <button onClick={onConfirm} className="flex-1 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium py-2.5 shadow-lg shadow-indigo-900/20 hover:brightness-110">Confirm Booking</button>
        <button onClick={onCancel} className="flex-1 rounded-xl border border-[rgba(148,163,184,0.12)] bg-[#111827] text-[#F8FAFC] text-sm font-medium py-2.5 hover:bg-[#1E293B]">Cancel</button>
      </div>
    </div>
  );
}
