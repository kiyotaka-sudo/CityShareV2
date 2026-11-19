/** Calculs géographiques côté application (animation des véhicules sur la carte). */
export type Coord = { lat: number; lng: number };

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance en mètres (haversine). */
export function distanceM(a: Coord, b: Coord): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cap de a vers b en degrés (0 = nord, sens horaire). */
export function cap(a: Coord, b: Coord): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Rotation par le plus court chemin : de 350° vers 10°, on tourne de +20°, pas de -340°. */
export function angleInterpole(de: number, vers: number, t: number): number {
  const delta = ((vers - de + 540) % 360) - 180;
  return (de + delta * t + 360) % 360;
}

export function lerp(a: Coord, b: Coord, t: number): Coord {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/** Projection d'un point sur une polyligne : distance cumulée (m) depuis le début et écart (m) à la ligne. */
export function projeter(trace: Coord[], p: Coord): { abscisse: number; ecart: number } {
  let meilleur = { abscisse: 0, ecart: Infinity };
  let cumul = 0;
  for (let i = 0; i < trace.length - 1; i++) {
    const a = trace[i];
    const b = trace[i + 1];
    const longueur = distanceM(a, b);
    // projection plane locale (suffisante à l'échelle d'une rue)
    const kx = Math.cos(rad(a.lat));
    const ax = 0, ay = 0;
    const bx = (b.lng - a.lng) * kx, by = b.lat - a.lat;
    const px = (p.lng - a.lng) * kx, py = p.lat - a.lat;
    const l2 = bx * bx + by * by;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * bx + (py - ay) * by) / l2));
    const proj = lerp(a, b, t);
    const ecart = distanceM(proj, p);
    if (ecart < meilleur.ecart) meilleur = { abscisse: cumul + longueur * t, ecart };
    cumul += longueur;
  }
  return meilleur;
}

/** Point situé à une distance cumulée donnée le long de la polyligne, avec le cap du segment. */
export function pointA(trace: Coord[], abscisse: number): { point: Coord; cap: number } {
  let cumul = 0;
  for (let i = 0; i < trace.length - 1; i++) {
    const longueur = distanceM(trace[i], trace[i + 1]);
    if (cumul + longueur >= abscisse || i === trace.length - 2) {
      const t = longueur === 0 ? 0 : Math.max(0, Math.min(1, (abscisse - cumul) / longueur));
      return { point: lerp(trace[i], trace[i + 1], t), cap: cap(trace[i], trace[i + 1]) };
    }
    cumul += longueur;
  }
  return { point: trace[trace.length - 1], cap: 0 };
}

/** Partie d'un tracé déjà parcourue (jusqu'à la position du véhicule) et partie restante. */
export function couperTrace(trace: Coord[], position: Coord): { parcouru: Coord[]; restant: Coord[] } {
  if (trace.length < 2) return { parcouru: [], restant: trace };
  const { abscisse } = projeter(trace, position);
  const parcouru: Coord[] = [trace[0]];
  const restant: Coord[] = [];
  let cumul = 0;
  for (let i = 0; i < trace.length - 1; i++) {
    const longueur = distanceM(trace[i], trace[i + 1]);
    if (cumul + longueur < abscisse) {
      parcouru.push(trace[i + 1]);
    } else {
      const coupe = pointA(trace, abscisse).point;
      parcouru.push(coupe);
      restant.push(coupe, ...trace.slice(i + 1));
      break;
    }
    cumul += longueur;
  }
  return { parcouru, restant: restant.length ? restant : [trace[trace.length - 1]] };
}

/** Longueur totale d'une polyligne en mètres. */
export function longueurTrace(trace: Coord[]): number {
  let total = 0;
  for (let i = 0; i < trace.length - 1; i++) total += distanceM(trace[i], trace[i + 1]);
  return total;
}
