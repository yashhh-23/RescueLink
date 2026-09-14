'use client';

import React, { useState } from 'react';
import {
  Flame,
  Waves,
  Mountain,
  AlertOctagon,
  MapPin,
  Users,
  Plus,
  Minus,
  Check,
  Send,
  Loader2,
  Phone,
  Mail,
  HelpCircle,
  Mic,
  Square,
  Trash2,
} from 'lucide-react';
import {
  SOSSubmissionSchema,
  type SOSSubmission,
  type IncidentCategory,
  type UrgentNeed,
  type ContactMethod,
} from '@/lib/validation';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { enqueueIncident } from '@/lib/offlineQueue';

interface SOSFormProps {
  isOnline: boolean;
  onSubmitted: (submission: {
    id: string;
    category: IncidentCategory;
    payload: SOSSubmission;
    isLocal: boolean;
  }) => void;
  onQueueUpdated?: () => void;
}

const CATEGORIES: Array<{
  id: IncidentCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  color: string;
  bgColor: string;
}> = [
  { id: 'flood', label: 'Flood / Water', icon: Waves, color: '#38bdf8', bgColor: '#082f49' },
  { id: 'fire', label: 'Fire / Wildfire', icon: Flame, color: '#f87171', bgColor: '#450a0a' },
  { id: 'landslide', label: 'Landslide / Debris', icon: Mountain, color: '#fbbf24', bgColor: '#451a03' },
  { id: 'other', label: 'Other Threat', icon: AlertOctagon, color: '#c084fc', bgColor: '#3b0764' },
];

const URGENT_NEEDS: Array<{ id: UrgentNeed; label: string }> = [
  { id: 'medical', label: 'Medical Aid' },
  { id: 'boat', label: 'Rescue Boat' },
  { id: 'food', label: 'Food Ration' },
  { id: 'clean_water', label: 'Clean Water' },
  { id: 'infant_care', label: 'Infant / Elderly Care' },
];

