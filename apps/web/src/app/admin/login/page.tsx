'use client';
import React from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = '/admin/status';
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d?.message || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#111827] p-8 rounded-2xl border border-white/10 shadow-2xl space-y-4">
        <h1 className="text-2xl font-bold text-white">Admin Login</h1>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-2 rounded-lg bg-[#0F172A] border border-white/10 text-white" required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-2 rounded-lg bg-[#0F172A] border border-white/10 text-white" required />
        {error && <div className="text-rose-300 text-sm">{error}</div>}
        <button disabled={loading} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold">{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}
