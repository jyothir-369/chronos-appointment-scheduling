import { useState, useEffect } from 'react';
export default function SettingsPage() {
  const [provider, setProvider] = useState<{ cancellationWindowHours?: number; timezone?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch('/api/providers/me').then(r => r.ok ? r.json() : null).then(setProvider).finally(() => setLoading(false));
  }, []);
  const save = async () => {
    await fetch('/api/providers/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(provider) });
    setSaved(true);
  };
  if (loading) return <main className="p-6"><p>Loading settings...</p></main>;
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <label className="block mb-2">Cancellation window (hours)</label>
      <input type="number" value={provider?.cancellationWindowHours ?? 24} onChange={e => setProvider(p => p ? { ...p, cancellationWindowHours: Number(e.target.value) } : null)} className="border p-2 w-full mb-4" />
      <label className="block mb-2">Timezone</label>
      <input type="text" value={provider?.timezone ?? 'UTC'} onChange={e => setProvider(p => p ? { ...p, timezone: e.target.value } : null)} className="border p-2 w-full mb-4" />
      <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
      {saved && <p className="text-green-600 mt-2">Saved.</p>}
    </main>
  );
}
