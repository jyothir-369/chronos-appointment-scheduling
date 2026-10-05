"use client";
import React from "react";
import { LayoutDashboard, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = React.useState("sarah@chronos.app");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Sign in failed");
      }
    } catch {
      setError("Backend unavailable");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center px-6 py-12 font-sans antialiased">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center"><LayoutDashboard size={20} className="text-white" /></div>
          <div><div className="font-extrabold text-xl tracking-tight text-white leading-none">Chronos</div><div className="text-xs text-slate-400 font-medium mt-0.5">Pro Workspace</div></div>
        </div>

        <div className="rounded-2xl bg-[#111827]/80 border border-white/10 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Welcome back</h1>
          <p className="text-sm text-slate-400 mb-6">Sign in to your Chronos workspace.</p>

          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Login form">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 mb-1.5">Work email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0F172A] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition" placeholder="you@company.com" />
              </div>
            </div>

            {error && <div className="text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition disabled:opacity-60">
              {loading ? "Signing in…" : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 mt-5">Uses existing Chronos session cookie authentication. No JWT, no localStorage.</p>
        </div>
      </div>
    </div>
  );
}
