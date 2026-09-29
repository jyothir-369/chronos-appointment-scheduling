import { useState } from 'react';

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  if (!open) return null;

  const items = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Calendar', href: '/calendar' },
    { label: 'Appointments', href: '/appointments' },
    { label: 'Event Types', href: '/event-types' },
    { label: 'Availability', href: '/availability' },
    { label: 'Clients', href: '/clients' },
    { label: 'Settings', href: '/settings' },
    { label: 'New Appointment', href: '#new' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-4" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or navigate..."
          className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 outline-none text-base"
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        />
        <ul className="mt-2 space-y-1 max-h-64 overflow-auto">
          {items.filter(i => i.label.toLowerCase().includes(query.toLowerCase())).map(i => (
            <li key={i.label}><a href={i.href} className="block px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm" onClick={onClose}>{i.label}</a></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
