// Known brand → domain mappings (extend as needed)
const KNOWN_DOMAINS = {
  'jollibee': 'jollibee.com',
  'mcdonalds': 'mcdonalds.com',
  "mcdonald's": 'mcdonalds.com',
  'starbucks': 'starbucks.com',
  'sm': 'sm.com.ph',
  'sm city': 'sm.com.ph',
  'chooks to go': 'chookstogo.com',
  'chooks': 'chookstogo.com',
  'mercury drug': 'mercurydrug.com',
  'watsons': 'watsons.com.ph',
  'bdo': 'bdo.com.ph',
  'bpi': 'bpi.com.ph',
  'landbank': 'landbank.com',
  'petron': 'petron.com',
  'shell': 'shell.com.ph',
  'bos coffee': "boscoffee.com",
  'cafe aguinaldo': 'cafeaguinaldo.com',
  'hotel marciano': 'hotelmarciano.com',
  'uplb': 'uplb.edu.ph',
};

/**
 * Try to guess a brand's domain from its name.
 * Returns null if we can't make a reasonable guess.
 */
export function guessDomain(brand) {
  if (!brand) return null;
  const key = brand.toLowerCase().trim();

  if (KNOWN_DOMAINS[key]) return KNOWN_DOMAINS[key];

  // Fallback: if the brand looks like a single word with no spaces,
  // try brandname.com as a guess.
  const cleaned = key.replace(/[^a-z0-9]/g, '');
  if (cleaned.length >= 3 && cleaned.length <= 20 && !brand.includes(' ')) {
    return `${cleaned}.com`;
  }

  return null;
}

/**
 * Return a logo URL for a brand, or null if we can't guess one.
 * Uses Google's public favicon service (free, no key).
 */
export function getBrandLogoUrl(brand) {
  const domain = guessDomain(brand);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}