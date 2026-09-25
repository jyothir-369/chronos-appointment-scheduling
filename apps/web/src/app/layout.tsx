import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chronos",
  description: "Timezone-Safe Appointment Scheduling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
