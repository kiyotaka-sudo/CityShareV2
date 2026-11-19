import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { fcfa } from '../../utils/format';

/** Montant qui défile jusqu'à sa nouvelle valeur (effet compteur), en 450 ms. */
export default function PrixAnime({ valeur, style, duree = 450 }: { valeur: number; style?: StyleProp<TextStyle>; duree?: number }) {
  const [affiche, setAffiche] = useState(valeur);
  const depart = useRef(valeur);
  useEffect(() => {
    const de = depart.current;
    if (de === valeur) return undefined;
    const debut = Date.now();
    let raf = 0;
    const etape = () => {
      const p = Math.min(1, (Date.now() - debut) / duree);
      const ease = 1 - (1 - p) ** 3;
      const v = Math.round(de + (valeur - de) * ease);
      setAffiche(v);
      depart.current = v;
      if (p < 1) raf = requestAnimationFrame(etape);
    };
    raf = requestAnimationFrame(etape);
    return () => cancelAnimationFrame(raf);
  }, [valeur, duree]);
  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{fcfa(affiche)}</Text>;
}
