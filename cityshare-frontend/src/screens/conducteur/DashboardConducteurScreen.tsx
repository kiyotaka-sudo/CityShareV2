import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList, Trip } from '../../types';
import { trajetApi } from '../../api/trajetApi';
import { useAuth } from '../../hooks/useAuth';
import { formatPrice } from '../../utils/dateFormatter';
import { getApiErrorMessage } from '../../utils/apiError';

export default function DashboardConducteurScreen() {
  const { t } = useTranslation();
  const { user, refreshSession } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = async () => {
    try {
      const data = await trajetApi.listMine();
      setTrips(data);
    } catch (e) {
      if (__DEV__) {
        console.warn('listMine', getApiErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refreshSession().then(() => loadTrips());
    }, [])
  );

  const openCreateTrip = async () => {
    const sessionUser = (await refreshSession()) ?? user;
    if (sessionUser?.role !== 'CONDUCTEUR') {
      Alert.alert('CityShare', t('create_trip.driver_only'));
      return;
    }
    navigation.navigate('CreateTrip');
  };

  const handleDemarrer = async (id: number) => {
    try {
      await trajetApi.demarrer(id);
      loadTrips();
      Alert.alert('CityShare', '🚗 Trajet démarré !');
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  const handleTerminer = async (id: number) => {
    try {
      await trajetApi.terminer(id);
      loadTrips();
      Alert.alert('CityShare', '✅ Trajet terminé !');
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('driver.dashboard_title')}</Text>
        <Pressable style={styles.avatar} onPress={() => navigation.navigate('Settings')}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person" color={colors.primary} size={22} />
          )}
        </Pressable>
      </View>
          <View style={styles.stats}>
        {[
          [String(trips.length), t('driver.stats_trips')],
          [String(trips.reduce((acc, t) => acc + (t.nbPlacesDispo ?? 0), 0)), t('driver.stats_passengers')],
          [formatPrice(trips.reduce((acc, t) => acc + ((t.prixParPlace ?? t.prix ?? 0) * (t.nbPlacesDispo ?? t.placesDisponibles ?? 0)), 0)), t('driver.stats_earnings')],
          [String(user?.noteMoyenne?.toFixed(1) ?? '4.8'), `${t('driver.stats_rating')} ⭐`]
        ].map(([value, label]) => (
          <View key={label} style={styles.statCard}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
        ))}
      </View>
      <Pressable style={styles.propose} onPress={openCreateTrip}>
        <Text style={styles.proposeText}>{t('driver.propose_trip')}</Text>
      </Pressable>
      <Pressable style={styles.docs} onPress={() => navigation.navigate('ValidateTrip')}>
        <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
        <Text style={styles.docsText}>Scanner QR Code passager</Text>
      </Pressable>
      <Text style={styles.section}>{t('driver.active_trips')}</Text>
      {loading ? (
        <Text style={styles.emptyText}>Chargement...</Text>
      ) : trips.length === 0 ? (
        <Text style={styles.emptyText}>Aucun trajet pour le moment. Publiez votre premier trajet !</Text>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item }) => (
            <View style={styles.trip}>
              <View style={{ flex: 1 }}>
                <Text style={styles.route}>{item.villeDepart ?? item.depart} → {item.villeArrivee ?? item.arrivee}</Text>
                <Text style={styles.meta}>{item.dateHeure?.split('T')[0]} · {item.dateHeure?.split('T')[1]?.slice(0, 5)} · {item.nbPlacesDispo ?? item.placesDisponibles} places</Text>
                <Text style={[styles.badge, item.statut === 'EN_COURS' && styles.badgeActive, item.statut === 'TERMINE' && styles.badgeDone]}>
                  {item.statut === 'ACTIF' ? t('driver.status_active') : item.statut === 'EN_COURS' ? '🚗 En cours' : '✅ Terminé'}
                </Text>
              </View>
              <View style={styles.tripActions}>
                {item.statut === 'ACTIF' && (
                  <Pressable style={styles.actionBtn} onPress={() => handleDemarrer(item.id)}>
                    <Text style={styles.actionBtnText}>Démarrer</Text>
                  </Pressable>
                )}
                {item.statut === 'EN_COURS' && (
                  <Pressable style={[styles.actionBtn, styles.actionBtnEnd]} onPress={() => handleTerminer(item.id)}>
                    <Text style={styles.actionBtnText}>Terminer</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}
      <Pressable style={styles.fab} onPress={openCreateTrip}>
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { backgroundColor: colors.primary, paddingTop: 56, paddingHorizontal: 16, paddingBottom: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 26, fontWeight: '900' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white },
  stats: { flexDirection: 'row', gap: 10, padding: 16, marginTop: -20 },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 14, alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  propose: { marginHorizontal: 16, backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  proposeText: { color: colors.white, fontWeight: '900' },
  docs: { margin: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, padding: 14 },
  docsText: { color: colors.primary, fontWeight: '900' },
  section: { marginHorizontal: 16, marginBottom: 12, color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  emptyText: { marginHorizontal: 16, color: colors.textSecondary, fontWeight: '600', textAlign: 'center', marginTop: 20 },
  trip: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 14, alignItems: 'flex-start', gap: 10 },
  route: { color: colors.textPrimary, fontWeight: '900' },
  meta: { color: colors.textSecondary, marginTop: 4 },
  badge: { color: colors.primary, backgroundColor: '#E8F5E9', alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, fontWeight: '900', marginTop: 8 },
  badgeActive: { color: '#E65100', backgroundColor: '#FFF3E0' },
  badgeDone: { color: '#1B5E20', backgroundColor: '#C8E6C9' },
  tripActions: { gap: 8 },
  actionBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  actionBtnEnd: { backgroundColor: colors.danger },
  actionBtnText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  fab: { position: 'absolute', right: 18, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 6 }
});
