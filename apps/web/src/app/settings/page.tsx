"use client";
import { useState, useEffect } from 'react';
export default function SettingsPage() {
  const [provider, setProvider] = useState<{ id?: string; name?: string; cancellationWindowHours?: number; timezone?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [providerId, setProviderId] = useState<string>('');
  useEffect(() => {
    // In a real app with session, get provider ID from session/user context.
    // Using a placeholder for verified PATCH endpoint demonstration.
    fetch('/api/providers/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        if (d?.id) setProviderId(d.id);
        setProvider(d);
      })
      .finally(() => setLoading(false));
  }, []);
  const save = async () => {
    if (!providerId) return;
    await fetch(`/api/providers/${providerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: provider?.name,
        timezone: provider?.timezone,
        cancellationWindowHours: provider?.cancellationWindowHours,
      }),
    });
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
