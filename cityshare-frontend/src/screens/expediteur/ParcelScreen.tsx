import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { geocodePlace } from '../../utils/geocode';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { colisApi } from '../../api/colisApi';
import { RootStackParamList, Trip } from '../../types';
import TripCard from '../../components/TripCard';

export default function ParcelScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [form, setForm] = useState({ depart: 'Yaoundé', arrivee: 'Obala', description: 'Petit paquet fragile' });
  const [weight, setWeight] = useState<'LEGER' | 'MOYEN'>('LEGER');
  const [matches, setMatches] = useState<Trip[]>([]);
  const [searched, setSearched] = useState(false);

  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const findDriver = async () => {
    try {
      const data = await colisApi.match({ depart: form.depart, arrivee: form.arrivee, poids: weight });
      setMatches(data);
      setSearched(true);
    } catch {
      Alert.alert('CityShare', t('common.error'));
      setMatches([]);
      setSearched(true);
    }
  };

  const entrust = async (trip: Trip) => {
    try {
      const pickup = await geocodePlace(form.depart);
      const dropoff = await geocodePlace(form.arrivee);
      const parcel = await colisApi.create({
        villeDepart: form.depart,
        villeArrivee: form.arrivee,
        depart: form.depart,
        arrivee: form.arrivee,
        description: form.description,
        poids: weight,
        trajetId: trip.id,
        conducteurId: trip.conducteur.id,
        latDepart: pickup?.latitude,
        lngDepart: pickup?.longitude,
        latArrivee: dropoff?.latitude,
        lngArrivee: dropoff?.longitude,
        prixLivraison: Math.round((trip.prixParPlace ?? trip.prix ?? 3000) * 0.55)
      });
      navigation.navigate('ParcelTracking', { parcel });
    } catch {
      Alert.alert('CityShare', t('common.error'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('parcel.title')}</Text>
      <View style={styles.card}>
        <TextInput style={styles.input} value={form.depart} onChangeText={(value) => setField('depart', value)} placeholder={t('parcel.pickup')} />
        <TextInput style={styles.input} value={form.arrivee} onChangeText={(value) => setField('arrivee', value)} placeholder={t('parcel.delivery')} />
        <TextInput
          style={[styles.input, styles.description]}
          multiline
          value={form.description}
          onChangeText={(value) => setField('description', value)}
          placeholder={t('parcel.description')}
        />
        <View style={styles.weights}>
          {(['LEGER', 'MOYEN'] as const).map((item) => (
            <Pressable key={item} onPress={() => setWeight(item)} style={[styles.weight, weight === item && styles.weightActive]}>
              <Text style={[styles.weightText, weight === item && styles.weightTextActive]}>
                {item === 'LEGER' ? t('parcel.weight_light') : t('parcel.weight_medium')}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.button} onPress={findDriver}>
          <Text style={styles.buttonText}>{t('parcel.find_driver')}</Text>
        </Pressable>
      </View>
      {searched && matches.length === 0 && <Text style={styles.empty}>{t('search.no_results')}</Text>}
      <FlatList
        data={matches}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TripCard trip={item} onReserve={() => entrust(item)} onPress={() => entrust(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: 16, paddingTop: 56 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10, marginBottom: 16 },
  input: { height: 52, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, color: colors.textPrimary },
  description: { height: 88, textAlignVertical: 'top', paddingTop: 14 },
  weights: { flexDirection: 'row', gap: 10 },
  weight: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 12, padding: 13, alignItems: 'center' },
  weightActive: { borderColor: colors.primary, backgroundColor: '#E8F5E9' },
  weightText: { color: colors.textSecondary, fontWeight: '800' },
  weightTextActive: { color: colors.primary },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '900' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginBottom: 16, fontWeight: '600' }
});