export const SOSForm: React.FC<SOSFormProps> = ({
  isOnline,
  onSubmitted,
  onQueueUpdated,
}) => {
  const [category, setCategory] = useState<IncidentCategory>('flood');
  const [description, setDescription] = useState<string>('');
  const [peopleAffected, setPeopleAffected] = useState<number>(1);
  const [urgentNeeds, setUrgentNeeds] = useState<UrgentNeed[]>([]);
  const [contactMethod, setContactMethod] = useState<ContactMethod>('none');
  const [contactValue, setContactValue] = useState<string>('');
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    location,
    loading: geoLoading,
    error: geoError,
    captureLocation,
    setManualLocation,
  } = useGeolocation();

  const toggleUrgentNeed = (need: UrgentNeed) => {
    setUrgentNeeds((prev) =>
      prev.includes(need) ? prev.filter((item) => item !== need) : [...prev, need]
    );
  };

  const handleManualCoordinateChange = (latVal: string, lngVal: string) => {
    setManualLat(latVal);
    setManualLng(lngVal);
    const parsedLat = parseFloat(latVal);
    const parsedLng = parseFloat(lngVal);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      setManualLocation({
        lat: parsedLat,
        lng: parsedLng,
        label: 'Manual Coordinate Entry',
      });
    }
  };

  const voice = useVoiceRecorder(15);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    const currentLocation = location || {
      lat: parseFloat(manualLat) || 0,
      lng: parseFloat(manualLng) || 0,
      label: 'Unspecified Pin',
    };

    const finalDescription = description.trim() || (voice.audioBase64 ? 'Voice SOS Audio Message Recorded' : '');

    const payloadCandidate = {
      category,
      description: finalDescription,
      location: currentLocation,
      peopleAffected: Number(peopleAffected),
      urgentNeeds,
      audioBlob: voice.audioBase64 || undefined,
      reporter: {
        contactMethod,
        contactValue: contactValue.trim() || undefined,
      },
    };

    const validationResult = SOSSubmissionSchema.safeParse(payloadCandidate);

    if (!validationResult.success) {
      const messages = validationResult.error.errors.map(
        (err) => `${err.path.join('.') || 'Form'}: ${err.message}`
      );
      setFormErrors(messages);
      return;
    }

    const validPayload = validationResult.data;
    setIsSubmitting(true);

    // If offline, or if online POST fails, enqueue directly into IndexedDB
    if (!isOnline) {
      try {
        const queued = await enqueueIncident(validPayload);
        if (onQueueUpdated) onQueueUpdated();
        onSubmitted({
          id: queued.localId,
          category,
          payload: validPayload,
          isLocal: true,
        });
      } catch {
        setFormErrors(['Failed to save report to local emergency cache. Please retry.']);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      if (response.status === 201 || response.status === 200) {
        const data = (await response.json()) as { id?: string; incident?: { id?: string } };
        const serverId = data.id || data.incident?.id || `srv-${Date.now()}`;
        onSubmitted({
          id: serverId,
          category,
          payload: validPayload,
          isLocal: false,
        });
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch {
      // Fallback: Enqueue locally if network fails unexpectedly
      try {
        const queued = await enqueueIncident(validPayload);
        if (onQueueUpdated) onQueueUpdated();
        onSubmitted({
          id: queued.localId,
          category,
          payload: validPayload,
          isLocal: true,
        });
      } catch {
        setFormErrors(['Network failed and unable to save to local cache.']);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Distress SOS Submission Form"
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      {/* Emergency Header */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            letterSpacing: '-0.02em',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
            }}
            className="beacon-pulse"
          />
          EMERGENCY DISTRESS SOS
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '6px' }}>
          Transmit immediate location and hazard details to nearby rescue responders.
        </p>
      </div>

      {/* Validation Errors Display */}
      {formErrors.length > 0 && (
        <div
          role="alert"
          style={{
            backgroundColor: '#450a0a',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '14px 16px',
            color: '#fecaca',
            fontSize: '14px',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>Please complete the following:</div>
          <ul style={{ paddingLeft: '20px' }}>
            {formErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 1: Hazard Category */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#cbd5e1',
            marginBottom: '10px',
          }}
        >
          1. Select Hazard Category
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '12px',
          }}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className="touch-target-large"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 12px',
                  borderRadius: '12px',
                  border: `2px solid ${isSelected ? cat.color : '#2a364f'}`,
                  backgroundColor: isSelected ? cat.bgColor : '#121826',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 0 15px ${cat.color}40` : 'none',
                }}
              >
                <Icon size={32} color={isSelected ? cat.color : '#94a3b8'} />
                <span style={{ fontSize: '15px', fontWeight: 700 }}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Immediate Situation Description */}
      <div>
        <label
          htmlFor="sos-description"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#cbd5e1',
            marginBottom: '8px',
          }}
        >
          2. Describe Immediate Threat / Trapped State
        </label>
        <textarea
          id="sos-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Water at ceiling level, 3 people trapped in attic, power lines down outside..."
          rows={3}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: '2px solid #2a364f',
            backgroundColor: '#121826',
            color: '#ffffff',
            fontSize: '16px',
            resize: 'vertical',
            outline: 'none',
          }}
        />

        {/* 1-Tap Voice Distress Recording */}
        <div style={{ marginTop: '10px' }}>
          {!voice.audioUrl ? (
            <button
              type="button"
              onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `2px solid ${voice.isRecording ? '#ef4444' : '#3b82f6'}`,
                backgroundColor: voice.isRecording ? '#7f1d1d' : '#1e293b',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {voice.isRecording ? (
                <>
                  <Square size={16} color="#ffffff" />
                  <span
                    className="beacon-pulse"
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                    }}
                  />
                  <span>Recording Voice SOS ({voice.recordingDuration}s / 15s) - Click to Finish</span>
                </>
              ) : (
                <>
                  <Mic size={18} color="#60a5fa" />
                  <span>1-Tap: Record Voice Distress (15s Max for Trapped Victims)</span>
                </>
              )}
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#064e3b',
                border: '1px solid #059669',
                borderRadius: '8px',
                color: '#ecfdf5',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#34d399" />
                <span>Voice SOS Ready ({voice.recordingDuration}s)</span>
                <audio src={voice.audioUrl} controls style={{ height: '28px', maxWidth: '200px' }} />
              </div>
              <button
                type="button"
                onClick={voice.clearRecording}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <Trash2 size={14} />
                Discard
              </button>
            </div>
          )}

          {voice.error && (
            <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '6px' }}>
              {voice.error}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Location Capture */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#cbd5e1',
            marginBottom: '8px',
          }}
        >
          3. Emergency Location (GPS or Manual)
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={captureLocation}
            disabled={geoLoading}
            className="touch-target-large"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              backgroundColor: '#1e293b',
              border: `2px solid ${location ? '#10b981' : '#3b82f6'}`,
              color: '#ffffff',
              borderRadius: '8px',
              padding: '14px 20px',
              fontWeight: 700,
              fontSize: '16px',
              cursor: geoLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {geoLoading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Acquiring High-Accuracy GPS Fix...</span>
              </>
            ) : location ? (
              <>
                <Check size={20} color="#10b981" />
                <span>GPS Locked: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
              </>
            ) : (
              <>
                <MapPin size={20} color="#60a5fa" />
                <span>1-Tap: Capture Browser GPS Coordinates</span>
              </>
            )}
          </button>

          {geoError && (
            <div style={{ color: '#fca5a5', fontSize: '13px', padding: '4px 8px' }}>
              {geoError}
            </div>
          )}

          {/* Manual Coordinate fallback fields */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px',
              backgroundColor: '#121826',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
            }}
          >
            <div>
              <label
                htmlFor="manual-lat"
                style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}
              >
                Latitude
              </label>
              <input
                id="manual-lat"
                type="number"
                step="any"
                placeholder={location ? String(location.lat) : 'e.g. 37.7749'}
                value={manualLat}
                onChange={(e) => handleManualCoordinateChange(e.target.value, manualLng)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #2a364f',
                  backgroundColor: '#0a0d14',
                  color: '#ffffff',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="manual-lng"
                style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}
              >
                Longitude (lng)
              </label>
              <input
                id="manual-lng"
                type="number"
                step="any"
                placeholder={location ? String(location.lng) : 'e.g. -122.4194'}
                value={manualLng}
                onChange={(e) => handleManualCoordinateChange(manualLat, e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #2a364f',
                  backgroundColor: '#0a0d14',
                  color: '#ffffff',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: People Affected Stepper */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#cbd5e1',
            marginBottom: '8px',
          }}
        >
          4. Number of People Affected
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#121826',
            border: '2px solid #2a364f',
            borderRadius: '8px',
            padding: '8px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
            <Users size={20} />
            <span style={{ fontSize: '15px' }}>Total Individuals with you:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setPeopleAffected((prev) => Math.max(1, prev - 1))}
              aria-label="Decrease people affected"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={18} />
            </button>

            <span style={{ fontSize: '20px', fontWeight: 800, minWidth: '32px', textAlign: 'center' }}>
              {peopleAffected}
            </span>

            <button
              type="button"
              onClick={() => setPeopleAffected((prev) => prev + 1)}
              aria-label="Increase people affected"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Step 5: Urgent Needs Multi-Select */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#cbd5e1',
            marginBottom: '8px',
          }}
        >
          5. Urgent Resource Needs (Select All That Apply)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {URGENT_NEEDS.map((need) => {
            const isSelected = urgentNeeds.includes(need.id);
            return (
              <button
                key={need.id}
                type="button"
                onClick={() => toggleUrgentNeed(need.id)}
                style={{
                  padding: '12px 18px',
                  borderRadius: '24px',
                  border: `2px solid ${isSelected ? '#f59e0b' : '#334155'}`,
                  backgroundColor: isSelected ? '#78350f' : '#121826',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Check size={16} color="#fbbf24" />}
                {need.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 6: Reporter Contact (Optional) */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#cbd5e1',
            marginBottom: '8px',
          }}
        >
          6. Contact Method for Rescuers (Optional)
        </label>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: '#121826',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid #1e293b',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['none', 'phone', 'email'] as ContactMethod[]).map((method) => {
              const isSelected = contactMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setContactMethod(method)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${isSelected ? '#3b82f6' : '#334155'}`,
                    backgroundColor: isSelected ? '#1e3a8a' : '#0a0d14',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {method === 'phone' && <Phone size={14} />}
                  {method === 'email' && <Mail size={14} />}
                  {method === 'none' && <HelpCircle size={14} />}
                  {method === 'none' ? 'No Contact' : method.toUpperCase()}
                </button>
              );
            })}
          </div>

          {contactMethod !== 'none' && (
            <input
              type={contactMethod === 'email' ? 'email' : 'tel'}
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder={
                contactMethod === 'phone'
                  ? 'Enter phone number (e.g. +1 555-0199)'
                  : 'Enter email address'
              }
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #2a364f',
                backgroundColor: '#0a0d14',
                color: '#ffffff',
                fontSize: '14px',
              }}
            />
          )}
        </div>
      </div>

      {/* Transmit SOS Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="touch-target-large"
        style={{
          backgroundColor: '#dc2626',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          padding: '18px 24px',
          fontSize: '20px',
          fontWeight: 900,
          letterSpacing: '0.04em',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 8px 24px rgba(220, 38, 38, 0.45)',
          transition: 'transform 0.1s ease, background-color 0.15s ease',
        }}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>TRANSMITTING DISTRESS SIGNAL...</span>
          </>
        ) : (
          <>
            <Send size={24} />
            <span>TRANSMIT DISTRESS SOS</span>
          </>
        )}
      </button>
    </form>
  );
};
