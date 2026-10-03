"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Clock,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { CommandPalette } from "./CommandPalette";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/bookings", icon: BookOpen },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Availability", href: "/availability", icon: Clock },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#080D18] text-[#F8FAFC] font-sans antialiased selection:bg-indigo-500/30">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0F172A]/80 backdrop-blur">
        <Link href="/dashboard" className="font-extrabold text-lg tracking-tight text-white">Chronos</Link>
        <button onClick={() => setOpen(!open)} aria-label="Toggle menu" className="p-2 rounded-lg hover:bg-white/10">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="flex max-w-[1440px] mx-auto">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#0F172A] border-r border-white/10 flex flex-col transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-6 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <Clock size={18} className="text-white" />
            </div>
            <Link href="/dashboard" className="font-extrabold text-xl tracking-tight text-white leading-none">Chronos</Link>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
            {nav.map((n) => {
              const active = pathname === n.href || pathname?.startsWith(n.href + "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <n.icon size={18} />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="text-[11px] text-slate-400 leading-relaxed">
              <div className="font-semibold text-slate-200">Chronos Session</div>
              <div className="truncate">chronos_session present</div>
              <div className="text-xs text-amber-400 mt-1">Development: NO_REAL_AUTH enabled</div>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setOpen(false)} />}

        {/* Main */}
        <main className="flex-1 min-w-0 p-6 lg:p-10">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Dashboard</h1>
            <div className="flex gap-2">
              <CommandPalette />
              <Link href="/bookings" className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-indigo-900/20">My Bookings</Link>
              <Link href="/settings" className="px-3 py-2 rounded-lg bg-[#111827] border border-white/10 hover:bg-[#1E293B] text-slate-200 text-sm font-medium transition">Settings</Link>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
