import { cookies } from 'next/headers';
import { apiFetch } from '../lib/api';

export default async function BookingsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('chronos_session')?.value;
  let list: any[] = [];
  let error = '';
  if (session) {
    try {
      const res = await apiFetch('/bookings', { cookie: session });
      if (res.ok) list = await res.json();
    } catch { error = 'Failed to load'; }
  }
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">My bookings</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {list.length === 0 ? <p className="text-slate-500">No bookings yet.</p> : (
        <ul className="space-y-4">
          {list.map((b: any) => (
            <li key={b.booking_id} className="rounded-xl border p-4 bg-white shadow-sm">
              <div className="font-semibold">Booking #{String(b.booking_id).slice(0,8)}</div>
              <div className="text-sm text-slate-500">Status: {b.status}</div>
              <div className="text-sm">Slot: {String(b.slot_start_utc)}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
