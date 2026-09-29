import { Search, Bell, Plus, Settings, User } from 'lucide-react';

export default function Topbar({ title = 'Dashboard' }: { title?: string }) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[rgba(148,163,184,0.12)] bg-[#0B1120]/80 backdrop-blur sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-[17px] font-semibold text-white tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search appointments, clients..."
            className="h-8 w-64 rounded-full bg-[#111827] border border-[rgba(148,163,184,0.12)] pl-8 pr-3 text-[13px] text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#6366F1]/40 transition-colors"
          />
        </div>
        <a href="#" className="h-8 px-3 rounded-full bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-900/20 hover:brightness-110 transition">
          <Plus size={14} /> New Appointment
        </a>
        <button className="w-8 h-8 rounded-full bg-[#111827] border border-[rgba(148,163,184,0.12)] flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition"><Bell size={16} /></button>
        <button className="w-8 h-8 rounded-full bg-[#111827] border border-[rgba(148,163,184,0.12)] flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition"><Settings size={16} /></button>
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-[#818CF8] to-[#6366F1] text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-indigo-900/20">JD</button>
      </div>
    </header>
  );
}
