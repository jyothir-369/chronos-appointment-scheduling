"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

const items = [
  { label: "Dashboard", href: "/dashboard", description: "Overview of bookings and KPIs" },
  { label: "Calendar", href: "/calendar", description: "Month / week / day view" },
  { label: "Bookings", href: "/bookings", description: "My appointments list" },
  { label: "Appointments", href: "/appointments", description: "Appoint directory with filters" },
  { label: "Clients", href: "/clients", description: "Client CRM directory" },
  { label: "Event Types", href: "/event-types", description: "Manage event types" },
  { label: "Availability", href: "/availability", description: "Weekly availability rules" },
  { label: "Settings", href: "/settings", description: "Profile & provider settings" },
  { label: "New Appointment", href: "/book", description: "Book a new slot" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    i.description.toLowerCase().includes(query.toLowerCase())
  );
  const results = filtered.length ? filtered : items;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((s) => !s);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const navigate = useCallback((h: string) => {
    setOpen(false);
    window.location.href = h;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => (s + 1) % results.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => (s - 1 + results.length) % results.length); }
      else if (e.key === "Enter") { e.preventDefault(); navigate(results[selected].href); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected, navigate]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#0F172A] border border-white/10 rounded-xl text-slate-400 text-sm hover:border-indigo-500/50 transition"
      >
        <span>Search...</span>
        <kbd className="px-1.5 py-0.5 text-[10px] bg-[#1E293B] border border-white/10 rounded text-slate-300 font-mono">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <span aria-hidden="true" className="text-zinc-500">⌘</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                placeholder="Search pages, actions..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {results.map((item, idx) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition ${idx === selected ? "bg-indigo-500/15" : "hover:bg-zinc-800/50"}`}
                >
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 text-xs font-bold">{item.label[0]}</div>
                  <div>
                    <div className={`text-sm font-medium ${idx === selected ? "text-white" : "text-zinc-200"}`}>{item.label}</div>
                    <div className="text-xs text-zinc-500">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Navigation</span>
              <span>↑↓ to navigate · ↵ to select</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
