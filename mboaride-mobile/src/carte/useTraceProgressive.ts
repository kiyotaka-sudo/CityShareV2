import { useEffect, useRef, useState } from 'react';
import type { Coord } from './geo';

/**
 * Fait « dessiner » un itinéraire du départ vers l'arrivée en ~900 ms quand il change (moment 3 du plan).
 * Renvoie la portion visible du tracé.
 */
export function useTraceProgressive(trace: Coord[] | undefined, actif: boolean, dureeMs = 900): Coord[] | undefined {
  const [visible, setVisible] = useState<Coord[] | undefined>(actif ? [] : trace);
  const cle = useRef('');
  useEffect(() => {
    if (!trace || trace.length < 2 || !actif) {
      setVisible(trace);
      return undefined;
    }
    const nouvelleCle = `${trace.length}:${trace[0].lat}:${trace[trace.length - 1].lng}`;
    if (nouvelleCle === cle.current) return undefined;
    cle.current = nouvelleCle;
    const debut = Date.now();
    let raf = 0;
    const etape = () => {
      const p = Math.min(1, (Date.now() - debut) / dureeMs);
      const ease = 1 - (1 - p) ** 3;
      setVisible(trace.slice(0, Math.max(2, Math.ceil(trace.length * ease))));
      if (p < 1) raf = requestAnimationFrame(etape);
    };
    raf = requestAnimationFrame(etape);
    return () => cancelAnimationFrame(raf);
  }, [trace, actif, dureeMs]);
  return visible;
}
