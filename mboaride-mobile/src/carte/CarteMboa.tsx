import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Constants from 'expo-constants';
import CarteWeb from './CarteWeb';
import type { CarteProps } from './types';

export type { CarteProps, PointCarte, VehiculeCarte, ZoneChaude } from './types';

/**
 * Carte MboaRide. Dans l'application installée (version de développement ou APK), carte native MapLibre ;
 * dans Expo Go, où ce module natif n'existe pas, carte de secours Leaflet avec les mêmes fonctions.
 */
const CarteNative: React.ComponentType<CarteProps> | null =
  Constants.appOwnership === 'expo' ? null : require('./CarteNative').default; // eslint-disable-line @typescript-eslint/no-require-imports

export const CARTE_NATIVE = CarteNative !== null;

export default function CarteMboa({ style, ...props }: CarteProps & { style?: StyleProp<ViewStyle> }) {
  const Composant = CarteNative ?? CarteWeb;
  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <Composant {...props} />
    </View>
  );
}
