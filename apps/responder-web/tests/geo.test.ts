import { describe, expect, it } from 'vitest';
import {
  haversineDistanceMeters,
  formatDistance,
  estimateEtaMinutes,
  isPointInCircle,
  isPointInPolygon,
} from '@/lib/geo';

describe('haversineDistanceMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceMeters({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0);
  });

  it('computes a known distance (roughly) between two real cities', () => {
    // Delhi to Mumbai is roughly 1150-1160 km great-circle.
    const delhi = { lat: 28.6139, lng: 77.209 };
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const distanceKm = haversineDistanceMeters(delhi, mumbai) / 1000;
    expect(distanceKm).toBeGreaterThan(1100);
    expect(distanceKm).toBeLessThan(1250);
  });
});

describe('formatDistance', () => {
  it('shows meters under 1km', () => {
    expect(formatDistance(450)).toBe('450 m');
  });

  it('shows km with one decimal at or above 1km', () => {
    expect(formatDistance(2500)).toBe('2.5 km');
  });
});

describe('estimateEtaMinutes', () => {
  it('is never less than 1 minute for a nonzero distance', () => {
    expect(estimateEtaMinutes(100)).toBeGreaterThanOrEqual(1);
  });

  it('scales roughly linearly with distance', () => {
    const near = estimateEtaMinutes(5000);
    const far = estimateEtaMinutes(50000);
    expect(far).toBeGreaterThan(near);
  });
});

describe('isPointInCircle', () => {
  const center = { lat: 20, lng: 78 };

  it('is true for a point within the radius', () => {
    expect(isPointInCircle({ lat: 20.001, lng: 78 }, center, 500)).toBe(true);
  });

  it('is false for a point well outside the radius', () => {
    expect(isPointInCircle({ lat: 25, lng: 85 }, center, 500)).toBe(false);
  });
});

describe('isPointInPolygon', () => {
  // A simple square around (0,0) to (10,10).
  const square = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 10 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ];

  it('is true for a point inside the polygon', () => {
    expect(isPointInPolygon({ lat: 5, lng: 5 }, square)).toBe(true);
  });

  it('is false for a point outside the polygon', () => {
    expect(isPointInPolygon({ lat: 15, lng: 15 }, square)).toBe(false);
  });

  it('is false for a degenerate polygon with fewer than 3 points', () => {
    expect(isPointInPolygon({ lat: 1, lng: 1 }, [{ lat: 0, lng: 0 }])).toBe(false);
  });
});
