export default function EmptyState({ icon, heading, body, actionHref, actionLabel }: { icon?: string; heading: string; body: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="rounded-2xl border border-[#23232e] bg-[#12121a] p-10 text-center shadow-sm space-y-4" aria-label="Empty state">
      {icon ? <div className="text-4xl" aria-hidden="true">{icon}</div> : null}
      <h2 className="text-xl font-bold text-[#f8f6f2]">{heading}</h2>
      <p className="text-sm text-[#94a3b8]">{body}</p>
      {actionHref && actionLabel ? (
        <a href={actionHref} className="inline-block mt-4 rounded-xl bg-[#f8f6f2] text-[#0f172a] font-bold px-6 py-3 hover:brightness-95 transition shadow-sm">{actionLabel}</a>
      ) : null}
    </div>
  );
}