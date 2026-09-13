'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  RefreshCw,
  ArrowLeft,
  WifiOff,
} from 'lucide-react';
import type { IncidentCategory, IncidentStatus as IncidentStatusType, IncidentResponse } from '@/lib/validation';
import { isLocalIncidentId } from '@/lib/offlineQueue';

interface IncidentStatusProps {
  incidentId: string;
  category: IncidentCategory;
  isLocal: boolean;
  onReset: () => void;
}

const STATIC_SAFETY_DIRECTIVES: Record<IncidentCategory, { title: string; bullets: string[] }> = {
  flood: {
    title: 'Flood Survival Protocol',
    bullets: [
      'Do not attempt to walk or drive through moving water.',
      'Disconnect your master electrical breaker and gas shutoff if safe to do so.',
      'Move to the highest structural elevation (roof/upper deck); do not enter closed attics without roof egress.',
      'Signal rescuers using bright reflective cloth, phone flash, or whistle bursts of three.',
    ],
  },
  landslide: {
    title: 'Landslide & Debris Flow Protocol',
    bullets: [
      'Evacuate immediately away from slopes, gullies, and direct drainage paths.',
      'Stay alert for sudden changes in water runoff or sounds of cracking trees and rocks.',
      'If escape is impossible, curl into a tight ball and protect your head.',
      'Remain clear of the slide perimeter; watch for secondary slide reactivation.',
    ],
  },
  fire: {
    title: 'Wildfire & Structure Fire Protocol',
    bullets: [
      'Stay low beneath smoke ceiling; crawl on hands and knees.',
      'Feel closed doors with back of hand before opening; do not open hot doors.',
      'Cover your face with a damp cotton cloth or mask to filter particulate.',
      'Proceed immediately toward designated fire refuge zones or upwind clearings.',
    ],
  },
  other: {
    title: 'Emergency Life Safety Protocol',
    bullets: [
      'Remain inside or behind structural shelter away from overhead hazards.',
      'Conserve phone battery (enable low-power mode, lower screen brightness).',
      'Keep your location beacon active and await direct responder contact.',
      'Prepare whistle, light source, or audio signal for incoming search parties.',
    ],
  },
};

const STATUS_STEPS: IncidentStatusType[] = ['new', 'acknowledged', 'in_progress', 'resolved'];

