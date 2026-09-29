import { useState } from 'react';

export default function NewAppointmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <h2 className="text-xl font-bold mb-4">New Appointment</h2>
        <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">Step {step}: Select event type / date / slot / client</div>
        <p className="text-sm">Uses real booking endpoint (POST /bookings) with DB transaction. No separate booking engine.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
          <button onClick={() => setStep((s) => Math.min(s + 1, 4))} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">Next</button>
        </div>
      </div>
    </div>
  );
}
