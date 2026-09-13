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

// Default center: Los Baños, Laguna, Philippines
export const DEFAULT_CENTER = [14.1695, 121.2411];

// ---------- Helpers ----------

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
    rating: 4.0,
    reviews: 0,
    address: p.address_line2 || p.formatted || '',
    phone: p.contact?.phone || null,
    hours: null,
    description: (p.categories || []).slice(0, 3).map((s) => s.replace(/\./g, ' ')).join(' · '),
    keywords: [p.name, p.brand, ...(p.categories || [])].filter(Boolean).map((s) => String(s).toLowerCase()),
  };
}

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

/**
 * Search for places within a specific category.
 * @param {string} categoryId  e.g. 'school'
 * @param {string} [query]     optional text query, scoped to this category only
 * @param {[number,number]} center
 * @param {number} radiusMeters
 */
export async function searchByCategory(
  categoryId,
  query = '',
  center = DEFAULT_CENTER,
  radiusMeters = 15000
) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  const [lat, lng] = center;
  const trimmed = (query || '').trim();

  const call = (radius, params = {}) =>
    callGeoapify({
      categories: cat.geoapify,
      filter: `circle:${lng},${lat},${radius}`,
      limit: 30,
      ...params,
    });

  // No query → just return everything in the category
  if (!trimmed) return call(radiusMeters);

  // With query → strict name first
  let results = await call(radiusMeters, { name: trimmed });

  // Widen if nothing
  if (results.length === 0) {
    results = await call(50000, { name: trimmed });
  }

  // Fuzzy fallback with client-side filter
  if (results.length === 0) {
    const fuzzy = await call(radiusMeters, { text: trimmed });
    const q = trimmed.toLowerCase();
    results = fuzzy.filter((p) => {
      const hay = `${p.name || ''} ${p.brand || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  results.sort((a, b) => relevanceScore(a, trimmed) - relevanceScore(b, trimmed));
  return results;
}