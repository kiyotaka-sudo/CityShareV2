import React, { useState } from 'react';
import { Alert, Linking, Pressable, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types';
import { paymentApi, PaymentOperator } from '../../api/paymentApi';
import * as Clipboard from 'expo-clipboard';
import { formatPrice } from '../../utils/dateFormatter';
import { getApiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';

type Props = StackScreenProps<RootStackParamList, 'Payment'>;

const PAYMENT_METHODS: Array<{
  operator: PaymentOperator;
  titleKey: string;
  subtitleKey: string;
  brand: string;
  color: string;
  textColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    operator: 'CM_MTNMOBILEMONEY',
    titleKey: 'payment.mtn_title',
    subtitleKey: 'payment.mtn_subtitle',
    brand: 'MTN',
    color: '#FFCC00',
    textColor: '#1A1A1A',
    icon: 'phone-portrait-outline'
  },
  {
    operator: 'CM_ORANGEMONEY',
    titleKey: 'payment.orange_title',
    subtitleKey: 'payment.orange_subtitle',
    brand: 'OM',
    color: '#FF7900',
    textColor: '#FFFFFF',
    icon: 'wallet-outline'
  }
];

export default function PaymentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { reservation, trip } = route.params;
  const [loadingOperator, setLoadingOperator] = useState<PaymentOperator | null>(null);
  const loading = loadingOperator !== null;

  const confirmReservation = () => {
    navigation.replace('ReservationConfirm', {
      reservation: { ...reservation, statut: 'CONFIRMEE' },
      trip
    });
  };

  const payWithMonetbil = async (operator: PaymentOperator) => {
    setLoadingOperator(operator);
    try {
      const init = await paymentApi.init(reservation.id, user?.telephone, operator);
      if (init.statut === 'SIMULE' || !init.paymentUrl) {
        await paymentApi.simulate(reservation.id);
        confirmReservation();
        return;
      }
      // open payment URL (could be a tel: / ussd URL). handle USSD/tel specially so Expo Go opens the dialer with the code prefilled
      const openDialerOrUrl = async (raw: string) => {
        try {
          const trimmed = (raw || '').trim();
          // handle pure USSD like *123*...# or tel:*123*...#
          const isTel = trimmed.startsWith('tel:');
          const isUssdLike = /^\*\d+/.test(trimmed) || /\*/.test(trimmed) && trimmed.endsWith('#');
          let target = trimmed;
          if (isUssdLike && !isTel) {
            target = `tel:${trimmed}`;
          }
          if (target.startsWith('tel:')) {
            const number = target.slice(4);
            // encode the number so '#' is preserved when opening URL
            const encoded = `tel:${encodeURIComponent(number)}`;
            // ask user before opening dialer
            Alert.alert('CityShare', t('payment.will_open_dialer'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.confirm'), onPress: async () => Linking.openURL(encoded).catch(async () => {
                await Clipboard.setStringAsync(number);
                Alert.alert('CityShare', t('payment.copied_code'));
              }) }
            ]);
            return;
          }
          // fallback: open URL directly
          await Linking.openURL(encodeURI(trimmed));
        } catch (e) {
          // fallback: copy raw to clipboard and show message
          await Clipboard.setStringAsync(raw);
          Alert.alert('CityShare', t('payment.copied_code'));
        }
      };

      await openDialerOrUrl(init.paymentUrl);
      Alert.alert('CityShare', t('payment.after_redirect'), [
        {
          text: t('payment.check_status'),
          onPress: async () => {
            try {
              const status = await paymentApi.status(reservation.id);
              if (status.statut === 'PAYE') {
                confirmReservation();
              } else {
                Alert.alert('CityShare', t('payment.pending'));
              }
            } catch (e) {
              Alert.alert('CityShare', getApiErrorMessage(e));
            }
          }
        }
      ]);
    } catch (e) {
      Alert.alert('CityShare', getApiErrorMessage(e));
    } finally {
      setLoadingOperator(null);
    }
  };

  const paySimulated = async () => {
    setLoadingOperator('CM_MTNMOBILEMONEY');
    try {
      await paymentApi.simulate(reservation.id);
      confirmReservation();
    } catch (e) {
      Alert.alert('CityShare', getApiErrorMessage(e));
    } finally {
      setLoadingOperator(null);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
      </Pressable>
      <Text style={styles.title}>{t('payment.title')}</Text>
      <Text style={styles.subtitle}>{trip.depart ?? trip.villeDepart} - {trip.arrivee ?? trip.villeArrivee}</Text>
      <Text style={styles.amount}>{formatPrice(reservation.prixTotal ?? trip.prixParPlace ?? 0)}</Text>
      <Text style={styles.hint}>{t('payment.choose_operator')}</Text>

      <View style={styles.methodList}>
        {PAYMENT_METHODS.map((method) => {
          const isLoading = loadingOperator === method.operator;
          return (
            <Pressable
              key={method.operator}
              style={({ pressed }) => [
                styles.methodCard,
                { borderColor: method.color },
                pressed && styles.methodCardPressed,
                loading && !isLoading && styles.disabled
              ]}
              onPress={() => payWithMonetbil(method.operator)}
              disabled={loading}
            >
              <View style={[styles.logoBadge, { backgroundColor: method.color }]}>
                <Text style={[styles.logoText, { color: method.textColor }]}>{method.brand}</Text>
              </View>
              <View style={styles.methodText}>
                <Text style={styles.methodTitle}>{t(method.titleKey)}</Text>
                <Text style={styles.methodSubtitle}>{t(method.subtitleKey)}</Text>
              </View>
              <Ionicons
                name={isLoading ? 'hourglass-outline' : method.icon}
                size={28}
                color={method.color}
              />
            </Pressable>
          );
        })}
      </View>

      <Pressable style={[styles.btnOutline, loading && styles.disabled]} onPress={paySimulated} disabled={loading}>
        <Text style={styles.btnOutlineText}>{t('payment.dev_simulate')}</Text>
      </Pressable>
      <Text style={styles.note}>{t('payment.operator_note')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: 24, paddingTop: 64, gap: 16 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontWeight: '700' },
  amount: { fontSize: 32, fontWeight: '900', color: colors.primary },
  hint: { color: colors.textSecondary, lineHeight: 22 },
  methodList: { gap: 12 },
  methodCard: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  methodCardPressed: { transform: [{ scale: 0.99 }] },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: { fontWeight: '900', fontSize: 16 },
  methodText: { flex: 1, gap: 4 },
  methodTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 16 },
  methodSubtitle: { color: colors.textSecondary, fontWeight: '700', lineHeight: 19 },
  btnOutline: { borderWidth: 1, borderColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '900' },
  note: { color: colors.textSecondary, lineHeight: 20, fontSize: 13 },
  disabled: { opacity: 0.55 }
});
