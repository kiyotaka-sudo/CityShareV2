/**
 * Géocodage OpenStreetMap (Nominatim) limité au Cameroun, avec cache mémoire.
 * Complète la base de repères locaux quand l'adresse cherchée n'y figure pas.
 */
export interface Lieu { lat: number; lng: number; adresse: string }

const cache = new Map<string, Lieu[]>();

export async function rechercherAdresse(q: string): Promise<Lieu[]> {
  const cle = q.trim().toLowerCase();
  if (cle.length < 3) return [];
  if (cache.has(cle)) return cache.get(cle)!;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=cm&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'MboaRide/1.0' } });
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const lieux = data.map((d) => ({ lat: Number(d.lat), lng: Number(d.lon), adresse: d.display_name.split(',').slice(0, 3).join(',') }));
    cache.set(cle, lieux);
    return lieux;
  } catch {
    return [];
  }
}

export async function adresseInverse(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'MboaRide/1.0' } });
    const d = (await res.json()) as { display_name?: string; address?: Record<string, string> };
    const a = d.address ?? {};
    const parties = [a.road, a.neighbourhood || a.suburb, a.city || a.town].filter(Boolean);
    return parties.length ? parties.join(', ') : (d.display_name ?? '').split(',').slice(0, 2).join(',');
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
