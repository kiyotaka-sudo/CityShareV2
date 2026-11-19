import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Api } from '../api';

export const CLE_ECONOMIE = 'mboaride.economieBatterie';

/**
 * Envoi de la position du chauffeur : toutes les 5 s (BNF-01), ou toutes les 15 s avec une précision réduite
 * en mode économie de batterie (BNF-04). Les envois échoués sont simplement ignorés (le suivant les remplace).
 */
export function useEnvoiPosition(actif: boolean, surPosition?: (lat: number, lng: number) => void) {
  const rappel = useRef(surPosition);
  rappel.current = surPosition;

  useEffect(() => {
    if (!actif) return undefined;
    let abonnement: Location.LocationSubscription | null = null;
    let annule = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || annule) return;
      const economie = (await AsyncStorage.getItem(CLE_ECONOMIE)) === 'true';
      abonnement = await Location.watchPositionAsync(
        {
          accuracy: economie ? Location.Accuracy.Balanced : Location.Accuracy.High,
          timeInterval: economie ? 15000 : 5000,
          distanceInterval: economie ? 50 : 10
        },
        (p) => {
          const { latitude, longitude } = p.coords;
          rappel.current?.(latitude, longitude);
          Api.chauffeur.position(latitude, longitude).catch(() => undefined);
        }
      );
    })();
    return () => {
      annule = true;
      abonnement?.remove();
    };
  }, [actif]);
}
