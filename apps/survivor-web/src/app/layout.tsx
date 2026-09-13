import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RescueLink | Disaster Distress SOS Client',
  description: 'Panic-resilient offline-capable emergency beacon and rescue response tracker.',
  applicationName: 'RescueLink Survivor',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RescueLink SOS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0d14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body>{children}</body>
    </html>
  );
}
