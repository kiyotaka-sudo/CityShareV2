import React, { useState } from 'react';
import { Alert, Linking, Pressable, Text } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { Api } from '../api';
import { messageErreur } from '../api/client';
import { couleurs } from '../theme';

/**
 * Bouton SOS (BF-43) : alerte le support et les contacts de confiance avec la position GPS,
 * puis continue d'envoyer la position pendant 10 minutes. Propose aussi d'appeler la police (117).
 */
export default function BoutonSOS({ courseId, compact }: { courseId?: number; compact?: boolean }) {
  const { t } = useTranslation();
  const [envoi, setEnvoi] = useState(false);

  const declencher = async () => {
    setEnvoi(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = p.coords.latitude; lng = p.coords.longitude;
      } catch { /* position indisponible : le serveur utilisera celle du chauffeur */ }
      const alerte = await Api.securite.sos({ courseId, lat, lng });
      const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 20 },
        (p) => Api.securite.positionSos(alerte.id, p.coords.latitude, p.coords.longitude).catch(() => undefined)).catch(() => null);
      setTimeout(() => sub?.remove(), 10 * 60 * 1000);
      Alert.alert(t('sos.envoyeTitre'), t('sos.envoyeTexte'), [
        { text: t('sos.appeler117'), style: 'destructive', onPress: () => Linking.openURL('tel:117') },
        { text: 'OK' }
      ]);
    } catch (e) {
      Alert.alert(t('sos.echec'), messageErreur(e), [{ text: t('sos.appeler117'), onPress: () => Linking.openURL('tel:117') }, { text: 'OK' }]);
    } finally {
      setEnvoi(false);
    }
  };

  const confirmer = () => Alert.alert(t('sos.titre'), t('sos.confirmation'), [
    { text: t('commun.annuler'), style: 'cancel' },
    { text: t('sos.declencher'), style: 'destructive', onPress: declencher }
  ]);

  return (
    <Pressable onPress={confirmer} disabled={envoi} accessibilityRole="button" accessibilityLabel="SOS"
      style={({ pressed }) => ({
        backgroundColor: couleurs.rouge, borderRadius: compact ? 24 : 12, paddingHorizontal: compact ? 14 : 18, minHeight: compact ? 44 : 52,
        alignItems: 'center', justifyContent: 'center', opacity: pressed || envoi ? 0.7 : 1
      })}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: compact ? 15 : 17, letterSpacing: 1 }}>SOS</Text>
    </Pressable>
  );
}
