import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { Reservation, RootStackParamList } from '../../types';
import { reservationApi } from '../../api/reservationApi';

export default function ConducteurPassengersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<Reservation[]>([]);

  useFocusEffect(
    useCallback(() => {
      reservationApi.conducteurPassengers().then(setItems).catch(() => setItems([]));
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('extra.driver_passengers_title')}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>{t('extra.driver_passengers_empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.passager?.prenom} {item.passager?.nom}
            </Text>
            <Text style={styles.meta}>
              {item.trajet?.villeDepart} → {item.trajet?.villeArrivee} · {item.statut}
            </Text>
            {!item.qrCodeScanne && (
              <Pressable
                style={styles.btn}
                onPress={() => navigation.navigate('ShowBoardingQr', { reservation: item })}
              >
                <Text style={styles.btnText}>{t('extra.show_boarding_qr')}</Text>
              </Pressable>
            )}
            {item.qrCodeScanne && (
              <Text style={styles.done}>{t('extra.boarding_done')}</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingTop: 56, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginBottom: 16 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 12 },
  name: { color: colors.textPrimary, fontWeight: '900', fontSize: 16 },
  meta: { color: colors.textSecondary, marginTop: 6, marginBottom: 10 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, padding: 12, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '900' },
  done: { color: colors.primary, fontWeight: '800' }
});