export const IncidentStatus: React.FC<IncidentStatusProps> = ({
  incidentId: initialIncidentId,
  category,
  isLocal: initialIsLocal,
  onReset,
}) => {
  const [incidentId, setIncidentId] = useState<string>(initialIncidentId);
  const [isLocal, setIsLocal] = useState<boolean>(initialIsLocal || isLocalIncidentId(initialIncidentId));
  const [status, setStatus] = useState<IncidentStatusType>('new');
  const [incidentData, setIncidentData] = useState<IncidentResponse | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update when prop changes
  useEffect(() => {
    setIncidentId(initialIncidentId);
    setIsLocal(initialIsLocal || isLocalIncidentId(initialIncidentId));
  }, [initialIncidentId, initialIsLocal]);

  const fetchIncidentDetails = useCallback(async () => {
    // OFFLINE ID GUARD: Never poll if the incident has a local queue ID
    if (isLocal || isLocalIncidentId(incidentId)) {
      return;
    }

    setIsPolling(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`);
      if (res.ok) {
        const data = (await res.json()) as IncidentResponse;
        setIncidentData(data);
        if (data.status) {
          setStatus(data.status);
        }
        setLastPolledAt(new Date());
      }
    } catch {
      // Polling network drop; continue safely
    } finally {
      setIsPolling(false);
    }
  }, [incidentId, isLocal]);

  // Polling loop: Runs every 5s ONLY if ID is NOT a local ID
  useEffect(() => {
    if (isLocal || isLocalIncidentId(incidentId)) {
      // Polling strictly disabled for local temporary IDs
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchIncidentDetails();

    // 5-second polling interval
    pollTimerRef.current = setInterval(() => {
      fetchIncidentDetails();
    }, 5000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [incidentId, isLocal, fetchIncidentDetails]);

  const currentStepIndex = STATUS_STEPS.indexOf(status);
  const safetyDirective = STATIC_SAFETY_DIRECTIVES[category] || STATIC_SAFETY_DIRECTIVES.other;
  const aiAction = incidentData?.triage?.suggestedAction;

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Header with return button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#cbd5e1',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          Submit Another SOS
        </button>

        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          {lastPolledAt ? `Updated ${lastPolledAt.toLocaleTimeString()}` : ''}
        </div>
      </div>

      {/* Incident Reference Card */}
      <div
        style={{
          backgroundColor: '#121826',
          border: `2px solid ${isLocal ? '#f59e0b' : '#3b82f6'}`,
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Incident Tracking ID
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 700,
                color: isLocal ? '#fbbf24' : '#60a5fa',
                wordBreak: 'break-all',
              }}
            >
              {incidentId}
            </div>
          </div>

          <span
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: isLocal ? '#78350f' : '#1e3a8a',
              color: isLocal ? '#fde68a' : '#bfdbfe',
              border: `1px solid ${isLocal ? '#f59e0b' : '#3b82f6'}`,
            }}
          >
            {isLocal ? 'QUEUED OFFLINE' : 'DISPATCH TRANSMITTED'}
          </span>
        </div>

        {isLocal && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#451a03',
              border: '1px solid #b45309',
              borderRadius: '8px',
              padding: '12px',
              color: '#fef3c7',
              fontSize: '14px',
            }}
          >
            <WifiOff size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <strong>Queued offline - waiting for network connection.</strong>
              <div style={{ fontSize: '13px', color: '#fde68a', marginTop: '2px' }}>
                Your SOS is securely stored in local IndexedDB. It will automatically transmit as soon as edge uplink or captive Wi-Fi reconnects. Live server polling is paused.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Status Pipeline */}
      <div
        style={{
          backgroundColor: '#121826',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
            Dispatch Status
          </h2>
          {isPolling && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#60a5fa' }}>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Polling updates...
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = currentStepIndex >= idx;
            const isCurrent = currentStepIndex === idx;

            return (
              <div
                key={step}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#065f46' : '#1e293b',
                    border: `2px solid ${isCurrent ? '#34d399' : isCompleted ? '#10b981' : '#334155'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  {isCompleted ? <CheckCircle2 size={18} color="#34d399" /> : <Clock size={16} color="#64748b" />}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: isCurrent ? '#34d399' : isCompleted ? '#e2e8f0' : '#64748b',
                  }}
                >
                  {step.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bedrock AI / Rescuer Directive (Prominently rendered if populated) */}
      {aiAction ? (
        <div
          role="region"
          aria-label="Rescuer & AI Directive"
          style={{
            backgroundColor: '#172554',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Bot size={24} color="#60a5fa" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#93c5fd' }}>
              Rescuer & AI Directive
            </h3>
          </div>
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e3a8a',
              borderRadius: '8px',
              padding: '14px',
              color: '#f8fafc',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: 1.6,
            }}
          >
            {aiAction}
          </div>
          {incidentData?.triage?.assignedUnits && incidentData.triage.assignedUnits.length > 0 && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#93c5fd' }}>
              <strong>Assigned Units:</strong> {incidentData.triage.assignedUnits.join(', ')}
            </div>
          )}
        </div>
      ) : null}

      {/* Optimistic Immediate Local Survival Protocol */}
      <div
        role="region"
        aria-label="Immediate Survival Protocol"
        style={{
          backgroundColor: '#1e293b',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <ShieldAlert size={24} color="#ef4444" />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fca5a5' }}>
            {safetyDirective.title}
          </h3>
        </div>
        <ul style={{ paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {safetyDirective.bullets.map((bullet, idx) => (
            <li key={idx} style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 500 }}>
              {bullet}
            </li>
          ))}
        </ul>

        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#fecaca',
          }}
        >
          <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>Keep your device awake. Do not close this browser window.</span>
        </div>
      </div>
    </div>
  );
};
