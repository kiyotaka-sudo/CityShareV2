import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { Parcel } from '../../types';
import MapViewOSM from '../../components/MapViewOSM';
import ColisCard from '../../components/ColisCard';

export default function ParcelTrackingScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const parcel = route?.params?.parcel ?? {
    id: 1,
    villeDepart: 'Yaoundé',
    villeArrivee: 'Obala',
    depart: 'Yaoundé',
    arrivee: 'Obala',
    description: 'Petit paquet fragile',
    poids: 'LEGER' as const,
    prixLivraison: 2500,
    statut: 'EN_COURS'
  };

  return (
    <View style={styles.container}>
      <MapViewOSM fullScreen />
      <View style={styles.panel}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('extra.parcel_tracking')}</Text>
        <ColisCard parcel={parcel} />
        <View style={styles.row}>
          <Ionicons name="time-outline" size={22} color={colors.primary} />
          <Text style={styles.text}>{t('parcel.eta')} : 1h 25 min</Text>
        </View>
        <View style={styles.progress}><View style={styles.fill} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: { position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: colors.white, borderRadius: 16, padding: 16, elevation: 4 },
  backButton: { position: 'absolute', top: 16, left: 16, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, zIndex: 10 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: 12, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { color: colors.textPrimary, fontWeight: '800' },
  progress: { height: 8, borderRadius: 5, backgroundColor: colors.surface, marginTop: 14, overflow: 'hidden' },
  fill: { width: '45%', height: '100%', backgroundColor: colors.accent }
});
