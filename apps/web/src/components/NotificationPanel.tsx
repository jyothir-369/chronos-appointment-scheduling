"use client";
import React, { useState, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onOpen() { setOpen(true); fetchNotifications(); }
    window.addEventListener("open-notifications", onOpen);
    return () => window.removeEventListener("open-notifications", onOpen);
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setList(data.notifications || []);
        setUnread(data.unread || 0);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function markRead(id: string) {
    try {
      await fetch(`http://localhost:3001/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
      setList(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }

  async function markAllRead() {
    try {
      await fetch("http://localhost:3001/notifications/read-all", { method: "POST", credentials: "include" });
      setList(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* silent */ }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur flex justify-end" onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-[#0F172A] border-l border-white/10 h-full shadow-2xl p-6 space-y-4 overflow-y-auto" role="dialog" aria-label="Notifications">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg text-white flex items-center gap-2"><Bell size={18} /> Notifications</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{unread} unread</span>
          <button onClick={markAllRead} className="text-brand-400 hover:text-brand-300 font-medium">Mark all read</button>
        </div>
        {loading && <div className="text-xs text-slate-400">Loading...</div>}
        {!loading && list.length === 0 && <div className="text-xs text-slate-500">No notifications.</div>}
        <div className="space-y-3">
          {list.map((n: any) => (
            <button key={n.id} onClick={() => !n.read && markRead(n.id)} className={`w-full text-left rounded-xl p-3 border transition ${n.read ? "bg-[#111827] border-white/5 text-slate-300" : "bg-indigo-500/10 border-indigo-500/30 text-white"}`}>
              <div className="font-semibold text-sm">{n.title || "Notification"}</div>
              <div className="text-xs text-slate-400 mt-1">{n.message || ""}</div>
              <div className="text-[10px] text-slate-500 mt-2">{new Date(n.createdAt || n.created_at).toLocaleString()}</div>
              {!n.read && <span className="inline-block mt-1 text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded">Unread</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
