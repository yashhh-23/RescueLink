'use client';

import { useState } from 'react';
import { broadcastIncident } from '@/lib/api';
import { queueBroadcast, updateBroadcastStatus } from '@/lib/offlineCache';
import type { IncidentResponse } from '@/lib/schema';

interface BroadcastModalProps {
  incident: IncidentResponse;
  onClose: () => void;
}

type RecipientMethod = 'phone' | 'email' | 'captive_wifi_banner';

const RECIPIENT_OPTIONS: { value: RecipientMethod; label: string }[] = [
  { value: 'phone', label: 'Phone (SMS/IVR)' },
  { value: 'email', label: 'Email' },
  { value: 'captive_wifi_banner', label: 'Captive Wi-Fi banner (geofenced zone)' },
];

/**
 * Picks the most sensible default recipient method from what we actually
 * know about the reporter, but the dispatcher can always override it —
 * the PRD explicitly lists three distinct channels (phone / email /
 * captive Wi-Fi banner), so this is a real choice, not just an inferred one.
 */
function defaultRecipient(incident: IncidentResponse): { method: RecipientMethod; value: string } {
  const reporter = incident.reporter;
  if (reporter?.contactMethod === 'phone' && reporter.contactValue) {
    return { method: 'phone', value: reporter.contactValue };
  }
  if (reporter?.contactMethod === 'email' && reporter.contactValue) {
    return { method: 'email', value: reporter.contactValue };
  }
  return { method: 'captive_wifi_banner', value: 'All devices within incident radius' };
}

export function BroadcastModal({ incident, onClose }: BroadcastModalProps) {
  const suggested = incident.triage?.suggestedAction ?? '';
  const [message, setMessage] = useState(suggested);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<'sent' | 'queued' | null>(null);

  const initial = defaultRecipient(incident);
  const [recipientMethod, setRecipientMethod] = useState<RecipientMethod>(initial.method);
  const [recipientValue, setRecipientValue] = useState(initial.value);

  function handleMethodChange(method: RecipientMethod) {
    setRecipientMethod(method);
    // Re-seed a sensible value when switching channels, but leave it
    // editable — a dispatcher may want to target a different number/zone.
    if (method === 'phone' && incident.reporter?.contactMethod === 'phone') {
      setRecipientValue(incident.reporter.contactValue ?? '');
    } else if (method === 'email' && incident.reporter?.contactMethod === 'email') {
      setRecipientValue(incident.reporter.contactValue ?? '');
    } else if (method === 'captive_wifi_banner') {
      setRecipientValue('All devices within incident radius');
    } else {
      setRecipientValue('');
    }
  }

  async function handleSend() {
    setIsSending(true);
    try {
      const { delivered } = await broadcastIncident(incident.id, {
        message,
        recipientMethod,
        recipientValue,
      });

      const outboxEntry = {
        id: `${incident.id}-${Date.now()}`,
        incidentId: incident.id,
        message,
        recipientMethod,
        recipientValue,
        queuedAt: Date.now(),
        status: (delivered ? 'sent' : 'pending') as 'sent' | 'pending',
      };
      await queueBroadcast(outboxEntry);
      if (delivered) await updateBroadcastStatus(outboxEntry.id, 'sent');

      setResult(delivered ? 'sent' : 'queued');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink-900">Broadcast flash alert</h2>
        <p className="mt-1 text-sm text-ink-500">
          Reviews the Bedrock AI safety directive before sending to the survivor or geofenced zone.
        </p>

        {result === null ? (
          <>
            <label className="mt-4 block text-xs font-medium text-ink-500" htmlFor="broadcast-message">
              Message
            </label>
            <textarea
              id="broadcast-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-1 focus:ring-action"
              placeholder="Safety directive for the affected area…"
            />

            <fieldset className="mt-3">
              <legend className="text-xs font-medium text-ink-500">Recipient channel</legend>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {RECIPIENT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded border border-line px-2.5 py-1.5 text-sm text-ink-700 has-[:checked]:border-action has-[:checked]:bg-action-soft"
                  >
                    <input
                      type="radio"
                      name="recipient-method"
                      value={option.value}
                      checked={recipientMethod === option.value}
                      onChange={() => handleMethodChange(option.value)}
                      className="accent-action"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-3 block text-xs font-medium text-ink-500" htmlFor="broadcast-target">
              Target
            </label>
            <input
              id="broadcast-target"
              type="text"
              value={recipientValue}
              onChange={(e) => setRecipientValue(e.target.value)}
              disabled={recipientMethod === 'captive_wifi_banner'}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-1 focus:ring-action disabled:bg-canvas disabled:text-ink-500"
              placeholder={recipientMethod === 'phone' ? '+91…' : recipientMethod === 'email' ? 'name@example.com' : ''}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !message.trim() || !recipientValue.trim()}
                className="rounded bg-danger px-3.5 py-1.5 text-sm font-medium text-white hover:bg-danger-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? 'Sending…' : 'Send broadcast'}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4">
            {result === 'sent' ? (
              <p className="text-sm text-success">Broadcast delivered.</p>
            ) : (
              <p className="text-sm text-priority-pending">
                POST /api/incidents/:id/broadcast isn&rsquo;t implemented on the backend yet, so this
                was saved to the local outbox instead of silently failing. It will show as pending
                until that route exists.
              </p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-canvas"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
