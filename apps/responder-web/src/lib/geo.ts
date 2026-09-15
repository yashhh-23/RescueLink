const EARTH_RADIUS_METERS = 6371000;

/** Great-circle distance between two lat/lng points, in meters. */
export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Rough time-to-scene estimate. There is no real routing/traffic data
 * behind this — it is a straight-line distance divided by an assumed
 * average field-unit speed, clearly labeled as an estimate in the UI.
 */
const ASSUMED_UNIT_SPEED_KMH = 25;

export function estimateEtaMinutes(meters: number): number {
  const km = meters / 1000;
  const hours = km / ASSUMED_UNIT_SPEED_KMH;
  return Math.max(1, Math.round(hours * 60));
}

/** Point-in-circle test for a drawn circular geofence. */
export function isPointInCircle(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusMeters: number
): boolean {
  return haversineDistanceMeters(point, center) <= radiusMeters;
}

/**
 * Point-in-polygon test (ray casting) for a drawn polygon geofence.
 * `polygon` is a list of { lat, lng } vertices, not necessarily closed.
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const vi = polygon[i];
    const vj = polygon[j];
    if (!vi || !vj) continue;

    const intersects =
      vi.lng > point.lng !== vj.lng > point.lng &&
      point.lat < ((vj.lat - vi.lat) * (point.lng - vi.lng)) / (vj.lng - vi.lng) + vi.lat;

    if (intersects) inside = !inside;
  }
  return inside;
}
