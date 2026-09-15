'use client';

import { useState } from 'react';
import { BroadcastModal } from './BroadcastModal';
import type { IncidentResponse } from '@/lib/schema';

export function BroadcastAction({ incident }: { incident: IncidentResponse }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink-900">Flash alert</h2>
      <p className="mt-1 text-sm text-ink-500">
        Send the AI-generated safety directive to the survivor or geofenced zone.
      </p>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 rounded bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger-hover"
      >
        Broadcast directive
      </button>
      {isOpen ? <BroadcastModal incident={incident} onClose={() => setIsOpen(false)} /> : null}
    </section>
  );
}
