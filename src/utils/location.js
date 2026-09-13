// Distance, hours, and filtering helpers.

// Haversine distance in km
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function formatKm(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// Normalize a search query against a place
export function matchesQuery(place, query) {
  if (!query || !query.trim()) return true;
  const q = query.trim().toLowerCase();
  const haystack = [
    place.name,
    place.brand,
    place.category,
    ...(place.keywords || []),
    place.address,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  // every word in query must appear
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

// "HH:MM" -> minutes since midnight
function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function isOpenNow(hours, now = new Date()) {
  if (!hours) return null;
  if (!hours.days.includes(now.getDay())) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = toMin(hours.open);
  let close = toMin(hours.close);
  // handle overnight (e.g. 00:00 - 23:59 stays same-day)
  if (close === 0) close = 24 * 60;
  if (close <= open) close += 24 * 60;
  const m = mins < open ? mins + 24 * 60 : mins;
  return m >= open && m <= close;
}

export function formatHours(hours) {
  if (!hours) return '';
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  if (hours.open === '00:00' && hours.close === '23:59') return 'Open 24 hours';
  return `${fmt(hours.open)} – ${fmt(hours.close)}`;
}

export function todayName() {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
}

// Apply filters to a list of results (each must have _distance set if user located)
export function applyFilters(list, { filter }) {
  let out = [...list];
  if (filter === 'open') out = out.filter((p) => isOpenNow(p.hours));
  if (filter === 'rated') out.sort((a, b) => b.rating - a.rating);
  if (filter === 'nearest') {
    out.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
  }
  return out;
}