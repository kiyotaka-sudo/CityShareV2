export interface GeocodedPoint {
  latitude: number;
  longitude: number;
  label: string;
}

const cache = new Map<string, GeocodedPoint | null>();
const routeCache = new Map<string, GeocodedPoint[]>();

function decodePolyline(encoded: string): GeocodedPoint[] {
  const points: GeocodedPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5, label: '' });
  }

  return points;
}

async function calculateRoute(points: GeocodedPoint[]): Promise<GeocodedPoint[]> {
  if (points.length < 2) {
    return points;
  }

  const routeKey = points.map((point) => `${point.latitude},${point.longitude}`).join('|');
  if (routeCache.has(routeKey)) {
    return routeCache.get(routeKey)!;
  }

  const coords = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline&steps=false`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      return points;
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route?.geometry || typeof route.geometry !== 'string') {
      return points;
    }

    const decoded = decodePolyline(route.geometry);
    if (decoded.length === 0) {
      return points;
    }

    const mapped = decoded.map((point, index) => ({
      ...point,
      label: index === 0 ? points[0].label : index === decoded.length - 1 ? points[points.length - 1].label : point.label
    }));
    routeCache.set(routeKey, mapped);
    return mapped;
  } catch {
    return points;
  }
}

export async function geocodePlace(query: string): Promise<GeocodedPoint | null> {
  if (!query) {
    return null;
  }

  const normalized = query.trim().toLowerCase();
  if (cache.has(normalized)) {
    return cache.get(normalized) ?? null;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cm&q=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CityShare/1.0'
      }
    });
    if (!response.ok) {
      cache.set(normalized, null);
      return null;
    }

    const data = (await response.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(data) || data.length === 0) {
      cache.set(normalized, null);
      return null;
    }

    const item = data[0];
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      cache.set(normalized, null);
      return null;
    }

    const result: GeocodedPoint = {
      latitude,
      longitude,
      label: query
    };
    cache.set(normalized, result);
    return result;
  } catch {
    cache.set(normalized, null);
    return null;
  }
}

export async function geocodeRouteLocations(labels: string[]): Promise<GeocodedPoint[]> {
  const points = await Promise.all(labels.map(async (label) => geocodePlace(label)));
  const valid = points.filter((point): point is GeocodedPoint => point !== null);
  return calculateRoute(valid);
}
