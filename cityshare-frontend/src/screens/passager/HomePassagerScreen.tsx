import React, { useEffect } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { popularRoutes } from '../../utils/constants';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { TripContext } from '../../context/TripContext';
import TripCard from '../../components/TripCard';
import { trajetApi } from '../../api/trajetApi';

function parseRoute(route: string): { depart: string; arrivee: string } {
  const [depart, arrivee] = route.split('→').map((s) => s.trim());
  return { depart: depart ?? '', arrivee: arrivee ?? '' };
}

export default function HomePassagerScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const tripContext = React.useContext(TripContext);
  const firstName = user?.prenom || user?.nom?.split(' ')[0] || 'Ernest';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    trajetApi
      .search({})
      .then((trips) => {
        if (trips.length) tripContext?.setTrips(trips);
      })
      .catch(() => undefined);
  }, []);

  const openSearch = (depart?: string, arrivee?: string) => {
    navigation.navigate('SearchTrip', { depart, arrivee, date: defaultDate });
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.greeting}>{t('home.greeting', { name: firstName })}</Text>
        <View style={styles.actions}>
          <Ionicons name="notifications-outline" color={colors.primary} size={24} />
          <Pressable style={styles.avatar} onPress={() => navigation.navigate('Passager' as any, { screen: 'Profil' } as any)}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" color={colors.primary} size={20} />
            )}
          </Pressable>
        </View>
      </View>
      <Pressable style={styles.search} onPress={() => openSearch()}>
        <Ionicons name="search" color={colors.white} size={20} />
        <Text style={styles.searchText}>{t('home.search_placeholder')}</Text>
      </Pressable>
      <View style={styles.quickRow}>
        <Pressable style={styles.quickCard} onPress={() => openSearch()}>
          <Ionicons name="car-outline" color={colors.primary} size={28} />
          <Text style={styles.quickText}>{t('home.find_trip')}</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => navigation.navigate('Expediteur')}>
          <Ionicons name="cube-outline" color={colors.primary} size={28} />
          <Text style={styles.quickText}>{t('home.send_parcel')}</Text>
        </Pressable>
      </View>
      <Text style={styles.sectionTitle}>{t('home.popular_routes')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {popularRoutes.map((route) => {
          const { depart, arrivee } = parseRoute(route);
          return (
            <Pressable key={route} style={styles.chip} onPress={() => openSearch(depart, arrivee)}>
              <Text style={styles.chipText} numberOfLines={1}>
                {route}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.sectionTitle}>{t('home.available_trips')}</Text>
      <FlatList
        data={tripContext?.trips ?? []}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyList}>{t('search.no_results')}</Text>}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => navigation.navigate('TripDetail', { trip: item })}
            onReserve={() => navigation.navigate('TripDetail', { trip: item })}
          />
        )}
        contentContainerStyle={{ paddingBottom: 90 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingTop: 56, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9' },
  avatarImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9' },
  search: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 10
  },
  searchText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  quickRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  quickCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 10 },
  quickText: { color: colors.textPrimary, fontWeight: '800' },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 22, marginBottom: 10 },
  chipsRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  chip: {
    alignSelf: 'flex-start',
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: 'rgba(27, 94, 32, 0.15)',
    maxWidth: 160
  },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  emptyList: { color: colors.textSecondary, textAlign: 'center', marginTop: 16, fontWeight: '600' }
});
