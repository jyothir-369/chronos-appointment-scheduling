"use client"
import { ClassicTabs } from "../../components/ui/ClassicTabs";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Input } from "../../components/ui/Input";
import { Clock, Globe, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function PublicBookingPage() {
  const [step, setStep] = useState(2);
  const [tz, setTz] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl rounded-3xl shadow-2xl shadow-brand-900/20 bg-white/5 backdrop-blur border border-white/10">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-300 uppercase tracking-wider"><Clock size={14}/> Provider: Dr. Chronos · Zone: America/New_York</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Book an appointment</h1>

          {/* Timezone detect */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-4 flex items-center gap-3">
            <Globe size={16} className="text-brand-400" />
            <div>
              <div className="text-xs font-bold text-slate-300">Viewer timezone: <strong className="text-white">{tz}</strong></div>
              <div className="text-[10px] text-slate-400">Times shown in your selected zone. The stored instant stays in UTC.</div>
            </div>
          </div>

          {step === 2 && (
            <>
              <h2 className="font-bold">Select a time</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {["09:00","10:00","14:00"].map(t => (
                  <button key={t} onClick={() => {}} className="rounded-xl bg-brand-600 text-white font-semibold py-3 shadow hover:bg-brand-700 transition">{t} — 30 min</button>
                ))}
              </div>
              <div className="rounded-xl bg-amber-900/20 border border-amber-700/30 p-3 flex items-start gap-2 text-xs text-amber-200">
                <AlertCircle size={14} />
                <span><strong>Slot conflict handling:</strong> If this slot is taken by another booking, you will see a refreshed list with nearest alternatives. The database unique constraint `(provider_id, slot_start_utc)` prevents double-booking.</span>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-700 flex gap-3">
            <Button onClick={() => setStep(3)}>Confirm & Book</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
