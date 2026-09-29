"use client";
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell({ children, title = 'Dashboard' }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-[#080D18] text-[#F8FAFC] flex font-sans antialiased selection:bg-[#6366F1]/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar title={title} />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
