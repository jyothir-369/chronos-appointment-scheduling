export default function EmptyAvailability() {
  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-6 shadow-xl shadow-black/20 text-center">
      <div className="text-3xl mb-3 text-[#64748B]">◈</div>
      <h3 className="text-base font-bold text-white mb-1">No available times</h3>
      <p className="text-sm text-[#94A3B8]">There are currently no available appointments for the selected date.</p>
    </div>
  );
}
