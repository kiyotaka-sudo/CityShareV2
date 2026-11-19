import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { angleInterpole, cap as calculerCap, Coord, distanceM, lerp, pointA, projeter } from './geo';
import { DUREE_ANIMATION_MS, TypeVehiculeCarte, VehiculeCarte } from './types';

export interface VehiculeAffiche extends Coord {
  id: string;
  type: TypeVehiculeCarte;
  cap: number;
}

interface Etat {
  type: TypeVehiculeCarte;
  depart: Coord;
  cible: Coord;
  capDepart: number;
  capCible: number;
  debut: number;
  courant: VehiculeAffiche;
  /** Abscisses sur l'itinéraire si le véhicule y est aimanté. */
  surTrace?: { de: number; vers: number };
  /** Animation terminée et dernière position déjà affichée. */
  fini: boolean;
}

/** Au-delà de cette distance (téléportation, reconnexion), le véhicule est replacé sans animation. */
const SAUT_MAX_M = 2000;
/** Distance maximale à l'itinéraire pour considérer que le véhicule le suit. */
const ECART_TRACE_M = 60;
const IMAGE_MS = 33; // ~30 images/s : fluide et économe en batterie

/**
 * Anime les véhicules entre deux positions GPS (reçues toutes les ~5 s) : vitesse constante,
 * glissement le long de l'itinéraire quand il est connu, rotation par le plus court chemin.
 * Respecte le réglage « Réduire les animations » du téléphone.
 */
export function useVehiculesAnimes(vehicules: VehiculeCarte[], trace?: Coord[], aimanterId?: string): VehiculeAffiche[] {
  const etats = useRef(new Map<string, Etat>());
  const [affiches, setAffiches] = useState<VehiculeAffiche[]>([]);
  const reduire = useRef(false);
  const traceRef = useRef(trace);
  traceRef.current = trace;
  const raf = useRef<number | null>(null);
  const derniere = useRef(0);

  /** Boucle d'animation : démarrée à chaque nouvelle cible, arrêtée dès que tout est immobile. */
  const demarrer = () => {
    if (raf.current !== null) return;
    const image = (t: number) => {
      if (t - derniere.current < IMAGE_MS) {
        raf.current = requestAnimationFrame(image);
        return;
      }
      derniere.current = t;
      const maintenant = Date.now();
      let change = false;
      const tr = traceRef.current;
      for (const [id, e] of etats.current) {
        if (e.fini) continue;
        const p = Math.min(1, (maintenant - e.debut) / DUREE_ANIMATION_MS);
        let position: Coord;
        let capCourant: number;
        if (e.surTrace && tr && tr.length > 1) {
          const pt = pointA(tr, e.surTrace.de + (e.surTrace.vers - e.surTrace.de) * p);
          position = pt.point;
          capCourant = angleInterpole(e.courant.cap, pt.cap, 0.25); // virages lissés
        } else {
          position = lerp(e.depart, e.cible, p);
          // le véhicule braque sur le premier quart du trajet puis avance, comme une vraie voiture
          capCourant = angleInterpole(e.capDepart, e.capCible, Math.min(1, p * 4));
        }
        e.courant = { id, type: e.type, lat: position.lat, lng: position.lng, cap: capCourant };
        e.fini = p >= 1;
        change = true;
      }
      if (change) setAffiches([...etats.current.values()].map((e) => e.courant));
      raf.current = change ? requestAnimationFrame(image) : null;
    };
    raf.current = requestAnimationFrame(image);
  };

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduire.current = v; }).catch(() => undefined);
  }, []);

  // Nouvelles cibles
  useEffect(() => {
    const maintenant = Date.now();
    const vus = new Set<string>();
    for (const v of vehicules) {
      vus.add(v.id);
      const e = etats.current.get(v.id);
      const cible = { lat: v.lat, lng: v.lng };
      if (!e) {
        const capInitial = v.cap ?? 0;
        etats.current.set(v.id, {
          type: v.type, depart: cible, cible, capDepart: capInitial, capCible: capInitial, debut: maintenant,
          courant: { id: v.id, type: v.type, lat: v.lat, lng: v.lng, cap: capInitial }, fini: true
        });
        continue;
      }
      if (e.cible.lat === cible.lat && e.cible.lng === cible.lng && e.type === v.type) continue;
      const depart = { lat: e.courant.lat, lng: e.courant.lng };
      const deplacement = distanceM(depart, cible);
      const saut = deplacement > SAUT_MAX_M || reduire.current;
      let capCible = v.cap ?? (deplacement > 3 ? calculerCap(depart, cible) : e.courant.cap);
      let surTrace: Etat['surTrace'];
      if (!saut && trace && trace.length > 1 && v.id === aimanterId) {
        const pd = projeter(trace, depart);
        const pc = projeter(trace, cible);
        if (pd.ecart < ECART_TRACE_M && pc.ecart < ECART_TRACE_M && pc.abscisse >= pd.abscisse) {
          surTrace = { de: pd.abscisse, vers: pc.abscisse };
          capCible = pointA(trace, pc.abscisse).cap;
        }
      }
      etats.current.set(v.id, {
        type: v.type, depart: saut ? cible : depart, cible, capDepart: saut ? capCible : e.courant.cap, capCible,
        debut: maintenant, courant: e.courant, surTrace, fini: false
      });
    }
    for (const id of [...etats.current.keys()]) if (!vus.has(id)) etats.current.delete(id);
    setAffiches([...etats.current.values()].map((e) => e.courant));
    demarrer();
  }, [vehicules, trace, aimanterId]); // eslint-disable-line react-hooks/exhaustive-deps


  return affiches;
}
