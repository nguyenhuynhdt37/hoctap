import axios from 'axios';

export interface IPLocation {
  city: string;
  region: string;
  country: string;
  countryCode: string;
}

const locationCache = new Map<string, IPLocation>();

export async function resolveIPLocation(ip: string): Promise<IPLocation | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return { city: 'Local', region: 'Network', country: 'Internal', countryCode: 'LOC' };
  }

  if (locationCache.has(ip)) {
    return locationCache.get(ip)!;
  }

  try {
    // Using freeipapi.com (free, no key for basic usage)
    const response = await axios.get(`https://freeipapi.com/api/json/${ip}`, { timeout: 3000 });
    const data = response.data;

    const location: IPLocation = {
      city: data.cityName || 'Unknown City',
      region: data.regionName || 'Unknown Region',
      country: data.countryName || 'Unknown Country',
      countryCode: data.countryCode || 'UN',
    };

    locationCache.set(ip, location);
    return location;
  } catch (error) {
    console.error(`❌ [Geo] Failed to resolve IP ${ip}:`, error);
    return null;
  }
}

export function formatLocation(loc: IPLocation | null): string {
  if (!loc) return 'Vị trí không xác định';
  if (loc.countryCode === 'LOC') return 'Máy chủ nội bộ';
  
  const parts = [];
  if (loc.city && loc.city !== 'Unknown City') parts.push(loc.city);
  if (loc.region && loc.region !== 'Unknown Region') parts.push(loc.region);
  if (loc.country) parts.push(loc.country);
  
  return parts.length > 0 ? parts.join(', ') : 'Vị trí không xác định';
}
