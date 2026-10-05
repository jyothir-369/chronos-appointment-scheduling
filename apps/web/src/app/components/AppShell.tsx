"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, BookOpen, Sparkles, Clock, Users,
  BarChart3, Receipt, PieChart, SlidersHorizontal, ChevronDown,
  ExternalLink, Search, Plus, Video, Phone, MapPin, Link2,
} from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { useState, useEffect } from 'react';

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Appointments", href: "/appointments", icon: BookOpen, badge: true },
  { label: "Event Types", href: "/event-types", icon: Sparkles },
  { label: "Availability", href: "/availability", icon: Clock },
  { label: "Clients CRM", href: "/clients", icon: Users },
  { label: "Reports", href: "/reports", icon: BarChart3, pill: "New" },
  { label: "Billing", href: "/billing", icon: Receipt },
  { label: "Analytics", href: "/analytics", icon: PieChart },
  { label: "Settings", href: "/settings", icon: SlidersHorizontal },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [dark, setDark] = React.useState(true);
  const [demoEmpty, setDemoEmpty] = React.useState(false);
  const [profileName, setProfileName] = React.useState('Dr. Sarah Jenkins');
  useEffect(() => { fetch('http://localhost:3001/providers/me',{credentials:'include'}).then(r=>r.ok?r.json():null).then(d=>{if(d&&d.name) setProfileName(d.name);}); }, []);
    const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className={`${dark ? "dark" : ""} min-h-screen bg-[#080D18] text-[#F8FAFC] font-sans antialiased selection:bg-indigo-500/30`}>
      <div className="flex min-h-screen">
        {/* Sidebar — flush left, ~255px, sticky */}
        <aside className="w-[255px] shrink-0 sticky top-0 h-screen bg-[#0F172A] border-r border-white/10 flex flex-col z-40">
          {/* Brand + subtitle */}
          <div className="p-5">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center"><LayoutDashboard size={18} className="text-white" /></div>
              <div>
                <div className="font-extrabold text-lg leading-none tracking-tight text-white">Chronos</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Pro Workspace</div>
              </div>
            </Link>
          </div>

          {/* Workspace switcher */}
          <div className="px-3 mb-2">
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#111827] border border-white/10 hover:border-white/20 transition text-sm text-left">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span className="text-sm font-medium text-white truncate">Acme Advisory Team</span>
              <ChevronDown size={14} className="ml-auto text-slate-400" />
            </button>
          </div>

          {/* Nav in exact order */}
          <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
            {nav.map((n) => {
              const active = pathname === n.href || pathname?.startsWith(n.href + "/");
              return (
                <Link key={n.href} href={n.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20" : "text-slate-300 hover:text-white hover:bg-white/5"}`}>
                  <n.icon size={18} />
                  <span className="truncate">{n.label}</span>
                  {n.badge && <span className="ml-auto text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">5</span>}
                  {n.pill && <span className="ml-auto text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">New</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom cards */}
          <div className="p-3 space-y-3">
            <a href="#" className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/10 hover:border-white/20 transition shadow-sm">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center"><ExternalLink size={16} /></div>
              <div className="min-w-0"><div className="text-sm font-semibold text-white truncate">Public Booking Page</div><div className="text-[11px] text-slate-400 truncate">chronos.app/book</div></div>
            </a>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#111827] border border-white/10">
              <span className="text-xs font-medium text-slate-300">Demo Empty States</span>
              <button onClick={() => setDemoEmpty(!demoEmpty)} className={`w-10 h-5 rounded-full transition ${demoEmpty ? "bg-indigo-500" : "bg-slate-600"} relative`} aria-label="Toggle demo empty states"><span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition ${demoEmpty ? "left-5.5" : "left-0.5"}`} /></button>
            </div>
          </div>
        </aside>

        {/* Main + topbar */}
        <main className="flex-1 min-w-0 bg-[#080D18]">
          <header className="sticky top-0 z-30 flex items-center gap-4 px-8 py-5 bg-[#080D18]/80 backdrop-blur border-b border-white/10">
            <h1 className="text-xl font-extrabold tracking-tight text-white shrink-0">Dashboard</h1>
            <div className="flex-1 max-w-2xl mx-auto">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search appointments, clients..." className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-[#111827] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500 bg-[#111827] border border-white/10 rounded px-1.5 py-0.5">Ctrl K</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { window.dispatchEvent(new CustomEvent("open-new-appointment")); }} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition"><Plus size={14} /> New Appointment</button>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 border-2 border-[#080D18] shadow-md relative"><span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-[#080D18]" /></div>
              <div ref={profileRef} className="relative">
                <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="true" aria-label="Profile menu" className="text-xs font-medium text-white hover:text-indigo-300 transition flex items-center gap-1">{profileName || "Dr. Sarah Jenkins"} <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} /></button>
                {open && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-[#111827] border border-white/10 shadow-2xl z-50 overflow-hidden">
                    <a href="#" onClick={(e) => { e.preventDefault(); setOpen(false); window.location.href = "/settings"; }} className="block px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5">Profile Settings</a>
                    <a href="#" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5">Preferences</a>
                    <button onClick={async () => { setOpen(false); await fetch("http://localhost:3001/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/login"; }} className="w-full text-left px-4 py-2.5 text-sm text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition">Sign Out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="max-w-[1440px] mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
