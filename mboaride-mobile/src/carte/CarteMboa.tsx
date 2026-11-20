import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleProp, View, ViewStyle } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CarteWeb from './CarteWeb';
import type { CarteProps } from './types';
import type { Coord } from './geo';
import PressableAnime from '../components/anime/Pressable';
import { haptique } from '../components/anime/haptique';
import { couleurs, ombres } from '../theme';

export type { CarteProps, PointCarte, VehiculeCarte, ZoneChaude } from './types';

/**
 * Carte MboaRide. Dans l'application installée (version de développement ou APK), carte native MapLibre ;
 * dans Expo Go, où ce module natif n'existe pas, carte de secours Leaflet avec les mêmes fonctions.
 */
const CarteNative: React.ComponentType<CarteProps> | null =
  Constants.appOwnership === 'expo' ? null : require('./CarteNative').default; // eslint-disable-line @typescript-eslint/no-require-imports

export const CARTE_NATIVE = CarteNative !== null;

/**
 * Carte avec bouton « Ma position » : un appui ramène la carte sur la position actuelle du téléphone.
 * `boutonPosition` : false pour le masquer ; `boutonPositionBas` : distance au bas de l'écran (au-dessus d'un panneau).
 */
export default function CarteMboa({ style, boutonPosition = true, boutonPositionBas, ...props }: CarteProps & {
  style?: StyleProp<ViewStyle>; boutonPosition?: boolean; boutonPositionBas?: number;
}) {
  const { t } = useTranslation();
  const Composant = CarteNative ?? CarteWeb;
  const [recentrage, setRecentrage] = useState<(Coord & { cle: number }) | undefined>();
  const [recherche, setRecherche] = useState(false);
  const bas = boutonPositionBas ?? (props.marges?.bas ?? 0) + 16;

  const allerAMaPosition = async () => {
    haptique.leger();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('carte.positionRefuseeTitre'), t('carte.positionRefusee'));
        return;
      }
      setRecherche(true);
      // Dernière position connue : réponse immédiate, puis position précise
      const derniere = await Location.getLastKnownPositionAsync().catch(() => null);
      if (derniere) setRecentrage({ lat: derniere.coords.latitude, lng: derniere.coords.longitude, cle: Date.now() });
      const actuelle = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setRecentrage({ lat: actuelle.coords.latitude, lng: actuelle.coords.longitude, cle: Date.now() });
    } catch {
      if (!recentrage) Alert.alert(t('carte.positionIndisponibleTitre'), t('carte.positionIndisponible'));
    } finally {
      setRecherche(false);
    }
  };

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <Composant {...props} recentrage={recentrage} maPosition={recentrage ?? props.maPosition} />
      {boutonPosition && (
        <PressableAnime onPress={allerAMaPosition} echelle={0.9} vibration={null} accessibilityRole="button"
          accessibilityLabel={t('carte.maPosition')}
          style={[{ position: 'absolute', right: 16, bottom: bas, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center' }, ombres.moyenne]}>
          {recherche && !recentrage
            ? <ActivityIndicator color={couleurs.primaire} />
            : <Ionicons name={recentrage ? 'locate' : 'locate-outline'} size={24} color={couleurs.primaire} />}
        </PressableAnime>
      )}
    </View>
  );
}
