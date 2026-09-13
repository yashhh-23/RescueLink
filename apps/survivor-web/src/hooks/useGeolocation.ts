'use client';

import { useState, useCallback } from 'react';
import type { Location } from '@/lib/validation';

export interface GeolocationState {
  location: Location | null;
  loading: boolean;
  error: string | null;
  accuracy: number | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: false,
    error: null,
    accuracy: null,
  });

  const captureLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported by your browser. Please enter coordinates manually.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setState({
          location: {
            lat: parseFloat(latitude.toFixed(6)),
            lng: parseFloat(longitude.toFixed(6)),
            label: 'GPS Auto-Detected',
          },
          loading: false,
          error: null,
          accuracy: Math.round(accuracy),
        });
      },
      (err) => {
        let message = 'Unable to retrieve location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location access was denied. Please allow permissions or enter manually.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'GPS signal unavailable. Move to an open area or enter manually.';
            break;
          case err.TIMEOUT:
            message = 'GPS request timed out. Retrying or enter manually.';
            break;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      },
      options
    );
  }, []);

  const setManualLocation = useCallback((location: Location) => {
    setState({
      location,
      loading: false,
      error: null,
      accuracy: null,
    });
  }, []);

  const clearLocation = useCallback(() => {
    setState({
      location: null,
      loading: false,
      error: null,
      accuracy: null,
    });
  }, []);

  return {
    ...state,
    captureLocation,
    setManualLocation,
    clearLocation,
  };
}
