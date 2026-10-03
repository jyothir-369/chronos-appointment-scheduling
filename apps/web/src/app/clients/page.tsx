"use client";
import { useState, useEffect } from 'react';
import { Client } from '@chronos/contracts';
import { apiFetch } from '../../lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/clients', { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Failed to load clients'); return r.json(); })
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="p-6"><p>Loading clients...</p></main>;
  if (error) return <main className="p-6"><p className="text-red-600">{error}</p></main>;
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Clients</h1>
      {clients.length === 0 ? <p>No clients found.</p> : (
        <table className="w-full border"><thead><tr className="bg-gray-100"><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
        <tbody>{clients.map(c => <tr key={c.id} className="border-t"><td>{c.name || '-'}</td><td>{c.email}</td><td>{c.phone || '-'}</td></tr>)}</tbody></table>
      )}
    </main>
  );
}
