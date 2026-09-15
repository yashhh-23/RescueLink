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
  Truck,
  Radio,
  Battery,
  BatteryCharging,
  BatteryLow,
  Zap,
  Moon,
  Volume2,
  Flashlight,
  Check,
  Mic,
  Activity,
} from 'lucide-react';
import type {
  IncidentCategory,
  IncidentStatus as IncidentStatusType,
  IncidentResponse,
  SOSSubmission,
} from '@/lib/validation';
import { isLocalIncidentId } from '@/lib/offlineQueue';
import { useBatteryOptimization } from '@/hooks/useBatteryOptimization';
import { useSurvivorStream } from '@/hooks/useSurvivorStream';
import { useScreenBeacon } from '@/hooks/useScreenBeacon';

interface IncidentStatusProps {
  incidentId: string;
  category: IncidentCategory;
  isLocal: boolean;
  payload?: SOSSubmission;
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
  payload,
  onReset,
}) => {
  const [incidentId, setIncidentId] = useState<string>(initialIncidentId);
  const [isLocal, setIsLocal] = useState<boolean>(initialIsLocal || isLocalIncidentId(initialIncidentId));
  const [status, setStatus] = useState<IncidentStatusType>('new');
  const [incidentData, setIncidentData] = useState<IncidentResponse | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const [liveBroadcastDirective, setLiveBroadcastDirective] = useState<string | null>(null);
  const [isDirectiveAcknowledged, setIsDirectiveAcknowledged] = useState<boolean>(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    batteryLevel,
    isCharging,
    isLowBattery,
    oledMode,
    toggleOledMode,
    recommendedPollIntervalMs,
  } = useBatteryOptimization();

  const { isBeaconActive, toggleBeacon, strobeColor } = useScreenBeacon();

  // Update when prop changes
  useEffect(() => {
    setIncidentId(initialIncidentId);
    setIsLocal(initialIsLocal || isLocalIncidentId(initialIncidentId));
  }, [initialIncidentId, initialIsLocal]);

  // Audio chime generator for flash evacuation alert
  const playAlertChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context restricted or unavailable
    }
  }, []);

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

  // Handle zero-latency push events from SSE stream
  const handleStreamUpdate = useCallback(
    (incomingIncident: IncidentResponse, broadcastMessage?: string) => {
      setIncidentData(incomingIncident);
      if (incomingIncident.status) {
        setStatus(incomingIncident.status);
      }
      if (broadcastMessage) {
        setLiveBroadcastDirective(broadcastMessage);
        setIsDirectiveAcknowledged(false);
        playAlertChime();
      }
      setLastPolledAt(new Date());
    },
    [playAlertChime]
  );

  // Real-time zero-latency event stream listener
  const { streamStatus } = useSurvivorStream({
    incidentId,
    isLocal,
    onUpdate: handleStreamUpdate,
  });

  // Polling fallback loop: runs responsive to battery level
  useEffect(() => {
    if (isLocal || isLocalIncidentId(incidentId)) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchIncidentDetails();

    // Dynamic interval: 5s normally, 30s when battery <= 20%
    pollTimerRef.current = setInterval(() => {
      fetchIncidentDetails();
    }, recommendedPollIntervalMs);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [incidentId, isLocal, fetchIncidentDetails, recommendedPollIntervalMs]);

  // Assigned units resolution (supports both triage.assignedUnits and top-level assignedUnits)
  const assignedUnits: string[] =
    incidentData?.triage?.assignedUnits ||
    (incidentData as { assignedUnits?: string[] })?.assignedUnits ||
    [];

  // Effective status: if units are dispatched and status is still new/acknowledged, reflect active response
  const effectiveStatus: IncidentStatusType =
    assignedUnits.length > 0 && (status === 'new' || status === 'acknowledged')
      ? 'in_progress'
      : status;

  const currentStepIndex = STATUS_STEPS.indexOf(effectiveStatus);
  const safetyDirective = STATIC_SAFETY_DIRECTIVES[category] || STATIC_SAFETY_DIRECTIVES.other;

  // Active tactical directive (either push broadcast or Bedrock AI action)
  const activeDirective =
    liveBroadcastDirective ||
    incidentData?.triage?.suggestedAction ||
    (incidentData as { details?: { immediateAction?: string } })?.details?.immediateAction ||
    null;

  // Audio voice SOS source (from server or local submission payload)
  const effectiveAudioBlob = incidentData?.audioBlob || payload?.audioBlob || null;

  // LoRa / Sat packet payload size estimation (PRD Stage 1: Item 3 - 100-byte spec)
  const estimatedPayloadBytes = JSON.stringify({
    cat: category,
    desc: incidentData?.description || payload?.description,
    loc: incidentData?.location || payload?.location,
    p: incidentData?.peopleAffected || payload?.peopleAffected,
  }).length;

  // Visual theming tokens for OLED Survival Mode
  const theme = {
    bg: oledMode ? '#000000' : 'transparent',
    cardBg: oledMode ? '#0a0a0a' : '#121826',
    cardBorder: oledMode ? '#333333' : '#1e293b',
    textColor: oledMode ? '#ffffff' : '#f8fafc',
    subTextColor: oledMode ? '#a3a3a3' : '#94a3b8',
  };

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        backgroundColor: theme.bg,
        minHeight: '100vh',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* FULL-SCREEN NIGHT RESCUE SCREEN STROBE OVERLAY */}
      {isBeaconActive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: strobeColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#000000',
              padding: '16px 24px',
              borderRadius: '12px',
              border: '2px solid #ef4444',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.8)',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fee2e2', letterSpacing: '0.08em' }}>
              RESCUE BEACON ACTIVE
            </div>
            <div style={{ fontSize: '13px', color: '#fca5a5', marginTop: '4px' }}>
              Flashing SOS Strobe &amp; Alpine Whistle Bursts for Search Units
            </div>
          </div>

          <button
            onClick={toggleBeacon}
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: '3px solid #ffffff',
              padding: '16px 36px',
              borderRadius: '50px',
              fontSize: '18px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(0,0,0,0.9)',
            }}
          >
            STOP BEACON
          </button>
        </div>
      )}

      {/* Header with return button & Survival Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={onReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: oledMode ? '#171717' : '#1e293b',
            border: `1px solid ${oledMode ? '#404040' : '#334155'}`,
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Night Beacon Trigger */}
          <button
            onClick={toggleBeacon}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #f59e0b',
              backgroundColor: '#78350f',
              color: '#fef3c7',
            }}
            title="Flash high-visibility screen strobe and whistle pulses for search helicopters"
          >
            <Flashlight size={14} color="#fde68a" />
            NIGHT BEACON
          </button>

          {/* Battery Status Indicator */}
          {batteryLevel !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: isLowBattery ? '#ef4444' : '#10b981',
                backgroundColor: oledMode ? '#171717' : '#1e293b',
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${isLowBattery ? '#b91c1c' : '#334155'}`,
                fontWeight: 600,
              }}
              title={`Device Battery: ${Math.round(batteryLevel * 100)}%`}
            >
              {isCharging ? (
                <BatteryCharging size={14} />
              ) : isLowBattery ? (
                <BatteryLow size={14} />
              ) : (
                <Battery size={14} />
              )}
              <span>{Math.round(batteryLevel * 100)}%</span>
            </div>
          )}

          {/* OLED Survival Mode Toggle */}
          <button
            onClick={toggleOledMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: oledMode ? '1px solid #10b981' : '1px solid #475569',
              backgroundColor: oledMode ? '#042f2e' : '#1e293b',
              color: oledMode ? '#34d399' : '#94a3b8',
            }}
            title="Toggle AMOLED pure black survival mode for maximum battery life"
          >
            {oledMode ? <Zap size={14} color="#34d399" /> : <Moon size={14} />}
            {oledMode ? 'SURVIVAL ON' : 'SURVIVAL'}
          </button>
        </div>
      </div>

      {/* Low Battery Warning Banner */}
      {isLowBattery && (
        <div
          style={{
            backgroundColor: '#450a0a',
            border: '2px solid #ef4444',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fee2e2',
            fontSize: '13px',
          }}
        >
          <BatteryLow size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <strong>CRITICAL BATTERY LEVEL (&le; 20%)</strong>
            <div style={{ color: '#fca5a5', marginTop: '2px' }}>
              Network polling throttled to 30s to conserve life. OLED Survival Mode is strongly recommended.
            </div>
          </div>
        </div>
      )}

      {/* Incident Reference & Telemetry Card */}
      <div
        style={{
          backgroundColor: theme.cardBg,
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
            <div style={{ fontSize: '12px', color: theme.subTextColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Real-Time Stream Status Badge */}
            {!isLocal && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor:
                    streamStatus === 'live'
                      ? '#064e3b'
                      : streamStatus === 'connecting'
                      ? '#1e3a8a'
                      : '#1e293b',
                  color:
                    streamStatus === 'live'
                      ? '#6ee7b7'
                      : streamStatus === 'connecting'
                      ? '#93c5fd'
                      : '#94a3b8',
                  border: `1px solid ${
                    streamStatus === 'live'
                      ? '#10b981'
                      : streamStatus === 'connecting'
                      ? '#3b82f6'
                      : '#334155'
                  }`,
                }}
              >
                <Activity size={12} />
                {streamStatus === 'live'
                  ? 'LIVE RELAY'
                  : streamStatus === 'connecting'
                  ? 'CONNECTING RELAY'
                  : `POLLING (${recommendedPollIntervalMs / 1000}s)`}
              </span>
            )}

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
        </div>

        {/* PRD LoRa / Satellite Packet Compression Diagnostics */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: oledMode ? '#111111' : '#0f172a',
            border: `1px solid ${theme.cardBorder}`,
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color="#60a5fa" />
            <span>
              Uplink Channel:{' '}
              <strong style={{ color: isLocal ? '#fbbf24' : '#6ee7b7' }}>
                {isLocal ? 'Offline Mesh Queue' : 'Captive Wi-Fi / Sat Relay'}
              </strong>
            </span>
          </div>
          <div style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
            Payload Size: <strong>~{estimatedPayloadBytes} B</strong> (LoRa / Sat Compliant)
          </div>
        </div>

        {isLocal && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: oledMode ? '#201202' : '#451a03',
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

      {/* ATTACHED VOICE DISTRESS AUDIO DISPATCH CARD */}
      {effectiveAudioBlob && (
        <div
          role="region"
          aria-label="Attached Voice Dispatch"
          style={{
            backgroundColor: oledMode ? '#0a0a0a' : '#1e1b4b',
            border: '2px solid #6366f1',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c7d2fe', fontWeight: 700, fontSize: '15px' }}>
              <Mic size={18} color="#818cf8" />
              Attached Voice SOS Recording
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#a5b4fc',
                backgroundColor: '#312e81',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              15s Audio Dispatch
            </span>
          </div>

          <div style={{ fontSize: '13px', color: '#e0e7ff' }}>
            Your spoken distress message is securely packaged with this emergency beacon for arriving first responders.
          </div>

          <audio
            src={effectiveAudioBlob}
            controls
            style={{
              width: '100%',
              height: '38px',
              borderRadius: '8px',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* RESCUER EN-ROUTE & UNIT DEPLOYMENT CARD (Stage 3 Live Relay) */}
      {assignedUnits.length > 0 && (
        <div
          role="region"
          aria-label="Rescue Unit Deployment"
          style={{
            backgroundColor: oledMode ? '#021e14' : '#064e3b',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: oledMode ? 'none' : '0 0 25px rgba(16, 185, 129, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  backgroundColor: '#10b981',
                  borderRadius: '8px',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Truck size={22} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ecfdf5', margin: 0 }}>
                  Rescue Teams Deployed &amp; En Route
                </h3>
                <div style={{ fontSize: '12px', color: '#a7f3d0' }}>
                  Responders have confirmed your beacon position and are converging on-site.
                </div>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                backgroundColor: '#065f46',
                color: '#6ee7b7',
                border: '1px solid #10b981',
              }}
            >
              <Radio size={12} />
              DISPATCH LIVE
            </span>
          </div>

          <div
            style={{
              backgroundColor: oledMode ? '#000000' : '#022c22',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid #047857',
            }}
          >
            <div style={{ fontSize: '11px', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Assigned Field Units &amp; Call Signs
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {assignedUnits.map((unit, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#d1fae5',
                    border: '1px solid #34d399',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Radio size={12} color="#34d399" />
                  {unit}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Status Pipeline */}
      <div
        style={{
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: theme.textColor }}>
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
                    backgroundColor: isCompleted ? '#065f46' : oledMode ? '#171717' : '#1e293b',
                    border: `2px solid ${isCurrent ? '#34d399' : isCompleted ? '#10b981' : oledMode ? '#404040' : '#334155'}`,
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

      {/* TWO-WAY FLASH EVACUATION ALERT & DIRECTIVE (Stage 3 Real-time Relay) */}
      {activeDirective ? (
        <div
          role="region"
          aria-label="Rescuer & AI Directive"
          style={{
            backgroundColor: oledMode ? '#1e0505' : '#450a0a',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: oledMode ? 'none' : '0 0 25px rgba(239, 68, 68, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={24} color="#f87171" />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fca5a5', margin: 0 }}>
                  Emergency Flash Directive
                </h3>
                <div style={{ fontSize: '11px', color: '#f87171' }}>
                  Two-Way Tactical Alert Broadcast from Incident Commander &amp; AI Triage
                </div>
              </div>
            </div>

            <button
              onClick={playAlertChime}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#7f1d1d',
                border: '1px solid #ef4444',
                color: '#fee2e2',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
              title="Play alert tone"
            >
              <Volume2 size={14} />
              Audio Siren
            </button>
          </div>

          <div
            style={{
              backgroundColor: oledMode ? '#000000' : '#1c0505',
              border: '1px solid #7f1d1d',
              borderRadius: '8px',
              padding: '14px',
              color: '#fef2f2',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: 1.6,
            }}
          >
            {activeDirective}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsDirectiveAcknowledged(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isDirectiveAcknowledged ? '#065f46' : '#991b1b',
                border: `1px solid ${isDirectiveAcknowledged ? '#10b981' : '#f87171'}`,
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Check size={16} />
              {isDirectiveAcknowledged ? 'DIRECTIVE ACKNOWLEDGED · SAFE' : 'CONFIRM RECEIPT'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Immediate Local Survival Protocol */}
      <div
        role="region"
        aria-label="Immediate Survival Protocol"
        style={{
          backgroundColor: theme.cardBg,
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
            backgroundColor: oledMode ? '#1c0505' : 'rgba(239, 68, 68, 0.1)',
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
