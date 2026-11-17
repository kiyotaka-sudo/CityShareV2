import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Driver } from '../types';
import { colors } from '../theme/colors';
import StarRating from './StarRating';

export default function DriverCard({ driver }: { driver: Driver }) {
  const { t } = useTranslation();
  const rating = driver.noteMoyenne ?? driver.note ?? 0;
  return (
    <View style={styles.card}>
      {driver.photoUrl ? (
        <Image source={{ uri: driver.photoUrl }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Ionicons name="person" color={colors.primary} size={24} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{driver.prenom ? `${driver.prenom} ${driver.nom}` : driver.nom}</Text>
        <StarRating value={rating} size={16} />
      </View>
      {driver.verifie && (
        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.badgeText}>{t('trip_detail.verified')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, padding: 14, elevation: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9' },
  name: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: '#E8F5E9' },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' }
});
