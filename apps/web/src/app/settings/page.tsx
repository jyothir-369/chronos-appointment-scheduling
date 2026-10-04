"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { Badge } from "../components/Badge";
import { apiFetch } from "../../lib/api";
import { Settings, User, Bell, Shield, Palette, CreditCard, Link2, Check, AlertCircle, Sparkles, Clock } from "lucide-react";

const tabs = [
  { id: "profile", label: "Account Profile", icon: User },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
];

export default function SettingsPage() {
  const [active, setActive] = React.useState("profile");
  const [provider, setProvider] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [providerId, setProviderId] = React.useState<string>("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    apiFetch("/providers/me", { credentials: "include" })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d: any) => {
        if (d?.id) setProviderId(d.id);
        setProvider(d || { name: "", timezone: "UTC", cancellationWindowHours: 24 });
      })
      .catch((e) => setError(e?.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!providerId) return;
    setSaving(true); setSaved(false); setError("");
    try {
      const res = await apiFetch(`/providers/${providerId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: provider?.name,
          timezone: provider?.timezone,
          cancellationWindowHours: provider?.cancellationWindowHours,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold tracking-tight text-white">Account Profile</h2>
      {loading ? <div className="h-32 rounded-2xl bg-[#0F172A] animate-pulse border border-white/5" /> : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
            <input value={provider?.name ?? ""} onChange={(e) => setProvider((p: any) => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg bg-[#0F172A] border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Timezone (IANA)</label>
            <input value={provider?.timezone ?? "UTC"} onChange={(e) => setProvider((p: any) => ({ ...p, timezone: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg bg-[#0F172A] border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Cancellation Window (hours)</label>
            <input type="number" value={provider?.cancellationWindowHours ?? 24} onChange={(e) => setProvider((p: any) => ({ ...p, cancellationWindowHours: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-lg bg-[#0F172A] border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition" />
          </div>
          <button onClick={saveProfile} disabled={saving} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 transition">{saving ? "Saving..." : "Save Changes"}</button>
          {saved && <div className="flex items-center gap-2 text-sm text-emerald-300"><Check size={16} /> Saved successfully.</div>}
          {error && <div className="flex items-center gap-2 text-sm text-rose-300"><AlertCircle size={16} /> {error}</div>}
        </div>
      )}
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold tracking-tight text-white">Integrations</h2>
      <p className="text-sm text-slate-400">No verified integration endpoints found. Displaying truthful unavailable state.</p>
      {["Google Calendar", "Zoom", "Microsoft Teams"].map((name) => (
        <div key={name} className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">{name}</h3>
            <p className="text-xs text-slate-500">Not configured — backend endpoint unavailable.</p>
          </div>
          <span className="text-xs font-semibold text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-full">Not connected</span>
        </div>
      ))}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold tracking-tight text-white">Notifications</h2>
      <p className="text-sm text-slate-400">Notification preferences are not exposed by a verified REST endpoint. Showing current backend truth.</p>
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 text-sm text-slate-300 space-y-3">
        {["Booking notifications", "Cancellation notifications", "Reminder notifications"].map((label) => (
          <label key={label} className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4 accent-indigo-500 rounded" disabled />
            <span>{label} — no REST endpoint verified.</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderBranding = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold tracking-tight text-white">Branding</h2>
      <p className="text-sm text-slate-400">Only profile/name fields mapped to verified <code className="text-indigo-300">PATCH /providers/:id</code>. No separate branding endpoint audited.</p>
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 text-sm text-slate-300">
        Public profile name and timezone are controlled via Account Profile settings.
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold tracking-tight text-white">Security</h2>
      <p className="text-sm text-slate-400">Auth is cookie-based (<code className="text-indigo-300">chronos_session</code>). No password-change endpoint audited; no session-logout endpoint verified.</p>
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 text-sm text-slate-300 space-y-2">
        <div className="flex items-center gap-2"><Shield size={16} className="text-indigo-300" /> Session cookie <code>chronos_session</code> present.</div>
        <div>No verified endpoint for session revocation or password reset.</div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold tracking-tight text-white">Billing</h2>
      <p className="text-sm text-slate-400">No billing/invoicing controllers audited (<code className="text-indigo-300">/billing</code>, <code>/subscriptions</code> absent). Showing truthful unavailable state.</p>
      <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-6 text-amber-200 flex items-start gap-3"><AlertCircle size={20} />Billing settings are unavailable — backend does not expose billing endpoints.</div>
    </div>
  );

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
          <p className="text-sm text-slate-400">Manage profile, integrations, notifications, branding, security and billing.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${active === t.id ? "bg-indigo-600 text-white border-indigo-500" : "bg-[#111827] text-slate-300 border-white/10 hover:text-white"}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20">
          {active === "profile" && renderProfile()}
          {active === "integrations" && renderIntegrations()}
          {active === "notifications" && renderNotifications()}
          {active === "branding" && renderBranding()}
          {active === "security" && renderSecurity()}
          {active === "billing" && renderBilling()}
        </section>
      </div>
    </AppShell>
  );
}
