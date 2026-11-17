import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatPrice } from '../../utils/dateFormatter';

type Props = StackScreenProps<RootStackParamList, 'ReservationConfirm'>;

export default function ReservationConfirmScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const scale = useRef(new Animated.Value(0)).current;
  const reservation = route.params?.reservation;
  const trip = route.params?.trip ?? reservation?.trajet;

  if (!reservation || !trip) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('common.error')}</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const basePrice = reservation.prixTotal ?? trip.prixParPlace ?? trip.prix ?? 0;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }, [scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.check, { transform: [{ scale }] }]}>
        <Ionicons name="checkmark" color={colors.white} size={58} />
      </Animated.View>
      <Text style={styles.title}>{t('reservation.congrats', { name: user?.prenom || user?.nom || 'voyageur' })}</Text>
      <Text style={styles.subtitle}>{t('reservation.confirmed')}</Text>
      <View style={styles.summary}>
        <Text style={styles.route}>{trip.depart} → {trip.arrivee}</Text>
        <Text style={styles.meta}>
          {trip.date} · {trip.heure} · {trip.conducteur?.prenom} {trip.conducteur?.nom}
        </Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>{t('reservation.total')}</Text>
          <Text style={styles.totalText}>{formatPrice(basePrice)}</Text>
        </View>
      </View>
      <Text style={styles.boardingHint}>{t('reservation.boarding_hint')}</Text>
      <View style={styles.buttons}>
        <Pressable style={styles.outline} onPress={() => navigation.navigate('Passager')}>
          <Text style={styles.outlineText}>{t('reservation.view_trips')}</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() =>
            navigation.navigate('LiveTracking', {
              trip,
              reservation,
              reservationId: reservation.id,
              peerId: trip.conducteur?.id
            })
          }
        >
          <Text style={styles.buttonText}>{t('reservation.view_map')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16 },
  check: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontWeight: '700' },
  summary: { width: '100%', backgroundColor: colors.surface, padding: 16, borderRadius: 16 },
  route: { color: colors.textPrimary, fontWeight: '900', fontSize: 18 },
  meta: { color: colors.textSecondary, marginTop: 6, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  totalText: { color: colors.primary, fontWeight: '900' },
  boardingHint: { color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  buttons: { flexDirection: 'row', gap: 10, width: '100%' },
  outline: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  outlineText: { color: colors.primary, fontWeight: '900' },
  button: { flex: 1, backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '900' }
});
