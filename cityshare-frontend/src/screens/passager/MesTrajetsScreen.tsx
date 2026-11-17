import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { Reservation, RootStackParamList } from '../../types';
import { formatPrice } from '../../utils/dateFormatter';
import { reservationApi } from '../../api/reservationApi';
import { reservationToTrip } from '../../utils/tripMapper';

export default function MesTrajetsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [active, setActive] = useState<'current' | 'past'>('current');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    reservationApi
      .mine()
      .then(setReservations)
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = reservations.filter((r) => {
    const statut = r.statut?.toUpperCase() ?? '';
    const trajetStatut = r.trajet?.statut?.toUpperCase() ?? '';
    if (active === 'current') {
      return statut !== 'TERMINEE' && trajetStatut !== 'TERMINE';
    }
    return statut === 'TERMINEE' || trajetStatut === 'TERMINE';
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('extra.my_trips')}</Text>
      <View style={styles.tabs}>
        <Pressable onPress={() => setActive('current')} style={[styles.tab, active === 'current' && styles.tabActive]}>
          <Text style={[styles.tabText, active === 'current' && styles.tabTextActive]}>{t('extra.ongoing')}</Text>
        </Pressable>
        <Pressable onPress={() => setActive('past')} style={[styles.tab, active === 'past' && styles.tabActive]}>
          <Text style={[styles.tabText, active === 'past' && styles.tabTextActive]}>{t('extra.past')}</Text>
        </Pressable>
      </View>
      {loading ? (
        <Text style={styles.emptyText}>{t('common.loading')}</Text>
      ) : filtered.length === 0 ? (
        <Text style={styles.emptyText}>
          {active === 'current' ? t('extra.no_current_trips') : t('extra.no_past_trips')}
        </Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const trip = reservationToTrip(item);
            return (
              <View style={styles.card}>
                {trip.conducteur?.photoUrl ? (
                  <Image source={{ uri: trip.conducteur.photoUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatar}>
                    <Ionicons name="person" color={colors.primary} size={20} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.route}>
                    {trip.depart} → {trip.arrivee}
                  </Text>
                  <Text style={styles.meta}>
                    {trip.date} · {trip.conducteur?.prenom} {trip.conducteur?.nom} · {formatPrice(item.prixTotal)}
                  </Text>
                  <Text style={styles.status}>{item.statut}</Text>
                </View>
                {active === 'current' ? (
                  <View style={styles.actionsCol}>
                    {!item.qrCodeScanne && item.statut?.toUpperCase() === 'CONFIRMEE' && (
                      <Pressable style={styles.scan} onPress={() => navigation.navigate('ScanBoarding')}>
                        <Text style={styles.scanText}>{t('extra.scan_boarding_short')}</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={styles.follow}
                      onPress={() =>
                        navigation.navigate('LiveTracking', {
                          trip,
                          reservation: item,
                          reservationId: item.id,
                          peerId: trip.conducteur?.id
                        })
                      }
                    >
                      <Text style={styles.followText}>{t('extra.follow')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.follow}
                    onPress={() => navigation.navigate('Rating', { trip, conducteurId: trip.conducteur?.id })}
                  >
                    <Text style={styles.followText}>{t('rating.submit')}</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingTop: 56, paddingHorizontal: 16 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginBottom: 16 },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 18 },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: '800' },
  tabTextActive: { color: colors.white },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 30, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white },
  route: { color: colors.textPrimary, fontWeight: '900' },
  meta: { color: colors.textSecondary, marginTop: 4 },
  status: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 4 },
  actionsCol: { gap: 8, alignItems: 'flex-end' },
  scan: { backgroundColor: colors.primary, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 },
  scanText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  follow: { backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  followText: { color: colors.white, fontWeight: '900' }
});
