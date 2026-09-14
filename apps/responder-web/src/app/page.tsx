import React from 'react';

export default function ResponderDashboardPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#38bdf8' }}>
          🚨 RescueLink Responder Dashboard
        </h1>
        <p style={{ color: '#94a3b8' }}>
          Emergency Dispatch Command Center (Phase 4 Module Skeleton)
        </p>
      </header>

      <div style={{ background: '#1e293b', borderRadius: '8px', padding: '1.5rem', border: '1px solid #334155' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Incident Feed & Map View
        </h2>
        <p style={{ color: '#cbd5e1' }}>
          Skeleton ready for Dev 2 (Responder Frontend).
        </p>
      </div>
    </main>
  );
}
