import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList, Trip } from '../../types';
import { trajetApi } from '../../api/trajetApi';
import { getApiErrorMessage } from '../../utils/apiError';
import TripCard from '../../components/TripCard';

type Props = StackScreenProps<RootStackParamList, 'SearchTrip'>;

export default function SearchTripScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [depart, setDepart] = useState(route.params?.depart ?? 'Yaoundé');
  const [arrivee, setArrivee] = useState(route.params?.arrivee ?? 'Ntui');
  const [date, setDate] = useState(route.params?.date ?? defaultDate);
  const [seats, setSeats] = useState(1);
  const [results, setResults] = useState<Trip[]>([]);

  const search = async () => {
    try {
      const data = await trajetApi.search({ depart, arrivee, date, places: seats });
      setResults(data);
    } catch (e) {
      Alert.alert('CityShare', getApiErrorMessage(e));
      setResults([]);
    }
  };

  const swap = () => {
    setDepart(arrivee);
    setArrivee(depart);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={26} color={colors.textPrimary} /></Pressable>
        <Text style={styles.title}>{t('search.title')}</Text>
      </View>
      <View style={styles.card}>
        <TextInput style={styles.input} value={depart} onChangeText={setDepart} placeholder={t('search.departure')} />
        <Pressable style={styles.swap} onPress={swap}><Ionicons name="swap-vertical" size={22} color={colors.primary} /></Pressable>
        <TextInput style={styles.input} value={arrivee} onChangeText={setArrivee} placeholder={t('search.arrival')} />
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} value={date} onChangeText={setDate} placeholder={t('search.date')} />
          <View style={styles.counter}>
            <Pressable onPress={() => setSeats(Math.max(1, seats - 1))}><Ionicons name="remove-circle-outline" size={24} color={colors.primary} /></Pressable>
            <Text style={styles.counterText}>{seats}</Text>
            <Pressable onPress={() => setSeats(seats + 1)}><Ionicons name="add-circle-outline" size={24} color={colors.primary} /></Pressable>
          </View>
        </View>
        <Pressable style={styles.button} onPress={search}><Text style={styles.buttonText}>{t('search.search_btn')}</Text></Pressable>
      </View>
      <Text style={styles.results}>{t('search.results')}</Text>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TripCard trip={item} onPress={() => navigation.navigate('TripDetail', { trip: item })} />}
        ListEmptyComponent={<Text style={styles.empty}>{t('search.no_results')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52, paddingHorizontal: 16, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10, marginBottom: 20 },
  input: { height: 50, borderRadius: 12, backgroundColor: colors.white, paddingHorizontal: 14, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  swap: { alignSelf: 'center', width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
  counterText: { color: colors.textPrimary, fontWeight: '900', minWidth: 18, textAlign: 'center' },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '900' },
  results: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 30 }
});
