import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface Coord { lat: number; lng: number }

/** Position actuelle de l'appareil (une lecture, puis rafraîchissable). */
export function usePosition() {
  const [position, setPosition] = useState<Coord | null>(null);
  const [refusee, setRefusee] = useState(false);

  const actualiser = useCallback(async (): Promise<Coord | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setRefusee(true);
      return null;
    }
    const derniere = await Location.getLastKnownPositionAsync();
    if (derniere) setPosition({ lat: derniere.coords.latitude, lng: derniere.coords.longitude });
    try {
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: p.coords.latitude, lng: p.coords.longitude };
      setPosition(c);
      return c;
    } catch {
      return derniere ? { lat: derniere.coords.latitude, lng: derniere.coords.longitude } : null;
    }
  }, []);

  useEffect(() => {
    actualiser();
  }, [actualiser]);

  return { position, refusee, actualiser };
}
