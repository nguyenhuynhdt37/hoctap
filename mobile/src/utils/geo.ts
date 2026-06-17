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
    // Try freeipapi.com first with a standard User-Agent header
    const response = await axios.get(`https://freeipapi.com/api/json/${ip}`, {
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });
    const data = response.data;

    const location: IPLocation = {
      city: data.cityName || 'Unknown City',
      region: data.regionName || 'Unknown Region',
      country: data.countryName || 'Unknown Country',
      countryCode: data.countryCode || 'UN',
    };

    locationCache.set(ip, location);
    return location;
  } catch (error: any) {
    // Fallback to ipapi.co
    try {
      const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 3000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      const data = response.data;
      
      const location: IPLocation = {
        city: data.city || 'Unknown City',
        region: data.region || 'Unknown Region',
        country: data.country_name || 'Unknown Country',
        countryCode: data.country_code || 'UN',
      };

      locationCache.set(ip, location);
      return location;
    } catch (fallbackError: any) {
      console.warn(`⚠️ [Geo] Failed to resolve IP ${ip} (freeipapi: ${error.message || error}, ipapi.co: ${fallbackError.message || fallbackError})`);
      return null;
    }
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
