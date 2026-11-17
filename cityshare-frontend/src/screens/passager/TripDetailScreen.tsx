import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import { reservationApi } from '../../api/reservationApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatPrice } from '../../utils/dateFormatter';
import MapViewOSM from '../../components/MapViewOSM';
import DriverCard from '../../components/DriverCard';
import { navigateToMessages } from '../../utils/navigationHelpers';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { geocodeRouteLocations, GeocodedPoint } from '../../utils/geocode';

type Props = StackScreenProps<RootStackParamList, 'TripDetail'>;

export default function TripDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { trip } = route.params;
  const { location } = useLocation();
  const [routePoints, setRoutePoints] = useState<GeocodedPoint[]>([]);

  useEffect(() => {
    const loadRoute = async () => {
      const labels = [trip.depart, ...(trip.stops ?? []), trip.arrivee].filter(Boolean) as string[];
      const points = await geocodeRouteLocations(labels);
      setRoutePoints(points);
    };
    loadRoute();
  }, [trip.depart, trip.arrivee, trip.stops]);

  const reserve = async () => {
    try {
      const reservation = await reservationApi.create(trip.id);
      navigation.navigate('Payment', { reservation, trip });
    } catch (e) {
      Alert.alert('CityShare', getApiErrorMessage(e));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapBox}>
        <MapViewOSM routePoints={routePoints} userLocation={location?.coords} />
        <Pressable style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.driverWrap}><DriverCard driver={trip.conducteur} /></View>
        {trip.conducteur?.id && (
          <View style={styles.contactRow}>
            <Pressable
              style={styles.contactBtn}
              onPress={() => {
                const tel = trip.conducteur?.telephone;
                if (tel) Linking.openURL(`tel:${tel}`);
              }}
            >
              <Text style={styles.contactText}>📞 {t('tracking.call')}</Text>
            </Pressable>
            <Pressable
              style={styles.contactBtn}
              onPress={() => navigateToMessages(navigation, user?.role, trip.conducteur!.id!)}
            >
              <Text style={styles.contactText}>💬 {t('tracking.message')}</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.timeline}>
          {[trip.depart, ...(trip.stops ?? []), trip.arrivee].map((point, index) => (
            <View key={`${point}-${index}`} style={styles.timelineRow}>
              <View style={[styles.dot, index === 0 && styles.dotStart, index === (trip.stops?.length ?? 0) + 1 && styles.dotEnd]} />
              <Text style={styles.point}>{point}</Text>
            </View>
          ))}
        </View>
        <View style={styles.chips}>
          <Text style={styles.chip}>🕐 {trip.heure}</Text>
          <Text style={styles.chip}>💺 {t('trip_detail.seats_left', { count: trip.placesDisponibles })}</Text>
          <Text style={styles.chip}>💰 {t('trip_detail.price', { amount: trip.prixParPlace ?? trip.prix ?? 0 })}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('trip_detail.vehicle')}</Text>
          <Text style={styles.cardText}>{trip.conducteur.vehicule} · {trip.conducteur.plaque}</Text>
          <View style={styles.photo}><Ionicons name="car-sport-outline" size={50} color={colors.primary} /></View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('trip_detail.qr_instruction')}</Text>
          <Text style={styles.cardText}>{t('extra.qr_help')}</Text>
        </View>
      </ScrollView>
      <View style={styles.sticky}>
        <Text style={styles.total}>{formatPrice(trip.prixParPlace ?? trip.prix ?? 0)}</Text>
        <Pressable style={styles.reserve} onPress={reserve}><Text style={styles.reserveText}>{t('trip_detail.reserve_btn')}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  mapBox: { height: '35%' },
  back: { position: 'absolute', top: 48, left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 16 },
  driverWrap: { marginTop: -34, marginBottom: 12 },
  contactRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  contactBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center' },
  contactText: { color: colors.primary, fontWeight: '900' },
  timeline: { borderLeftWidth: 3, borderLeftColor: colors.primary, marginLeft: 10, paddingLeft: 18, gap: 16 },
  timelineRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.secondary, marginLeft: -26, marginRight: 14 },
  dotStart: { backgroundColor: colors.primary },
  dotEnd: { backgroundColor: colors.accent },
  point: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 20 },
  chip: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, color: colors.textPrimary, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 17 },
  cardText: { color: colors.textSecondary, marginTop: 8 },
  photo: { height: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderRadius: 12, marginTop: 12 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  total: { color: colors.textPrimary, fontSize: 20, fontWeight: '900', flex: 1 },
  reserve: { backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12 },
  reserveText: { color: colors.white, fontWeight: '900' }
});
