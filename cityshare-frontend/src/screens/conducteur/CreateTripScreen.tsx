import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import { trajetApi } from '../../api/trajetApi';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../utils/apiError';

type Props = StackScreenProps<RootStackParamList, 'CreateTrip'>;

type StopDraft = { ville: string; heure: string };

export default function CreateTripScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, refreshSession } = useAuth();
  const [seats, setSeats] = useState(3);
  const [acceptParcel, setAcceptParcel] = useState(true);
  const [allowStops, setAllowStops] = useState(false);
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [newStopVille, setNewStopVille] = useState('');
  const [newStopHeure, setNewStopHeure] = useState('12:00');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [form, setForm] = useState({ depart: 'Yaoundé', arrivee: 'Ntui', date: defaultDate, heure: '08:30', prix: '4500' });

  const addStop = () => {
    if (!newStopVille.trim()) return;
    setStops((current) => [...current, { ville: newStopVille.trim(), heure: newStopHeure }]);
    setNewStopVille('');
    setAllowStops(true);
  };

  const removeStop = (index: number) => {
    setStops((current) => current.filter((_, i) => i !== index));
  };

  const publish = async () => {
    const sessionUser = (await refreshSession()) ?? user;
    if (sessionUser?.role !== 'CONDUCTEUR') {
      Alert.alert('CityShare', t('create_trip.driver_only'));
      return;
    }
    if (!form.depart.trim() || !form.arrivee.trim() || !form.prix.trim()) {
      Alert.alert('CityShare', t('create_trip.fill_required'));
      return;
    }
    const prix = Number(form.prix);
    if (!Number.isFinite(prix) || prix <= 0) {
      Alert.alert('CityShare', t('create_trip.invalid_price'));
      return;
    }
    try {
      await trajetApi.create({
        villeDepart: form.depart.trim(),
        villeArrivee: form.arrivee.trim(),
        dateHeure: `${form.date}T${form.heure}:00`,
        nbPlacesTotal: seats,
        prixParPlace: prix,
        accepteColis: acceptParcel,
        autoriseArrets: allowStops || stops.length > 0,
        arrets: stops.map((stop, index) => ({
          ville: stop.ville,
          ordre: index + 1,
          heurePassage: stop.heure
        }))
      });
      Alert.alert('CityShare', t('create_trip.published'));
      navigation.goBack();
    } catch (e) {
      Alert.alert('CityShare', getApiErrorMessage(e));
    }
  };

  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('create_trip.title')}</Text>
      </View>
      <View style={styles.card}>
        <TextInput style={styles.input} value={form.depart} onChangeText={(value) => setField('depart', value)} placeholder={t('create_trip.departure')} />
        <View style={styles.greenLine} />
        <TextInput style={styles.input} value={form.arrivee} onChangeText={(value) => setField('arrivee', value)} placeholder={t('create_trip.arrival')} />
      </View>
      {allowStops && (
        <View style={styles.stopsBox}>
          <Text style={styles.label}>{t('create_trip.add_stop')}</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} value={newStopVille} onChangeText={setNewStopVille} placeholder={t('create_trip.stop_city')} />
            <TextInput style={[styles.input, { width: 90 }]} value={newStopHeure} onChangeText={setNewStopHeure} placeholder={t('create_trip.time')} />
          </View>
          <Pressable style={styles.addStopBtn} onPress={addStop}>
            <Text style={styles.addStopText}>+ {t('create_trip.add_stop_btn')}</Text>
          </Pressable>
          {stops.map((stop, index) => (
            <View key={`${stop.ville}-${index}`} style={styles.stopRow}>
              <Text style={styles.stopText}>{stop.ville} · {stop.heure}</Text>
              <Pressable onPress={() => removeStop(index)}>
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} value={form.date} onChangeText={(value) => setField('date', value)} placeholder={t('create_trip.date')} />
        <TextInput style={[styles.input, { flex: 1 }]} value={form.heure} onChangeText={(value) => setField('heure', value)} placeholder={t('create_trip.time')} />
      </View>
      <View style={styles.counter}>
        <Text style={styles.label}>{t('create_trip.seats')}</Text>
        <View style={styles.counterControls}>
          <Pressable onPress={() => setSeats(Math.max(1, seats - 1))}>
            <Ionicons name="remove-circle-outline" size={28} color={colors.primary} />
          </Pressable>
          <Text style={styles.counterText}>{seats}</Text>
          <Pressable onPress={() => setSeats(seats + 1)}>
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
          </Pressable>
        </View>
      </View>
      <TextInput style={styles.input} value={form.prix} onChangeText={(value) => setField('prix', value)} keyboardType="numeric" placeholder={t('create_trip.price')} />
      <View style={styles.switchRow}>
        <Text style={styles.label}>{t('create_trip.accept_parcel')}</Text>
        <Switch value={acceptParcel} onValueChange={setAcceptParcel} trackColor={{ true: colors.success }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>{t('create_trip.allow_stops')}</Text>
        <Switch value={allowStops} onValueChange={setAllowStops} trackColor={{ true: colors.success }} />
      </View>
      <Pressable style={styles.button} onPress={publish}>
        <Text style={styles.buttonText}>{t('create_trip.publish')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingTop: 58, gap: 14, backgroundColor: colors.white },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900' },
  card: { borderRadius: 16, backgroundColor: colors.surface, padding: 14, gap: 10 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 14, color: colors.textPrimary },
  greenLine: { width: 3, height: 28, backgroundColor: colors.primary, alignSelf: 'center', borderRadius: 2 },
  row: { flexDirection: 'row', gap: 10 },
  counter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textPrimary, fontWeight: '800' },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterText: { color: colors.textPrimary, fontWeight: '900', fontSize: 18, minWidth: 24, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  stopsBox: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10 },
  addStopBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  addStopText: { color: colors.primary, fontWeight: '900' },
  stopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, padding: 12, borderRadius: 12 },
  stopText: { color: colors.textPrimary, fontWeight: '700' }
});
