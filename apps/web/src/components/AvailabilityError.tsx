export default function AvailabilityError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-6 shadow-xl shadow-black/20">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-amber-400 text-xl">⚠</span>
        <h3 className="text-base font-bold text-white">Unable to load availability</h3>
      </div>
      <p className="text-sm text-[#94A3B8] mb-4">We couldn't retrieve available appointment times. Please try again.</p>
      <button onClick={onRetry} className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[#111827] px-4 py-2 text-sm text-[#F8FAFC] hover:bg-[#1E293B]">Try Again</button>
    </div>
  );
}
