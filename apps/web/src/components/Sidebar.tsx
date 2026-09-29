"use client";
import { useState } from 'react';
import { Menu, X, Calendar, Clock, LayoutDashboard, Users, Settings, BarChart3, CreditCard, FileText } from 'lucide-react';

const items = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', active: false },
  { label: 'Calendar', icon: Calendar, href: '/calendar', active: false },
  { label: 'Appointments', icon: Clock, href: '/appointments', active: true },
  { label: 'Event Types', icon: FileText, href: '/event-types', active: false },
  { label: 'Availability', icon: Calendar, href: '/availability', active: false },
  { label: 'Clients CRM', icon: Users, href: '/clients', active: false },
  { label: 'Reports', icon: BarChart3, href: '/reports', active: false },
  { label: 'Billing', icon: CreditCard, href: '/billing', active: false },
  { label: 'Analytics', icon: BarChart3, href: '/analytics', active: false },
  { label: 'Settings', icon: Settings, href: '/settings', active: false },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-[#111827] border border-[rgba(148,163,184,0.12)] flex items-center justify-center text-[#94A3B8] shadow-xl" aria-label="Open menu"><Menu size={18} /></button>
      <aside className={`w-[260px] shrink-0 bg-[#0F172A] border-r border-[rgba(148,163,184,0.12)] flex flex-col fixed md:static inset-0 z-40 md:z-0 transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} shadow-2xl md:shadow-none`}>
      <button onClick={() => setOpen(false)} className="md:hidden absolute top-3 right-3 w-8 h-8 rounded-lg bg-[#111827] border border-[rgba(148,163,184,0.12)] flex items-center justify-center text-[#94A3B8]" aria-label="Close menu"><X size={16} /></button>
      <div className="p-5 border-b border-[rgba(148,163,184,0.12)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-900/20">C</div>
          <div>
            <div className="text-[15px] font-semibold text-white leading-tight">Chronos</div>
            <div className="text-[11px] text-[#64748B] font-medium">Pro Workspace</div>
          </div>
        </div>
        <div className="mt-4 px-3 py-2 rounded-lg bg-[#111827] border border-[rgba(148,163,184,0.12)] flex items-center justify-between text-sm">
          <span className="text-[#94A3B8] font-medium">Acme Advisory Team</span>
          <span className="text-xs text-[#64748B]">⌄</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <a
              key={i.label}
              href={i.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                i.active
                  ? 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/20'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/60'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{i.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[rgba(148,163,184,0.12)] space-y-1">
        <a href="/public" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/60 transition-colors">
          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">↗</span>
          Public Booking Page
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/60 transition-colors">
          <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">◈</span>
          Demo Empty States
        </a>
      </div>
    </aside>
    {open && <div onClick={() => setOpen(false)} className="md:hidden fixed inset-0 bg-black/50 z-30" aria-hidden="true" />}
    </>
  );
}
