import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rescue-Link Responder Dashboard',
  description: 'Operational dashboard for responder incident triage and coordination.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
