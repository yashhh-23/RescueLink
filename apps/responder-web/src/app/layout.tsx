import './globals.css';
import React from 'react';

export const metadata = {
  title: 'RescueLink - Responder Command Dashboard',
  description: 'Real-time Emergency Dispatch & Triage Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
