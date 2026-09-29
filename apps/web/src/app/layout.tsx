// Ensure tokens are loaded via global CSS import in this file
import '../styles/tokens.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080D18] text-[#F8FAFC] antialiased font-sans selection:bg-[#6366F1]/30">
        {children}
      </body>
    </html>
  );
}
