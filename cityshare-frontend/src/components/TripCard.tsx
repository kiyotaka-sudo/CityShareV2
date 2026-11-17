import React from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Trip } from '../types';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/dateFormatter';
import StarRating from './StarRating';

interface Props {
  trip: Trip;
  onPress?: () => void;
  onReserve?: () => void;
}

export default function TripCard({ trip, onPress, onReserve }: Props) {
  const { t } = useTranslation();
  const routeLabel = `${trip.villeDepart ?? trip.depart} → ${trip.villeArrivee ?? trip.arrivee}`;
  const timeLabel = trip.dateHeure ? new Date(trip.dateHeure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : trip.heure;
  const seats = trip.nbPlacesDispo ?? trip.placesDisponibles ?? 0;
  const price = trip.prixParPlace ?? trip.prix ?? 0;
  const rating = trip.conducteur.noteMoyenne ?? trip.conducteur.note ?? 0;
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.leftBorder} />
      <View style={styles.content}>
        <View style={styles.header}>
          {trip.conducteur?.photoUrl ? (
            <Image source={{ uri: trip.conducteur.photoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" color={colors.primary} size={20} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.route}>{routeLabel}</Text>
            <Text style={styles.meta}>{timeLabel} · {seats} {t('common.seats')}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(price)}</Text>
        </View>
        <View style={styles.footer}>
          <StarRating value={rating} size={16} />
          <Pressable onPress={onReserve ?? onPress} style={styles.reserve}>
            <Text style={styles.reserveText}>{t('search.reserve')}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  leftBorder: { width: 5, backgroundColor: colors.primary },
  content: { flex: 1, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5E9' },
  route: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.textSecondary, marginTop: 3 },
  price: { backgroundColor: '#E8F5E9', color: colors.primary, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, fontSize: 12 },
  footer: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reserve: { backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 },
  reserveText: { color: colors.white, fontWeight: '800' }
});
