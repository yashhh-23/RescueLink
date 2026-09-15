'use client';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  return audioContext;
}

/**
 * Two-tone alert chime for new critical/fire incidents. Synthesized (no MP3
 * asset), matching the approach survivor-web uses for its evacuation chime.
 * Silently no-ops if the browser blocks audio before a user gesture, or in
 * environments without Web Audio support (e.g. some test runners).
 */
export function playCriticalAlertChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [880, 660].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.22);
      gain.gain.setValueAtTime(0.0001, now + index * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.2, now + index * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.22 + 0.2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + index * 0.22);
      oscillator.stop(now + index * 0.22 + 0.22);
    });
  } catch {
    // Audio is a nice-to-have alert channel, never worth crashing over.
  }
}
