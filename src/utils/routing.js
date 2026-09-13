const ORS_KEY = import.meta.env.VITE_ORS_API_KEY;

// NOTE: OpenRouteService migrated from api.openrouteservice.org to api.heigit.org.
// The old host still works today but will be removed — we use the new one.
const ORS_BASE = 'https://api.openrouteservice.org';

/**
 * Fetch a driving route between two points.
 * @param {{lat:number,lng:number}} from
 * @param {{lat:number,lng:number}} to
 * @returns {Promise<{coordinates:[number,number][], distanceKm:number, durationMin:number}>}
 */
export async function fetchRoute(from, to) {
  if (!ORS_KEY) {
    throw new Error(
      'Directions are not configured. Add VITE_ORS_API_KEY to your .env file.'
    );
  }

  const url = `${ORS_BASE}/v2/directions/driving-car/geojson`;
  const body = {
    coordinates: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: ORS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Routing failed (${res.status}). ${text}`);
  }

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error('No route found.');

  const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const summary = feature.properties.summary;

  return {
    coordinates: coords,
    distanceKm: summary.distance / 1000,
    durationMin: Math.round(summary.duration / 60),
  };
}