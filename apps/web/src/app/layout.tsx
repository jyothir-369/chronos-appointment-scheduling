import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Chronos — Timezone-Safe Scheduling",
  description: "Book, manage, and cancel appointments with explicit timezone awareness.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-700 focus:text-white focus:px-3 focus:py-2 focus:rounded-md">Skip to content</a>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200" role="banner">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <a href="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-slate-900" aria-label="Chronos home">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm shadow-md" aria-hidden="true">C</span>
              <span>Chronos</span>
            </a>
            <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-slate-600">
              <a href="/" className="px-2.5 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">Home</a>
              <a href="/book" className="px-2.5 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">Book</a>
              <a href="/bookings" className="px-2.5 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">My Bookings</a>
              <a href="/provider" className="px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">Provider</a>
            </nav>
          </div>
        </header>
        <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">{children}</main>
        <footer className="border-t border-slate-200 bg-white" role="contentinfo">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-sm text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>Chronos — Timezone-Safe Appointment Scheduling</span>
            <span>Backend: <a href="http://localhost:3001/health" className="underline hover:text-blue-600" target="_blank" rel="noopener noreferrer">localhost:3001</a></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
