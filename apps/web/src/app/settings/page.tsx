"use client";
import React from "react";
import { AppShell } from "../components/AppShell";
import { User, Link2, Bell, Palette, Shield, CreditCard, Check } from "lucide-react";

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
  const [toasted, setToasted] = React.useState(false);
  const [slug, setSlug] = React.useState("dr-sarah");
  const [emailNotify, setEmailNotify] = React.useState(true);
  const [smsNotify, setSmsNotify] = React.useState(false);
  const [dailySummary, setDailySummary] = React.useState(true);

  const [profile, setProfile] = React.useState({name:'Dr. Sarah Jenkins', email:'sarah@chronos.app', slug:'dr-sarah', avatarUrl:null as string|null});
  const [uploading, setUploading] = React.useState(false);
  const handleSave = async () => {
    try {
      const res = await fetch('http://localhost:3001/providers/me', { method: 'PATCH', headers: {'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({name: profile.name, slug: profile.slug}) });
      if (res.ok) { setToasted(true); setTimeout(() => setToasted(false), 2000); window.dispatchEvent(new CustomEvent('refresh-profile')); } else { alert('Save failed'); }
    } catch (e) { alert('Save failed'); }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold border-b-2 transition ${
                active === t.id
                  ? "border-brand-600 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {active === "profile" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm max-w-4xl">
            <div className="flex items-center gap-4">
              <img src={profile.avatarUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80"} alt={profile.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-500" />
              <div>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition inline-block"><input type="file" accept="image/jpeg,image/png,image/gif" className="hidden" disabled={uploading} onChange={async (e:any) => { const f=e.target.files?.[0]; if(!f){return} if(f.size>1024*1024){alert("File exceeds 1MB"); return} if(!/.(jpe?g|png|gif)$/i.test(f.name)){alert("Only JPG, PNG, GIF allowed"); return} setUploading(true); const formData = new FormData(); formData.append('file', f); formData.append('fileName', f.name); try { const res = await fetch('http://localhost:3001/providers/me/avatar', { method:'POST', credentials:'include', body: formData }); const data = await res.json().catch(()=>({})); if(res.ok && data.avatar_url){ setProfile(p=>({...p, avatarUrl: data.avatar_url})); window.dispatchEvent(new CustomEvent('refresh-profile')); } else { alert('Upload failed: '+(data.error||'Unknown')) } } catch(err:any){ alert('Upload error: '+err.message); } setUploading(false); }} />{uploading ? 'Uploading...' : 'Change Photo'}</label>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="fullName" className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Full Name</label>
                <input id="fullName" value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
              </div>
              <div>
                <label htmlFor="email" className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Email Address</label>
                <input id="email" value={profile.email} onChange={e => setProfile(p => ({...p, email: e.target.value}))} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="slug" className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Custom Booking Slug</label>
                <div className="flex">
                  <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-l-xl text-xs text-slate-400">chronos.app/</span>
                  <input id="slug" value={profile.slug} onChange={(e) => setProfile(p => ({...p, slug: e.target.value}))} className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
                </div>
              </div>
            </div>

            <button onClick={handleSave} className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-brand-500/20">Save Profile</button>
            {toasted && <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5"><Check size={14} /> Profile saved successfully</div>}
          </div>
        )}

        {active === "integrations" && (
          <div className="space-y-4 max-w-4xl">
            <h2 className="text-xl font-extrabold tracking-tight text-white">Integrations</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div><h3 className="font-bold text-sm text-slate-900 dark:text-white">Google Calendar</h3><p className="text-xs text-slate-500 dark:text-slate-400">Sync bookings to your calendar.</p></div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">Connected</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div><h3 className="font-bold text-sm text-slate-900 dark:text-white">Zoom Video Conferencing</h3><p className="text-xs text-slate-500 dark:text-slate-400">Auto-create meeting links.</p></div>
                <button className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition">Connect</button>
              </div>
            </div>
          </div>
        )}

        {active === "notifications" && (
          <div className="space-y-4 max-w-4xl">
            <h2 className="text-xl font-extrabold tracking-tight text-white">Notifications</h2>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200"><span>Email booking alerts</span><button onClick={() => setEmailNotify(!emailNotify)} className={`h-5 w-9 rounded-full transition relative ${emailNotify ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"}`} aria-label="Toggle"><span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition ${emailNotify ? "left-5" : "left-0.5"}`} /></button></label>
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200"><span>SMS reminders</span><button onClick={() => setSmsNotify(!smsNotify)} className={`h-5 w-9 rounded-full transition relative ${smsNotify ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"}`} aria-label="Toggle"><span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition ${smsNotify ? "left-5" : "left-0.5"}`} /></button></label>
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200"><span>Daily agenda summary</span><button onClick={() => setDailySummary(!dailySummary)} className={`h-5 w-9 rounded-full transition relative ${dailySummary ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"}`} aria-label="Toggle"><span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition ${dailySummary ? "left-5" : "left-0.5"}`} /></button></label>
            </div>
          </div>
        )}

        {(active === "branding" || active === "security" || active === "billing") && (
          <div className="max-w-4xl text-xs text-slate-500 dark:text-slate-400 space-y-2"><h2 className="text-xl font-extrabold tracking-tight text-white">{tabs.find((t) => t.id === active)?.label}</h2><p>Content for {tabs.find((t) => t.id === active)?.label} shown here.</p></div>
        )}
      </div>
    </AppShell>
  );
}
