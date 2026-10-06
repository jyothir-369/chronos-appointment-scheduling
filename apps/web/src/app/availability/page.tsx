"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Globe, Trash2 } from "lucide-react";

const DAYS = [
  { label: "Monday", default: { active: true, slots: [{ start: "09:00", end: "17:00" }] } },
  { label: "Tuesday", default: { active: true, slots: [{ start: "09:00", end: "17:00" }] } },
  { label: "Wednesday", default: { active: true, slots: [{ start: "09:00", end: "17:00" }] } },
  { label: "Thursday", default: { active: true, slots: [{ start: "09:00", end: "17:00" }] } },
  { label: "Friday", default: { active: true, slots: [{ start: "09:00", end: "15:00" }] } },
  { label: "Saturday", default: { active: false, slots: [] } },
  { label: "Sunday", default: { active: false, slots: [] } },
];

const TIMEZONES = [
  { label: "Eastern Time (US & Canada)", value: "GMT-4", sub: "Default" },
  { label: "Pacific Time (US & Canada)", value: "GMT-7", sub: "" },
  { label: "London", value: "GMT+1", sub: "" },
  { label: "India", value: "GMT+5:30", sub: "" },
];

const BUFFER_OPTIONS = [
  { label: "15 minutes before/after", value: "15" },
  { label: "30 minutes before/after", value: "30" },
  { label: "No buffer", value: "0" },
];

const NOTICE_OPTIONS = [
  { label: "4 hours advance notice", value: "4" },
  { label: "24 hours advance notice", value: "24" },
  { label: "48 hours advance notice", value: "48" },
];

export default function AvailabilityPage() {
  const [schedule, setSchedule] = React.useState(DAYS.map((d) => ({ ...d.default, label: d.label })));
  const [tz, setTz] = React.useState("GMT-4");
  const [buffer, setBuffer] = React.useState("15");
  const [notice, setNotice] = React.useState("4");
  const [toasted, setToasted] = React.useState(false);

  const toggleDay = (i: number) => setSchedule((prev) => prev.map((s, idx) => idx === i ? { ...s, active: !s.active } : s));
  const addSlot = (i: number) => setSchedule((prev) => prev.map((s, idx) => idx === i ? { ...s, slots: [...s.slots, { start: "09:00", end: "17:00" }] } : s));
  const removeSlot = (i: number, si: number) => setSchedule((prev) => prev.map((s, idx) => idx === i ? { ...s, slots: s.slots.filter((_, j) => j !== si) } : s));
  const setSlot = (i: number, si: number, field: "start" | "end", value: string) => setSchedule((prev) => prev.map((s, idx) => idx === i ? { ...s, slots: s.slots.map((slot, j) => j === si ? { ...slot, [field]: value } : slot) } : s));

  const handleSave = () => { setToasted(true); setTimeout(() => setToasted(false), 2000); };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Availability Schedules</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Set your weekly recurring hours and holiday overrides for client bookings.</p>
          </div>
          <button onClick={handleSave} className="inline-flex items-center px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition shadow-md shadow-brand-500/20">Save Changes</button>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2.5 font-medium text-slate-700 dark:text-slate-200"><Globe size={16} className="text-brand-600" /><span>Active Timezone</span></div>
          <div className="relative">
            <select value={tz} onChange={(e) => setTz(e.target.value)} className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40 transition cursor-pointer">
              {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label} {t.sub ? `(${t.sub})` : `(${t.value})`}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Weekly Hours</h2>
          </div>
          {schedule.map((day: any, i: number) => (
            <div key={day.label} className="flex items-center gap-4 flex-wrap">
              <div className="w-36 shrink-0">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => toggleDay(i)} aria-label={day.active ? "Deactivate" : "Activate"} className={`h-5 w-9 rounded-full transition relative ${day.active ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition ${day.active ? "left-5" : "left-0.5"}`} />
                  </button>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{day.label}</span>
                </div>
              </div>
              <div className="flex-1 min-w-[260px]">
                {day.active ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    {day.slots.map((slot: any, si: number) => (
                      <React.Fragment key={si}>
                        <div className="flex items-center gap-2">
                          <label htmlFor={`start-${i}-${si}`} className="sr-only">Start</label>
                          <input id={`start-${i}-${si}`} type="time" value={slot.start} onChange={(e) => setSlot(i, si, "start", e.target.value)} className="w-24 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
                          <span className="text-xs text-slate-400">-</span>
                          <label htmlFor={`end-${i}-${si}`} className="sr-only">End</label>
                          <input id={`end-${i}-${si}`} type="time" value={slot.end} onChange={(e) => setSlot(i, si, "end", e.target.value)} className="w-24 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
                          <button onClick={() => removeSlot(i, si)} aria-label="Remove slot" title="Remove" className="p-1 text-slate-400 hover:text-rose-500 transition"><Trash2 size={14} /></button>
                        </div>
                      </React.Fragment>
                    ))}
                    <button onClick={() => addSlot(i)} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">+ Add Slot</button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Unavailable</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Buffer Time</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add padding time before and after appointments.</p>
            <div className="mt-3">
              <select value={buffer} onChange={(e) => setBuffer(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40">
                {BUFFER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Minimum Booking Notice</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prevent last-minute bookings on your calendar.</p>
            <div className="mt-3">
              <select value={notice} onChange={(e) => setNotice(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40">
                {NOTICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {toasted && (<div className="text-xs font-semibold text-emerald-400">Availability settings saved</div>)}
      </div>
    </AppShell>
  );
}
