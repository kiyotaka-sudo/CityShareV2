import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import { formatReservationQr } from '../../utils/tripMapper';

type Props = StackScreenProps<RootStackParamList, 'ShowBoardingQr'>;

export default function ShowBoardingQrScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { reservation } = route.params;
  const trip = reservation.trajet;
  const qrValue = formatReservationQr(reservation);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.title}>{t('extra.driver_boarding_qr_title')}</Text>
      <Text style={styles.subtitle}>{t('extra.driver_boarding_qr_hint')}</Text>
      <Text style={styles.passenger}>
        {reservation.passager?.prenom} {reservation.passager?.nom}
      </Text>
      <Text style={styles.route}>
        {trip?.depart ?? trip?.villeDepart} → {trip?.arrivee ?? trip?.villeArrivee}
      </Text>
      <QRCodeDisplay value={qrValue} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.white, padding: 16, paddingTop: 56, alignItems: 'center', gap: 12 },
  back: { alignSelf: 'flex-start' },
  title: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  passenger: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  route: { color: colors.textSecondary, fontWeight: '700' }
});
