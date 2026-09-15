'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useScreenBeacon() {
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [strobeColor, setStrobeColor] = useState<'#ffffff' | '#000000'>('#000000');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoShutoffRef = useRef<NodeJS.Timeout | null>(null);

  // Play a short acoustic whistle burst via Web Audio API
  const playWhistleBurst = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio context may be restricted in non-user-initiated contexts
    }
  }, []);

  const stopBeacon = useCallback(() => {
    setIsBeaconActive(false);
    setStrobeColor('#000000');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoShutoffRef.current) {
      clearTimeout(autoShutoffRef.current);
      autoShutoffRef.current = null;
    }
  }, []);

  const startBeacon = useCallback(() => {
    setIsBeaconActive(true);
    let flashCount = 0;

    // Strobe interval: 250ms pulse
    timerRef.current = setInterval(() => {
      setStrobeColor((prev) => (prev === '#000000' ? '#ffffff' : '#000000'));
      flashCount++;

      // Every 6 flashes (~1.5s), emit an alpine acoustic whistle burst
      if (flashCount % 6 === 0) {
        playWhistleBurst();
      }
    }, 250);

    // Auto-shutoff after 3 minutes to prevent battery drain
    autoShutoffRef.current = setTimeout(() => {
      stopBeacon();
    }, 180000);
  }, [playWhistleBurst, stopBeacon]);

  const toggleBeacon = useCallback(() => {
    if (isBeaconActive) {
      stopBeacon();
    } else {
      startBeacon();
    }
  }, [isBeaconActive, startBeacon, stopBeacon]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoShutoffRef.current) clearTimeout(autoShutoffRef.current);
    };
  }, []);

  return {
    isBeaconActive,
    toggleBeacon,
    startBeacon,
    stopBeacon,
    strobeColor,
  };
}
