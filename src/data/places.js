// Geoapify-powered place search.
// Structured to mirror a real API response so it can be swapped later.
// Categories: food, coffee, shopping, bank, pharmacy, gas, hotel, school

const API_KEY = import.meta.env.VITE_PLACES_API_KEY;

export const CATEGORIES = [
  { id: 'food',     label: 'Food',         emoji: '🍔', geoapify: 'catering' },
  { id: 'coffee',   label: 'Coffee',       emoji: '☕', geoapify: 'catering.cafe' },
  { id: 'shopping', label: 'Shopping',     emoji: '🛍️', geoapify: 'commercial' },
  { id: 'bank',     label: 'Banks',        emoji: '🏦', geoapify: 'service.financial' },
  { id: 'pharmacy', label: 'Pharmacy',     emoji: '💊', geoapify: 'healthcare.pharmacy' },
  { id: 'gas',      label: 'Gas Stations', emoji: '⛽', geoapify: 'service.vehicle' },
  { id: 'hotel',    label: 'Hotels',       emoji: '🏨', geoapify: 'accommodation' },
  { id: 'school',   label: 'Schools',      emoji: '🏫', geoapify: 'education' },
];

export const POPULAR_SEARCHES = [
  'Jollibee', "McDonald's", 'SM', 'Chooks to Go', 'Starbucks', 'Mercury Drug',
];

// Default center: Los Baños, Laguna, Philippines
export const DEFAULT_CENTER = [14.1695, 121.2411];

// Broad categories sent with every text search so we don't miss results.
const BROAD_CATEGORIES = [
  'catering',
  'commercial',
  'service',
  'healthcare',
  'accommodation',
  'education',
  'entertainment',
  'tourism',
  'leisure',
  'natural',
].join(',');

// ---------- Helpers ----------

// Map Geoapify category strings back to MapFind's category ids
function mapCategory(categories = []) {
  const c = categories.join(' ').toLowerCase();
  if (c.includes('cafe')) return 'coffee';
  if (c.includes('restaurant') || c.includes('fast_food') || c.includes('catering')) return 'food';
  if (c.includes('bank') || c.includes('financial')) return 'bank';
  if (c.includes('pharmacy') || c.includes('healthcare')) return 'pharmacy';
  if (c.includes('fuel') || c.includes('vehicle')) return 'gas';
  if (c.includes('hotel') || c.includes('accommodation')) return 'hotel';
  if (c.includes('school') || c.includes('education') || c.includes('university')) return 'school';
  if (c.includes('commercial') || c.includes('shopping') || c.includes('supermarket')) return 'shopping';
  return 'shopping';
}

// Convert a Geoapify feature into MapFind's place shape
function normalize(feature) {
  const p = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [0, 0];

  return {
    id: p.place_id || `geo-${lat}-${lng}`,
    name: p.name || p.address_line1 || 'Unnamed place',
    brand: p.brand || p.name || '',
    category: mapCategory(p.categories),
    lat,
    lng,
    rating: 4.0,          // Geoapify does not return ratings — placeholder
    reviews: 0,
    address: p.address_line2 || p.formatted || '',
    phone: p.contact?.phone || null,
    hours: null,          // Geoapify returns opening_hours as a string — see note below
    description: (p.categories || []).slice(0, 3).map((s) => s.replace(/\./g, ' ')).join(' · '),
    keywords: [p.name, p.brand, ...(p.categories || [])].filter(Boolean).map((s) => String(s).toLowerCase()),
  };
}

// Try to parse Geoapify's opening_hours string into { open, close, days }
// Geoapify formats like "Mo-Fr 08:00-22:00" or "24/7". Best-effort only.
function parseHours(raw) {
  if (!raw) return null;
  if (/24\/7/i.test(raw)) {
    return { open: '00:00', close: '23:59', days: [0,1,2,3,4,5,6] };
  }
  const m = raw.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!m) return null;
  const pad = (t) => (t.length === 4 ? `0${t}` : t);
  return { open: pad(m[1]), close: pad(m[2]), days: [0,1,2,3,4,5,6] };
}

// ---------- Public API ----------

async function callGeoapify(params) {
  if (!API_KEY) {
    console.warn('[MapFind] VITE_PLACES_API_KEY is not set. No results will be returned.');
    return [];
  }

  const url = new URL('https://api.geoapify.com/v2/places');
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });
  url.searchParams.set('apiKey', API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Geoapify error ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  return (data.features || []).map((f) => {
    const place = normalize(f);
    const parsedHours = parseHours(f.properties?.opening_hours);
    if (parsedHours) place.hours = parsedHours;
    return place;
  });
}

// Rank a place against a query: 0 = best match, 4 = weak match
function relevanceScore(place, query) {
  const q = query.toLowerCase();
  const name = (place.name || '').toLowerCase();
  const brand = (place.brand || '').toLowerCase();
  if (name === q || brand === q) return 0;
  if (name.startsWith(q) || brand.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (brand.includes(q)) return 3;
  return 4;
}

// Text/brand search — used for the header search bar.
// Strategy:
//   1. Strict `name` filter, 15 km radius
//   2. Strict `name` filter, 50 km radius
//   3. Fuzzy `text` filter, then client-side sanity check on name/brand
// Results are ranked so exact-name matches float to the top.
export async function searchPlaces(query, center = DEFAULT_CENTER, radiusMeters = 15000) {
  const [lat, lng] = center;
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const strictCall = (radius) =>
    callGeoapify({
      categories: BROAD_CATEGORIES,
      name: trimmed,
      filter: `circle:${lng},${lat},${radius}`,
      limit: 30,
    });

  // 1) Strict name, tight radius
  let results = await strictCall(radiusMeters);

  // 2) Strict name, wide radius
  if (results.length === 0) {
    results = await strictCall(50000);
  }

  // 3) Fuzzy fallback, then filter out irrelevant hits
  if (results.length === 0) {
    const fuzzy = await callGeoapify({
      categories: BROAD_CATEGORIES,
      text: trimmed,
      filter: `circle:${lng},${lat},${radiusMeters}`,
      limit: 30,
    });
    const q = trimmed.toLowerCase();
    results = fuzzy.filter((p) => {
      const hay = `${p.name || ''} ${p.brand || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  results.sort((a, b) => relevanceScore(a, trimmed) - relevanceScore(b, trimmed));
  return results;
}

// Category search — used by the category buttons
export async function searchByCategory(categoryId, center = DEFAULT_CENTER, radiusMeters = 15000) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  const [lat, lng] = center;
  return callGeoapify({
    categories: cat.geoapify,
    filter: `circle:${lng},${lat},${radiusMeters}`,
    limit: 30,
  });
}