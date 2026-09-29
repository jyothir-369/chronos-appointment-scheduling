export default function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-[#1E293B]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded bg-[#1E293B]" />
        <div className="h-3 w-48 rounded bg-[#1E293B]" />
      </div>
    </div>
  );
}
