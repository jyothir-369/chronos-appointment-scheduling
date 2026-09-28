import React from 'react';
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f3f4f6]" aria-label="Chronos scheduling platform">
      <nav aria-label="Main navigation" className="sticky top-0 z-50 border-b border-[#1f2937] bg-[#0b0f19]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-extrabold tracking-tight text-[#f8f6f2] hover:text-[#f8f6f2]/90 transition" aria-label="Chronos home">Chronos</a>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="/" className="text-[#94a3b8] hover:text-[#f8f6f2] transition" aria-label="Home">Home</a>
            <a href="/book" className="text-[#94a3b8] hover:text-[#f8f6f2] transition" aria-label="Book">Book</a>
            <a href="/bookings" className="text-[#94a3b8] hover:text-[#f8f6f2] transition" aria-label="My Bookings">My Bookings</a>
            <a href="/provider" className="text-[#94a3b8] hover:text-[#f8f6f2] transition" aria-label="Provider">Provider</a>
          </div>
          <a href="/book" className="inline-flex items-center rounded-xl bg-[#f8f6f2] text-[#0f172a] px-4 py-2 text-sm font-bold shadow hover:brightness-95 transition" aria-label="Book appointment">Book</a>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="border-t border-[#1f2937] bg-[#0b0f19] py-8 text-xs text-[#64748b]">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span>Chronos — Timezone-Safe Scheduling</span>
          <span className="font-mono">v1.0</span>
        </div>
      </footer>
    </div>
  );
}