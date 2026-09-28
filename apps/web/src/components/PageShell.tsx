import React from 'react';
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-[Inter,sans-serif]" aria-label="Chronos scheduling platform">
      <nav aria-label="Main navigation" className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-extrabold tracking-tight text-[#1e293b] hover:text-[#4F46E5] transition" aria-label="Chronos home">Chronos</a>
          <div className="flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="/" className="hover:text-[#4F46E5] transition" aria-label="Home">Home</a>
            <a href="/book" className="hover:text-[#4F46E5] transition" aria-label="Book">Book</a>
            <a href="/bookings" className="hover:text-[#4F46E5] transition" aria-label="My Bookings">My Bookings</a>
            <a href="/provider" className="hover:text-[#4F46E5] transition" aria-label="Provider">Provider</a>
          </div>
          <a href="/book" className="inline-flex items-center rounded-xl bg-[#4F46E5] text-white px-4 py-2 text-sm font-bold shadow hover:bg-indigo-700 transition" aria-label="Book appointment">Book</a>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span>Chronos — Timezone-Safe Scheduling</span>
          <span className="font-mono">v1.0</span>
        </div>
      </footer>
    </div>
  );
}
