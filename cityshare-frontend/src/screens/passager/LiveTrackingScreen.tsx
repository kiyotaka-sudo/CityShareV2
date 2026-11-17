import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import MapViewOSM from '../../components/MapViewOSM';
import SOSButton from '../../components/SOSButton';
import { useLocation } from '../../hooks/useLocation';
import { reservationApi } from '../../api/reservationApi';
import { useAuth } from '../../hooks/useAuth';
import { navigateToMessages } from '../../utils/navigationHelpers';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import { formatReservationQr } from '../../utils/tripMapper';
import { geocodeRouteLocations, GeocodedPoint } from '../../utils/geocode';

type Props = StackScreenProps<RootStackParamList, 'LiveTracking'>;

export default function LiveTrackingScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const trip = route.params?.trip;
  const reservation = route.params?.reservation;
  const reservationId = route.params?.reservationId ?? reservation?.id;
  const peerId = route.params?.peerId ?? trip?.conducteur?.id;
  const { location } = useLocation();
  const [arrived, setArrived] = useState(false);
  const [routePoints, setRoutePoints] = useState<GeocodedPoint[]>([]);

  useEffect(() => {
    const loadRoute = async () => {
      if (!trip) return;
      const labels = [trip.depart, ...(trip.stops ?? []), trip.arrivee].filter(Boolean) as string[];
      const points = await geocodeRouteLocations(labels);
      setRoutePoints(points);
    };
    loadRoute();
  }, [trip]);

  if (!trip) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>{t('common.error')}</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const carLocation = location?.coords
    ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
    : undefined;

  const confirmArrival = async () => {
    if (!reservationId) {
      Alert.alert('CityShare', t('tracking.no_reservation'));
      return;
    }
    try {
      await reservationApi.confirmerArrivee(reservationId);
      setArrived(true);
      Alert.alert('CityShare', t('tracking.arrival_confirmed'));
      navigation.navigate('Rating', { trip, conducteurId: trip.conducteur?.id });
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  const callDriver = () => {
    const tel = trip.conducteur?.telephone;
    if (tel) {
      Linking.openURL(`tel:${tel}`);
    }
  };

  const openMessages = () => {
    if (peerId) {
      navigateToMessages(navigation, user?.role, peerId);
    }
  };

  return (
    <View style={styles.container}>
      <MapViewOSM fullScreen routePoints={routePoints} carLocation={carLocation} userLocation={location?.coords} />
      <View style={styles.pill}>
        <Ionicons name="car" color={colors.primary} size={20} />
        <Text style={styles.pillText}>
          {trip.conducteur?.prenom} {trip.conducteur?.nom} · {trip.conducteur?.plaque}
        </Text>
      </View>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t('tracking.en_route', { destination: trip.arrivee })}</Text>
        <View style={styles.progress}>
          <View style={[styles.progressFill, arrived && styles.progressDone]} />
        </View>
        <Text style={styles.eta}>{trip.heure ? `${trip.date} · ${trip.heure}` : t('tracking.eta', { time: '—' })}</Text>
        {reservation && reservation.qrCodeScanne && !reservation.arriveeConfirmee && !arrived && (
          <View style={styles.qrBox}>
            <Text style={styles.qrLabel}>{t('tracking.show_qr_arrival')}</Text>
            <QRCodeDisplay value={formatReservationQr(reservation)} />
            <Text style={styles.qrHint}>{t('tracking.arrival_qr_hint')}</Text>
          </View>
        )}
        {reservation && !reservation.qrCodeScanne && (
          <Pressable style={styles.scanBtn} onPress={() => navigation.navigate('ScanBoarding')}>
            <Text style={styles.scanBtnText}>{t('extra.scan_driver_boarding')}</Text>
          </Pressable>
        )}
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={callDriver}>
            <Ionicons name="call-outline" color={colors.primary} size={22} />
            <Text style={styles.actionText}>{t('tracking.call')}</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={openMessages}>
            <Ionicons name="chatbubble-outline" color={colors.primary} size={22} />
            <Text style={styles.actionText}>{t('tracking.message')}</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={confirmArrival} disabled={arrived}>
            <Ionicons name="checkmark-circle-outline" color={colors.primary} size={22} />
            <Text style={styles.actionText}>{t('tracking.arrived')}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.sos}>
        <SOSButton onPress={() => navigation.navigate('SOS')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  missingText: { color: colors.textPrimary, fontWeight: '800', marginBottom: 12 },
  link: { color: colors.primary, fontWeight: '900' },
  pill: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 4
  },
  pillText: { color: colors.textPrimary, fontWeight: '900' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 36
  },
  handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  progress: { height: 9, borderRadius: 5, backgroundColor: colors.surface, marginTop: 16, overflow: 'hidden' },
  progressFill: { width: '55%', height: '100%', backgroundColor: colors.accent },
  progressDone: { width: '100%' },
  eta: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    color: colors.primary,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    marginTop: 12
  },
  qrBox: { marginTop: 14, alignItems: 'center', gap: 8 },
  qrLabel: { color: colors.textSecondary, fontWeight: '700', textAlign: 'center' },
  qrHint: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', paddingHorizontal: 8 },
  scanBtn: { marginTop: 14, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  scanBtnText: { color: colors.white, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  action: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  actionText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  sos: { position: 'absolute', right: 18, bottom: 210 }
});
