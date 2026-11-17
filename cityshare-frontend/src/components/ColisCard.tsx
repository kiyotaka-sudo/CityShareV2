import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Parcel } from '../types';
import { colors } from '../theme/colors';

export default function ColisCard({ parcel, onPress }: { parcel: Parcel; onPress?: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Ionicons name="cube-outline" size={28} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.route}>{parcel.depart} → {parcel.arrivee}</Text>
        <Text style={styles.meta}>{parcel.description}</Text>
      </View>
      <Text style={styles.badge}>{parcel.poids === 'LEGER' ? t('parcel.weight_light') : t('parcel.weight_medium')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface, marginBottom: 12 },
  route: { color: colors.textPrimary, fontWeight: '800' },
  meta: { color: colors.textSecondary, marginTop: 4 },
  badge: { color: colors.primary, fontWeight: '800', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 }
});
