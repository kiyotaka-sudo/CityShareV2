import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { Routes } from '../navigation/RootNavigator';

/**
 * Bouton retour Android : depuis un écran de course ou de réservation, on revient d'abord à l'accueil
 * (et non à l'écran précédent ou hors de l'application).
 */
export function useRetourAccueil() {
  const nav = useNavigation<StackNavigationProp<Routes>>();
  useFocusEffect(useCallback(() => {
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      nav.navigate('Onglets');
      return true;
    });
    return () => abonnement.remove();
  }, [nav]));
}
